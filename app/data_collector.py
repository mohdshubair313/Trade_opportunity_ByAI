import logging
from typing import List, Dict
from duckduckgo_search import DDGS
import time

MAX_RETRIES = 3
RETRY_DELAY = 2

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
            # Create comprehensive search queries
            queries = [
                f"{sector} sector trading opportunities India 2024",
                f"{sector} market news India outlook",
                f"India {sector} export import trends"
            ]
            
            all_results = []
            seen_urls = set()
            
            # Use context manager for DDGS
            with DDGS() as ddgs:
                # Add a generic fallback query
                queries.append(f"{sector} India news")
                
                for query in queries:
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
                            logger.warning(f"Error searching with query '{query}' (attempt {attempt+1}): {str(e)}")
                            time.sleep(1)
                            continue
                    
                    if len(all_results) >= max_results:
                        break
            
            logger.info(f"Collected {len(all_results)} results for sector: {sector}")
            return all_results[:max_results]
            
        except Exception as e:
            logger.error(f"Error collecting data for sector {sector}: {str(e)}")
            return []
    
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
