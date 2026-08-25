import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, Clock, AlertTriangle, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "API Versioning & Deprecation Policy",
  description:
    "TradeInsight AI API Versioning and Deprecation Policy — stability guarantees, sunset headers, deprecation timelines, and migration protocols for AI agents and developers.",
  alternates: {
    canonical: "https://tradeinsight.shubair.in/docs/deprecation-policy",
  },
};

export default function DeprecationPolicyPage() {
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
            <Link href="/docs/api" className="hover:text-white transition-colors">API Docs</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-3xl">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-violet-300/70 mb-3">
          <Clock className="h-4 w-4" />
          <span>Lifecycle &amp; Stability</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          API Versioning &amp; Deprecation Policy
        </h1>
        <p className="text-base text-white/60 mb-12">
          Effective: August 2026 · Version 2.0.0 · Governed by Mohd Shubair
        </p>

        <div className="space-y-10 text-white/80 leading-relaxed">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              1. Stability Guarantee for AI Agents &amp; Developers
            </h2>
            <p>
              TradeInsight AI commits to providing predictable, backward-compatible API surfaces.
              AI agents and automated algorithmic workflows rely on stable contracts. We never
              introduce breaking schema changes or remove endpoints on active API versions without
              following the formal deprecation timeline outlined below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Versioning Strategy</h2>
            <p className="mb-4">
              TradeInsight AI uses URL-based semantic path versioning:
            </p>
            <div className="rounded-xl border border-white/10 bg-[#0c0c16] p-4 font-mono text-sm text-violet-300 mb-4">
              https://tradeinsight.shubair.in/api/v1/...
            </div>
            <ul className="list-disc list-inside space-y-2 text-white/70">
              <li><strong>Non-breaking enhancements</strong> (adding new fields, optional parameters, new endpoints) are introduced directly into the current version (<code className="text-xs bg-white/10 px-1 py-0.5 rounded">v1</code>).</li>
              <li><strong>Breaking changes</strong> (removing fields, altering required parameters, changing response status codes) trigger a new major version (<code className="text-xs bg-white/10 px-1 py-0.5 rounded">v2</code>).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Deprecation Timeline &amp; Protocol</h2>
            <p className="mb-4">
              When an endpoint or schema is marked for deprecation:
            </p>
            <ol className="list-decimal list-inside space-y-3 text-white/70">
              <li><strong>Minimum 6 Months Notice:</strong> The endpoint remains fully operational for at least 180 calendar days from the formal deprecation announcement.</li>
              <li><strong>Machine-Readable HTTP Headers (RFC 8594):</strong> Responses from deprecated endpoints include standard RFC headers:
                <div className="mt-2 rounded-xl border border-white/10 bg-[#0c0c16] p-3 text-xs font-mono space-y-1 text-amber-300">
                  <div>Deprecation: @1771891200</div>
                  <div>Sunset: Wed, 24 Feb 2027 00:00:00 GMT</div>
                  <div>Link: &lt;https://tradeinsight.shubair.in/docs/deprecation-policy&gt;; rel=&quot;deprecation&quot;</div>
                </div>
              </li>
              <li><strong>OpenAPI Specification:</strong> The endpoint is marked with <code className="text-xs bg-white/10 px-1 py-0.5 rounded">&quot;deprecated&quot;: true</code> in <code className="text-xs bg-white/10 px-1 py-0.5 rounded">/openapi.json</code>.</li>
              <li><strong>Developer Notification:</strong> Documented in <code className="text-xs bg-white/10 px-1 py-0.5 rounded">llms.txt</code>, <code className="text-xs bg-white/10 px-1 py-0.5 rounded">/docs/api</code>, and sent via developer communications.</li>
            </ol>
          </section>

          <section className="rounded-2xl border border-amber-400/20 bg-amber-500/05 p-6">
            <h2 className="text-xl font-bold text-amber-200 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              4. Sunset &amp; Retirement
            </h2>
            <p className="text-white/70">
              After the Sunset date passes, retired endpoints will return HTTP 410 Gone or HTTP 404 with structured JSON
              error responses directing agents to the current replacement endpoint:
            </p>
            <div className="mt-3 rounded-xl border border-white/10 bg-[#0c0c16] p-4 text-xs font-mono text-white/70">
              {`{
  "error": "Endpoint Sunset",
  "message": "This API endpoint has been retired.",
  "code": "ENDPOINT_SUNSET",
  "hint": "Please migrate to the v2 equivalent documented at https://tradeinsight.shubair.in/docs/api."
}`}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Current Deprecated Endpoints</h2>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-sm font-mono text-white/90">POST /api/v1/auth/login-legacy</div>
              <div className="text-xs text-white/50 mt-1">
                Deprecated in favor of <code className="text-violet-300">POST /api/v1/auth/login</code>. Returns RFC Deprecation and Sunset headers.
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Questions &amp; Support</h2>
            <p className="text-white/70">
              For deprecation migration assistance, contact Mohd Shubair at{" "}
              <a href="mailto:shubair313@gmail.com" className="text-violet-300 hover:underline font-medium">
                shubair313@gmail.com
              </a>{" "}
              or open an issue on{" "}
              <a
                href="https://github.com/mohdshubair313"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-300 hover:underline font-medium"
              >
                GitHub
              </a>.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] mt-16 py-8 text-center text-sm text-white/40">
        <p>© {new Date().getFullYear()} TradeInsight AI by Mohd Shubair. All rights reserved.</p>
      </footer>
    </div>
  );
}
