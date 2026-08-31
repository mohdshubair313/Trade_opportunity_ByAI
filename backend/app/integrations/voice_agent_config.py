"""
Configuration and Prompt Schema for Deepgram Voice Agent API & S2S Pipeline.
Adheres to Deepgram Voice Agent API (wss://agent.deepgram.com/v1/agent/converse).
"""

from typing import Any, Dict, List

SYSTEM_PROMPT = (
    "You are TradeInsight AI, an elite Indian financial and trading intelligence voice assistant. "
    "You provide instantaneous, accurate market analysis, stock quotes, crypto valuations, portfolio reviews, and mock order execution.\n\n"
    "CRITICAL CONVERSATIONAL RULES:\n"
    "1. VOICE-OPTIMIZED BREVITY — Keep responses under 2-3 concise sentences. Never output markdown tables, long bullet points, or raw JSON in voice.\n"
    "2. TRADE CONFIRMATION SAFETY — Before executing ANY trade, state the ticker, action (BUY/SELL), and exact quantity back to the user, then ask for explicit verbal confirmation.\n"
    "3. INDIAN & GLOBAL MARKET PRECISION — Prices for Indian stocks (e.g. RELIANCE, TCS, HDFCBANK, INFY, TATAMOTORS) and indices (NIFTY 50, SENSEX) are in INR (₹). Crypto and US equities (BTC, ETH, AAPL, TSLA, NVDA) are in USD ($).\n"
    "4. NEUTRAL DATA DELIVERY — Present facts, trends, and support/resistance data objectively without offering unsolicited financial advice.\n"
    "5. REAL-TIME TOOL USAGE — Always use the appropriate tool when asked about prices, market indices, sector performance, portfolio balances, or order execution.\n"
    "6. HINGLISH MASTERY — Fluently understand Indian financial colloquialisms: 'bhaav' (price), 'kitna gira/bhadha' (how much drop/rise), 'kharidna' (buy), 'bechna' (sell), 'kya lagta hai' (what is your outlook), 'target' (target price), 'paise' (funds). Always reply in clear Indian English.\n"
    "7. INTERRUPTIONS & BARGE-IN — If interrupted or context is partial, remain poised, rephrase concisely, and ask a crisp clarifying question."
)

FUNCTIONS_SCHEMA: List[Dict[str, Any]] = [
    {
        "name": "get_stock_or_crypto_price",
        "description": "Fetch live or real-time mock price, 24-hour percentage change, high/low, and volume for an equity or cryptocurrency ticker symbol.",
        "parameters": {
            "type": "object",
            "properties": {
                "ticker": {
                    "type": "string",
                    "description": "The stock or crypto ticker symbol (e.g., RELIANCE, TCS, HDFCBANK, AAPL, NVDA, BTC, ETH, SOL).",
                }
            },
            "required": ["ticker"],
        },
    },
    {
        "name": "check_user_portfolio",
        "description": "Retrieve active portfolio holdings, total valuation in INR/USD, and available cash balance for a user account.",
        "parameters": {
            "type": "object",
            "properties": {
                "user_name": {
                    "type": "string",
                    "description": "The registered user account name (e.g., demo_user, shubair).",
                }
            },
            "required": ["user_name"],
        },
    },
    {
        "name": "execute_mock_trade",
        "description": "Execute a paper/mock buy or sell transaction for an equity or crypto ticker. Updates cash and holdings in real time. Always confirm with the user before calling.",
        "parameters": {
            "type": "object",
            "properties": {
                "user_name": {
                    "type": "string",
                    "description": "The registered user account name placing the trade.",
                },
                "ticker": {
                    "type": "string",
                    "description": "The stock or crypto ticker symbol.",
                },
                "action": {
                    "type": "string",
                    "enum": ["buy", "sell"],
                    "description": "Order action: 'buy' or 'sell'.",
                },
                "quantity": {
                    "type": "integer",
                    "description": "Positive integer quantity of units or shares.",
                },
            },
            "required": ["user_name", "ticker", "action", "quantity"],
        },
    },
    {
        "name": "get_market_indices",
        "description": "Get real-time snapshot of key market indices: Nifty 50, Sensex, Bank Nifty, and India VIX.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "get_sector_trends",
        "description": "Get current performance and top gainers/losers across major Indian sectors (Banking, IT, Renewable Energy, Auto, Pharma).",
        "parameters": {
            "type": "object",
            "properties": {
                "sector": {
                    "type": "string",
                    "description": "Sector name or 'all' for an overall summary.",
                }
            },
            "required": ["sector"],
        },
    },
]


def build_settings_config(
    voice: str = "aura-2-thalia-en",
    llm_model: str = "gpt-4o-mini",
    temperature: float = 0.6,
) -> Dict[str, Any]:
    """
    Builds the official Deepgram Agent API handshake Settings packet.
    """
    return {
        "type": "Settings",
        "audio": {
            "input": {
                "encoding": "linear16",
                "sample_rate": 16000,
            },
            "output": {
                "encoding": "linear16",
                "sample_rate": 16000,
                "container": "none",
            },
        },
        "agent": {
            "language": "en",
            "listen": {
                "provider": {
                    "type": "deepgram",
                    "model": "nova-3",
                },
            },
            "think": {
                "provider": {
                    "type": "open_ai",
                    "model": llm_model,
                    "temperature": temperature,
                },
                "prompt": SYSTEM_PROMPT,
                "functions": FUNCTIONS_SCHEMA,
            },
            "speak": {
                "provider": {
                    "type": "deepgram",
                    "model": voice,
                },
            },
            "greeting": (
                "Namaste! I am your TradeInsight AI Assistant. "
                "I can analyze Nifty trends, check live stock prices, review your portfolio, or execute mock trades. "
                "How can I assist your trading today?"
            ),
        },
    }
