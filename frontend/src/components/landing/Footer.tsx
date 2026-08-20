"use client";

import { TrendingUp, Github, Twitter, Linkedin, Mail } from "lucide-react";
import Link from "next/link";

const footerLinks = {
  product: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Pricing", href: "/pricing" },
    { label: "API", href: "/docs/api" },
    { label: "Changelog", href: "/changelog" },
  ],
  sectors: [
    { label: "Technology", href: "/dashboard?sector=technology" },
    { label: "Pharmaceuticals", href: "/dashboard?sector=pharmaceuticals" },
    { label: "Fintech", href: "/dashboard?sector=fintech" },
    { label: "Healthcare", href: "/dashboard?sector=healthcare" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
  ],
};

const socialLinks = [
  { icon: Twitter, href: "https://x.com/Shubair313", label: "Twitter" },
  { icon: Github, href: "https://github.com/mohdshubair313", label: "GitHub" },
  { icon: Linkedin, href: "https://www.linkedin.com/in/mohd-shubair-b1a454250/", label: "LinkedIn" },
  { icon: Mail, href: "mailto:[shubair313@gmail.com]", label: "Email" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#07070d]/90 backdrop-blur-xl relative z-10 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4 group">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.35)]">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-violet-500/40 to-cyan-400/40 blur-md -z-10" />
              </div>
              <span className="font-bold text-xl text-white">
                Trade<span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">Insight</span>
              </span>
            </Link>
            <p className="text-sm text-white/60 mb-5 leading-relaxed">
              AI-powered market intelligence for discovering trade opportunities
              in Indian markets.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/55 hover:text-white hover:border-violet-400/40 hover:bg-violet-500/15 hover:shadow-[0_0_16px_rgba(139,92,246,0.25)] transition-all"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Product</h4>
            <ul className="space-y-2.5">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-violet-300 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-white">Sectors</h4>
            <ul className="space-y-2.5">
              {footerLinks.sectors.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-violet-300 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-white">Company</h4>
            <ul className="space-y-2.5">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-violet-300 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-white">Legal</h4>
            <ul className="space-y-2.5">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-violet-300 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-white/[0.08] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/55">
            &copy; {new Date().getFullYear()} TradeInsight AI. All rights
            reserved.
          </p>
          <p className="text-xs text-white/40 flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" />
            Crafted with agentic AI
          </p>
        </div>
      </div>
    </footer>
  );
}