"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  CircleDollarSign,
  Crown,
  ShieldCheck,
  Sparkles,
  Waves,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import {
  createPaymentOrder,
  CreateOrderResponse,
  getPaymentOrder,
  listPaymentCatalog,
  PaymentCatalogItem,
  verifyPaymentOrder,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type BillingPeriod = "monthly" | "annual";
type PlanKey = "free" | "pro" | "enterprise";

type PlanDefinition = {
  key: PlanKey;
  name: string;
  accent: string;
  description: string;
  eyebrow: string;
  features: string[];
  monthlySku?: string;
  annualSku?: string;
  icon: typeof Crown;
};

const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    key: "free",
    name: "Free",
    accent: "from-slate-500/30 via-slate-200/10 to-transparent",
    description: "Best for exploring market intelligence before upgrading.",
    eyebrow: "Start exploring",
    features: [
      "5 analyses per month",
      "Popular sectors and recent market data",
      "Core dashboards and saved history",
      "Fast onboarding with guest mode",
    ],
    icon: Sparkles,
  },
  {
    key: "pro",
    name: "Pro",
    accent: "from-emerald-500/40 via-cyan-400/15 to-transparent",
    description: "For operators who need premium reports, exports, and AI copilots.",
    eyebrow: "Most popular",
    features: [
      "100 analyses per month",
      "Premium exports and richer market intelligence",
      "Instant voice briefings and multimodal chart lab",
      "Priority processing with webhook-backed order reconciliation",
    ],
    monthlySku: "plan_pro_monthly",
    annualSku: "plan_pro_annual",
    icon: Zap,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    accent: "from-amber-400/35 via-orange-300/15 to-transparent",
    description: "For teams that want unlimited runs, premium support, and maximum throughput.",
    eyebrow: "Built to scale",
    features: [
      "Unlimited analyses and premium plan entitlements",
      "Unlimited watchlists, alerts, and export workflows",
      "Priority support and full-team usage",
      "Executive-ready AI briefing surfaces for every report",
    ],
    monthlySku: "plan_enterprise_monthly",
    annualSku: "plan_enterprise_annual",
    icon: Crown,
  },
];

const PLAN_RANK: Record<PlanKey, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
};

function formatINR(paise: number): string {
  // Hardcode the currency symbol and simple formatting to avoid Intl hydration mismatches
  // which are common between Node.js server and Browser environments.
  const amount = (paise / 100).toLocaleString("en-IN");
  return `₹${amount}`;
}

function loadRazorpayCheckout(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Razorpay checkout can only run in the browser"));
      return;
    }

    if (window.Razorpay) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay checkout")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout"));
    document.body.appendChild(script);
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function PricingCheckoutGrid({
  billingPeriod,
}: {
  billingPeriod: BillingPeriod;
}) {
  const router = useRouter();
  const { isAuthenticated, userProfile, refreshUserProfile } = useAuth();
  const [catalog, setCatalog] = useState<Record<string, PaymentCatalogItem>>({});
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<string>("Orders reconcile on the backend after signature verification.");

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    listPaymentCatalog()
      .then((items) => {
        if (cancelled) return;
        const mapped = Object.fromEntries(items.map((item) => [item.sku, item]));
        setCatalog(mapped);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(error instanceof Error ? error.message : "Unable to load plans");
      })
      .finally(() => {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const currentTier = useMemo<PlanKey>(() => {
    const tier = (userProfile?.tier || "free").toLowerCase();
    if (tier === "enterprise") return "enterprise";
    if (tier === "pro") return "pro";
    return "free";
  }, [userProfile?.tier]);

  const openCheckout = async (
    order: CreateOrderResponse,
    plan: PlanDefinition,
    item: PaymentCatalogItem
  ) => {
    await loadRazorpayCheckout();
    if (!window.Razorpay) {
      throw new Error("Razorpay checkout failed to initialize");
    }

    const finalizeUpgrade = async (label = plan.name) => {
      setLiveStatus(`${label} payment settled. Syncing your account tier now...`);
      await refreshUserProfile();
      toast.success(`${label} unlocked successfully`);
      router.refresh();
    };

    const pollForSettlement = async () => {
      setLiveStatus("Payment authorized. Waiting for server-side reconciliation...");
      for (let attempt = 0; attempt < 12; attempt += 1) {
        await delay(2500);
        const latest = await getPaymentOrder(order.local_order_id);
        if (latest.status === "paid") {
          await finalizeUpgrade(plan.name);
          return latest;
        }
        if (latest.failure_reason) {
          throw new Error(latest.failure_reason);
        }
      }
      throw new Error("Payment captured but the final order sync is still pending. Please refresh in a few seconds.");
    };

    const razorpay = new window.Razorpay({
      key: order.key_id,
      amount: order.amount_paise,
      currency: order.currency,
      name: "TradeInsight AI",
      description: `${plan.name} plan • ${billingPeriod}`,
      order_id: order.razorpay_order_id || "",
      image: "/icon.png",
      prefill: {
        name: userProfile?.full_name || userProfile?.username || "",
        email: userProfile?.email || "",
      },
      notes: {
        plan_name: plan.name,
        billing_period: billingPeriod,
        local_order_id: String(order.local_order_id),
      },
      theme: {
        color: "#22c55e",
        backdrop_color: "rgba(3, 7, 18, 0.86)",
      },
      modal: {
        confirm_close: true,
        animation: true,
        ondismiss: () => {
          setLiveStatus("Checkout closed. Your server-side order remains intact until paid or expired.");
        },
      },
      handler: async (response) => {
        setLiveStatus("Payment authorized. Verifying signature with the backend...");
        const verified = await verifyPaymentOrder({
          local_order_id: order.local_order_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });

        if (verified.status === "paid") {
          await finalizeUpgrade(plan.name);
          return;
        }
        await pollForSettlement();
      },
    });

    razorpay.on("payment.failed", () => {
      setLiveStatus("Razorpay marked the payment as failed. No plan changes were applied.");
      toast.error("Payment failed. You were not charged.");
    });

    setLiveStatus(
      `${item.name} order created${order.key_id.startsWith("rzp_test") ? " in Razorpay test mode" : ""}. Opening secure checkout...`
    );
    razorpay.open();
  };

  const handlePlanAction = async (plan: PlanDefinition) => {
    if (plan.key === "free") {
      router.push("/dashboard");
      return;
    }
    if (!isAuthenticated) {
      toast("Sign in first so we can attach the upgrade to your account.", { icon: "🔐" });
      router.push("/login");
      return;
    }

    const currentRank = PLAN_RANK[currentTier];
    const targetRank = PLAN_RANK[plan.key];
    if (targetRank <= currentRank) {
      toast.success(`You already have ${plan.name} access on this account.`);
      return;
    }

    const sku = billingPeriod === "annual" ? plan.annualSku : plan.monthlySku;
    if (!sku) {
      toast.error("This plan is not available for online checkout yet.");
      return;
    }

    const item = catalog[sku];
    if (!item) {
      toast.error("The selected plan is not available in the payment catalog right now.");
      return;
    }

    try {
      setActivePlan(plan.key);
      setLiveStatus("Creating a secure Razorpay order on the backend...");
      const order = await createPaymentOrder({
        items: [{ sku, quantity: 1 }],
        currency: item.currency,
        notes: {
          plan_name: plan.name,
          billing_period: billingPeriod,
          checkout_surface: "pricing_page",
        },
      });
      await openCheckout(order, plan, item);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout failed");
      setLiveStatus("Checkout failed before settlement. No account changes were applied.");
    } finally {
      setActivePlan(null);
    }
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_38%),linear-gradient(160deg,rgba(8,12,16,0.96),rgba(9,18,24,0.94))] p-6 md:p-8"
      >
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.05),transparent)] opacity-40" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="glow">
                <ShieldCheck className="mr-1 h-3 w-3" />
                Razorpay-secured checkout
              </Badge>
              <Badge variant="outline">
                <Waves className="mr-1 h-3 w-3" />
                Webhook-backed reconciliation
              </Badge>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl [font-family:var(--font-display)]">
              Upgrade in one flow. Activate on server truth.
            </h2>
            <p className="mt-3 max-w-xl text-sm text-slate-300 md:text-base">
              Every upgrade creates a backend order first, verifies the Razorpay signature,
              and only flips your account after settlement is confirmed.
            </p>
          </div>

          <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 backdrop-blur">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4 text-emerald-400" />
              <span>Current tier: <strong className="text-white">{currentTier}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>{liveStatus}</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-8 md:grid-cols-3">
        {PLAN_DEFINITIONS.map((plan, index) => {
          const Icon = plan.icon;
          const sku = billingPeriod === "annual" ? plan.annualSku : plan.monthlySku;
          const item = sku ? catalog[sku] : null;
          const isCurrent = PLAN_RANK[currentTier] === PLAN_RANK[plan.key];
          const isLocked = plan.key !== "free" && catalogLoading;
          const priceLabel = item ? formatINR(item.price_paise) : plan.key === "free" ? "Free" : "Loading";
          const subLabel =
            plan.key === "free"
              ? "For individual exploration"
              : billingPeriod === "annual"
                ? "Billed yearly through Razorpay"
                : "Billed monthly through Razorpay";

          return (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="h-full"
            >
              <div
                className={cn(
                  "group relative h-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#070b10] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.32)] transition-all hover:border-primary/40",
                  plan.key === "pro" && "border-emerald-400/35 shadow-[0_24px_80px_rgba(16,185,129,0.18)]"
                )}
              >
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-100", plan.accent)} />
                <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                <div className="relative flex h-full flex-col">
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-emerald-300/80">
                        {plan.eyebrow}
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold">{plan.name}</h3>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/8 p-3 backdrop-blur">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </div>

                  <p className="mb-6 text-sm leading-6 text-slate-300">{plan.description}</p>

                  <div className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur">
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-semibold tracking-tight">{priceLabel}</span>
                      {plan.key !== "free" && (
                        <span className="pb-1 text-sm text-slate-400">/{billingPeriod === "annual" ? "year" : "month"}</span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{subLabel}</p>
                  </div>

                  <ul className="mb-8 space-y-3 text-sm text-slate-200">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <span className="mt-0.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 p-1">
                          <Check className="h-3 w-3 text-emerald-300" />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto space-y-3">
                    {isCurrent && (
                      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                        This is your current active tier.
                      </div>
                    )}
                    <Button
                      variant={plan.key === "pro" ? "glow" : plan.key === "enterprise" ? "gradient" : "outline"}
                      size="lg"
                      className="w-full"
                      isLoading={activePlan === plan.key}
                      disabled={isCurrent || isLocked}
                      onClick={() => void handlePlanAction(plan)}
                    >
                      {plan.key === "free"
                        ? "Enter Dashboard"
                        : isCurrent
                          ? "Current Plan"
                          : isAuthenticated
                            ? `Upgrade to ${plan.name}`
                            : `Sign in for ${plan.name}`}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    {plan.key === "enterprise" && (
                      <button
                        type="button"
                        onClick={() => router.push("/contact")}
                        className="w-full text-sm text-slate-400 transition-colors hover:text-white"
                      >
                        Prefer invoices or procurement review? Talk to sales.
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
