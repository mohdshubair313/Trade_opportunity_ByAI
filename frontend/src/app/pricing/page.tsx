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

import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";
import { PricingCheckoutGrid } from "@/components/payments/PricingCheckoutGrid";
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
    <div className="min-h-screen bg-canvas text-ink main-container pb-20">
      <Header />

      <section className="relative overflow-hidden pt-32 pb-12">
        <div className="container relative z-10 mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-4xl text-center"
          >
            <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
              <div className="inline-flex items-center gap-2 px-sm py-xxs rounded-xs border border-hairline bg-canvas-soft text-primary text-eyebrow-mono">
                <Shield className="h-3 w-3" />
                <span>Razorpay-Secured</span>
              </div>
              <div className="inline-flex items-center gap-2 px-sm py-xxs rounded-xs border border-hairline bg-canvas-soft text-primary text-eyebrow-mono">
                <Waves className="h-3 w-3" />
                <span>Multimodal Ready</span>
              </div>
            </div>

            <h1 className="text-display-xl text-ink-strong tracking-tight leading-[1.05]">
              Buy like a product company. <br />
              <span className="text-primary">Operate like a fintech stack.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-body-lg text-mute">
              Choose a plan, open Razorpay Checkout, and let the backend reconcile the entire flow before your account upgrades. No fake buttons. No manual refresh roulette.
            </p>

            <div className="mt-8 inline-flex items-center gap-2 p-1 border border-hairline bg-canvas-soft rounded-sm">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={cn(
                  "px-lg py-sm text-button-md transition-colors rounded-xs",
                  billingPeriod === "monthly"
                    ? "bg-canvas text-ink border border-hairline"
                    : "text-mute hover:text-ink border border-transparent"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("annual")}
                className={cn(
                  "flex items-center gap-2 px-lg py-sm text-button-md transition-colors rounded-xs",
                  billingPeriod === "annual"
                    ? "bg-canvas text-ink border border-hairline"
                    : "text-mute hover:text-ink border border-transparent"
                )}
              >
                Annual
                <span className="bg-primary-soft text-primary px-xs py-xxs rounded-xs text-caption-strong">
                  SAVE
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
              className="group relative rounded-sm border border-hairline bg-canvas-soft p-xl transition-all hover:bg-canvas"
            >
              <div className="absolute top-4 right-4 text-[10px] font-mono font-bold text-mute group-hover:text-primary transition-colors">
                § 0{index + 1}
              </div>
              <div className="mb-6 inline-flex border border-hairline bg-canvas p-md rounded-sm">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-3">
                <h2 className="text-display-sm text-ink-strong">{item.title}</h2>
                <p className="text-body-sm text-mute">{item.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-4 py-16 border-t border-hairline mt-10">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="text-display-md text-ink-strong">
              Frequently Asked <span className="text-primary">Questions</span>
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
                className="group relative rounded-sm border border-hairline bg-canvas p-xl hover:bg-canvas-soft transition-colors"
              >
                <div className="absolute top-4 right-4 text-[10px] font-mono font-bold text-mute group-hover:text-primary transition-colors">
                  Q {index + 1}
                </div>
                <div className="space-y-2">
                  <h3 className="text-body-lg-strong text-ink-strong">{faq.question}</h3>
                  <p className="text-body text-mute">{faq.answer}</p>
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
            className="mx-auto max-w-3xl rounded-sm border border-hairline bg-canvas-soft px-8 py-12 text-center"
          >
            <h2 className="text-display-md text-ink-strong">
              Ready to hear your analysis out loud and inspect your charts like a pro?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-body text-mute">
              Upgrade, run a sector report, and use the new multimodal studio to generate voice briefings and structured chart analysis directly from the results page.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/dashboard">
                <Button size="xl">
                  Open Dashboard
                  <ArrowRight className="h-5 w-5 ml-2" />
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
