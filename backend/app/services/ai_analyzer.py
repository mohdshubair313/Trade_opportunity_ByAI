import logging
import os
from datetime import datetime

# ✅ CORRECT IMPORTS (New SDK)
from google import genai
from google.genai import types

# If you have a config module, uncomment this:
from app.core.config import get_settings
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
        
        # Model name — gemini-2.5-flash is the free-tier-friendly choice and
        # also the only one that accepts `google_search` grounding on free plans.
        # The gemini-3-*-preview families report limit=0 for free tier today.
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    def analyze_sector(self, sector: str, market_data: str, persona: dict | None = None) -> str:
        """
        Analyze sector data and generate trade opportunity insights.

        Args:
            sector: The sector name
            market_data: Collected market data as string
            persona: Optional dict describing the reader. Keys: persona, capital_range,
                     region, risk_appetite. When present, the prompt is reframed for
                     that persona (investor / exporter / sme_owner / student / consultant).

        Returns:
            Analysis report in markdown format
        """
        if self.mock_mode or "AI analysis failed" in market_data:
            # Signal the caller to fall back (OpenRouter offline path in main.py)
            # rather than silently returning mock text the user never asked for.
            raise RuntimeError("Gemini unavailable (mock_mode)")

        persona_context = self._persona_context(persona)

        try:
            prompt = f"""You are an expert market analyst specializing in Indian trade opportunities.

{persona_context}

Analyze the following market data for the {sector} sector in India and create a comprehensive trade opportunities report.

Market Data (numbered sources, cite them inline):
{market_data}

CITATION RULES — follow strictly:
- Each numbered entry above (e.g. "1.", "2.") is a source the reader can click.
- When you make a factual claim drawn from a source, add an inline citation using the source's number in square brackets, e.g. "PLI scheme boosts electronics exports [2]."
- You may cite multiple sources on one claim: "[1][3]". Do NOT invent numbers that aren't in the list.
- Do NOT add a 'References' / 'Sources' section yourself — the renderer adds it separately from the same numbered list.
- If a claim comes from general knowledge and not the sources above, omit the citation for that claim.

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

            # Build the config dict conditionally — ThinkingConfig only exists
            # on google-genai >= 0.8 and is only supported by gemini-3-*
            # models. On the stable gemini-2.5-flash (our default) we omit it.
            config_kwargs = {
                "max_output_tokens": 8192,
                "temperature": 0.7,
            }
            if self.model_name.startswith("gemini-3"):
                try:
                    config_kwargs["thinking_config"] = types.ThinkingConfig(thinking_level="minimal")
                except AttributeError:
                    pass  # Older SDK — skip thinking config gracefully.

            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(**config_kwargs),
                )
            except Exception as e:
                logger.error(f"Gemini API Error ({self.model_name}): {e}. Signalling fallback.")
                raise RuntimeError(f"Gemini analyze failed: {e}") from e

            logger.info(f"Successfully analyzed sector: {sector}")

            if response.text:
                return response.text
            logger.warning("Empty response from Gemini — signalling fallback")
            raise RuntimeError("Empty Gemini response")

        except RuntimeError:
            # Let the caller decide how to recover (route to OpenRouter, etc.).
            raise
        except Exception as e:
            logger.error(f"Unexpected error analyzing sector {sector}: {str(e)}")
            raise RuntimeError(f"Gemini analyze failed: {e}") from e

    _PERSONA_FRAMES = {
        "investor": (
            "Reader is a RETAIL INVESTOR. Emphasise listed company names, P/E vs peers, "
            "entry/exit zones, position sizing, catalysts and risks. Use plain English, no jargon. "
            "In Recommendations, give concrete watchlist tickers and stop-loss / target framing."
        ),
        "exporter": (
            "Reader is an MSME EXPORTER. Emphasise HS codes, target countries with growing demand, "
            "tariff and FTA context, port logistics, FX exposure, and government incentives (RoDTEP, PLI). "
            "In Recommendations, name specific country-product corridors to pursue first."
        ),
        "sme_owner": (
            "Reader is an SME OWNER evaluating a new line of business. Emphasise capital required, "
            "break-even timeline, local demand signals, supplier/vendor ecosystem, and required licenses. "
            "In Recommendations, give a 0-6-12 month launch checklist."
        ),
        "student": (
            "Reader is a B-SCHOOL / UPSC / CFA STUDENT writing a sector case study. Emphasise "
            "market sizing methodology, Porter's five forces, policy citations, and historical inflection points. "
            "Prefer academic tone. Cite sources liberally; prioritise rigor over action items."
        ),
        "consultant": (
            "Reader is an INDEPENDENT CONSULTANT preparing a client deck. Emphasise "
            "executive-summary framing, 2x2 matrices, opportunity sizing with assumptions, "
            "and a slide-ready structure. In Recommendations, format as three strategic pillars."
        ),
    }

    def _persona_context(self, persona: dict | None) -> str:
        """Return a short system-style framing block tailored to the reader persona."""
        if not persona:
            return "Reader is a general market observer. Write for a sophisticated but non-specialist audience."

        name = (persona.get("persona") or "").lower()
        frame = self._PERSONA_FRAMES.get(name) or "Reader is a general market observer."

        details = []
        if persona.get("capital_range"):
            details.append(f"capital range: {persona['capital_range']}")
        if persona.get("region"):
            details.append(f"region: {persona['region']}")
        if persona.get("risk_appetite"):
            details.append(f"risk appetite: {persona['risk_appetite']}")

        if details:
            return f"READER CONTEXT:\n{frame}\nAdditional signal — {'; '.join(details)}."
        return f"READER CONTEXT:\n{frame}"

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