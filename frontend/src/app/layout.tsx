import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { SmoothScroll } from "@/components/animations/SmoothScroll";
import { ScrollProgress } from "@/components/animations/ScrollProgress";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "TradeInsight AI — AI-Powered Market Intelligence",
  description:
    "Discover trade opportunities in Indian markets with AI-powered analysis. Comprehensive sector reports, market insights, and strategic recommendations — in under 15 seconds.",
  keywords: [
    "trade opportunities",
    "market analysis",
    "AI",
    "India markets",
    "export import",
    "business intelligence",
  ],
  authors: [{ name: "TradeInsight AI" }],
  openGraph: {
    title: "TradeInsight AI — AI-Powered Market Intelligence",
    description:
      "Discover trade opportunities in Indian markets with AI-powered analysis.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
      </body>
    </html>
  );
}
