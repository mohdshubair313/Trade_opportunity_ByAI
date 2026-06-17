import asyncio
import json
import logging
import os
from pathlib import Path

import websockets
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

# Bypass websockets lazy-import mechanism (broken with Python 3.14 + uvicorn).
# Importing the submodule eagerly at load time avoids the __getattr__ path.
import websockets.asyncio.client as _dg_ws_client  # noqa: F401

load_dotenv()

from app.trade_functions import function_map
from app.voice_agent_config import build_settings_config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
HOST = os.getenv("VOICE_AGENT_HOST", "0.0.0.0")
PORT = int(os.getenv("VOICE_AGENT_PORT", "8765"))

app = FastAPI(title="TradeInsight Voice Agent (WebSocket)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Reconnection constants
# ---------------------------------------------------------------------------
_RECONNECT_MAX_ATTEMPTS = 3
_RECONNECT_BASE_DELAY_S = 1.0
_RECONNECT_MAX_DELAY_S = 8.0


async def sts_connect(retries: int = _RECONNECT_MAX_ATTEMPTS):
    """Connect to Deepgram Voice Agent API with exponential backoff."""
    if not DEEPGRAM_API_KEY:
        raise ValueError("DEEPGRAM_API_KEY environment variable is not set")
    last_err: Exception = ConnectionError("No connection attempted")

    for attempt in range(1, retries + 1):
        try:
            ws = await websockets.asyncio.client.connect(
                "wss://agent.deepgram.com/v1/agent/converse",
                subprotocols=["token", DEEPGRAM_API_KEY],
                ping_interval=20,
                ping_timeout=10,
                max_size=10 * 1024 * 1024,
            )
            logger.info("deepgram connected on attempt %d/%d", attempt, retries)
            return ws
        except (websockets.WebSocketException, OSError) as exc:
            last_err = exc
            delay = min(
                _RECONNECT_BASE_DELAY_S * (2 ** (attempt - 1)),
                _RECONNECT_MAX_DELAY_S,
            )
            logger.warning(
                "deepgram connect attempt %d/%d failed: %s — retrying in %.1fs",
                attempt, retries, exc, delay,
            )
            await asyncio.sleep(delay)
    raise last_err


def handle_function_call_request(message: dict) -> list[dict]:
    functions = message.get("functions", [])
    results = []
    for func in functions:
        name = func.get("name")
        args_raw = func.get("arguments", "{}")
        call_id = func.get("id")
        try:
            args = json.loads(args_raw) if isinstance(args_raw, str) else args_raw
        except json.JSONDecodeError:
            args = {}
        handler = function_map.get(name)
        if handler:
            try:
                content = handler(**args)
            except TypeError as exc:
                content = json.dumps({
                    "status": "error",
                    "message": f"Invalid arguments for {name}: {exc}",
                })
        else:
            content = json.dumps({
                "status": "error",
                "message": f"Unknown function: {name}",
            })
        results.append({
            "type": "FunctionCallResponse",
            "id": call_id,
            "name": name,
            "content": content,
        })
    return results


async def deepgram_receiver(
    dg_ws: websockets.WebSocketClientProtocol,
    client_ws: WebSocket,
    settings_applied: asyncio.Event,
):
    try:
        async for message in dg_ws:
            if isinstance(message, str):
                decoded = json.loads(message)
                msg_type = decoded.get("type")
                logger.info("dg << %s", msg_type)

                if msg_type == "Welcome":
                    logger.info("deepgram welcome: %s", decoded.get("agent_id", ""))

                elif msg_type == "SettingsApplied":
                    logger.info("deepgram settings applied — audio channel open")
                    settings_applied.set()

                elif msg_type == "UserStartedSpeaking":
                    logger.info("barge-in detected — clearing agent audio")
                    await client_ws.send_text(json.dumps({"type": "clear"}))

                elif msg_type == "UserStoppedSpeaking":
                    logger.info("user stopped speaking — agent thinking")

                elif msg_type == "FunctionCallRequest":
                    logger.info("function call: %s", decoded.get("functions"))
                    responses = handle_function_call_request(decoded)
                    for resp in responses:
                        await dg_ws.send(json.dumps(resp))

                elif msg_type in ("AgentStartedSpeaking", "AgentAudioDone"):
                    logger.info("forwarding %s to client", msg_type)
                    await client_ws.send_text(json.dumps({"type": msg_type}))

                elif msg_type == "ConversationText":
                    await client_ws.send_text(json.dumps({
                        "type": "ConversationText",
                        "role": decoded.get("role"),
                        "content": decoded.get("content", ""),
                    }))

                elif msg_type in (
                    "AgentThinking",
                    "SpeakUpdated", "ThinkUpdated", "PromptUpdated",
                    "KeepAlive", "Close",
                ):
                    pass

                elif msg_type == "Error":
                    logger.error("deepgram error: %s", decoded)
                    await client_ws.send_text(json.dumps({
                        "type": "Error",
                        "content": str(decoded),
                    }))

                elif msg_type == "Warning":
                    logger.warning("deepgram warning: %s", decoded)

                else:
                    logger.debug("unhandled dg message: %s", msg_type)
            else:
                logger.info("dg >> audio (%d bytes)", len(message))
                try:
                    await client_ws.send_bytes(message)
                except WebSocketDisconnect:
                    logger.info("client disconnected while forwarding audio")
                    break
    except websockets.exceptions.ConnectionClosed:
        logger.info("deepgram connection closed (deepgram_receiver)")
    except Exception:
        logger.exception("error in deepgram_receiver")


async def keepalive_sender(dg_ws: websockets.WebSocketClientProtocol, stop: asyncio.Event):
    try:
        while not stop.is_set():
            await asyncio.sleep(5)
            try:
                await dg_ws.send(json.dumps({"type": "KeepAlive"}))
                logger.debug("sent keepalive")
            except websockets.exceptions.ConnectionClosed:
                break
            except Exception:
                logger.exception("keepalive error")
                break
    except asyncio.CancelledError:
        pass


async def client_receiver(
    client_ws: WebSocket,
    dg_ws: websockets.WebSocketClientProtocol,
    settings_applied: asyncio.Event,
):
    # Wait for Deepgram settings to apply before accepting audio
    try:
        await asyncio.wait_for(settings_applied.wait(), timeout=10.0)
    except asyncio.TimeoutError:
        logger.warning("settings not applied within 10s — proceeding anyway")

    try:
        while True:
            raw = await client_ws.receive()
            if raw["type"] == "websocket.disconnect":
                logger.info("browser client disconnected")
                break
            if raw["type"] == "websocket.receive":
                if "bytes" in raw:
                    logger.info("client >> audio (%d bytes)", len(raw["bytes"]))
                    await dg_ws.send(raw["bytes"])
                elif "text" in raw:
                    data = json.loads(raw["text"])
                    msg_type = data.get("type", "")
                    if msg_type == "close":
                        logger.info("client requested close")
                        break
                    elif msg_type == "Settings" or msg_type == "Update":
                        # Allow client to update agent settings dynamically
                        await dg_ws.send(raw["text"])
                        logger.info("forwarded %s to deepgram", msg_type)
    except WebSocketDisconnect:
        logger.info("browser client disconnected (client_receiver)")


@app.websocket("/ws/client")
async def websocket_endpoint(client_ws: WebSocket):
    await client_ws.accept()
    logger.info("browser client connected")
    config = build_settings_config()
    stop_keepalive = asyncio.Event()

    for dg_attempt in range(1, _RECONNECT_MAX_ATTEMPTS + 1):
        try:
            dg_ws = await sts_connect(retries=1)
        except Exception as exc:
            logger.error("deepgram connect failed (attempt %d/%d): %s", dg_attempt, _RECONNECT_MAX_ATTEMPTS, exc)
            if dg_attempt < _RECONNECT_MAX_ATTEMPTS:
                delay = min(_RECONNECT_BASE_DELAY_S * (2 ** dg_attempt), _RECONNECT_MAX_DELAY_S)
                logger.info("reconnecting in %.1fs...", delay)
                await asyncio.sleep(delay)
                continue
            await client_ws.send_text(json.dumps({
                "type": "Error",
                "content": "Could not connect to voice agent service",
            }))
            await client_ws.close()
            return

        try:
            settings_applied = asyncio.Event()
            await dg_ws.send(json.dumps(config))
            logger.info("sent settings config to deepgram")
            tasks = [
                asyncio.ensure_future(deepgram_receiver(dg_ws, client_ws, settings_applied)),
                asyncio.ensure_future(client_receiver(client_ws, dg_ws, settings_applied)),
                asyncio.ensure_future(keepalive_sender(dg_ws, stop_keepalive)),
            ]
            done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            stop_keepalive.set()
            for task in pending:
                task.cancel()
            # If we got here cleanly, break the retry loop
            break
        except (websockets.exceptions.ConnectionClosed, OSError) as exc:
            logger.warning("deepgram connection lost (attempt %d/%d): %s", dg_attempt, _RECONNECT_MAX_ATTEMPTS, exc)
            if dg_attempt < _RECONNECT_MAX_ATTEMPTS:
                try:
                    await client_ws.send_text(json.dumps({
                        "type": "Info",
                        "content": "Reconnecting...",
                    }))
                except Exception:
                    pass
                delay = min(_RECONNECT_BASE_DELAY_S * (2 ** dg_attempt), _RECONNECT_MAX_DELAY_S)
                await asyncio.sleep(delay)
                continue
            await client_ws.send_text(json.dumps({
                "type": "Error",
                "content": "Voice agent connection lost",
            }))
        except WebSocketDisconnect:
            logger.info("browser client disconnected")
            break
        except Exception:
            logger.exception("error in websocket handler")
            break
        finally:
            stop_keepalive.set()
            try:
                await dg_ws.close()
            except Exception:
                pass


@app.get("/", response_class=HTMLResponse)
async def index():
    return HTMLResponse(content="""
<!DOCTYPE html>
<html><body style="font-family:sans-serif;background:#0a0e14;color:#e2e8f0;display:flex;justify-content:center;align-items:center;min-height:100vh">
<div style="text-align:center">
  <h1>TradeInsight Voice Agent</h1>
  <p>WebSocket server running on <code>ws://localhost:8765/ws/client</code></p>
  <p><a href="/test" style="color:#22c55e">Open the Voice Agent test client →</a></p>
</div>
</body></html>""")


@app.get("/test", response_class=HTMLResponse)
async def test_page():
    html_path = Path(__file__).resolve().parent.parent / "frontend" / "public" / "voice-stream-test.html"
    if html_path.exists():
        return HTMLResponse(content=html_path.read_text(encoding="utf-8"))
    return HTMLResponse(content="<h1>Test page not found</h1>", status_code=404)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
