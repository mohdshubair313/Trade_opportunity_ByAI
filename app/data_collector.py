import logging
import warnings
from datetime import datetime
from typing import List, Dict

# duckduckgo_search 4.x leaks an async session on ratelimit and emits a
# RuntimeWarning that pollutes the logs on every throttled query. The leak
# itself is harmless (the coroutine is gc'd) but the warning is noisy and
# originates inside the library. Silence it before the library is imported so
# the filter is installed when the first warning fires.
warnings.filterwarnings(
    "ignore",
    message=r"coroutine 'AsyncSession\.close' was never awaited",
    category=RuntimeWarning,
)

from ddgs import DDGS  # noqa: E402 - import after warnings filter
import time

from app.sentiment import score_text, label_for

# DDG regularly 429s shared Docker egress IPs. Retrying doesn't help — it
# just burns clock. Keep one try per query so the analyze endpoint doesn't
# block for ~20s on every miss before falling through to the offline path.
MAX_RETRIES = 1
RETRY_DELAY = 0
# Short-circuit: once we've seen N ratelimit errors in this call, stop trying
# other queries altogether — they'll all hit the same limit.
_RATELIMIT_CIRCUIT_BREAKER = 2

logger = logging.getLogger(__name__)


class DataCollector:
    """Collects market data from web sources."""
    
    def __init__(self):
        pass
    
    def search_sector_news(self, sector: str, max_results: int = 10) -> List[Dict]:
        """
        Search for recent news and information about a sector.
        
        Args:
            sector: The sector name to search for
            max_results: Maximum number of results to return
            
        Returns:
            List of search results with title, body, and href
        """
        try:
            # Create comprehensive search queries with current year
            current_year = datetime.now().year
            queries = [
                f"{sector} sector trading opportunities India {current_year}",
                f"{sector} market news India outlook {current_year}",
                f"India {sector} export import trends"
            ]
            
            all_results = []
            seen_urls = set()
            ratelimit_hits = 0

            with DDGS() as ddgs:
                queries.append(f"{sector} India news")

                for query in queries:
                    if ratelimit_hits >= _RATELIMIT_CIRCUIT_BREAKER:
                        logger.warning(
                            "DDG ratelimit circuit breaker tripped after %d hits; "
                            "skipping remaining queries", ratelimit_hits,
                        )
                        break
                    for attempt in range(MAX_RETRIES):
                        try:
                            # Try with India region first
                            results = ddgs.text(query, region='in-en', max_results=5)
                            results = list(results) if results else []

                            # If no results with region, try global
                            if not results:
                                results = ddgs.text(query, max_results=5)
                                results = list(results) if results else []
                            
                            logger.debug(f"Raw search results count for '{query}': {len(results)}")
                            
                            for result in results:
                                href = result.get('href')
                                if href and href not in seen_urls:
                                    all_results.append({
                                        'title': result.get('title', ''),
                                        'body': result.get('body', ''),
                                        'url': href,
                                        'query': query
                                    })
                                    seen_urls.add(href)
                                    
                                    if len(all_results) >= max_results:
                                        break
                            
                            # Break retry loop if successful (even if 0 new results found, the query executed)
                            break
                        except Exception as e:
                            msg = str(e)
                            if "Ratelimit" in msg or "429" in msg:
                                ratelimit_hits += 1
                            logger.warning(f"Error searching with query '{query}': {msg[:140]}")
                            # Don't sleep — on ratelimited IPs a retry in 1s
                            # will hit the same 429. Fall through to the
                            # higher-level fallback (OpenRouter offline).
                            continue
                    
                    if len(all_results) >= max_results:
                        break
            
            # Fallback: DDGS text search is frequently throttled; try ddgs.news()
            # which is a separate endpoint and tends to be more reliable for
            # recent articles.
            if not all_results:
                try:
                    with DDGS() as ddgs:
                        news_query = f"{sector} India"
                        news_results = list(ddgs.news(news_query, region="in-en", max_results=max_results) or [])
                        for r in news_results:
                            url = r.get("url") or r.get("href")
                            if url and url not in seen_urls:
                                all_results.append({
                                    "title": r.get("title", ""),
                                    "body": r.get("body", "") or r.get("excerpt", ""),
                                    "url": url,
                                    "query": news_query,
                                })
                                seen_urls.add(url)
                                if len(all_results) >= max_results:
                                    break
                except Exception as exc:
                    logger.warning("DDG news fallback failed for %s: %s", sector, exc)

            logger.info(f"Collected {len(all_results)} results for sector: {sector}")
            return all_results[:max_results]

        except Exception as e:
            logger.error(f"Error collecting data for sector {sector}: {str(e)}")
            return []
    
    def search_news_articles(self, sector: str, max_results: int = 10) -> List[Dict]:
        """
        Fetch recent news items for a sector and score each with VADER sentiment.

        Uses DDGS.news() which returns a published date and source. Each item is
        shaped for the /sectors/{sector}/news endpoint.
        """
        items: List[Dict] = []
        seen = set()
        queries = [
            f"{sector} sector India",
            f"India {sector} market news",
        ]
        try:
            with DDGS() as ddgs:
                for query in queries:
                    try:
                        results = list(ddgs.news(query, region="in-en", max_results=max_results) or [])
                    except TimeoutError as exc:
                        # Timeouts on DDG news are common from shared Docker IPs.
                        # Log once and continue so the caller can fall through to
                        # the OpenRouter offline path instead of failing the pipeline.
                        logger.warning("ddgs.news timed out for '%s': %s", query, exc)
                        continue
                    except Exception as exc:
                        logger.warning("ddgs.news failed for '%s': %s", query, exc)
                        results = []

                    for r in results:
                        url = r.get("url") or r.get("href")
                        if not url or url in seen:
                            continue
                        seen.add(url)
                        title = r.get("title") or ""
                        body = r.get("body") or r.get("excerpt") or ""
                        compound = score_text(f"{title}. {body}")
                        items.append({
                            "title": title,
                            "body": body,
                            "url": url,
                            "source": r.get("source"),
                            "published_at": r.get("date"),
                            "sentiment_score": round(compound, 3),
                            "sentiment_label": label_for(compound),
                        })
                        if len(items) >= max_results:
                            return items
        except Exception as exc:
            logger.error("news collection failed for %s: %s", sector, exc)
        return items[:max_results]

    def format_search_results(self, results: List[Dict]) -> str:
        """
        Format search results into a readable string for AI analysis.
        
        Args:
            results: List of search results
            
        Returns:
            Formatted string of results
        """
        if not results:
            return "No data collected."
        
        formatted = "Market Research Data:\n\n"
        for idx, result in enumerate(results, 1):
            formatted += f"{idx}. {result['title']}\n"
            formatted += f"   {result['body']}\n"
            formatted += f"   Source: {result['url']}\n\n"
        
        return formatted
