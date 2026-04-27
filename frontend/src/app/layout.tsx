import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { SmoothScroll } from "@/components/animations/SmoothScroll";
import { ScrollProgress } from "@/components/animations/ScrollProgress";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"

// Inter at a focused weight range keeps the body text crisp without bloating
// the font payload. Instrument Serif is the display face used for hero
// headlines — a subtle serif accent that separates this site from the
// generic "all Inter" tailwind starter look.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400"],
  style: ["normal", "italic"],
});

// metadataBase is REQUIRED for production. Without it, the OG/Twitter image
// URLs resolve as relative paths which social platforms (Twitter, LinkedIn,
// WhatsApp) silently reject — they need absolute URLs. Override per-env
// via NEXT_PUBLIC_SITE_URL if you ever move domains.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://tradeinsight.shubair.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TradeInsight AI — AI-Powered Market Intelligence",
    template: "%s · TradeInsight",
  },
  description:
    "Discover trade opportunities in Indian markets with AI-powered analysis. Comprehensive sector reports, market insights, and strategic recommendations — in under 15 seconds.",
  keywords: [
    "trade opportunities",
    "market analysis",
    "AI",
    "India markets",
    "export import",
    "business intelligence",
    "NSE sectors",
    "agentic AI",
  ],
  authors: [{ name: "TradeInsight AI" }],
  creator: "TradeInsight AI",
  publisher: "TradeInsight AI",
  // Next.js auto-detects opengraph-image.png and twitter-image.png colocated
  // with this file — we don't list them explicitly so the config stays in
  // sync with the files on disk. The `images` default is inferred.
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: "TradeInsight AI",
    title: "TradeInsight AI — Market intelligence, written for you",
    description:
      "Pick a sector. Get a cited, persona-tuned report in under fifteen seconds. Built for retail investors, exporters, SME founders and consultants in Indian markets.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TradeInsight AI — Market intelligence, written for you",
    description:
      "Pick a sector. Get a cited, persona-tuned report in under fifteen seconds.",
    creator: "@Shubair313",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// Tints the mobile browser chrome (Chrome on Android, Safari iOS) to match
// our near-black canvas — small touch that compounds into "premium". Lives
// in its own `viewport` export because Next.js 14 deprecated themeColor
// inside `metadata`.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
    { media: "(prefers-color-scheme: light)", color: "#0A0A0A" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <html lang="en" className={`dark ${inter.variable} ${instrumentSerif.variable}`}>
        <body className="min-h-screen bg-background font-sans antialiased">
          <SmoothScroll />
          <ScrollProgress />
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "hsl(var(--card))",
                color: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
              },
              success: {
                iconTheme: {
                  primary: "hsl(var(--primary))",
                  secondary: "white",
                },
              },
            }}
          />
          <Analytics />
        </body>
      </html>
    </>
  );
}
