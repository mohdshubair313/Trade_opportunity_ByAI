"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  Shield,
  Sparkles,
  Wand2,
  Waves,
} from "lucide-react";

import { GridBackground } from "@/components/animations/AnimatedBackground";
import { GradientText } from "@/components/animations/AnimatedText";
import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";
import { PricingCheckoutGrid } from "@/components/payments/PricingCheckoutGrid";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "When does my plan activate?",
    answer:
      "Activation happens after the backend confirms the Razorpay payment and finalizes the order. The frontend then refreshes your account state from the server.",
  },
  {
    question: "Why do you create a backend order before opening checkout?",
    answer:
      "That keeps the backend as the source of truth for amount, SKU, verification, and account entitlement updates. It also protects against client disconnects during checkout.",
  },
  {
    question: "Do voice briefings and chart vision work on paid plans only?",
    answer:
      "The premium checkout flow is designed to unlock the richer multimodal experience, including voice briefings, receipt/chart understanding, and faster export workflows.",
  },
  {
    question: "Can I still talk to sales for enterprise procurement?",
    answer:
      "Yes. Enterprise can be purchased online, but the page also keeps a direct sales path for invoicing, compliance review, or custom rollout requests.",
  },
];

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("annual");

  return (
    <div className="min-h-screen bg-background main-container">
      <Header />

      <section className="relative overflow-hidden pt-32 pb-12">
        <GridBackground className="opacity-25" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_28%)]" />

        <div className="container relative z-10 mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-4xl text-center"
          >
            <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
              <Badge variant="glow">
                <Shield className="mr-1 h-3 w-3" />
                Razorpay-secured plans
              </Badge>
              <Badge variant="info">
                <Waves className="mr-1 h-3 w-3" />
                Voice + vision ready
              </Badge>
            </div>

            <h1 className="text-4xl font-display font-semibold tracking-tight md:text-7xl leading-[1.05]">
              Buy like a product company. <br />
              <GradientText>Operate like a fintech stack.</GradientText>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
              Choose a plan, open Razorpay Checkout, and let the backend reconcile the entire flow before your account upgrades. No fake buttons. No manual refresh roulette.
            </p>

            <div className="mt-8 inline-flex items-center gap-4 rounded-full border border-white/10 bg-white/5 p-1.5 backdrop-blur">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={cn(
                  "rounded-full px-6 py-2 text-sm font-medium transition-all",
                  billingPeriod === "monthly"
                    ? "bg-background text-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("annual")}
                className={cn(
                  "flex items-center gap-2 rounded-full px-6 py-2 text-sm font-medium transition-all",
                  billingPeriod === "annual"
                    ? "bg-background text-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Annual
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-primary">
                  Save more
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-4 pb-16">
        <div className="container mx-auto">
          <PricingCheckoutGrid billingPeriod={billingPeriod} />
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="container mx-auto grid gap-6 lg:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: "Operator-grade UX",
              body: "Premium plans unlock voice briefings, chart reading, and report workflows designed to feel like a serious startup control room.",
            },
            {
              icon: BrainCircuit,
              title: "Multimodal AI stack",
              body: "Use text, market data, image understanding, and speech generation together instead of hopping between disconnected tools.",
            },
            {
              icon: Wand2,
              title: "Backend-first trust",
              body: "Checkout verification, order polling, webhook settlement, and entitlement updates all happen on the server before the UI claims success.",
            },
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="group relative rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.04))] p-8 hover:border-primary/40 transition-all hover:shadow-2xl hover:shadow-primary/5"
            >
              <div className="absolute top-6 right-8 text-[10px] font-mono font-bold text-muted-foreground/30 group-hover:text-primary/40 transition-colors">
                § 0{index + 1}
              </div>
              <div className="mb-6 inline-flex rounded-2xl border border-white/10 bg-white/5 p-3 group-hover:scale-110 transition-transform">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="pl-6 border-l-2 border-primary/10 group-hover:border-primary/40 transition-colors space-y-3">
                <h2 className="text-2xl font-display font-semibold tracking-tight">{item.title}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-muted/20 px-4 py-16">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="text-3xl font-semibold">
              Frequently Asked <GradientText>Questions</GradientText>
            </h2>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="group relative rounded-[1.5rem] border border-white/10 bg-card p-8 hover:border-primary/40 transition-all"
              >
                <div className="absolute top-6 right-8 text-[10px] font-mono font-bold text-muted-foreground/30 group-hover:text-primary/40 transition-colors">
                  Q {index + 1}
                </div>
                <div className="pl-6 border-l-2 border-primary/10 group-hover:border-primary/40 transition-colors space-y-2">
                  <h3 className="text-lg font-display font-semibold tracking-tight">{faq.question}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-3xl rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.16),transparent_35%),linear-gradient(180deg,rgba(7,10,14,0.98),rgba(9,15,22,0.95))] px-6 py-10 text-center md:px-10"
          >
            <h2 className="text-3xl font-semibold [font-family:var(--font-display)]">
              Ready to hear your analysis out loud and inspect your charts like a pro?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              Upgrade, run a sector report, and use the new multimodal studio to generate voice briefings and structured chart analysis directly from the results page.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/dashboard">
                <Button size="xl" variant="glow">
                  Open Dashboard
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="xl" variant="outline">
                  Talk to Sales
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
