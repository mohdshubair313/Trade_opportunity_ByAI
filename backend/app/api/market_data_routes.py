"""Market data routes (§4.1) — live data, relative strength, correlations, news."""
from fastapi import APIRouter, Depends, Request, Query

from app.core.rate_limiter import limiter
from app.services.data_collector import DataCollector
from app.services.market_data import (
    get_sector_market_data,
    get_sector_relative_strength,
    get_sector_correlation_matrix,
)

data_collector = DataCollector()

router = APIRouter(tags=["Market Data"])


@router.get(
    "/api/v1/sectors/{sector}/market-data",
    operation_id="getSectorMarketData",
    summary="Get live market snapshot and historical trend for sector",
)
@limiter.limit("30/minute")
async def get_market_data(request: Request, sector: str):
    """Live sector index snapshot + 12-month trend for the /results charts."""
    return get_sector_market_data(sector)


@router.get(
    "/api/v1/sectors/{sector}/relative-strength",
    operation_id="getSectorRelativeStrength",
    summary="Get sector index relative strength vs Nifty 50",
)
@limiter.limit("30/minute")
async def get_relative_strength(request: Request, sector: str):
    """Sector index vs Nifty 50 over the last 6 months, normalised to 100."""
    return get_sector_relative_strength(sector)


@router.get(
    "/api/v1/sectors/correlations",
    operation_id="getSectorCorrelations",
    summary="Get pairwise correlation matrix across NSE sectors",
)
@limiter.limit("10/minute")
async def get_correlations(request: Request):
    """90-day pairwise correlation across all mapped NSE sector indices."""
    return get_sector_correlation_matrix()


@router.get(
    "/api/v1/sectors/{sector}/news",
    operation_id="getSectorNews",
    summary="Get recent news articles for sector with VADER sentiment scores",
)
@limiter.limit("30/minute")
async def get_sector_news(
    request: Request,
    sector: str,
    limit: int = Query(10, ge=1, le=25, description="Max articles to return"),
):
    """Recent news items scored with VADER sentiment."""
    items = data_collector.search_news_articles(sector, max_results=limit)
    return {"sector": sector, "count": len(items), "items": items}

