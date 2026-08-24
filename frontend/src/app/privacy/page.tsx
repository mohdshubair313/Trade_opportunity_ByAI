import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "TradeInsight AI Privacy Policy — how we collect, use, store, and protect your data. Last updated August 2026.",
  alternates: {
    canonical: "https://tradeinsight.shubair.in/privacy",
  },
};

export default function PrivacyPage() {
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
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          Privacy Policy
        </h1>
        <p className="text-sm text-white/40 mb-12">
          Last updated: August 2026
        </p>

        <div className="prose prose-invert prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Introduction</h2>
            <p className="text-white/70 leading-relaxed">
              TradeInsight AI (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your
              information when you use our website at tradeinsight.shubair.in and our associated
              API services (collectively, the &quot;Service&quot;). By accessing or using the Service,
              you agree to the terms of this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Information We Collect</h2>
            <h3 className="text-lg font-semibold text-white/90 mb-2">Account Information</h3>
            <p className="text-white/70 leading-relaxed mb-3">
              When you register for an account, we collect your username, email address, and a
              hashed version of your password. We never store plaintext passwords. You may
              optionally provide a full name and company affiliation.
            </p>
            <h3 className="text-lg font-semibold text-white/90 mb-2">Usage Data</h3>
            <p className="text-white/70 leading-relaxed mb-3">
              We automatically collect certain information about how you interact with the Service,
              including which sectors you analyse, how often you use the platform, and aggregate
              usage metrics. This data helps us improve the product and ensure fair rate limiting.
            </p>
            <h3 className="text-lg font-semibold text-white/90 mb-2">Analysis Reports</h3>
            <p className="text-white/70 leading-relaxed">
              When you request a sector analysis, the generated report is stored in your account
              history. Reports are scoped to your user account via JWT authentication and are
              never visible to other users. You may delete your analysis history at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. How We Use Your Information</h2>
            <p className="text-white/70 leading-relaxed">
              We use the information we collect to: provide and maintain the Service; generate
              persona-tuned sector reports based on your preferences; send OTP verification
              emails for account security; respond to contact form submissions; improve our
              AI models and service quality through aggregate usage patterns (never individual
              data); enforce rate limits and prevent abuse; and communicate important service
              updates or security notices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Data Storage and Security</h2>
            <p className="text-white/70 leading-relaxed">
              Your data is stored on secure servers with encryption at rest and in transit.
              We use industry-standard security measures including HTTPS/TLS for all
              communications, bcrypt password hashing, JWT-based authentication with short-lived
              access tokens and long-lived refresh tokens, and strict CORS policies. We retain
              your data only as long as your account is active. Upon account deletion, all
              associated data including analysis history, favourites, and watchlists is
              permanently removed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Third-Party Services</h2>
            <p className="text-white/70 leading-relaxed">
              TradeInsight AI uses third-party services to deliver its functionality. These
              include AI model providers (Google Gemini, OpenRouter) for generating analysis
              reports — prompts include your sector selection and persona preferences but never
              your personal identifiable information. We use Razorpay for payment processing
              on paid plans — payment data is handled directly by Razorpay and we do not store
              credit card numbers. We use Resend for transactional email delivery (OTP codes,
              contact form responses). We use Vercel Analytics for aggregate website performance
              metrics — no personally identifiable information is collected.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Your Rights</h2>
            <p className="text-white/70 leading-relaxed">
              You have the right to: access the personal data we hold about you; correct any
              inaccurate data; delete your account and all associated data; export your analysis
              history in multiple formats (PDF, PPTX, XLSX, Markdown); opt out of non-essential
              communications; and request information about how your data is processed. To
              exercise any of these rights, contact us at shubair313@gmail.com or through our
              contact page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Cookies</h2>
            <p className="text-white/70 leading-relaxed">
              TradeInsight AI uses minimal cookies. We store authentication tokens in
              localStorage (not cookies) for session management. Vercel Analytics may set
              a first-party analytics cookie for aggregate performance monitoring. We do
              not use advertising cookies or third-party tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Changes to This Policy</h2>
            <p className="text-white/70 leading-relaxed">
              We may update this Privacy Policy from time to time. Changes will be posted on
              this page with an updated &quot;Last updated&quot; date. Your continued use of the
              Service after any changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Contact Us</h2>
            <p className="text-white/70 leading-relaxed">
              If you have questions about this Privacy Policy or our data practices, please
              contact us at{" "}
              <a href="mailto:shubair313@gmail.com" className="text-violet-300 hover:underline">
                shubair313@gmail.com
              </a>{" "}
              or visit our{" "}
              <Link href="/contact" className="text-violet-300 hover:underline">
                contact page
              </Link>.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] mt-16 py-8 text-center text-sm text-white/40">
        <p>© {new Date().getFullYear()} TradeInsight AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
