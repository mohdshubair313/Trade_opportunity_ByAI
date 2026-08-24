import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, Sparkles, Globe, Shield, Zap, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description:
    "TradeInsight AI is an agentic market intelligence platform for Indian equity sectors. Learn about our mission, technology, and the team behind the product.",
  alternates: {
    canonical: "https://tradeinsight.shubair.in/about",
  },
};

export default function AboutPage() {
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
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
          About{" "}
          <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
            TradeInsight AI
          </span>
        </h1>

        <p className="text-lg text-white/70 leading-relaxed mb-12 max-w-2xl">
          TradeInsight AI is an agentic market intelligence platform built for the Indian equity market.
          We help retail investors, exporters, SME founders, and research consultants discover trade
          opportunities across 20+ NSE sectors — in under fifteen seconds.
        </p>

        {/* Mission */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-violet-400" />
            Our Mission
          </h2>
          <p className="text-white/70 leading-relaxed mb-4">
            Financial research in India is fragmented. Retail investors scroll through dozens of news
            sites, broker reports, and social media threads to form a view on a sector. Professional
            analysts spend hours collecting data before they can even begin writing. We believe
            AI can compress this process from hours to seconds — without sacrificing the depth,
            citations, or nuance that make research actionable.
          </p>
          <p className="text-white/70 leading-relaxed">
            TradeInsight AI exists to democratise institutional-grade market intelligence. Whether
            you manage a ₹5 lakh portfolio from your phone or run a research desk with an SLA,
            you deserve cited, structured analysis delivered at the speed of thought. Our agentic
            AI reads filings, news, and market tape — then writes a sector report tailored to
            your persona, capital allocation, and risk appetite. Every claim is backed by verifiable
            sources so you can trust what you read and act with confidence.
          </p>
        </section>

        {/* Technology */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <Zap className="h-5 w-5 text-fuchsia-400" />
            Our Technology
          </h2>
          <p className="text-white/70 leading-relaxed mb-4">
            TradeInsight AI is built on an agentic architecture — a cascade of specialised AI models
            that each handle a different part of the research workflow. One agent collects market
            data from NSE sector indices. Another searches and grades news by relevance. A third
            synthesises the evidence into a structured report with executive summary, top
            opportunities, primary risks, and actionable recommendations.
          </p>
          <p className="text-white/70 leading-relaxed">
            The platform supports multiple output formats (PDF, PPTX, XLSX, Markdown) and includes
            a voice agent for hands-free market briefings in Indian English — ideal for professionals
            who want their morning briefing while commuting. Our intelligent caching layer and tuned
            model router keep response times under fifteen seconds on the median analysis, even on
            the free tier.
          </p>
        </section>

        {/* Values grid */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
            <Globe className="h-5 w-5 text-cyan-400" />
            What We Stand For
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: <Shield className="h-5 w-5 text-violet-300" />,
                title: "Citations, Not Hallucinations",
                desc: "Every claim in every report is backed by a verifiable source. We don't generate opinions — we synthesise evidence.",
              },
              {
                icon: <Users className="h-5 w-5 text-fuchsia-300" />,
                title: "Built for India",
                desc: "Sector taxonomy, data sources, and analyst framing are tuned for NSE sectors, Indian macro context, and INR denomination.",
              },
              {
                icon: <Zap className="h-5 w-5 text-cyan-300" />,
                title: "Speed Without Compromise",
                desc: "Median end-to-end analysis: under 15 seconds. We prioritise speed because insights that arrive late are insights that don't get used.",
              },
              {
                icon: <Shield className="h-5 w-5 text-emerald-300" />,
                title: "Privacy by Default",
                desc: "JWT-scoped access per user. Your reports, watchlists, and favourites never surface to another account.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 hover:border-violet-400/25 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  {card.icon}
                  <h3 className="font-semibold text-white">{card.title}</h3>
                </div>
                <p className="text-sm text-white/60 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-emerald-400" />
            The Team
          </h2>
          <p className="text-white/70 leading-relaxed mb-4">
            TradeInsight AI is created by Mohd Shubair, a developer passionate about building
            AI-powered tools that solve real problems in the Indian financial ecosystem. The project
            combines expertise in full-stack development, machine learning, and Indian equity markets
            to deliver a product that is both technically sophisticated and practically useful.
          </p>
          <p className="text-white/70 leading-relaxed">
            We are an open-source-friendly project — our codebase is available on GitHub for
            transparency and community contribution. If you are interested in contributing or
            partnering, reach out via our{" "}
            <Link href="/contact" className="text-violet-300 hover:underline">
              contact page
            </Link>{" "}
            or find us on{" "}
            <a
              href="https://github.com/mohdshubair313"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-300 hover:underline"
            >
              GitHub
            </a>.
          </p>
        </section>

        {/* CTA */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to try it?</h2>
          <p className="text-white/60 mb-6">
            Start analyzing sectors for free — no credit card required.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-500 px-8 py-3 text-sm font-bold text-white hover:shadow-[0_0_40px_rgba(168,85,247,0.4)] transition-all"
          >
            Start analyzing →
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] mt-16 py-8 text-center text-sm text-white/40">
        <p>© {new Date().getFullYear()} TradeInsight AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
