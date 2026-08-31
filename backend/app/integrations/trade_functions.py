import json
import logging
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class Portfolio:
    holdings: Dict[str, int] = field(default_factory=lambda: {
        "RELIANCE": 15, "TCS": 10, "HDFCBANK": 25, "BTC": 0.25,
    })
    cash_balance: float = 125000.0
    total_portfolio_value: float = 0.0


_portfolios: Dict[str, Portfolio] = {
    "demo_user": Portfolio(),
    "shubair": Portfolio(
        holdings={"RELIANCE": 50, "TCS": 25, "INFY": 40, "BTC": 0.5, "ETH": 2.0},
        cash_balance=350000.0
    ),
}

_MOCK_PRICES: Dict[str, Dict[str, Any]] = {
    "AAPL": {"price": 198.50, "change_24h": 1.2, "volume": 45200000, "currency": "USD"},
    "TSLA": {"price": 245.80, "change_24h": -0.8, "volume": 38500000, "currency": "USD"},
    "GOOGL": {"price": 175.20, "change_24h": 0.5, "volume": 22100000, "currency": "USD"},
    "MSFT": {"price": 420.30, "change_24h": 1.8, "volume": 18900000, "currency": "USD"},
    "NVDA": {"price": 880.40, "change_24h": 3.2, "volume": 56700000, "currency": "USD"},
    "META": {"price": 510.60, "change_24h": 1.5, "volume": 19800000, "currency": "USD"},
    "BTC": {"price": 67850.00, "change_24h": 2.4, "volume": 28500000000, "currency": "USD"},
    "ETH": {"price": 3520.00, "change_24h": 1.1, "volume": 15200000000, "currency": "USD"},
    "SOL": {"price": 185.00, "change_24h": -2.1, "volume": 8900000000, "currency": "USD"},
    "RELIANCE": {"price": 2985.50, "change_24h": 1.4, "volume": 12500000, "currency": "INR"},
    "TCS": {"price": 3920.00, "change_24h": 0.6, "volume": 4800000, "currency": "INR"},
    "HDFCBANK": {"price": 1695.25, "change_24h": 1.1, "volume": 14200000, "currency": "INR"},
    "INFY": {"price": 1840.00, "change_24h": -0.3, "volume": 7600000, "currency": "INR"},
    "TATAMOTORS": {"price": 985.00, "change_24h": 2.8, "volume": 18500000, "currency": "INR"},
    "ICICIBANK": {"price": 1240.50, "change_24h": 0.9, "volume": 11300000, "currency": "INR"},
}

_MARKET_INDICES: Dict[str, Dict[str, Any]] = {
    "NIFTY 50": {"value": 24835.80, "change_pts": 142.50, "change_percent": 0.58, "trend": "Bullish"},
    "SENSEX": {"value": 81380.20, "change_pts": 415.80, "change_percent": 0.51, "trend": "Bullish"},
    "BANK NIFTY": {"value": 51240.00, "change_pts": 280.40, "change_percent": 0.55, "trend": "Bullish"},
    "INDIA VIX": {"value": 13.45, "change_pts": -0.42, "change_percent": -3.02, "trend": "Low Volatility"},
}

_SECTOR_TRENDS: Dict[str, Dict[str, Any]] = {
    "Renewable Energy": {
        "change_percent": 2.4,
        "sentiment": "Strongly Bullish",
        "top_gainer": "Adani Green (+4.1%)",
        "summary": "Government green hydrogen incentives driving heavy institutional inflow.",
    },
    "Banking": {
        "change_percent": 0.9,
        "sentiment": "Moderately Bullish",
        "top_gainer": "HDFC Bank (+1.3%)",
        "summary": "Robust credit growth and declining NPAs supporting private bank margins.",
    },
    "Information Technology": {
        "change_percent": 0.4,
        "sentiment": "Neutral",
        "top_gainer": "TCS (+0.6%)",
        "summary": "Steady deal pipeline despite cautious Q3 discretionary spending.",
    },
    "Automobile": {
        "change_percent": 1.8,
        "sentiment": "Bullish",
        "top_gainer": "Tata Motors (+2.8%)",
        "summary": "Festive season sales momentum and EV adoption exceeding expectations.",
    },
    "Pharma": {
        "change_percent": -0.2,
        "sentiment": "Neutral",
        "top_gainer": "Sun Pharma (+0.5%)",
        "summary": "US generic price stabilization offsetting domestic volume softness.",
    },
}


def get_stock_or_crypto_price(ticker: str) -> str:
    ticker = ticker.strip().upper()
    data = _MOCK_PRICES.get(ticker)
    if not data:
        return json.dumps({
            "status": "error",
            "message": f"Ticker '{ticker}' not found. Please verify the symbol and try again.",
            "ticker": ticker,
        })
    direction = "up" if data["change_24h"] >= 0 else "down"
    curr = data.get("currency", "INR" if ticker in ["RELIANCE", "TCS", "HDFCBANK", "INFY", "TATAMOTORS", "ICICIBANK"] else "USD")
    return json.dumps({
        "status": "success",
        "ticker": ticker,
        "price": data["price"],
        "currency": curr,
        "change_24h_percent": data["change_24h"],
        "change_direction": direction,
        "volume": data["volume"],
    })


def check_user_portfolio(user_name: str) -> str:
    user_name = user_name.strip().lower()
    portfolio = _portfolios.get(user_name)
    if not portfolio:
        return json.dumps({
            "status": "error",
            "message": f"User '{user_name}' not found. Please provide a valid registered username.",
            "user_name": user_name,
        })
    total_holdings_value = 0.0
    holdings_list = []
    for ticker, qty in portfolio.holdings.items():
        price_data = _MOCK_PRICES.get(ticker, {"price": 0, "currency": "INR"})
        value = price_data["price"] * qty
        total_holdings_value += value
        holdings_list.append({
            "ticker": ticker,
            "quantity": qty,
            "current_price": price_data["price"],
            "currency": price_data.get("currency", "INR"),
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
        "currency": "INR",
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
            "message": f"Ticker '{ticker}' not found in our trading universe.",
        })
    if action not in ("buy", "sell"):
        return json.dumps({
            "status": "error",
            "message": f"Invalid action '{action}'. Must be 'buy' or 'sell'.",
        })
    if quantity <= 0 or not isinstance(quantity, int):
        return json.dumps({
            "status": "error",
            "message": "Quantity must be a positive whole integer.",
        })

    price = price_data["price"]
    curr = price_data.get("currency", "INR")
    total_cost = round(price * quantity, 2)

    if action == "buy":
        if total_cost > portfolio.cash_balance:
            return json.dumps({
                "status": "error",
                "message": f"Insufficient funds. Required: {curr} {total_cost:.2f}, Available: {curr} {portfolio.cash_balance:.2f}.",
            })
        portfolio.cash_balance -= total_cost
        portfolio.holdings[ticker] = portfolio.holdings.get(ticker, 0) + quantity
    else:
        current_qty = portfolio.holdings.get(ticker, 0)
        if quantity > current_qty:
            return json.dumps({
                "status": "error",
                "message": f"Insufficient units. You own {current_qty} {ticker} but tried to sell {quantity}.",
            })
        portfolio.cash_balance += total_cost
        if current_qty == quantity:
            del portfolio.holdings[ticker]
        else:
            portfolio.holdings[ticker] = current_qty - quantity

    order_id = f"TI-{str(uuid.uuid4())[:8].upper()}"
    return json.dumps({
        "status": "completed",
        "order_id": order_id,
        "action": action.upper(),
        "ticker": ticker,
        "quantity": quantity,
        "price_per_unit": price,
        "currency": curr,
        "total_value": total_cost,
        "remaining_cash": round(portfolio.cash_balance, 2),
        "message": f"Successfully executed order {order_id}: {action.upper()} {quantity} {ticker} at {curr} {price:.2f}.",
    })


def get_market_indices() -> str:
    return json.dumps({
        "status": "success",
        "indices": _MARKET_INDICES,
    })


def get_sector_trends(sector: str = "all") -> str:
    sector_clean = sector.strip()
    if sector_clean.lower() == "all" or not sector_clean:
        return json.dumps({
            "status": "success",
            "sectors": _SECTOR_TRENDS,
        })
    for s_name, data in _SECTOR_TRENDS.items():
        if sector_clean.lower() in s_name.lower():
            return json.dumps({
                "status": "success",
                "sector": s_name,
                "data": data,
            })
    return json.dumps({
        "status": "success",
        "message": f"Sector '{sector}' not found in top 5 watchlist.",
        "available_sectors": list(_SECTOR_TRENDS.keys()),
    })


function_map = {
    "get_stock_or_crypto_price": get_stock_or_crypto_price,
    "check_user_portfolio": check_user_portfolio,
    "execute_mock_trade": execute_mock_trade,
    "get_market_indices": get_market_indices,
    "get_sector_trends": get_sector_trends,
}
