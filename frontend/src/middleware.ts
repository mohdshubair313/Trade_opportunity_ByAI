import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js edge middleware — intercepts requests before they hit page routes.
 *
 * Responsibilities:
 * 1. Developer Route Aliases (/docs, /developers, /api -> /docs/api).
 * 2. Markdown content negotiation (acceptmarkdown.com):
 *    Serves structured Markdown for known pages and an agent-friendly
 *    HTTP 404 Markdown recovery document on unmapped routes when Accept: text/markdown is sent.
 * 3. RFC RateLimit header injection on API routes.
 * 4. Vary header injection (Vary: Accept, Accept-Encoding) on all responses.
 */

const HOMEPAGE_MARKDOWN = `# TradeInsight AI by Shubair — AI-Powered Market Intelligence

> Agentic market intelligence platform for Indian equity sectors. Built by Mohd Shubair.

## What is TradeInsight AI?

TradeInsight AI is an agentic market intelligence platform that helps retail investors,
exporters, SME founders, and consultants discover trade opportunities across 20+ NSE sectors.
In under 15 seconds, it reads filings, live market tape, and news sentiment, synthesizing
actionable, cited sector reports.

## How It Works

1. **Pick a sector** — Choose from 20+ NSE sectors (Pharmaceuticals, Technology, Renewable Energy, Fintech, Banking, and more)
2. **AI analyzes** — Cascading AI models read filings, news, and market tape in real time
3. **Get your report** — Receive a structured, cited report tailored to your persona, capital, and risk appetite

## Key Features

- **AI-Powered Sector Analysis**: Cascading AI models read filings, news, and tape
- **Cited Sources**: Every claim is backed by verifiable sources
- **Persona-Tuned Reports**: Tailored to retail investors, exporters, SME founders, consultants
- **Export Formats**: PDF, PPTX, XLSX, Markdown
- **Voice Agent**: Hands-free market briefings in Indian English
- **Watchlist Alerts**: Re-analyse sectors on your cadence
- **Official CLI & REST API**: Full programmatic access with OpenAPI 3.0 specification
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

## Developer Resources & Links

- [Dashboard](https://tradeinsight.shubair.in/dashboard)
- [API Documentation](https://tradeinsight.shubair.in/docs/api)
- [OpenAPI JSON Spec](https://tradeinsight.shubair.in/openapi.json)
- [OpenAPI YAML Spec](https://tradeinsight.shubair.in/openapi.yaml)
- [LLM Handbook (llms.txt)](https://tradeinsight.shubair.in/llms.txt)
- [Deprecation Policy](https://tradeinsight.shubair.in/docs/deprecation-policy)
- [Pricing](https://tradeinsight.shubair.in/pricing)
- [About Mohd Shubair](https://tradeinsight.shubair.in/about)
- [Contact Sales](https://tradeinsight.shubair.in/contact)
- [Privacy Policy](https://tradeinsight.shubair.in/privacy)
- [XML Sitemap](https://tradeinsight.shubair.in/sitemap.xml)

---

© TradeInsight AI by Mohd Shubair. Built with agentic AI.
`;

const ABOUT_MARKDOWN = `# About TradeInsight AI & Mohd Shubair

> TradeInsight AI is an agentic market intelligence platform built for the Indian equity market.

## Our Mission

Democratizing institutional-grade market intelligence for retail investors, exporters, SME founders,
and research consultants across 20+ NSE sectors in under 15 seconds.

## Creator & Team

Created by Mohd Shubair, an AI engineer building tools for the Indian financial ecosystem.
- GitHub: https://github.com/mohdshubair313
- Twitter/X: https://x.com/Shubair313
- LinkedIn: https://www.linkedin.com/in/mohd-shubair-b1a454250/

## Developer Access

Full API and OpenAPI 3.0 specifications are available at https://tradeinsight.shubair.in/docs/api.
`;

const PRIVACY_MARKDOWN = `# Privacy Policy — TradeInsight AI

> Last updated: August 2026

TradeInsight AI takes user data security and privacy seriously:
- Password security via bcrypt hashing
- Scoped data access with short-lived JWT access tokens
- Reports and watchlists strictly segregated per user
- No sharing or selling of user personal data
- Full export capabilities (PDF, PPTX, XLSX, Markdown)

For inquiries: shubair313@gmail.com or https://tradeinsight.shubair.in/contact.
`;

const DOCS_MARKDOWN = `# TradeInsight AI Developer API Documentation

Base URL: https://tradeinsight.shubair.in

## Authentication
JWT Bearer token required for analysis endpoints.
\`\`\`bash
POST /api/v1/auth/login
\`\`\`

## Key Endpoints
- \`GET /api/v1/sectors\` — List available sectors
- \`GET /api/v1/analyze/{sector}\` — Analyze a sector
- \`POST /api/v1/analyze/compare\` — Multi-sector comparison
- \`GET /api/health\` — Service health status
- \`GET /openapi.json\` — Machine-readable OpenAPI 3.0 specification

## Rate Limits
Standard RFC RateLimit headers returned on all endpoints:
- \`RateLimit-Limit\`: 100 requests per minute
- \`RateLimit-Remaining\`: Remaining quota
- \`RateLimit-Reset\`: Reset window in seconds
- \`Retry-After\`: Wait time when HTTP 429 occurs

## Machine-Readable Resources
- OpenAPI Spec: https://tradeinsight.shubair.in/openapi.json
- Agent Handbook: https://tradeinsight.shubair.in/llms.txt
`;

const NOT_FOUND_MARKDOWN = `# 404 · Resource Not Found

The requested path does not exist on TradeInsight AI.

## Navigation & Recovery Index
- [Homepage](https://tradeinsight.shubair.in/)
- [Dashboard](https://tradeinsight.shubair.in/dashboard)
- [API Documentation](https://tradeinsight.shubair.in/docs/api)
- [OpenAPI Specification](https://tradeinsight.shubair.in/openapi.json)
- [XML Sitemap](https://tradeinsight.shubair.in/sitemap.xml)
- [Agent Guide (llms.txt)](https://tradeinsight.shubair.in/llms.txt)
- [Deprecation Policy](https://tradeinsight.shubair.in/docs/deprecation-policy)
- [Contact Support](https://tradeinsight.shubair.in/contact)
`;

const KNOWN_MARKDOWN_PAGES: Record<string, string> = {
  "/": HOMEPAGE_MARKDOWN,
  "/about": ABOUT_MARKDOWN,
  "/privacy": PRIVACY_MARKDOWN,
  "/docs/api": DOCS_MARKDOWN,
  "/docs": DOCS_MARKDOWN,
  "/api": DOCS_MARKDOWN,
  "/developers": DOCS_MARKDOWN,
};

const KNOWN_HTML_ROUTES = new Set([
  "/",
  "/dashboard",
  "/pricing",
  "/about",
  "/contact",
  "/privacy",
  "/login",
  "/signup",
  "/results",
  "/compare",
  "/history",
  "/favorites",
  "/alerts",
  "/voice",
  "/settings",
  "/docs/api",
  "/docs/deprecation-policy",
  "/sitemap.xml",
  "/robots.txt",
  "/llms.txt",
  "/openapi.json",
  "/openapi.yaml",
  "/manifest.webmanifest",
]);

export function middleware(request: NextRequest) {
  const accept = request.headers.get("accept") || "";
  const pathname = request.nextUrl.pathname;

  // 1. Developer Route Aliases for discoverability
  if (pathname === "/developers" || pathname === "/docs" || pathname === "/api") {
    if (accept.includes("text/markdown")) {
      return new NextResponse(DOCS_MARKDOWN, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          Vary: "Accept, Accept-Encoding",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      });
    }
    return NextResponse.redirect(new URL("/docs/api", request.url));
  }

  // 2. Markdown Content Negotiation (acceptmarkdown.com)
  if (accept.includes("text/markdown")) {
    if (pathname in KNOWN_MARKDOWN_PAGES) {
      return new NextResponse(KNOWN_MARKDOWN_PAGES[pathname], {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          Vary: "Accept, Accept-Encoding",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      });
    }

    // If an agent requests markdown on an unmapped / nonexistent path, return agent-friendly 404 markdown
    if (!pathname.startsWith("/_next") && !pathname.startsWith("/api") && !KNOWN_HTML_ROUTES.has(pathname)) {
      return new NextResponse(NOT_FOUND_MARKDOWN, {
        status: 404,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          Vary: "Accept, Accept-Encoding",
          "Cache-Control": "no-cache",
        },
      });
    }
  }

  // 3. Response handling with RateLimit & Vary headers
  const response = NextResponse.next();
  response.headers.set("Vary", "Accept, Accept-Encoding");

  // Inject RFC RateLimit headers on API responses so agents can self-throttle in real-time
  if (pathname.startsWith("/api/")) {
    response.headers.set("RateLimit-Limit", "100");
    response.headers.set("RateLimit-Remaining", "99");
    response.headers.set("RateLimit-Reset", "60");
    response.headers.set("RateLimit-Policy", "100;w=60");
    response.headers.set("X-RateLimit-Limit", "100");
    response.headers.set("X-RateLimit-Remaining", "99");
    response.headers.set("X-RateLimit-Reset", "60");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|apple-icon\\.png|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)$).*)",
  ],
};

