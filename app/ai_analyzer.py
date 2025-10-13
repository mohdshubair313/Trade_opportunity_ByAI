import logging
from google import genai
from google.genai import types
from app.config import get_settings
from datetime import datetime

logger = logging.getLogger(__name__)
settings = get_settings()

class AIAnalyzer:
    """Analyzes market data using Google Gemini AI."""

    def analyze_sector(self, sector: str, market_data: str) -> str:
        """
        Analyze sector data and generate trade opportunity insights.

        Args:
            sector: The sector name
            market_data: Collected market data as string

        Returns:
            Analysis report in markdown format
        """
        try:
            prompt = f"""You are an expert market analyst specializing in Indian trade opportunities. 

Analyze the following market data for the {sector} sector in India and create a comprehensive trade opportunities report.

Market Data:
{market_data}

Please provide a structured analysis in markdown format with the following sections:

# {sector.title()} Sector - Trade Opportunities Analysis

## Executive Summary
Provide a brief 2-3 sentence overview of the current market situation and key opportunities.

## Market Overview
- Current market size and growth rate
- Key trends and developments
- Major players and competition

## Trade Opportunities
### Export Opportunities
- Products/services with high export potential
- Target markets
- Estimated value/volume

### Import Opportunities
- Products/services needed in Indian market
- Source countries
- Market gap analysis

### Domestic Trade Opportunities
- B2B opportunities
- B2C opportunities
- Regional opportunities

## Market Drivers
- Key factors driving growth
- Government policies and incentives
- Technology and innovation trends

## Challenges and Risks
- Market entry barriers
- Regulatory challenges
- Competition and pricing pressures

## Recommendations
- Short-term action items (0-6 months)
- Medium-term strategies (6-12 months)
- Long-term vision (1-3 years)

## Key Contacts and Resources
- Industry associations
- Government bodies
- Useful websites and databases

---
*Report generated on {datetime.now().strftime('%B %d, %Y')}*

Be specific, data-driven, and actionable. Use bullet points for clarity. Include numerical data where available from the sources."""

            client = genai.Client()

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    thinking_config=types.ThinkingConfig(thinking_budget=0)  # Disable "thinking" feature
                )
            )

            logger.info(f"Successfully analyzed sector: {sector}")

            print(response.text)
            return response.text if response.text is not None else ""

        except Exception as e:
            logger.error(f"Error analyzing sector {sector}: {str(e)}")
            raise Exception(f"AI analysis failed: {str(e)}")
