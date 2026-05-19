You are an expert Python Developer and AI Engineer. I want to build a Real-time AI Voice Agent for my project "TradeInsight" (a stock/crypto trading and market analysis platform). 

I am following Tech With Tim's tutorial which uses Python (asyncio, websockets), Twilio (for phone call routing via TwiML streams), and the Deepgram Voice Agent API (Converse endpoint, Aura voice, Nova-3 provider). 
https://www.youtube.com/watch?v=hDKBREokidU&t=275s

However, I want to COMPLETELY REMOVE the pharmacy assistant code from that tutorial and replace it with a TradeInsight Voice Assistant.

Follow this docs of deepgram: https://developers.deepgram.com/docs/twilio-and-deepgram-voice-agent

Please write the complete, production-ready Python code step-by-step based on the following requirements:

### 1. CORE ARCHITECTURE & TECH STACK
- Language: Python 3.11+ using `asyncio` and `websockets`.
- Twilio Integration: Handle incoming TwiML stream via a local server (using ngrok for development) on port 5000. Decode inbound audio from base64.
- Deepgram Integration: Connect to `wss://agent.deepgram.com/v1/agent/converse` using a subprotocol token.
- Dual-Stream Brokerage: Manage asynchronous queues (`audio_Q`, `streams_id_q`) to route audio from Twilio to Deepgram, and bytes/audio from Deepgram back to Twilio.
- Barge-in/Interruption: Implement `user_started_speaking` detection to send a `clear` event to Twilio, instantly stopping the AI when the user interrupts.

### 2. TRADEINSIGHT FUNCTION CALLING (Replace Pharmacy Functions)
Delete all drug/order database logic. Implement an in-memory mock database and python functions for TradeInsight:
1. `get_stock_or_crypto_price(ticker: str)` -> Returns the current mock price, 24h change, and volume for a given ticker (e.g., AAPL, TSLA, BTC).
2. `check_user_portfolio(user_name: str)` -> Returns the user's holdings, total portfolio value, and available cash balance.
3. `execute_mock_trade(user_name: str, ticker: str, action: str, quantity: int)` -> Executes a buy/sell order, updates the portfolio, and returns a confirmation message with an Order ID and Status (e.g., Completed).

Create a `function_map` dictionary to map these string names to the actual Python executable functions.

### 3. CONFIGURATION (config.json structure)
Generate the Deepgram Voice Agent settings structure inside the code or as a JSON string. It must include:
- provider: "deepgram" (Nova-3 model)
- think: provider "openai" (gpt-4o-mini), containing the custom System Prompt and the `functions` array defining the 3 TradeInsight functions above with strict JSON schemas (name, description, parameters, required fields).
- speak: provider "deepgram" with an Aura voice model (e.g., "aura-asteria-en").
- greeting: "Hello! I am your TradeInsight AI Assistant. I can help you check live market prices, review your portfolio, or execute mock trades. How can I assist your trading today?"

### 4. SYSTEM PROMPT FOR THE LLM
The system prompt inside the config should instruct the AI to act as a professional, sharp, and helpful financial/trading assistant for TradeInsight. It must:
- Be concise (since it's a voice conversation).
- Ask for confirmation before executing any trade (confirm ticker, action, quantity).
- Politely guide the user if a ticker or action is invalid.

### STEP-BY-STEP DELIVERY EXPECTATION:
1. Provide the updated `config.json` settings structure with proper schemas for the 3 trading functions.
2. Provide the `trade_functions.py` logic containing the mock trading database and functions.
3. Provide the full `main.py` containing the websocket server, connection logic, asynchronous stream receivers/senders, barge-in logic, and the JSON function execution handler (`handle_function_call_request`).

Make the code clean, well-commented, and free of any pharmacy-related placeholders. Let's build it step-by-step!