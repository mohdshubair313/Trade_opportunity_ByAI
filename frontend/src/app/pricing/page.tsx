"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Check,
  X,
  Sparkles,
  TrendingUp,
  Zap,
  Shield,
  Crown,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { GradientText } from "@/components/animations/AnimatedText";
import { NeonCard, GlowCard } from "@/components/animations/AnimatedCard";
import { GridBackground } from "@/components/animations/AnimatedBackground";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Free",
    description: "Perfect for exploring market insights",
    price: { monthly: 0, annual: 0 },
    popular: false,
    features: [
      { text: "5 analyses per month", included: true },
      { text: "Basic market reports", included: true },
      { text: "Popular sectors access", included: true },
      { text: "Email support", included: true },
      { text: "Export reports (PDF)", included: false },
      { text: "Priority processing", included: false },
      { text: "API access", included: false },
      { text: "Team collaboration", included: false },
      { text: "Custom alerts", included: false },
    ],
    cta: "Get Started",
    href: "/dashboard",
  },
  {
    name: "Pro",
    description: "For professionals and growing businesses",
    price: { monthly: 29, annual: 24 },
    popular: true,
    features: [
      { text: "100 analyses per month", included: true },
      { text: "Advanced market reports", included: true },
      { text: "All sectors access", included: true },
      { text: "Priority email support", included: true },
      { text: "Export reports (PDF, Excel)", included: true },
      { text: "Priority processing", included: true },
      { text: "API access (1000 calls/mo)", included: true },
      { text: "Team collaboration (3 users)", included: false },
      { text: "Custom alerts (10)", included: true },
    ],
    cta: "Start Free Trial",
    href: "/dashboard",
  },
  {
    name: "Enterprise",
    description: "For large teams and organizations",
    price: { monthly: 99, annual: 79 },
    popular: false,
    features: [
      { text: "Unlimited analyses", included: true },
      { text: "Premium market reports", included: true },
      { text: "All sectors + custom sectors", included: true },
      { text: "24/7 priority support", included: true },
      { text: "Export all formats", included: true },
      { text: "Instant processing", included: true },
      { text: "API access (unlimited)", included: true },
      { text: "Team collaboration (unlimited)", included: true },
      { text: "Custom alerts (unlimited)", included: true },
    ],
    cta: "Contact Sales",
    href: "/contact",
  },
];

const faqs = [
  {
    question: "What is included in the free plan?",
    answer:
      "The free plan includes 5 sector analyses per month, basic market reports, and access to all popular sectors. Perfect for getting started and exploring the platform.",
  },
  {
    question: "Can I upgrade or downgrade my plan?",
    answer:
      "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any payments accordingly.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, American Express), UPI, and bank transfers for enterprise plans.",
  },
  {
    question: "Is there a free trial for paid plans?",
    answer:
      "Yes! Pro plan comes with a 14-day free trial. No credit card required to start. You can cancel anytime during the trial.",
  },
  {
    question: "How accurate is the AI analysis?",
    answer:
      "Our AI analyzes data from multiple verified sources and provides comprehensive insights. While highly accurate, we recommend using the reports as part of your broader research strategy.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "Yes, we offer a 30-day money-back guarantee for all paid plans. If you're not satisfied, contact us for a full refund.",
  },
];

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    "annual"
  );

  return (
    <main className="relative min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <GridBackground className="opacity-30" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Badge variant="glow" className="mb-4">
              <Sparkles className="h-3 w-3 mr-1" />
              Simple, Transparent Pricing
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Choose the Right Plan for{" "}
              <GradientText>Your Business</GradientText>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Start free and scale as you grow. All plans include core features
              with no hidden fees.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-4 p-1.5 rounded-full bg-muted">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-all",
                  billingPeriod === "monthly"
                    ? "bg-background shadow-md text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("annual")}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                  billingPeriod === "annual"
                    ? "bg-background shadow-md text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Annual
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs">
                  Save 20%
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center z-10">
                    <Badge variant="default" className="px-4 py-1">
                      <Crown className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                {plan.popular ? (
                  <NeonCard color="green" className="h-full">
                    <PlanContent
                      plan={plan}
                      billingPeriod={billingPeriod}
                    />
                  </NeonCard>
                ) : (
                  <GlowCard className="h-full">
                    <PlanContent
                      plan={plan}
                      billingPeriod={billingPeriod}
                    />
                  </GlowCard>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">
              Why Choose <GradientText>TradeInsight AI?</GradientText>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "Lightning Fast",
                description:
                  "Get comprehensive analysis in under 15 seconds with our optimized AI pipeline.",
              },
              {
                icon: Shield,
                title: "Secure & Private",
                description:
                  "Enterprise-grade security with encryption and secure authentication.",
              },
              {
                icon: TrendingUp,
                title: "Actionable Insights",
                description:
                  "Not just data, but real recommendations you can act on immediately.",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center p-6"
              >
                <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">
              Frequently Asked <GradientText>Questions</GradientText>
            </h2>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-6"
              >
                <h3 className="font-semibold mb-2">{faq.question}</h3>
                <p className="text-muted-foreground text-sm">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto"
          >
            <h2 className="text-3xl font-bold mb-4">
              Ready to Start Discovering Opportunities?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of businesses using AI-powered market intelligence.
            </p>
            <Link href="/dashboard">
              <Button size="xl" variant="glow" className="group">
                Start Free Analysis
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function PlanContent({
  plan,
  billingPeriod,
}: {
  plan: (typeof plans)[0];
  billingPeriod: "monthly" | "annual";
}) {
  const price = plan.price[billingPeriod];

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
        <p className="text-sm text-muted-foreground">{plan.description}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold">
            {price === 0 ? "Free" : `$${price}`}
          </span>
          {price > 0 && (
            <span className="text-muted-foreground">/month</span>
          )}
        </div>
        {billingPeriod === "annual" && price > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Billed annually (${price * 12}/year)
          </p>
        )}
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((feature) => (
          <li key={feature.text} className="flex items-start gap-3">
            {feature.included ? (
              <Check className="h-5 w-5 text-primary flex-shrink-0" />
            ) : (
              <X className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />
            )}
            <span
              className={cn(
                "text-sm",
                feature.included
                  ? "text-foreground"
                  : "text-muted-foreground/50"
              )}
            >
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      <Link href={plan.href}>
        <Button
          className="w-full"
          variant={plan.popular ? "glow" : "outline"}
          size="lg"
        >
          {plan.cta}
        </Button>
      </Link>
    </div>
  );
}
