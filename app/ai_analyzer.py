import logging
import os
from datetime import datetime

# ✅ CORRECT IMPORTS (New SDK)
from google import genai
from google.genai import types

# If you have a config module, uncomment this:
from app.config import get_settings
settings = get_settings()

logger = logging.getLogger(__name__)


class AIAnalyzer:
    """Analyzes market data using Google Gemini AI."""

    def __init__(self):
        """Initialize the AI analyzer with API key."""
        # Get API key from environment variable
        api_key = settings.gemini_api_key or os.getenv("GEMINI_API_KEY")
        
        if not api_key:
            logger.warning("GEMINI_API_KEY not found. AI analysis will fail.")
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        # ✅ Initialize client with new SDK
        self.mock_mode = False
        try:
            self.client = genai.Client(api_key=api_key)
        except Exception as e:
            logger.warning(f"Failed to initialize Gemini client: {e}. Switching to MOCK MODE.")
            self.mock_mode = True
        
        # Model name - using Gemini 3 Flash Preview
        self.model_name = "gemini-3-flash-preview"

    def analyze_sector(self, sector: str, market_data: str) -> str:
        """
        Analyze sector data and generate trade opportunity insights.

        Args:
            sector: The sector name
            market_data: Collected market data as string

        Returns:
            Analysis report in markdown format
        """
        if self.mock_mode or "AI analysis failed" in market_data: # Fallback if data collection failed too
            return self._generate_mock_report(sector)

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

            # ✅ UPDATED API CALL for Gemini 3
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        thinking_config=types.ThinkingConfig(
                            thinking_level="minimal"
                        ),
                        max_output_tokens=8192,
                        temperature=0.7,
                    )
                )
            except Exception as e:
                logger.error(f"Gemini API Error: {e}. Falling back to mock report.")
                return self._generate_mock_report(sector)

            logger.info(f"Successfully analyzed sector: {sector}")

            # Handle response
            if response.text:
                return response.text
            else:
                logger.warning("Empty response from Gemini")
                return self._generate_mock_report(sector)

        except Exception as e:
            logger.error(f"Error analyzing sector {sector}: {str(e)}")
            return self._generate_mock_report(sector)

    def _generate_mock_report(self, sector: str) -> str:
        """Generate a realistic mock report for demo purposes."""
        logger.info(f"Generating MOCK report for {sector}")
        return f"""# {sector} Sector - Trade Opportunities Analysis (Demo Mode)

## Executive Summary
The {sector} sector in India is currently witnessing a robust growth phase, driven by increasing domestic demand and favorable government policies. Key opportunities lie in technological integration and export diversification, positioning India as a global hub.

## Market Overview
- **Market Size**: Estimated at $150 Billion (2024), growing at 12% CAGR.
- **Key Trends**: Rapid digitalization, sustainability focus, and supply chain resilience.
- **Major Players**: Tata Group, Reliance Industries, Adani Enterprises, and emerging startups.

## Trade Opportunities
### Export Opportunities
- **High Potential**: Specialized components, IT services, and processed goods.
- **Target Markets**: USA, UAE, Germany, and Southeast Asia.
- **Volume**: Expected to reach $40 Billion by 2026.

### Import Opportunities
- **Needs**: High-tech machinery, raw materials unavailable continuously locally.
- **Sources**: China, South Korea, Japan.
- **Gap**: Quality control equipment and specialized R&D tools.

### Domestic Trade Opportunities
- **B2B**: Supply chain optimization services and component manufacturing.
- **B2C**: Direct-to-consumer digital platforms and customized solutions.
- **Regional**: high growth in Tier-2 and Tier-3 cities.

## Market Drivers
- **Growth Factors**: Rising middle-class income and urbanization.
- **Policies**: PLI (Production Linked Incentive) schemes and ease of doing business reforms.
- **Innovation**: Adoption of AI, IoT, and green technologies.

## Challenges and Risks
- **Barriers**: High initial capital requirement and complex regulatory compliance.
- **Risks**: Global supply chain disruptions and raw material price volatility.
- **Competition**: Intense competition from established global players.

## Recommendations
- **Short-term (0-6 months)**: Focus on market research and partner identification.
- **Medium-term (6-12 months)**: Establish local presence and leverage PLI schemes.
- **Long-term (1-3 years)**: Invest in R&D and expand export footprint.

## Key Contacts and Resources
- Confederation of Indian Industry (CII)
- Ministry of Commerce & Industry
- {sector} Export Promotion Council

---
*Report generated on {datetime.now().strftime('%B %d, %Y')} (Mock Data)*"""


# # ============================================
# # EXAMPLE USAGE
# # ============================================
# if __name__ == "__main__":
#     # Set up logging
#     logging.basicConfig(level=logging.INFO)
    
#     # Make sure to set GEMINI_API_KEY environment variable
#     # export GEMINI_API_KEY="your-api-key-here"
    
#     try:
#         analyzer = AIAnalyzer()
        
#         # Test with sample data
#         sample_sector = "Technology"
#         sample_data = """
#         - Indian IT sector revenue: $245 billion (2024)
#         - Growth rate: 8.4% YoY
#         - Major companies: TCS, Infosys, Wipro
#         - Emerging trends: AI/ML, Cloud Computing, Cybersecurity
#         - Government initiatives: Digital India, Make in India
#         """
        
#         result = analyzer.analyze_sector(sample_sector, sample_data)
#         print("Analysis completed successfully!")
        
#     except Exception as e:
#         print(f"Error: {e}")