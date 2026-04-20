"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";
import { TrendingUp, Mail, User, Building2, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GradientText } from "@/components/animations/AnimatedText";
import { GridBackground, Spotlight } from "@/components/animations/AnimatedBackground";
import { submitContact } from "@/lib/api";

type Plan = "free" | "pro" | "enterprise";

interface FormErrors {
    name?: string;
    email?: string;
    message?: string;
}

export default function ContactPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [company, setCompany] = useState("");
    const [plan, setPlan] = useState<Plan>("enterprise");
    const [message, setMessage] = useState("");
    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const validate = (): boolean => {
        const next: FormErrors = {};
        if (!name || name.trim().length < 2) next.name = "Please enter your name";
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Valid email required";
        if (!message || message.trim().length < 10) next.message = "Tell us a bit more (at least 10 characters)";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsLoading(true);
        try {
            const resp = await submitContact({
                name: name.trim(),
                email: email.trim(),
                company: company.trim() || undefined,
                plan_interest: plan,
                message: message.trim(),
            });
            toast.success(resp.message);
            setSubmitted(true);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not send — please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    <Link href="/" className="flex items-center gap-2 mb-8">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                        <span className="font-bold text-xl">
                            Trade<span className="text-primary">Insight</span>
                        </span>
                    </Link>

                    {submitted ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-10"
                        >
                            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="h-8 w-8 text-green-500" />
                            </div>
                            <h1 className="text-3xl font-bold mb-3">Message <GradientText>received</GradientText></h1>
                            <p className="text-muted-foreground mb-8">
                                Thanks, {name.split(" ")[0]}. We&apos;ll reply to <span className="text-foreground">{email}</span> within one business day.
                            </p>
                            <Link href="/dashboard">
                                <Button variant="outline" size="lg" className="w-full">
                                    Back to dashboard
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </motion.div>
                    ) : (
                        <>
                            <h1 className="text-3xl font-bold mb-2">
                                Talk to <GradientText>Sales</GradientText>
                            </h1>
                            <p className="text-muted-foreground mb-8">
                                Tell us about your use case — team size, sectors you care about, and what you&apos;d like the product to do. We reply within one business day.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Your name</label>
                                    <Input
                                        type="text"
                                        placeholder="Aniket Ranjan"
                                        icon={<User className="h-4 w-4" />}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        error={errors.name}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Work email</label>
                                    <Input
                                        type="email"
                                        placeholder="you@company.com"
                                        icon={<Mail className="h-4 w-4" />}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        error={errors.email}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Company <span className="text-muted-foreground">(optional)</span>
                                    </label>
                                    <Input
                                        type="text"
                                        placeholder="Where you work"
                                        icon={<Building2 className="h-4 w-4" />}
                                        value={company}
                                        onChange={(e) => setCompany(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Plan you&apos;re interested in</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(["free", "pro", "enterprise"] as Plan[]).map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setPlan(p)}
                                                className={`h-10 rounded-lg border text-sm font-medium capitalize transition-colors ${plan === p
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-border text-muted-foreground hover:text-foreground"
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">How can we help?</label>
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="We analyze 15 sectors every quarter for internal research — looking for automated weekly briefs…"
                                        rows={5}
                                        className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                                    />
                                    {errors.message && (
                                        <p className="mt-1.5 text-xs text-destructive">{errors.message}</p>
                                    )}
                                </div>

                                <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                                    Send message
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </form>

                            <p className="mt-6 text-center text-sm text-muted-foreground">
                                Prefer email?{" "}
                                <a href="mailto:hello@tradeinsight.ai" className="text-primary hover:underline font-medium">
                                    hello@tradeinsight.ai
                                </a>
                            </p>
                        </>
                    )}
                </motion.div>
            </div>

            <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-muted/30">
                <GridBackground className="opacity-30" />
                <Spotlight className="-top-40 left-0" fill="#22c55e" />
                <div className="relative z-10 flex flex-col items-center justify-center p-12 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center mb-8 mx-auto">
                            <Mail className="h-12 w-12 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">
                            Built for <GradientText>real teams</GradientText>
                        </h2>
                        <p className="text-muted-foreground max-w-md">
                            Whether you&apos;re three analysts sharing a Slack channel or a research desk with an SLA, we&apos;ll scope the right plan for you.
                        </p>
                        <div className="mt-12 text-left space-y-4">
                            {[
                                "Custom sector coverage",
                                "White-label PDF / PPT exports",
                                "SSO and audit logs",
                                "Dedicated Slack channel",
                                "Volume pricing for teams",
                            ].map((feature, i) => (
                                <motion.div
                                    key={feature}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: 0.4 + i * 0.1 }}
                                    className="flex items-center gap-3"
                                >
                                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                    </div>
                                    <span className="text-muted-foreground">{feature}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
