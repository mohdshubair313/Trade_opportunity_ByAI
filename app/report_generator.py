import logging
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)


class ReportGenerator:
    """Generates and saves markdown reports."""
    
    def __init__(self, output_dir: str = "reports"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
    
    def save_report(self, sector: str, content: str) -> str:
        """
        Save report to markdown file.
        
        Args:
            sector: The sector name
            content: The report content in markdown
            
        Returns:
            Path to the saved file
        """
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{sector.lower().replace(' ', '_')}_{timestamp}.md"
            filepath = self.output_dir / filename
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            
            logger.info(f"Report saved to: {filepath}")
            return str(filepath)
            
        except Exception as e:
            logger.error(f"Error saving report: {str(e)}")
            raise Exception(f"Failed to save report: {str(e)}")
    
    def add_metadata(self, content: str, sector: str, sources_count: int) -> str:
        """
        Add metadata header to the report.
        
        Args:
            content: Original report content
            sector: Sector name
            sources_count: Number of sources analyzed
            
        Returns:
            Report with metadata header
        """
        metadata = f"""---
title: Trade Opportunities Analysis - {sector.title()}
date: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
sector: {sector}
sources_analyzed: {sources_count}
generated_by: Trade Opportunities API
---

"""
        return metadata + content
