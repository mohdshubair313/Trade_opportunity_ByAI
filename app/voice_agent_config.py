SYSTEM_PROMPT = (
    "You are TradeInsight AI, a professional, sharp, and helpful financial and trading assistant. "
    "You work for the TradeInsight platform — a stock, crypto, and market analysis tool.\n\n"
    "Rules:\n"
    "1. Be concise — this is a voice conversation. Keep responses under 3 sentences where possible.\n"
    "2. Before executing ANY trade, ALWAYS ask for explicit confirmation. "
    "State the ticker, action (buy/sell), and quantity back to the user before proceeding.\n"
    "3. If a user asks about an invalid ticker, politely tell them it's not found and suggest checking the symbol.\n"
    "4. When showing prices, mention both the price and the 24h change direction.\n"
    "5. Never give financial advice — present data neutrally.\n"
    "6. Use available functions to fetch real-time data when asked about prices, portfolios, or trades.\n"
    "7. For Indian stocks (e.g. RELIANCE, TCS, HDFCBANK), note that prices are in INR.\n"
    "8. If the user asks to 'buy' or 'sell', call the execute_mock_trade function only after confirmation."
)


FUNCTIONS_SCHEMA = [
    {
        "name": "get_stock_or_crypto_price",
        "description": "Get the current mock price, 24-hour change percentage, and volume for a given stock or crypto ticker symbol (e.g., AAPL, TSLA, BTC, RELIANCE).",
        "parameters": {
            "type": "object",
            "properties": {
                "ticker": {
                    "type": "string",
                    "description": "The stock or cryptocurrency ticker symbol (e.g., AAPL, TSLA, BTC, ETH, RELIANCE).",
                }
            },
            "required": ["ticker"],
        },
    },
    {
        "name": "check_user_portfolio",
        "description": "Check the portfolio holdings, total portfolio value, and available cash balance for a given user.",
        "parameters": {
            "type": "object",
            "properties": {
                "user_name": {
                    "type": "string",
                    "description": "The registered user name to look up (e.g., demo_user, shubair).",
                }
            },
            "required": ["user_name"],
        },
    },
    {
        "name": "execute_mock_trade",
        "description": "Execute a mock buy or sell order for a stock/crypto ticker. Updates the user's portfolio in real-time. Always ask for user confirmation before calling this.",
        "parameters": {
            "type": "object",
            "properties": {
                "user_name": {
                    "type": "string",
                    "description": "The registered user name placing the trade.",
                },
                "ticker": {
                    "type": "string",
                    "description": "The stock or crypto ticker symbol to trade.",
                },
                "action": {
                    "type": "string",
                    "enum": ["buy", "sell"],
                    "description": "Whether to buy or sell the shares.",
                },
                "quantity": {
                    "type": "integer",
                    "description": "The number of shares/units to buy or sell. Must be a positive integer.",
                },
            },
            "required": ["user_name", "ticker", "action", "quantity"],
        },
    },
]


def build_settings_config() -> dict:
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
                    "model": "gpt-4o-mini",
                    "temperature": 0.7,
                },
                "prompt": SYSTEM_PROMPT,
                "functions": FUNCTIONS_SCHEMA,
            },
            "speak": {
                "provider": {
                    "type": "deepgram",
                    "model": "aura-asteria-en",
                },
            },
            "greeting": (
                "Hello! I am your TradeInsight AI Assistant. "
                "I can help you check live market prices as per the sectors you want to explore "
                "or execute mock trades. How can I assist your trading today?"
            ),
        },
    }
