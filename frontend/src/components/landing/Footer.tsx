"use client";

import { Github, Twitter, Linkedin, Mail } from "lucide-react";
import { LogoGlyph } from "@/components/icons/CustomIcons";
import Link from "next/link";

const footerLinks = {
  product: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Pricing", href: "/pricing" },
    { label: "API Reference", href: "/docs/api" },
    { label: "Sector Rankings", href: "/compare" },
  ],
  sectors: [
    { label: "Technology (IT)", href: "/dashboard?sector=technology" },
    { label: "Pharma & CDMO", href: "/dashboard?sector=pharmaceuticals" },
    { label: "Fintech & Payments", href: "/dashboard?sector=fintech" },
    { label: "Renewables & Solar", href: "/dashboard?sector=renewable-energy" },
    { label: "Automotive & EV", href: "/dashboard?sector=automotive" },
  ],
  developers: [
    { label: "REST API Docs", href: "/docs/api" },
    { label: "OpenAPI Spec", href: "/openapi.json" },
    { label: "llms.txt Guide", href: "/llms.txt" },
    { label: "System Health API", href: "/api/health" },
  ],
  company: [
    { label: "About Mohd Shubair", href: "/about" },
    { label: "Contact & Support", href: "/contact" },
    { label: "Privacy Policy", href: "/privacy" },
  ],
};

const socialLinks = [
  { icon: Twitter, href: "https://x.com/Shubair313", label: "Twitter" },
  { icon: Github, href: "https://github.com/mohdshubair313", label: "GitHub" },
  { icon: Linkedin, href: "https://www.linkedin.com/in/mohd-shubair-b1a454250/", label: "LinkedIn" },
  { icon: Mail, href: "mailto:shubair313@gmail.com", label: "Email" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-[#141413] dark:bg-[#05080A] text-[#faf9f5] dark:text-[#EDEFEF] relative z-10">
      <div className="main-container mx-auto py-16">
        
        {/* Top Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12 mb-12">
          
          {/* Brand Col */}
          <div className="col-span-2 md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#242422] dark:bg-[#0D1518] border border-white/[0.12] text-primary group-hover:border-primary/50 transition-colors">
                <LogoGlyph className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold tracking-tight text-base text-[#faf9f5] dark:text-[#EDEFEF]">
                  TradeInsight
                </span>
                <span className="font-kalam text-xs text-primary font-bold">
                  ai
                </span>
              </div>
            </Link>

            <p className="text-xs text-[#b0aea5] dark:text-[#8B98A0] leading-relaxed max-w-sm font-kalam">
              Agentic market intelligence platform for Indian equity sectors. Synthesizing cited, persona-tuned research dossiers in under 15 seconds.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-2 pt-2">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="p-2 rounded-lg bg-[#242422] dark:bg-[#0D1518] border border-white/[0.08] text-[#b0aea5] hover:text-primary hover:border-primary/40 transition-colors"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links: Product */}
          <div>
            <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#faf9f5] dark:text-[#EDEFEF] mb-3">
              Product
            </div>
            <ul className="space-y-2">
              {footerLinks.product.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-xs text-[#b0aea5] dark:text-[#8B98A0] hover:text-[#faf9f5] dark:hover:text-[#EDEFEF] transition-colors font-kalam"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links: Sectors */}
          <div>
            <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#faf9f5] dark:text-[#EDEFEF] mb-3">
              Sectors
            </div>
            <ul className="space-y-2">
              {footerLinks.sectors.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-xs text-[#b0aea5] dark:text-[#8B98A0] hover:text-[#faf9f5] dark:hover:text-[#EDEFEF] transition-colors font-kalam"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links: Developers & Company */}
          <div>
            <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#faf9f5] dark:text-[#EDEFEF] mb-3">
              Platform
            </div>
            <ul className="space-y-2">
              {footerLinks.developers.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-xs text-[#b0aea5] dark:text-[#8B98A0] hover:text-[#faf9f5] dark:hover:text-[#EDEFEF] transition-colors font-kalam"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              {footerLinks.company.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-xs text-[#b0aea5] dark:text-[#8B98A0] hover:text-[#faf9f5] dark:hover:text-[#EDEFEF] transition-colors font-kalam"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Telemetry & Disclaimer */}
        <div className="pt-8 border-t border-white/[0.08] flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-[#87867f]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-[#b0aea5] dark:text-[#8B98A0]">
              SYSTEMS OPERATIONAL · NSE TAPE ACTIVE · CASCADE v2.4
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-kalam text-xs text-[#faf9f5] dark:text-[#EDEFEF]">
              Crafted in India 🇮🇳 by Mohd Shubair
            </span>
            <span>·</span>
            <span>© {new Date().getFullYear()} TradeInsight AI</span>
          </div>
        </div>

      </div>
    </footer>
  );
}