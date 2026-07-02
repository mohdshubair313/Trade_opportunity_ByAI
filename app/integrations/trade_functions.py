import json
import logging
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class Portfolio:
    holdings: Dict[str, int] = field(default_factory=lambda: {
        "AAPL": 10, "TSLA": 5, "BTC": 0.5,
    })
    cash_balance: float = 10000.0
    total_portfolio_value: float = 0.0


_portfolios: Dict[str, Portfolio] = {
    "demo_user": Portfolio(),
    "shubair": Portfolio(holdings={"AAPL": 50, "GOOGL": 20, "ETH": 2.0}, cash_balance=50000.0),
}

_MOCK_PRICES: Dict[str, Dict[str, float]] = {
    "AAPL": {"price": 198.50, "change_24h": 1.2, "volume": 45200000},
    "TSLA": {"price": 245.80, "change_24h": -0.8, "volume": 38500000},
    "GOOGL": {"price": 175.20, "change_24h": 0.5, "volume": 22100000},
    "MSFT": {"price": 420.30, "change_24h": 1.8, "volume": 18900000},
    "AMZN": {"price": 185.90, "change_24h": -0.3, "volume": 31200000},
    "NVDA": {"price": 880.40, "change_24h": 3.2, "volume": 56700000},
    "META": {"price": 510.60, "change_24h": 1.5, "volume": 19800000},
    "BTC": {"price": 67850.00, "change_24h": 2.4, "volume": 28500000000},
    "ETH": {"price": 3520.00, "change_24h": 1.1, "volume": 15200000000},
    "SOL": {"price": 185.00, "change_24h": -2.1, "volume": 8900000000},
    "RELIANCE": {"price": 2950.00, "change_24h": 0.8, "volume": 8500000},
    "TCS": {"price": 3890.00, "change_24h": -0.5, "volume": 4200000},
    "HDFCBANK": {"price": 1680.00, "change_24h": 1.3, "volume": 9800000},
}


def get_stock_or_crypto_price(ticker: str) -> str:
    ticker = ticker.strip().upper()
    data = _MOCK_PRICES.get(ticker)
    if not data:
        return json.dumps({
            "status": "error",
            "message": f"Ticker '{ticker}' not found. Please check the symbol and try again.",
            "ticker": ticker,
        })
    direction = "up" if data["change_24h"] >= 0 else "down"
    return json.dumps({
        "status": "success",
        "ticker": ticker,
        "price": data["price"],
        "change_24h_percent": data["change_24h"],
        "change_direction": direction,
        "volume": data["volume"],
        "currency": "USD",
    })


def check_user_portfolio(user_name: str) -> str:
    user_name = user_name.strip().lower()
    portfolio = _portfolios.get(user_name)
    if not portfolio:
        return json.dumps({
            "status": "error",
            "message": f"User '{user_name}' not found. Please provide a valid registered user name.",
            "user_name": user_name,
        })
    total_holdings_value = 0.0
    holdings_list = []
    for ticker, qty in portfolio.holdings.items():
        price_data = _MOCK_PRICES.get(ticker, {"price": 0})
        value = price_data["price"] * qty
        total_holdings_value += value
        holdings_list.append({
            "ticker": ticker,
            "quantity": qty,
            "current_price": price_data["price"],
            "total_value": round(value, 2),
        })
    portfolio.total_portfolio_value = round(total_holdings_value + portfolio.cash_balance, 2)
    return json.dumps({
        "status": "success",
        "user_name": user_name,
        "holdings": holdings_list,
        "total_holdings_value": round(total_holdings_value, 2),
        "cash_balance": portfolio.cash_balance,
        "total_portfolio_value": portfolio.total_portfolio_value,
    })


def execute_mock_trade(user_name: str, ticker: str, action: str, quantity: int) -> str:
    user_name = user_name.strip().lower()
    ticker = ticker.strip().upper()
    action = action.strip().lower()
    portfolio = _portfolios.get(user_name)
    if not portfolio:
        return json.dumps({
            "status": "error",
            "message": f"User '{user_name}' not found.",
        })
    price_data = _MOCK_PRICES.get(ticker)
    if not price_data:
        return json.dumps({
            "status": "error",
            "message": f"Ticker '{ticker}' not found in our system.",
        })
    if action not in ("buy", "sell"):
        return json.dumps({
            "status": "error",
            "message": f"Invalid action '{action}'. Please specify 'buy' or 'sell'.",
        })
    if quantity <= 0 or not isinstance(quantity, int):
        return json.dumps({
            "status": "error",
            "message": "Quantity must be a positive integer.",
        })
    price = price_data["price"]
    total_cost = round(price * quantity, 2)
    if action == "buy":
        if total_cost > portfolio.cash_balance:
            return json.dumps({
                "status": "error",
                "message": f"Insufficient cash balance. You need ${total_cost:.2f} but have ${portfolio.cash_balance:.2f}.",
            })
        portfolio.cash_balance -= total_cost
        portfolio.holdings[ticker] = portfolio.holdings.get(ticker, 0) + quantity
    else:
        current_qty = portfolio.holdings.get(ticker, 0)
        if quantity > current_qty:
            return json.dumps({
                "status": "error",
                "message": f"Insufficient shares. You own {current_qty} {ticker} but tried to sell {quantity}.",
            })
        portfolio.cash_balance += total_cost
        if current_qty == quantity:
            del portfolio.holdings[ticker]
        else:
            portfolio.holdings[ticker] = current_qty - quantity
    order_id = str(uuid.uuid4())[:8].upper()
    return json.dumps({
        "status": "completed",
        "order_id": order_id,
        "action": action,
        "ticker": ticker,
        "quantity": quantity,
        "price_per_unit": price,
        "total_value": total_cost,
        "remaining_cash": round(portfolio.cash_balance, 2),
        "message": f"Successfully {action}ed {quantity} shares of {ticker} at ${price:.2f} each. Order ID: {order_id}.",
    })


function_map = {
    "get_stock_or_crypto_price": get_stock_or_crypto_price,
    "check_user_portfolio": check_user_portfolio,
    "execute_mock_trade": execute_mock_trade,
}
