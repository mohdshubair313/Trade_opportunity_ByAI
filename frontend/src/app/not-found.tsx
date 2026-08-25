import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
  description:
    "The page you requested does not exist on TradeInsight AI. Use the links below to navigate to the homepage, dashboard, API docs, or sitemap.",
  robots: { index: false, follow: true },
};

/**
 * Custom 404 page — Next.js automatically returns HTTP 404 for this file.
 *
 * Audit item 2: Agents need a markdown-style body with recovery links
 * so they can navigate programmatically after hitting a dead end.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="max-w-lg w-full text-center">
        {/* Status badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-400/25 bg-rose-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-rose-300 mb-8">
          404 · Not Found
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          Page not found
        </h1>
        <p className="text-white/60 text-base leading-relaxed mb-10">
          The URL you requested doesn&apos;t exist on TradeInsight AI.
          Use the links below to find what you&apos;re looking for.
        </p>

        {/* Recovery links — agents parse these to navigate */}
        <nav aria-label="Recovery navigation" className="mb-10">
          <ul className="space-y-3 text-left max-w-xs mx-auto">
            {[
              { href: "/", label: "Homepage", desc: "TradeInsight AI landing page" },
              { href: "/dashboard", label: "Dashboard", desc: "Start analyzing sectors" },
              { href: "/docs/api", label: "API Documentation", desc: "Endpoints, auth, examples" },
              { href: "/openapi.json", label: "OpenAPI JSON Spec", desc: "Machine-readable API schema" },
              { href: "/openapi.yaml", label: "OpenAPI YAML Spec", desc: "YAML format API specification" },
              { href: "/sitemap.xml", label: "Sitemap", desc: "All indexable pages" },
              { href: "/llms.txt", label: "llms.txt", desc: "Agent instructions & guidance" },
              { href: "/docs/deprecation-policy", label: "Deprecation Policy", desc: "API lifecycle and sunset timeline" },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 hover:border-violet-400/30 hover:bg-white/[0.06] transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-white group-hover:text-violet-300 transition-colors">
                      {link.label}
                    </span>
                    <span className="block text-xs text-white/50 mt-0.5">
                      {link.desc}
                    </span>
                  </div>
                  <span className="text-white/30 text-xs font-mono group-hover:text-violet-300/60 transition-colors">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-500 px-6 py-2.5 text-sm font-semibold text-white hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all"
        >
          ← Back to TradeInsight AI
        </Link>
      </div>
    </div>
  );
}
