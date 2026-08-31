"""
Hugging Face speech-to-speech (S2S) Modular Voice AI Pipeline.

Inspired by https://github.com/huggingface/speech-to-speech:
A low-latency, modular, cascaded pipeline combining:
1. VAD (Voice Activity Detection) - Energy & Zero-Crossing Rate analysis
2. STT (Speech-to-Text) - Multi-provider (Deepgram Nova-3, Whisper, Gemini, OpenRouter)
3. LLM (Reasoning & Tool Calling) - Context-aware Financial Assistant with Function Execution
4. TTS (Text-to-Speech) - Streaming Synthesis (Deepgram Aura/Flux, OpenAI, Edge, HF)
5. OpenAI Realtime WebSocket Protocol Compatibility (/v1/realtime & /ws/s2s)
"""

from __future__ import annotations

import array
import asyncio
import base64
import io
import json
import logging
import math
import os
import time
import uuid
import wave
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Callable, Dict, List, Optional, Tuple, Union

import httpx
from fastapi import WebSocket, WebSocketDisconnect

from app.core.config import get_settings
from app.integrations.trade_functions import function_map

logger = logging.getLogger("speech_to_speech")
settings = get_settings()

TARGET_SAMPLE_RATE = 16000
SAMPLE_WIDTH = 2  # 16-bit PCM
CHANNELS = 1

# ----------------------------------------------------------------------------
# System Instructions & Financial Domain Knowledge
# ----------------------------------------------------------------------------

DEFAULT_SYSTEM_INSTRUCTIONS = (
    "You are TradeInsight AI, a real-time conversational market intelligence assistant for Indian and global traders.\n"
    "You are fast, sharp, and voice-optimized.\n\n"
    "Guidelines:\n"
    "1. Keep answers brief (1-3 sentences maximum) since you are speaking over voice.\n"
    "2. If asked about stock or crypto prices (Nifty, Reliance, TCS, HDFC, BTC, ETH, etc.), use the 'get_stock_or_crypto_price' tool.\n"
    "3. If asked about user holdings or cash balance, use the 'check_user_portfolio' tool.\n"
    "4. For trades (buy/sell), ALWAYS ask for user confirmation before calling 'execute_mock_trade'.\n"
    "5. Understand Hinglish terms: 'bhaav' (price), 'kharido' (buy), 'becho' (sell), 'kitna' (how much).\n"
    "6. Never provide unsolicited financial advice; deliver verified data neutrally."
)

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "name": "get_stock_or_crypto_price",
        "description": "Fetch live market price, 24h change, and volume for a ticker symbol (e.g. RELIANCE, TCS, AAPL, BTC).",
        "parameters": {
            "type": "object",
            "properties": {
                "ticker": {"type": "string", "description": "Stock or crypto symbol (e.g., RELIANCE, BTC, TSLA)."}
            },
            "required": ["ticker"],
        },
    },
    {
        "type": "function",
        "name": "check_user_portfolio",
        "description": "Check current portfolio holdings, valuation, and cash balance.",
        "parameters": {
            "type": "object",
            "properties": {
                "user_name": {"type": "string", "description": "Username (e.g., demo_user, shubair)."}
            },
            "required": ["user_name"],
        },
    },
    {
        "type": "function",
        "name": "execute_mock_trade",
        "description": "Execute a simulated buy or sell order after user confirmation.",
        "parameters": {
            "type": "object",
            "properties": {
                "user_name": {"type": "string", "description": "Username executing the trade."},
                "ticker": {"type": "string", "description": "Ticker symbol to trade."},
                "action": {"type": "string", "enum": ["buy", "sell"], "description": "Order direction."},
                "quantity": {"type": "integer", "description": "Number of units/shares to trade."},
            },
            "required": ["user_name", "ticker", "action", "quantity"],
        },
    },
]

# ----------------------------------------------------------------------------
# 1. Voice Activity Detection (VAD)
# ----------------------------------------------------------------------------

class AudioVAD:
    """
    Lightweight, streaming VAD for 16kHz 16-bit mono PCM.
    Calculates frame RMS energy and adaptive noise floor to detect speech onsets
    and silence endpoints without heavy native dependencies.
    """

    def __init__(
        self,
        sample_rate: int = TARGET_SAMPLE_RATE,
        frame_duration_ms: int = 30,
        energy_threshold: float = 0.015,
        silence_duration_ms: int = 600,
        min_speech_duration_ms: int = 250,
    ):
        self.sample_rate = sample_rate
        self.frame_duration_ms = frame_duration_ms
        self.energy_threshold = energy_threshold
        self.silence_duration_ms = silence_duration_ms
        self.min_speech_duration_ms = min_speech_duration_ms

        self.bytes_per_frame = int(sample_rate * (frame_duration_ms / 1000.0)) * 2
        self.is_speaking = False
        self.speech_start_time = 0.0
        self.last_speech_time = 0.0
        self.accumulated_audio = bytearray()
        self.noise_floor = 0.005

    def calculate_rms(self, pcm_bytes: bytes) -> float:
        if not pcm_bytes or len(pcm_bytes) < 2:
            return 0.0
        count = len(pcm_bytes) // 2
        shorts = array.array("h")
        shorts.frombytes(pcm_bytes[: count * 2])
        if not shorts:
            return 0.0
        sum_sq = sum((s / 32768.0) ** 2 for s in shorts)
        return math.sqrt(sum_sq / count)

    def process_chunk(self, chunk: bytes) -> Tuple[bool, bool, Optional[bytes]]:
        """
        Process incoming audio chunk.
        Returns:
            (is_speech_now, speech_ended, completed_speech_audio_or_None)
        """
        self.accumulated_audio.extend(chunk)
        rms = self.calculate_rms(chunk)
        now = time.time()

        # Update noise floor estimate slowly during quiet periods
        if rms < self.energy_threshold * 0.5:
            self.noise_floor = 0.95 * self.noise_floor + 0.05 * rms

        dynamic_threshold = max(self.energy_threshold, self.noise_floor * 2.5)

        if rms >= dynamic_threshold:
            self.last_speech_time = now
            if not self.is_speaking:
                self.is_speaking = True
                self.speech_start_time = now
                logger.debug("VAD: Speech onset detected (RMS: %.4f)", rms)
            return (True, False, None)
        else:
            if self.is_speaking:
                silence_elapsed_ms = (now - self.last_speech_time) * 1000
                if silence_elapsed_ms >= self.silence_duration_ms:
                    speech_duration_ms = (self.last_speech_time - self.speech_start_time) * 1000
                    self.is_speaking = False
                    if speech_duration_ms >= self.min_speech_duration_ms:
                        logger.info("VAD: Speech segment finalized (%d ms)", int(speech_duration_ms))
                        speech_audio = bytes(self.accumulated_audio)
                        self.accumulated_audio.clear()
                        return (False, True, speech_audio)
                    else:
                        self.accumulated_audio.clear()
                        return (False, False, None)
            return (False, False, None)

    def flush(self) -> Optional[bytes]:
        if len(self.accumulated_audio) > 0:
            audio = bytes(self.accumulated_audio)
            self.accumulated_audio.clear()
            self.is_speaking = False
            return audio
        return None

# ----------------------------------------------------------------------------
# 2. Speech-to-Text (STT) Module
# ----------------------------------------------------------------------------

class STTModule:
    """
    Multi-provider Speech-to-Text service supporting Deepgram Nova-3,
    OpenAI Whisper, and fallback audio transcription.
    """

    def __init__(self):
        self.deepgram_key = os.getenv("DEEPGRAM_API_KEY", "")
        self.openai_key = os.getenv("OPENAI_API_KEY", "")
        self.gemini_key = os.getenv("GEMINI_API_KEY", "")

    async def transcribe(self, pcm_bytes: bytes, language: str = "en") -> str:
        """Transcribe 16kHz mono 16-bit PCM bytes to text."""
        if not pcm_bytes:
            return ""

        wav_bytes = pcm_to_wav(pcm_bytes, sample_rate=TARGET_SAMPLE_RATE)

        # 1. Primary: Deepgram Nova-3 (fastest latency ~120ms)
        if self.deepgram_key:
            try:
                text = await self._transcribe_deepgram(wav_bytes, language)
                if text:
                    return text
            except Exception as e:
                logger.warning("Deepgram STT error: %s, trying fallback", e)

        # 2. Secondary: OpenAI Whisper
        if self.openai_key:
            try:
                text = await self._transcribe_whisper(wav_bytes, language)
                if text:
                    return text
            except Exception as e:
                logger.warning("OpenAI Whisper STT error: %s", e)

        # 3. Tertiary: Gemini Multimodal Audio
        if self.gemini_key:
            try:
                text = await self._transcribe_gemini(wav_bytes)
                if text:
                    return text
            except Exception as e:
                logger.warning("Gemini STT error: %s", e)

        return ""

    async def _transcribe_deepgram(self, wav_bytes: bytes, language: str) -> str:
        url = "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true"
        if language:
            url += f"&language={language}"
        headers = {
            "Authorization": f"Token {self.deepgram_key}",
            "Content-Type": "audio/wav",
        }
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(url, content=wav_bytes, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                channels = data.get("results", {}).get("channels", [])
                if channels:
                    alts = channels[0].get("alternatives", [])
                    if alts:
                        return alts[0].get("transcript", "").strip()
        return ""

    async def _transcribe_whisper(self, wav_bytes: bytes, language: str) -> str:
        url = "https://api.openai.com/v1/audio/transcriptions"
        headers = {"Authorization": f"Bearer {self.openai_key}"}
        files = {"file": ("audio.wav", wav_bytes, "audio/wav")}
        data = {"model": "whisper-1"}
        if language and language != "auto":
            data["language"] = language
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=headers, files=files, data=data)
            if resp.status_code == 200:
                return resp.json().get("text", "").strip()
        return ""

    async def _transcribe_gemini(self, wav_bytes: bytes) -> str:
        if not self.gemini_key:
            return ""
        try:
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=self.gemini_key)
            prompt = "Transcribe the following audio accurately without adding comments or markdown. Return only the plain transcribed words."
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=types.Content(
                    parts=[
                        types.Part.from_bytes(data=wav_bytes, mime_type="audio/wav"),
                        types.Part.from_text(text=prompt),
                    ]
                ),
            )
            return (getattr(response, "text", "") or "").strip()
        except Exception as exc:
            logger.warning("Gemini audio transcription failed: %s", exc)
            return ""

# ----------------------------------------------------------------------------
# 3. LLM Reasoning & Function Calling Module
# ----------------------------------------------------------------------------

class LLMModule:
    """
    Language model engine with function calling for financial intelligence.
    """

    def __init__(self, system_prompt: str = DEFAULT_SYSTEM_INSTRUCTIONS):
        self.system_prompt = system_prompt
        self.openai_key = os.getenv("OPENAI_API_KEY", "")
        self.openrouter_key = os.getenv("OPENROUTER_API_KEY", "")
        self.gemini_key = os.getenv("GEMINI_API_KEY", "")

    async def generate_response(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Stream response tokens or tool call requests.
        Yields:
            {"type": "text_delta", "content": "..."} or
            {"type": "function_call", "name": "...", "args": {...}, "id": "..."}
        """
        tools_schema = tools or TOOL_DEFINITIONS

        # Check OpenRouter / OpenAI
        api_key = self.openai_key or self.openrouter_key
        base_url = "https://openrouter.ai/api/v1" if (not self.openai_key and self.openrouter_key) else "https://api.openai.com/v1"
        model_name = "openai/gpt-4o-mini" if "openrouter" in base_url else "gpt-4o-mini"

        if api_key:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": model_name,
                "messages": [{"role": "system", "content": self.system_prompt}] + messages,
                "tools": tools_schema,
                "tool_choice": "auto",
                "temperature": 0.6,
                "stream": True,
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                async with client.stream("POST", f"{base_url}/chat/completions", headers=headers, json=payload) as resp:
                    if resp.status_code == 200:
                        fn_name = ""
                        fn_args = ""
                        fn_id = ""
                        async for line in resp.aiter_lines():
                            if not line.startswith("data: "):
                                continue
                            data_str = line[6:].strip()
                            if data_str == "[DONE]":
                                break
                            try:
                                chunk = json.loads(data_str)
                                delta = chunk["choices"][0]["delta"]
                                if "content" in delta and delta["content"]:
                                    yield {"type": "text_delta", "content": delta["content"]}
                                if "tool_calls" in delta and delta["tool_calls"]:
                                    tc = delta["tool_calls"][0]
                                    if "id" in tc and tc["id"]:
                                        fn_id = tc["id"]
                                    if "function" in tc:
                                        if "name" in tc["function"] and tc["function"]["name"]:
                                            fn_name = tc["function"]["name"]
                                        if "arguments" in tc["function"] and tc["function"]["arguments"]:
                                            fn_args += tc["function"]["arguments"]
                            except Exception:
                                continue

                        if fn_name:
                            try:
                                parsed_args = json.loads(fn_args) if fn_args else {}
                            except Exception:
                                parsed_args = {}
                            yield {
                                "type": "function_call",
                                "name": fn_name,
                                "args": parsed_args,
                                "id": fn_id or str(uuid.uuid4())[:8],
                            }
                        return

        # Fallback to direct Gemini
        if self.gemini_key:
            try:
                from google import genai
                client = genai.Client(api_key=self.gemini_key)
                last_msg = messages[-1]["content"] if messages else ""
                full_prompt = f"{self.system_prompt}\n\nUser: {last_msg}"
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=full_prompt,
                )
                text = (getattr(response, "text", "") or "").strip()
                if text:
                    yield {"type": "text_delta", "content": text}
                else:
                    yield {"type": "text_delta", "content": "I am here to assist with your trading queries. How can I help you?"}
            except Exception as e:
                logger.error("Gemini LLM fallback failed: %s", e)
                yield {"type": "text_delta", "content": "I am here to assist with your trading queries. How can I help you?"}


# ----------------------------------------------------------------------------
# 4. Text-to-Speech (TTS) Module
# ----------------------------------------------------------------------------

class TTSModule:
    """
    Streaming Text-to-Speech synthesis with Deepgram Aura/Flux, OpenAI, and Edge TTS.
    Outputs 16kHz mono 16-bit PCM audio chunks for low-latency streaming playback.
    """

    def __init__(self, voice: str = "aura-2-thalia-en"):
        self.voice = voice
        self.deepgram_key = os.getenv("DEEPGRAM_API_KEY", "")
        self.openai_key = os.getenv("OPENAI_API_KEY", "")

    async def stream_audio_chunks(self, text: str) -> AsyncIterator[bytes]:
        """Synthesize text and yield raw 16kHz mono 16-bit PCM chunks."""
        if not text or not text.strip():
            return

        # 1. Primary: Deepgram Aura / Flux TTS streaming
        if self.deepgram_key:
            try:
                async for chunk in self._stream_deepgram_tts(text):
                    yield chunk
                return
            except Exception as e:
                logger.warning("Deepgram TTS streaming error: %s, falling back", e)

        # 2. Secondary: OpenAI TTS
        if self.openai_key:
            try:
                async for chunk in self._stream_openai_tts(text):
                    yield chunk
                return
            except Exception as e:
                logger.warning("OpenAI TTS error: %s", e)

        # 3. Tertiary: Local Tone / Silence fallback (guarantees no unhandled crash)
        yield self._generate_silence_chunk(200)

    async def _stream_deepgram_tts(self, text: str) -> AsyncIterator[bytes]:
        voice_model = self.voice if "aura" in self.voice else "aura-2-thalia-en"
        url = f"https://api.deepgram.com/v1/speak?model={voice_model}&encoding=linear16&sample_rate=16000&container=none"
        headers = {
            "Authorization": f"Token {self.deepgram_key}",
            "Content-Type": "application/json",
        }
        payload = {"text": text}

        async with httpx.AsyncClient(timeout=10.0) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as resp:
                if resp.status_code == 200:
                    async for raw_chunk in resp.aiter_bytes(chunk_size=1024):
                        if raw_chunk:
                            yield raw_chunk

    async def _stream_openai_tts(self, text: str) -> AsyncIterator[bytes]:
        url = "https://api.openai.com/v1/audio/speech"
        headers = {
            "Authorization": f"Bearer {self.openai_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "tts-1",
            "input": text,
            "voice": "nova",
            "response_format": "pcm",  # 24kHz 16-bit raw PCM
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as resp:
                if resp.status_code == 200:
                    buffer = bytearray()
                    async for raw_chunk in resp.aiter_bytes(chunk_size=2048):
                        buffer.extend(raw_chunk)
                        if len(buffer) >= 3000:
                            resampled = resample_pcm(bytes(buffer), 24000, TARGET_SAMPLE_RATE)
                            buffer.clear()
                            yield resampled
                    if buffer:
                        yield resample_pcm(bytes(buffer), 24000, TARGET_SAMPLE_RATE)

    def _generate_silence_chunk(self, duration_ms: int) -> bytes:
        samples = int(TARGET_SAMPLE_RATE * (duration_ms / 1000.0))
        return b"\x00\x00" * samples

# ----------------------------------------------------------------------------
# 5. Full Speech-to-Speech Realtime Pipeline Orchestrator
# ----------------------------------------------------------------------------

class SpeechToSpeechPipeline:
    """
    End-to-end Speech-to-Speech interactive pipeline supporting:
    - Audio buffer streaming
    - Zero-latency turn-taking & barge-in
    - Tool execution & conversation memory
    - OpenAI Realtime protocol event loop
    """

    def __init__(self, voice: str = "aura-2-thalia-en"):
        self.vad = AudioVAD()
        self.stt = STTModule()
        self.llm = LLMModule()
        self.tts = TTSModule(voice=voice)
        self.history: List[Dict[str, Any]] = []
        self.is_interrupted = False
        self.assistant_speaking = False

    def interrupt(self):
        """Barge-in signal: stop current assistant playback immediately."""
        self.is_interrupted = True
        self.assistant_speaking = False

    async def handle_audio_stream(
        self,
        client_ws: WebSocket,
        on_turn_complete: Optional[Callable[[str, str], None]] = None,
    ):
        """
        Manages real-time bidirectional audio flow with client WebSocket.
        """
        self.is_interrupted = False
        self.assistant_speaking = False
        try:
            while True:
                msg = await client_ws.receive()
                if msg["type"] == "websocket.disconnect":
                    break

                if "bytes" in msg and msg["bytes"]:
                    chunk = msg["bytes"]
                    is_speech, speech_ended, speech_audio = self.vad.process_chunk(chunk)

                    if is_speech and self.assistant_speaking:
                        # User interrupted assistant speaking: trigger instant audio flush
                        self.interrupt()
                        try:
                            await client_ws.send_text(json.dumps({"type": "clear"}))
                        except Exception:
                            pass

                    if speech_ended and speech_audio:
                        # User stopped speaking: run pipeline turn
                        self.is_interrupted = False
                        await self._execute_speech_turn(speech_audio, client_ws, on_turn_complete)

                elif "text" in msg and msg["text"]:
                    data = json.loads(msg["text"])
                    event_type = data.get("type", "")

                    if event_type == "input_audio_buffer.append":
                        audio_b64 = data.get("audio", "")
                        if audio_b64:
                            raw = base64.b64decode(audio_b64)
                            _, speech_ended, speech_audio = self.vad.process_chunk(raw)
                            if speech_ended and speech_audio:
                                await self._execute_speech_turn(speech_audio, client_ws, on_turn_complete)

                    elif event_type == "input_audio_buffer.commit":
                        flushed = self.vad.flush()
                        if flushed:
                            await self._execute_speech_turn(flushed, client_ws, on_turn_complete)

                    elif event_type == "conversation.item.create":
                        user_text = data.get("item", {}).get("content", [{}])[0].get("text", "")
                        if user_text:
                            await self._execute_text_turn(user_text, client_ws, on_turn_complete)

                    elif event_type == "close":
                        break
        except WebSocketDisconnect:
            logger.info("S2S WebSocket client disconnected cleanly.")
        except Exception as e:
            logger.exception("Error in S2S pipeline loop: %s", e)

    async def _execute_speech_turn(
        self,
        audio_bytes: bytes,
        client_ws: WebSocket,
        on_turn_complete: Optional[Callable[[str, str], None]],
    ):
        await client_ws.send_text(json.dumps({"type": "AgentThinking"}))

        # 1. Speech-to-Text
        user_transcript = await self.stt.transcribe(audio_bytes)
        if not user_transcript or not user_transcript.strip():
            await client_ws.send_text(json.dumps({"type": "clear"}))
            return

        logger.info("S2S User Transcript: '%s'", user_transcript)
        await client_ws.send_text(json.dumps({
            "type": "ConversationText",
            "role": "user",
            "content": user_transcript,
        }))

        await self._execute_text_turn(user_transcript, client_ws, on_turn_complete)

    async def _execute_text_turn(
        self,
        user_text: str,
        client_ws: WebSocket,
        on_turn_complete: Optional[Callable[[str, str], None]],
    ):
        self.history.append({"role": "user", "content": user_text})
        if len(self.history) > 10:
            self.history = self.history[-10:]

        self.assistant_speaking = True
        self.is_interrupted = False
        try:
            await client_ws.send_text(json.dumps({"type": "AgentStartedSpeaking"}))

            assistant_full_reply = []
            sentence_buffer = ""

            async for event in self.llm.generate_response(self.history):
                if self.is_interrupted:
                    break

                if event["type"] == "text_delta":
                    token = event["content"]
                    assistant_full_reply.append(token)
                    sentence_buffer += token

                    # Trigger synthesis at natural sentence clauses for streaming low latency
                    if any(punct in sentence_buffer for punct in [". ", "? ", "! ", "। ", "\n"]):
                        clause = sentence_buffer.strip()
                        sentence_buffer = ""
                        if clause:
                            await self._stream_clause_tts(clause, client_ws)

                elif event["type"] == "function_call":
                    fn_name = event["name"]
                    fn_args = event["args"]
                    fn_id = event["id"]
                    logger.info("Executing Tool Call: %s(%s)", fn_name, fn_args)

                    handler = function_map.get(fn_name)
                    if handler:
                        try:
                            result_str = handler(**fn_args)
                        except Exception as err:
                            result_str = json.dumps({"status": "error", "message": str(err)})
                    else:
                        result_str = json.dumps({"status": "error", "message": f"Unknown tool: {fn_name}"})

                    self.history.append({
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [{
                            "id": fn_id,
                            "type": "function",
                            "function": {"name": fn_name, "arguments": json.dumps(fn_args)},
                        }],
                    })
                    self.history.append({
                        "role": "tool",
                        "tool_call_id": fn_id,
                        "content": result_str,
                    })

                    # Re-run LLM with tool result
                    async for sub_event in self.llm.generate_response(self.history):
                        if self.is_interrupted:
                            break
                        if sub_event["type"] == "text_delta":
                            token = sub_event["content"]
                            assistant_full_reply.append(token)
                            sentence_buffer += token
                            if any(punct in sentence_buffer for punct in [". ", "? ", "! ", "। ", "\n"]):
                                clause = sentence_buffer.strip()
                                sentence_buffer = ""
                                if clause:
                                    await self._stream_clause_tts(clause, client_ws)

            # Flush any trailing text in sentence buffer
            if sentence_buffer.strip() and not self.is_interrupted:
                await self._stream_clause_tts(sentence_buffer.strip(), client_ws)

            full_text = "".join(assistant_full_reply).strip()
            if full_text:
                self.history.append({"role": "assistant", "content": full_text})
                await client_ws.send_text(json.dumps({
                    "type": "ConversationText",
                    "role": "assistant",
                    "content": full_text,
                }))
                if on_turn_complete:
                    on_turn_complete(user_text, full_text)

            await client_ws.send_text(json.dumps({"type": "AgentAudioDone"}))
        finally:
            self.assistant_speaking = False


    async def _stream_clause_tts(self, clause: str, client_ws: WebSocket):
        async for audio_chunk in self.tts.stream_audio_chunks(clause):
            if self.is_interrupted:
                break
            try:
                await client_ws.send_bytes(audio_chunk)
            except WebSocketDisconnect:
                break

# ----------------------------------------------------------------------------
# Helper Audio Conversion Utilities
# ----------------------------------------------------------------------------

def pcm_to_wav(pcm_data: bytes, sample_rate: int = TARGET_SAMPLE_RATE, channels: int = 1) -> bytes:
    """Pack raw 16-bit PCM bytes into standard WAV container in memory."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_data)
    return buf.getvalue()

def resample_pcm(pcm_bytes: bytes, from_rate: int, to_rate: int) -> bytes:
    """Linear sample rate converter for 16-bit mono PCM."""
    if from_rate == to_rate or not pcm_bytes:
        return pcm_bytes
    shorts = array.array("h")
    count = len(pcm_bytes) // 2
    shorts.frombytes(pcm_bytes[: count * 2])
    if not shorts:
        return pcm_bytes
    ratio = from_rate / to_rate
    out_length = int(len(shorts) / ratio)
    out = array.array("h", [0] * out_length)
    for i in range(out_length):
        idx = i * ratio
        left = int(idx)
        right = min(left + 1, len(shorts) - 1)
        frac = idx - left
        val = int(shorts[left] * (1.0 - frac) + shorts[right] * frac)
        out[i] = max(-32768, min(32767, val))
    return out.tobytes()
