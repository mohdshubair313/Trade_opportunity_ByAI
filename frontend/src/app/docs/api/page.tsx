import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, Key, Send, FileJson, BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "API Documentation",
  description:
    "TradeInsight AI API Documentation — authentication, endpoints, example requests, and integration guides for programmatic access to AI-powered sector analysis.",
  alternates: {
    canonical: "https://tradeinsight.shubair.in/docs/api",
  },
};

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0c0c16] overflow-hidden">
      {title && (
        <div className="px-4 py-2 border-b border-white/10 text-xs font-mono text-white/50">
          {title}
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm font-mono text-white/80 leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function Endpoint({
  method,
  path,
  description,
  auth,
}: {
  method: string;
  path: string;
  description: string;
  auth?: boolean;
}) {
  const methodColor =
    method === "GET"
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
      : method === "POST"
      ? "bg-violet-500/20 text-violet-300 border-violet-400/30"
      : method === "DELETE"
      ? "bg-rose-500/20 text-rose-300 border-rose-400/30"
      : "bg-amber-500/20 text-amber-300 border-amber-400/30";

  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/[0.06] last:border-0">
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase border ${methodColor} shrink-0 mt-0.5`}
      >
        {method}
      </span>
      <div className="flex-1 min-w-0">
        <code className="text-sm font-mono text-white/90 break-all">{path}</code>
        <p className="text-xs text-white/50 mt-1">{description}</p>
      </div>
      {auth && (
        <span className="text-[10px] font-mono text-amber-300/60 shrink-0 mt-1">
          🔒 Auth
        </span>
      )}
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/[0.08] bg-[#07070d]/90 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg text-white">
              Trade<span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">Insight</span>
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm text-white/60">
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-6 w-6 text-violet-400" />
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300/70">
            Developer Docs
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          API Documentation
        </h1>
        <p className="text-lg text-white/60 leading-relaxed mb-4 max-w-2xl">
          Integrate TradeInsight AI programmatically. Analyse sectors, export reports, and
          build on top of our agentic market intelligence engine.
        </p>
        <div className="flex flex-wrap gap-3 mb-12">
          <a
            href="/openapi.json"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/70 hover:text-white hover:border-violet-400/30 transition-all"
          >
            <FileJson className="h-4 w-4" />
            OpenAPI Spec
          </a>
          <a
            href="/llms.txt"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/70 hover:text-white hover:border-violet-400/30 transition-all"
          >
            📄 llms.txt
          </a>
        </div>

        {/* Base URL */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <Send className="h-5 w-5 text-fuchsia-400" />
            Base URL
          </h2>
          <CodeBlock>https://tradeinsight.shubair.in</CodeBlock>
          <p className="text-sm text-white/50 mt-3">
            All API endpoints are relative to this base URL. Responses are JSON unless otherwise noted.
          </p>
        </section>

        {/* Authentication */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <Key className="h-5 w-5 text-amber-400" />
            Authentication
          </h2>
          <p className="text-white/70 leading-relaxed mb-4">
            TradeInsight AI uses JWT (JSON Web Token) bearer authentication. Obtain a token
            pair by registering or logging in, then include the access token in the
            <code className="text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded text-sm mx-1">
              Authorization
            </code>
            header of subsequent requests.
          </p>

          <h3 className="text-lg font-semibold mb-3 text-white/90">1. Register</h3>
          <CodeBlock title="POST /api/v1/auth/register">{`{
  "username": "your_username",
  "email": "you@example.com",
  "password": "SecurePass123",
  "full_name": "Your Name"
}`}</CodeBlock>

          <h3 className="text-lg font-semibold mt-6 mb-3 text-white/90">2. Login</h3>
          <CodeBlock title="POST /api/v1/auth/login">{`{
  "username": "your_username",
  "password": "SecurePass123"
}

// Response:
{
  "access_token": "eyJhbG...",
  "refresh_token": "eyJhbG...",
  "token_type": "bearer"
}`}</CodeBlock>

          <h3 className="text-lg font-semibold mt-6 mb-3 text-white/90">3. Use the Token</h3>
          <CodeBlock title="Authenticated Request">{`curl -X GET "https://tradeinsight.shubair.in/api/v1/analyze/pharmaceuticals" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"`}</CodeBlock>
        </section>

        {/* Endpoints */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Endpoints</h2>

          <h3 className="text-lg font-semibold mb-3 text-white/90 border-b border-white/10 pb-2">
            Public (No Auth Required)
          </h3>
          <div className="mb-6">
            <Endpoint method="GET" path="/" description="API root — service info and endpoint listing" />
            <Endpoint method="GET" path="/health" description="Health check with system status" />
            <Endpoint method="GET" path="/openapi.json" description="Full OpenAPI specification (machine-readable)" />
            <Endpoint method="GET" path="/api/v1/sectors" description="List all 20+ sectors available for analysis" />
          </div>

          <h3 className="text-lg font-semibold mb-3 text-white/90 border-b border-white/10 pb-2">
            Authentication
          </h3>
          <div className="mb-6">
            <Endpoint method="POST" path="/api/v1/auth/send-otp" description="Send a 6-digit OTP code to an email address" />
            <Endpoint method="POST" path="/api/v1/auth/verify-otp" description="Verify an email OTP code" />
            <Endpoint method="POST" path="/api/v1/auth/register" description="Register a new user account" />
            <Endpoint method="POST" path="/api/v1/auth/login" description="Login and receive access + refresh tokens" />
            <Endpoint method="POST" path="/api/v1/auth/refresh" description="Refresh an expired access token" auth />
            <Endpoint method="POST" path="/api/v1/auth/logout" description="Invalidate the current refresh token" auth />
          </div>

          <h3 className="text-lg font-semibold mb-3 text-white/90 border-b border-white/10 pb-2">
            Sector Analysis
          </h3>
          <div className="mb-6">
            <Endpoint method="GET" path="/api/v1/analyze/{sector}" description="Analyse a sector — returns a cited AI report with opportunities, risks, and recommendations" auth />
            <Endpoint method="POST" path="/api/v1/analyze/compare" description="Compare two sectors side-by-side" auth />
            <Endpoint method="GET" path="/api/v1/history" description="List past analyses for the current user" auth />
            <Endpoint method="GET" path="/api/v1/history/{id}" description="Retrieve a specific past analysis" auth />
            <Endpoint method="DELETE" path="/api/v1/history/{id}" description="Delete a specific analysis from history" auth />
            <Endpoint method="GET" path="/api/v1/history/{id}/export" description="Export an analysis as PDF, PPTX, XLSX, or Markdown" auth />
          </div>

          <h3 className="text-lg font-semibold mb-3 text-white/90 border-b border-white/10 pb-2">
            AI & Voice
          </h3>
          <div className="mb-6">
            <Endpoint method="POST" path="/api/v1/ai/vision/analyze" description="Analyse an uploaded image using AI vision" auth />
            <Endpoint method="POST" path="/api/v1/ai/tts" description="Convert text to speech" auth />
            <Endpoint method="POST" path="/api/v1/ai/stt" description="Convert speech to text" auth />
            <Endpoint method="POST" path="/api/v1/voice/query" description="Voice-based market query (text in, speech out)" auth />
            <Endpoint method="POST" path="/api/v1/voice/agent" description="Full voice agent interaction" auth />
            <Endpoint method="GET" path="/api/v1/voice/voices" description="List available TTS voices" />
          </div>

          <h3 className="text-lg font-semibold mb-3 text-white/90 border-b border-white/10 pb-2">
            User & Preferences
          </h3>
          <div className="mb-6">
            <Endpoint method="GET" path="/api/v1/users/me" description="Get current user profile" auth />
            <Endpoint method="PUT" path="/api/v1/users/me" description="Update user profile" auth />
            <Endpoint method="GET" path="/api/v1/users/me/stats" description="Get user usage statistics" auth />
            <Endpoint method="GET" path="/api/v1/favorites" description="List favourite sectors" auth />
            <Endpoint method="POST" path="/api/v1/favorites" description="Add a sector to favourites" auth />
            <Endpoint method="DELETE" path="/api/v1/favorites/{sector}" description="Remove a sector from favourites" auth />
          </div>
        </section>

        {/* Example */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Example: Analyse a Sector</h2>
          <CodeBlock title="Request">{`curl -X GET "https://tradeinsight.shubair.in/api/v1/analyze/pharmaceuticals?use_cache=true" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "Accept: application/json"`}</CodeBlock>

          <div className="mt-4">
            <CodeBlock title="Response (abbreviated)">{`{
  "sector": "Pharmaceuticals",
  "analysis": "## Executive Summary\\n\\nThe Indian pharmaceutical sector...",
  "key_opportunities": [
    "CDMOs benefiting from US supply-chain reshoring",
    "Q1 order books up 18% YoY"
  ],
  "key_risks": [
    "USD weakness offsetting margin expansion for exporters"
  ],
  "sources": [
    {"title": "...", "url": "...", "reliability": "high"}
  ],
  "generated_at": "2026-08-24T14:00:00Z",
  "latency_ms": 12400
}`}</CodeBlock>
          </div>
        </section>

        {/* Rate Limits */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Rate Limits</h2>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 font-semibold text-white/80">Tier</th>
                  <th className="text-left px-4 py-3 font-semibold text-white/80">Per Minute</th>
                  <th className="text-left px-4 py-3 font-semibold text-white/80">Per Hour</th>
                </tr>
              </thead>
              <tbody className="text-white/60">
                <tr className="border-b border-white/[0.06]">
                  <td className="px-4 py-3">Free</td>
                  <td className="px-4 py-3">10</td>
                  <td className="px-4 py-3">100</td>
                </tr>
                <tr className="border-b border-white/[0.06]">
                  <td className="px-4 py-3">Pro</td>
                  <td className="px-4 py-3">30</td>
                  <td className="px-4 py-3">500</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Enterprise</td>
                  <td className="px-4 py-3" colSpan={2}>Custom — contact sales</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-white/50 mt-3">
            Rate limit exceeded responses return HTTP 429 with a JSON body including a{" "}
            <code className="text-violet-300 bg-violet-500/10 px-1 rounded">Retry-After</code>{" "}
            header.
          </p>
        </section>

        {/* Error Responses */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Error Responses</h2>
          <p className="text-white/70 leading-relaxed mb-4">
            All errors return structured JSON with consistent fields:
          </p>
          <CodeBlock title="Error Response Format">{`{
  "error": "Human-readable error description",
  "message": "Detailed message for debugging",
  "code": "ERROR_CODE"
}`}</CodeBlock>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 font-semibold text-white/80">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-white/80">Code</th>
                  <th className="text-left px-4 py-3 font-semibold text-white/80">Description</th>
                </tr>
              </thead>
              <tbody className="text-white/60">
                <tr className="border-b border-white/[0.06]">
                  <td className="px-4 py-3">400</td>
                  <td className="px-4 py-3 font-mono text-xs">HTTP_400</td>
                  <td className="px-4 py-3">Bad request — invalid parameters</td>
                </tr>
                <tr className="border-b border-white/[0.06]">
                  <td className="px-4 py-3">401</td>
                  <td className="px-4 py-3 font-mono text-xs">HTTP_401</td>
                  <td className="px-4 py-3">Unauthorized — missing or invalid token</td>
                </tr>
                <tr className="border-b border-white/[0.06]">
                  <td className="px-4 py-3">404</td>
                  <td className="px-4 py-3 font-mono text-xs">HTTP_404</td>
                  <td className="px-4 py-3">Resource not found</td>
                </tr>
                <tr className="border-b border-white/[0.06]">
                  <td className="px-4 py-3">429</td>
                  <td className="px-4 py-3 font-mono text-xs">RATE_LIMITED</td>
                  <td className="px-4 py-3">Rate limit exceeded — retry after Retry-After header</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">500</td>
                  <td className="px-4 py-3 font-mono text-xs">INTERNAL_ERROR</td>
                  <td className="px-4 py-3">Internal server error</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] mt-16 py-8 text-center text-sm text-white/40">
        <p>© {new Date().getFullYear()} TradeInsight AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
