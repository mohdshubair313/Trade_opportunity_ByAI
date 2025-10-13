import logging
from typing import List, Dict
from ddgs import DDGS
import time

MAX_RETRIES = 3
RETRY_DELAY = 2

logger = logging.getLogger(__name__)


class DataCollector:
    """Collects market data from web sources."""
    
    def __init__(self):
        self.ddgs = DDGS()
    
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
            
            queries = [f"{sector} market news India"]
            
            all_results = []
            seen_urls = set()
            
            for query in queries:
                for attempt in range(MAX_RETRIES):
                    try:
                        results = self.ddgs.text(query, region='in-en', max_results=5)
                        logger.debug(f"Raw search results: {results}")
                        for result in results:
                            if result['href'] not in seen_urls:
                                all_results.append({
                                    'title': result.get('title', ''),
                                    'body': result.get('body', ''),
                                    'url': result.get('href', ''),
                                    'query': query
                                })
                                seen_urls.add(result['href'])
                                
                                if len(all_results) >= max_results:
                                    break
                    except Exception as e:
                        logger.warning(f"Error searching with query '{query}': {str(e)}")
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
