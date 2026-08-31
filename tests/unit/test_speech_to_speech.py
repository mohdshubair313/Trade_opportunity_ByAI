"""
Unit tests for Hugging Face speech-to-speech modular voice AI pipeline
and trade functions.
"""
import json
import os
import sys
from pathlib import Path
import pytest

# Ensure backend directory is in sys.path for standalone imports & IDE language server
_backend_path = str(Path(__file__).resolve().parent.parent.parent / "backend")
if _backend_path not in sys.path:
    sys.path.insert(0, _backend_path)

try:
    from app.integrations.trade_functions import (
        get_stock_or_crypto_price,
        check_user_portfolio,
        execute_mock_trade,
        get_market_indices,
        get_sector_trends,
    )
    from app.integrations.voice_agent_config import build_settings_config
    from app.integrations.speech_to_speech import AudioVAD, pcm_to_wav, resample_pcm, TARGET_SAMPLE_RATE
except ImportError:
    from backend.app.integrations.trade_functions import (  # type: ignore[no-redef]
        get_stock_or_crypto_price,
        check_user_portfolio,
        execute_mock_trade,
        get_market_indices,
        get_sector_trends,
    )
    from backend.app.integrations.voice_agent_config import build_settings_config  # type: ignore[no-redef]
    from backend.app.integrations.speech_to_speech import AudioVAD, pcm_to_wav, resample_pcm, TARGET_SAMPLE_RATE  # type: ignore[no-redef]



def test_get_stock_or_crypto_price():
    res = get_stock_or_crypto_price("RELIANCE")
    data = json.loads(res)
    assert data["status"] == "success"
    assert data["ticker"] == "RELIANCE"
    assert data["price"] > 0
    assert data["currency"] == "INR"

    btc = json.loads(get_stock_or_crypto_price("BTC"))
    assert btc["status"] == "success"
    assert btc["currency"] == "USD"


def test_check_user_portfolio():
    res = check_user_portfolio("demo_user")
    data = json.loads(res)
    assert data["status"] == "success"
    assert "holdings" in data
    assert data["cash_balance"] > 0


def test_execute_mock_trade():
    res = execute_mock_trade("demo_user", "RELIANCE", "buy", 1)
    data = json.loads(res)
    assert data["status"] == "completed"
    assert data["action"] == "BUY"
    assert data["quantity"] == 1
    assert "order_id" in data


def test_market_indices_and_sectors():
    idx = json.loads(get_market_indices())
    assert idx["status"] == "success"
    assert "NIFTY 50" in idx["indices"]

    sec = json.loads(get_sector_trends("Renewable Energy"))
    assert sec["status"] == "success"
    assert "sentiment" in sec["data"]


def test_build_settings_config():
    config = build_settings_config(voice="aura-2-thalia-en", llm_model="gpt-4o-mini")
    assert config["type"] == "Settings"
    assert config["agent"]["listen"]["provider"]["model"] == "nova-3"
    assert config["agent"]["speak"]["provider"]["model"] == "aura-2-thalia-en"
    assert len(config["agent"]["think"]["functions"]) >= 3


def test_audio_vad_and_utilities():
    vad = AudioVAD(energy_threshold=0.01)
    silence = b"\x00\x00" * 480  # 30ms silence at 16kHz
    is_speech, speech_ended, segment = vad.process_chunk(silence)
    assert not is_speech
    assert not speech_ended

    # WAV packaging
    wav_bytes = pcm_to_wav(silence, sample_rate=TARGET_SAMPLE_RATE)
    assert wav_bytes.startswith(b"RIFF")
    assert b"WAVE" in wav_bytes

    # Resampling
    resampled = resample_pcm(silence, 16000, 16000)
    assert resampled == silence
