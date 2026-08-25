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
 * JSON-LD structured data for AI and search engines (audit items 4, 5, 9, 14).
 * SoftwareApplication identifies the product; Organization & Person provide
 * business legitimacy, author verification, and developer discoverability.
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
          "TradeInsight AI by Mohd Shubair",
          "Trade Opportunity By AI",
        ],
        url: "https://tradeinsight.shubair.in",
        description:
          "Agentic market intelligence platform for Indian equity sectors by Mohd Shubair. Generates cited, persona-tuned sector reports covering 20+ NSE sectors in under 15 seconds.",
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
          "Persona-tuned reports (retail investor, exporter, SME founder, consultant)",
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
    <div className="relative w-full min-h-screen bg-black">
      {/* Structured data for agents and search engines */}
      <JsonLd />

      {/*
        Server-rendered semantic content with full heading hierarchy (H1 -> H2 -> H3).
        Visible to AI crawlers and search engines in raw HTML without JavaScript.
        Visually hidden (sr-only) so it doesn't collide with the client animated canvas.
      */}
      <div className="sr-only">
        <header>
          <h1>TradeInsight AI by Shubair — AI-Powered Market Intelligence for Indian Equity Sectors</h1>
          <p>
            TradeInsight AI, built by Mohd Shubair, is an agentic market intelligence platform
            for analyzing 20+ National Stock Exchange of India (NSE) sectors in under 15 seconds.
          </p>
        </header>

        <main>
          <section>
            <h2>Overview &amp; Core Value Proposition</h2>
            <p>
              TradeInsight AI reads financial filings, live market tape, and news sentiment, then
              generates structured, persona-tuned reports backed by cited sources. Whether you are a
              retail investor managing a personal portfolio, an exporter monitoring foreign exchange
              impacts, an SME founder planning capital allocation, or an equity research consultant,
              TradeInsight produces actionable sector intelligence on demand.
            </p>
          </section>

          <section>
            <h2>Platform Capabilities &amp; Key Features</h2>

            <article>
              <h3>1. AI-Powered Sector Analysis</h3>
              <p>
                Cascading AI models analyze macroeconomic factors, industry trends, and corporate filings
                to synthesize cited reports with executive summaries, top trade opportunities, primary risks,
                and concrete next steps.
              </p>
            </article>

            <article>
              <h3>2. Real-Time NSE Sector Data</h3>
              <p>
                Continuous tracking of Indian equity sector indices, benchmark deltas against Nifty 50,
                and news sentiment scored with natural language processing.
              </p>
            </article>

            <article>
              <h3>3. Multi-Format Report Export</h3>
              <p>
                Export complete research dossiers into PDF, Microsoft PowerPoint (PPTX), Microsoft Excel (XLSX),
                or Markdown for team presentations and quantitative modeling.
              </p>
            </article>

            <article>
              <h3>4. Interactive Voice Briefing Agent</h3>
              <p>
                Hands-free market query agent offering spoken briefings in Indian English, powered by speech-to-text,
                multimodal AI reasoning, and low-latency voice synthesis.
              </p>
            </article>

            <article>
              <h3>5. Automated Watchlist Alerts</h3>
              <p>
                Monitor prioritized sectors on customizable schedules (daily, weekly, or event-driven)
                with alerts triggered whenever material developments occur.
              </p>
            </article>

            <article>
              <h3>6. Side-by-Side Sector Comparison</h3>
              <p>
                Rank multiple sectors across opportunity scores, risk metrics, capital intensity, and time-to-ROI
                for optimal portfolio weighting.
              </p>
            </article>
          </section>

          <section>
            <h2>Covered Indian Equity Sectors</h2>
            <p>
              TradeInsight covers 20+ major NSE industry sectors including:
            </p>
            <ul>
              <li>Pharmaceuticals &amp; Active Pharmaceutical Ingredients (API / CDMO)</li>
              <li>Information Technology, Cloud &amp; Software Services</li>
              <li>Fintech &amp; Digital Payments</li>
              <li>Renewable Energy, Solar &amp; Clean Technology</li>
              <li>Automotive &amp; Electric Vehicles (EV)</li>
              <li>Fast-Moving Consumer Goods (FMCG)</li>
              <li>Banking, Financial Services &amp; Insurance (BFSI)</li>
              <li>Healthcare &amp; Diagnostics</li>
              <li>Metals &amp; Mining</li>
              <li>Infrastructure, Roads &amp; Ports</li>
              <li>Real Estate &amp; Construction</li>
              <li>Textiles, Agriculture, Chemicals &amp; Telecommunications</li>
            </ul>
          </section>

          <section>
            <h2>Developer Resources &amp; API Integration by Shubair</h2>
            <p>
              Programmatic access is available for AI agents, quant developers, and automated workflows.
            </p>
            <ul>
              <li><a href="/docs/api">API Documentation — Endpoints, JWT authentication, and examples</a></li>
              <li><a href="/openapi.json">OpenAPI 3.0 Specification (JSON)</a></li>
              <li><a href="/openapi.yaml">OpenAPI Specification (YAML)</a></li>
              <li><a href="/llms.txt">llms.txt — Machine-readable Agent Integration Handbook</a></li>
              <li><a href="/docs/deprecation-policy">API Versioning and Deprecation Policy</a></li>
              <li><a href="/api/health">System Health Check API</a></li>
            </ul>
          </section>

          <section>
            <h2>Subscription Plans &amp; Pricing</h2>
            <ul>
              <li><strong>Free Plan:</strong> 3 analyses per day, access to all 20+ sectors, standard AI routing. No credit card required.</li>
              <li><strong>Pro Plan:</strong> Unlimited analyses, priority LLM execution, PDF/PPTX/XLSX exports, 20 watchlist slots.</li>
              <li><strong>Enterprise Plan:</strong> Custom sector feeds, dedicated Slack channels, white-label decks, SSO, and team volume licensing.</li>
            </ul>
          </section>

          <nav aria-label="Quick Links">
            <h2>Site Navigation</h2>
            <ul>
              <li><a href="/dashboard">Launch Dashboard</a></li>
              <li><a href="/pricing">View Pricing Plans</a></li>
              <li><a href="/docs/api">Developer API Docs</a></li>
              <li><a href="/about">About TradeInsight AI &amp; Mohd Shubair</a></li>
              <li><a href="/contact">Contact Enterprise Sales</a></li>
              <li><a href="/privacy">Privacy &amp; Data Security Policy</a></li>
              <li><a href="/sitemap.xml">XML Sitemap</a></li>
            </ul>
          </nav>
        </main>
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