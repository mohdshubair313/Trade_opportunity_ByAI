import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js edge middleware — intercepts requests before they hit page routes.
 *
 * Responsibilities:
 * 1. Markdown content negotiation (audit item 5):
 *    When an agent sends `Accept: text/markdown`, return a markdown version
 *    of the page content with proper headers instead of HTML.
 * 2. Vary header injection (audit item 5):
 *    Add `Vary: Accept` to all responses so CDNs don't serve cached HTML
 *    to an agent requesting markdown (or vice versa).
 */

/** Markdown version of the homepage — served when Accept: text/markdown is sent. */
const HOMEPAGE_MARKDOWN = `# TradeInsight AI — AI-Powered Market Intelligence

> AI-powered market intelligence platform for Indian equity sectors.

## What is TradeInsight AI?

TradeInsight AI is an agentic market intelligence platform that helps retail investors,
exporters, SME founders, and consultants discover trade opportunities in Indian markets.
Pick any of our 20+ NSE sectors and receive a comprehensive, cited sector report in under
fifteen seconds.

## How It Works

1. **Pick a sector** — Choose from 20+ NSE sectors (Pharmaceuticals, Technology, Renewable Energy, Fintech, Banking, and more)
2. **AI analyzes** — Our agentic AI reads filings, news, and market data in real time
3. **Get your report** — Receive a structured, cited report tailored to your persona and risk appetite

## Key Features

- **AI-Powered Sector Analysis**: Cascading AI models read filings, news, and tape
- **Cited Sources**: Every claim is backed by verifiable sources
- **Persona-Tuned Reports**: Tailored to retail investors, exporters, SME founders, consultants
- **Export Formats**: PDF, PPTX, XLSX, Markdown
- **Voice Agent**: Hands-free market briefings in Indian English
- **Watchlist Alerts**: Re-analyse sectors on your cadence
- **Privacy by Default**: JWT-scoped — your reports never surface to another account

## Covered Sectors

Pharmaceuticals, Technology, Renewable Energy, Fintech, Automotive, FMCG,
Metals & Mining, Healthcare, Real Estate, Infrastructure, Banking, Media,
Insurance, Telecom, Education, Agriculture, E-commerce, Manufacturing,
Textile, Food Processing, Chemicals.

## Pricing

- **Free**: No credit card required — 3 analyses per day
- **Pro**: Higher limits, priority AI, export to all formats
- **Enterprise**: Custom coverage, SSO, audit logs, dedicated support

## Links

- [Dashboard](https://tradeinsight.shubair.in/dashboard)
- [API Documentation](https://tradeinsight.shubair.in/docs/api)
- [OpenAPI Spec](https://tradeinsight.shubair.in/openapi.json)
- [Pricing](https://tradeinsight.shubair.in/pricing)
- [Contact](https://tradeinsight.shubair.in/contact)
- [About](https://tradeinsight.shubair.in/about)
- [Privacy Policy](https://tradeinsight.shubair.in/privacy)
- [llms.txt](https://tradeinsight.shubair.in/llms.txt)
- [Sitemap](https://tradeinsight.shubair.in/sitemap.xml)

## For Agents

See [llms.txt](https://tradeinsight.shubair.in/llms.txt) for integration guidance.
OpenAPI spec at [/openapi.json](https://tradeinsight.shubair.in/openapi.json).

---

© TradeInsight AI. Built with agentic AI.
`;

const MARKDOWN_PAGES: Record<string, string> = {
  "/": HOMEPAGE_MARKDOWN,
};

export function middleware(request: NextRequest) {
  const accept = request.headers.get("accept") || "";
  const pathname = request.nextUrl.pathname;

  // Markdown content negotiation — only for pages that have a markdown variant
  if (accept.includes("text/markdown") && pathname in MARKDOWN_PAGES) {
    return new NextResponse(MARKDOWN_PAGES[pathname], {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        Vary: "Accept, Accept-Encoding",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  }

  // For all other responses, add Vary header
  const response = NextResponse.next();
  response.headers.set("Vary", "Accept, Accept-Encoding");
  return response;
}

/**
 * Match all paths except static assets, _next internals, and API routes
 * (API routes handle their own Vary headers).
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon.png, apple-icon.png (browser icons)
     * - *.png, *.jpg, *.svg, *.webp (image files)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|apple-icon\\.png|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)$).*)",
  ],
};
