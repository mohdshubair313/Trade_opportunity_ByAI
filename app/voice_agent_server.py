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


def sts_connect():
    if not DEEPGRAM_API_KEY:
        raise ValueError("DEEPGRAM_API_KEY environment variable is not set")
    return websockets.connect(
        "wss://agent.deepgram.com/v1/agent/converse",
        subprotocols=["token", DEEPGRAM_API_KEY],
    )


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
):
    try:
        async for message in dg_ws:
            if isinstance(message, str):
                decoded = json.loads(message)
                msg_type = decoded.get("type")
                logger.info("dg << %s", msg_type)
                if msg_type == "UserStartedSpeaking":
                    logger.info("barge-in detected")
                    await client_ws.send_text(json.dumps({"type": "clear"}))
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
                    "SettingsApplied", "Welcome",
                    "AgentThinking",
                    "SpeakUpdated", "ThinkUpdated", "PromptUpdated",
                ):
                    pass
                elif msg_type == "Error":
                    logger.error("deepgram error: %s", decoded)
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


async def keepalive_sender(dg_ws: websockets.WebSocketClientProtocol):
    while True:
        await asyncio.sleep(5)
        try:
            await dg_ws.send(json.dumps({"type": "KeepAlive"}))
            logger.debug("sent keepalive")
        except websockets.exceptions.ConnectionClosed:
            break
        except Exception:
            logger.exception("keepalive error")
            break


async def client_receiver(
    client_ws: WebSocket,
    dg_ws: websockets.WebSocketClientProtocol,
):
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
                    if data.get("type") == "close":
                        logger.info("client requested close")
                        break
    except WebSocketDisconnect:
        logger.info("browser client disconnected (client_receiver)")


@app.websocket("/ws/client")
async def websocket_endpoint(client_ws: WebSocket):
    await client_ws.accept()
    logger.info("browser client connected")
    config = build_settings_config()
    try:
        async with sts_connect() as dg_ws:
            logger.info("connected to deepgram voice agent api")
            await dg_ws.send(json.dumps(config))
            logger.info("sent settings config to deepgram")
            tasks = [
                asyncio.ensure_future(deepgram_receiver(dg_ws, client_ws)),
                asyncio.ensure_future(client_receiver(client_ws, dg_ws)),
                asyncio.ensure_future(keepalive_sender(dg_ws)),
            ]
            done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            for task in pending:
                task.cancel()
    except WebSocketDisconnect:
        logger.info("browser client disconnected")
    except websockets.exceptions.ConnectionClosed:
        logger.info("deepgram websocket closed")
    except Exception:
        logger.exception("error in websocket handler")


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
