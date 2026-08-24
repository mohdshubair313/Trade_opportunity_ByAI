import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Testimonials } from "@/components/landing/Testimonials";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { LiveVisitors } from "@/components/landing/LiveVisitors";
import { WebThreads } from "@/components/animations";

/**
 * Per-page metadata — adds canonical URL (fixes audit item 15).
 * og:type, og:image, and lang are already set in the root layout.
 */
export const metadata: Metadata = {
  alternates: {
    canonical: "https://tradeinsight.shubair.in",
  },
};

/**
 * JSON-LD structured data for AI and search engines (audit items 9 + 14).
 * SoftwareApplication identifies the product; Organization provides
 * contactPoint and address for business legitimacy verification.
 */
function JsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "TradeInsight AI",
        url: "https://tradeinsight.shubair.in",
        description:
          "AI-powered market intelligence platform for Indian equity sectors. Generates cited, persona-tuned sector reports covering 20+ NSE sectors in under 15 seconds.",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
          description: "Free tier available — no credit card required",
        },
        author: { "@id": "#organization" },
        screenshot: "https://tradeinsight.shubair.in/opengraph-image.png",
        featureList: [
          "AI-powered sector analysis for 20+ NSE sectors",
          "Cited sources on every claim",
          "Persona-tuned reports (retail investor, exporter, SME founder, consultant)",
          "Export to PDF, PPTX, XLSX, Markdown",
          "Voice agent for hands-free market briefings",
          "Watchlist alerts with configurable cadence",
          "JWT-scoped privacy — reports never surface to another account",
        ],
      },
      {
        "@type": "Organization",
        "@id": "#organization",
        name: "TradeInsight AI",
        url: "https://tradeinsight.shubair.in",
        logo: "https://tradeinsight.shubair.in/icon.png",
        description:
          "TradeInsight AI builds agentic market intelligence tools for the Indian equity market.",
        contactPoint: {
          "@type": "ContactPoint",
          email: "shubair313@gmail.com",
          contactType: "customer support",
          availableLanguage: ["English", "Hindi"],
        },
        address: {
          "@type": "PostalAddress",
          addressCountry: "IN",
        },
        sameAs: [
          "https://x.com/Shubair313",
          "https://github.com/mohdshubair313",
          "https://www.linkedin.com/in/mohd-shubair-b1a454250/",
        ],
      },
      {
        "@type": "WebSite",
        name: "TradeInsight AI",
        url: "https://tradeinsight.shubair.in",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default function HomePage() {
  return (
    <div className="relative w-full min-h-screen bg-black">
      {/* Structured data for agents and search engines */}
      <JsonLd />

      {/*
        Server-rendered semantic content — visible to AI crawlers without JS.
        Visually hidden (sr-only) so it doesn't compete with the animated hero,
        but fully present in raw HTML for agents that can't execute JavaScript.
      */}
      <div className="sr-only">
        <h1>TradeInsight AI — AI-Powered Market Intelligence for Indian Equity Sectors</h1>
        <p>
          TradeInsight AI is an agentic market intelligence platform that helps retail investors,
          exporters, SME founders, and consultants discover trade opportunities in Indian markets.
          Pick any of our 20+ NSE sectors — from Pharmaceuticals and Technology to Renewable Energy,
          Fintech, Automotive, FMCG, Banking, Healthcare, Real Estate, Infrastructure, Metals &amp; Mining,
          and more — and receive a comprehensive, cited sector report in under fifteen seconds.
        </p>
        <p>
          Our AI reads the latest filings, news, and market tape, then writes a structured report
          tailored to your persona, capital allocation, and risk appetite. Every claim is backed by
          cited sources so you can verify before you act. Reports include an executive summary,
          top opportunities, primary risks, actionable recommendations, and can be exported to PDF,
          PPTX, XLSX, or Markdown.
        </p>
        <p>
          Key features include real-time NSE sector data with benchmark deltas, a voice agent for
          hands-free market briefings in Indian English, watchlist alerts that re-analyse sectors on
          your cadence, side-by-side sector comparison, and JWT-scoped privacy ensuring your reports
          never surface to another account. TradeInsight AI is free to start with no credit card
          required — upgrade to Pro or Enterprise for higher limits, white-label exports, and SSO.
        </p>
        <nav aria-label="Main sections">
          <ul>
            <li><a href="/dashboard">Dashboard — Start analyzing sectors</a></li>
            <li><a href="/pricing">Pricing — Free, Pro, and Enterprise plans</a></li>
            <li><a href="/docs/api">API Documentation — Integrate TradeInsight programmatically</a></li>
            <li><a href="/about">About TradeInsight AI</a></li>
            <li><a href="/contact">Contact Sales</a></li>
            <li><a href="/privacy">Privacy Policy</a></li>
          </ul>
        </nav>
      </div>

      {/* Animated thread background — kept as the hero of the page */}
      <div className="fixed inset-0 z-0" aria-hidden="true">
        <WebThreads
          color1="#5227FF"
          color2="#FF9FFC"
          color3="#FFFFFF"
          speed={0.2}
          threadCount={6}
          frequency={5.0}
          spread={0.18}
          taper={1.0}
          position={0.5}
          fanMode="center"
          glow={0.02}
          falloff={0.6}
          thickness={1.1}
          brightness={0.6}
          opacity={1.0}
          mirror={true}
          shimmer={false}
          grain={true}
          grainIntensity={0.05}
          mouseInteraction={true}
          mouseStrength={0.3}
        />
      </div>

      {/* Contrast scrims — dim the threads behind text so every word is readable */}
      <div className="fixed inset-0 z-[1] pointer-events-none" aria-hidden="true">
        {/* Base dim */}
        <div className="absolute inset-0 bg-black/40" />
        {/* Deep vignette for a cinematic focus */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,transparent_25%,rgba(0,0,0,0.55)_100%)]" />
        {/* Top fade so the fixed header is always legible */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent" />
        {/* Bottom fade into the footer */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent" />
      </div>

      <div className="relative z-10 w-full main-container">
        <Header />
        <Hero />
        <Features />
        <HowItWorks />
        <Testimonials />
        <CTA />
        <Footer />
      </div>

      <LiveVisitors />
    </div>
  );
}