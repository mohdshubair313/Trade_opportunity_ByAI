import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { SoundEffects } from "@/components/animations/SoundEffects";

export const metadata: Metadata = {
  title: "TradeInsight AI - AI-Powered Market Intelligence",
  description:
    "Discover trade opportunities in Indian markets with AI-powered analysis. Get comprehensive sector reports, market insights, and strategic recommendations.",
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
    title: "TradeInsight AI - AI-Powered Market Intelligence",
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
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        <SoundEffects>
          {children}
        </SoundEffects>
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
