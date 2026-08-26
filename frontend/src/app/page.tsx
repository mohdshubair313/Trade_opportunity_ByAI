import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { Personas } from "@/components/landing/Personas";
import { DeliveryFormats } from "@/components/landing/DeliveryFormats";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

/**
 * Per-page metadata — adds canonical URL.
 */
export const metadata: Metadata = {
  alternates: {
    canonical: "https://tradeinsight.shubair.in",
  },
};

/**
 * JSON-LD structured data for AI and search engines.
 */
function JsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": "https://tradeinsight.shubair.in/#software",
        name: "TradeInsight AI",
        alternateName: [
          "TradeInsight",
          "Trade Insight",
          "TradeInsight by Shubair",
          "TradeOpportunity By AI",
        ],
        url: "https://tradeinsight.shubair.in",
        description:
          "Agentic market intelligence platform for Indian equity sectors. Generates cited, persona-tuned sector reports covering 20+ NSE sectors in under 15 seconds.",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web, CLI, API",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
          description: "Free tier available — no credit card required",
        },
        author: { "@id": "https://tradeinsight.shubair.in/#organization" },
        creator: { "@id": "https://tradeinsight.shubair.in/#person" },
        publisher: { "@id": "https://tradeinsight.shubair.in/#organization" },
        screenshot: "https://tradeinsight.shubair.in/opengraph-image.png",
        featureList: [
          "AI-powered sector analysis for 20+ NSE sectors",
          "Cited sources on every claim with verifiable references",
          "Persona-tuned reports (Day Trader, Investor, SME Founder, Consultant)",
          "Export to PDF, PPTX, XLSX, Markdown",
          "Voice agent for hands-free market briefings in Indian English",
          "Watchlist alerts with configurable cadence",
          "Official CLI tool and REST API with OpenAPI specification",
          "JWT-scoped privacy — reports never surface to another account",
        ],
      },
      {
        "@type": "Organization",
        "@id": "https://tradeinsight.shubair.in/#organization",
        name: "TradeInsight AI",
        alternateName: "TradeInsight",
        url: "https://tradeinsight.shubair.in",
        logo: "https://tradeinsight.shubair.in/icon.png",
        description:
          "TradeInsight AI builds agentic market intelligence tools and developer APIs for Indian financial markets.",
        founder: { "@id": "https://tradeinsight.shubair.in/#person" },
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
        "@type": "Person",
        "@id": "https://tradeinsight.shubair.in/#person",
        name: "Mohd Shubair",
        alternateName: ["Shubair", "Mohd Shubair Developer"],
        url: "https://github.com/mohdshubair313",
        jobTitle: "Founder & AI Engineer",
        sameAs: [
          "https://x.com/Shubair313",
          "https://github.com/mohdshubair313",
          "https://www.linkedin.com/in/mohd-shubair-b1a454250/",
        ],
      },
      {
        "@type": "WebSite",
        name: "TradeInsight AI by Shubair",
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
    <div className="relative w-full min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary transition-colors duration-300">
      {/* Structured data for agents and search engines */}
      <JsonLd />

      {/*
        Server-rendered semantic content with full heading hierarchy (H1 -> H2 -> H3).
        Visible to AI crawlers and search engines in raw HTML without JavaScript.
      */}
      <div className="sr-only">
        <header>
          <h1>TradeInsight AI — Agentic Market Intelligence for Indian Equity Sectors</h1>
          <p>
            One question. Answered in 15 seconds. Cited, not guessed.
            TradeInsight AI analyzes 20+ National Stock Exchange of India (NSE) sectors in under 15 seconds.
          </p>
        </header>

        <main>
          <section>
            <h2>7 AM. One Question. Answered in 15 seconds.</h2>
            <p>
              TradeInsight AI reads financial filings, live market tape, and news sentiment, then
              generates structured, persona-tuned reports backed by cited sources. Whether you are a
              day trader, equity investor, SME exporter, or strategy consultant.
            </p>
          </section>

          <section>
            <h2>Built for Resilience — Technical Architecture</h2>
            <p>
              4-layer fallback model cascade, 2-second pre-computed vector cache, 40ms model routing latency,
              and 99.8% citation accuracy grounded in primary exchange filings.
            </p>
          </section>

          <section>
            <h2>Multi-Modal Deliverables: Web, Voice, Document</h2>
            <p>
              Interactive streaming web dossiers, spoken voice briefings in Indian English, and 1-click
              exports into PDF, PPTX, XLSX, and Markdown.
            </p>
          </section>
        </main>
      </div>

      {/* Global Background Ambient Scrims */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        {/* Subtle Radial Ambient in Top-Right */}
        <div
          className="absolute top-0 right-0 w-[800px] h-[600px] rounded-full blur-[160px] opacity-10 dark:opacity-15"
          style={{
            background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
          }}
        />
        {/* Subtle Bottom Fade */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Main Interactive Landing Experience */}
      <div className="relative z-10 w-full">
        <Header />
        <Hero />
        <HowItWorks />
        <Features />
        <Personas />
        <DeliveryFormats />
        <CTA />
        <Footer />
      </div>
    </div>
  );
}