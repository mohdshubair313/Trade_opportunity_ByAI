"use client";

import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, Sparkles, TrendingUp, TrendingDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BorderBeam } from "@/components/animations/BorderBeam";
import { Marquee } from "@/components/animations/Marquee";
import { BlurIn } from "@/components/animations";

// Mock sector vitals — frozen so the hero is stable across server / client.
const PREVIEW_SECTORS = [
    { name: "Pharmaceuticals", change: +2.34, bars: [40, 60, 45, 70, 55, 80, 90] },
    { name: "Technology", change: +1.08, bars: [30, 45, 52, 48, 62, 58, 72] },
    { name: "Renewable Energy", change: -0.62, bars: [60, 55, 50, 58, 52, 48, 45] },
];

// Social-proof row — sectors we cover. Real names feel more trustworthy than
// invented brand logos, and we don't need to lie about customers we don't have.
const MARQUEE_SECTORS = [
    "Pharmaceuticals",
    "Technology",
    "Renewable Energy",
    "Fintech",
    "Automotive",
    "FMCG",
    "Metals & Mining",
    "Healthcare",
    "Real Estate",
    "Infrastructure",
    "Banking",
    "Media",
];

export function Hero() {
    const sectionRef = useRef<HTMLElement | null>(null);
    // Scroll-tied motion: the preview drifts up and fades as the page
    // scrolls past it. This is what gives the section that "living" feel
    // without any explicit looping animation.
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start start", "end start"],
    });
    const previewY = useTransform(scrollYProgress, [0, 1], [0, -80]);
    const previewOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.1]);
    const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

    return (
        <section
            ref={sectionRef}
            className="relative min-h-[95vh] flex items-center justify-center overflow-hidden pt-20 pb-28"
        >
            {/* Calm violet backdrop above the threads */}
            <div className="absolute inset-0 pointer-events-none">
                <div
                    className="absolute left-1/2 top-0 -translate-x-1/2 w-[1100px] h-[700px]"
                    style={{
                        background:
                            "radial-gradient(60% 60% at 50% 0%, rgba(139, 92, 246, 0.22) 0%, transparent 70%)",
                    }}
                />
                <div
                    className="absolute left-1/3 bottom-0 w-[600px] h-[400px]"
                    style={{
                        background:
                            "radial-gradient(50% 50% at 50% 100%, rgba(217, 70, 239, 0.12) 0%, transparent 70%)",
                    }}
                />
                <div className="landing-grid absolute inset-0" />
            </div>

            <motion.div
                style={{ y: heroY }}
                className="container relative z-10 px-4 mx-auto"
            >
                {/* Eyebrow */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex justify-center mb-8"
                >
                    <Link
                        href="/pricing"
                        className="group inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-[#12101f]/70 backdrop-blur-xl px-4 py-1.5 text-xs font-medium text-violet-200 transition-all hover:border-violet-400/50 hover:text-white hover:shadow-[0_0_24px_rgba(139,92,246,0.25)]"
                    >
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-auth-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-gradient-to-r from-violet-400 to-fuchsia-400" />
                        </span>
                        Now with agentic AI + live grounding
                        <ArrowRight className="h-3 w-3 opacity-70 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </motion.div>

                {/* Headline — blur-in reveal */}
                <BlurIn
                    duration={0.8}
                    className="mx-auto max-w-4xl text-center text-5xl md:text-7xl lg:text-[6rem] leading-[1.05] tracking-tight text-white block mb-6 font-extrabold [text-shadow:0_2px_30px_rgba(0,0,0,0.6)]"
                >
                    Market intelligence,{" "}
                    <span className="italic bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent font-display block mt-2 [text-shadow:none]">
                        written for you.
                    </span>
                </BlurIn>

                {/* Sub-copy */}
                <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.35 }}
                    className="mx-auto mt-7 max-w-2xl text-center text-base md:text-lg text-white/80 leading-relaxed [text-shadow:0_1px_16px_rgba(0,0,0,0.7)]"
                >
                    TradeInsight reads the news, the filings and the tape — then writes a
                    sector report tailored to your persona, capital and risk appetite. In
                    under fifteen seconds.
                </motion.p>

                {/* CTAs */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.45 }}
                    className="mt-12 flex flex-col sm:flex-row gap-4 items-center justify-center"
                >
                    <Link href="/dashboard">
                        <Button
                            size="lg"
                            className="group relative h-12 px-8 text-sm font-bold tracking-wide bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-500 text-white border-none overflow-hidden hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] transition-all"
                        >
                            <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                                <span className="animate-auth-shine absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                            </span>
                            Start analyzing
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                    </Link>
                    <Link href="/pricing">
                        <Button size="lg" variant="outline" className="h-12 px-8 text-sm font-semibold tracking-wide backdrop-blur-xl bg-white/[0.06] hover:bg-white/[0.12] transition-all border-white/15 text-white hover:border-white/30">
                            See pricing
                        </Button>
                    </Link>
                </motion.div>

                {/* Trust row */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.55 }}
                    className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/60"
                >
                    <span>Free tier · No card required</span>
                    <span className="h-1 w-1 rounded-full bg-white/40" />
                    <span>20+ NSE sectors</span>
                    <span className="h-1 w-1 rounded-full bg-white/40" />
                    <span>Cited sources on every claim</span>
                </motion.div>

                {/* Product preview — scroll-tied parallax + border beam. */}
                <motion.div
                    style={{ y: previewY, opacity: previewOpacity }}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.5 }}
                    className="mt-20 md:mt-24 mx-auto max-w-5xl"
                >
                    <HeroPreview />
                </motion.div>

                {/* Marquee strip — infinite horizontal scroll of covered sectors. */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.9 }}
                    className="mt-16 md:mt-20"
                >
                    <p className="text-center text-[11px] font-medium uppercase tracking-[0.22em] text-white/55 mb-5">
                        Covering the sectors that move the Nifty
                    </p>
                    <Marquee speed={55}>
                        {MARQUEE_SECTORS.map((s) => (
                            <div
                                key={s}
                                className="flex items-center gap-2 text-sm font-medium text-white/65 hover:text-white transition-colors"
                            >
                                <span className="h-1 w-1 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" />
                                {s}
                            </div>
                        ))}
                    </Marquee>
                </motion.div>
            </motion.div>
        </section>
    );
}

// ---------------------------------------------------------------------------
// Hero preview — cursor-tracking parallax tilt + animated border beam
// ---------------------------------------------------------------------------

function HeroPreview() {
    const cardRef = useRef<HTMLDivElement | null>(null);
    // Raw cursor deltas normalised to [-0.5, 0.5] then spring-damped so the
    // tilt feels weighted, not twitchy.
    const mvX = useMotionValue(0);
    const mvY = useMotionValue(0);
    const rotateY = useSpring(useTransform(mvX, [-0.5, 0.5], [8, -8]), {
        stiffness: 150,
        damping: 20,
    });
    const rotateX = useSpring(useTransform(mvY, [-0.5, 0.5], [-6, 6]), {
        stiffness: 150,
        damping: 20,
    });

    const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mvX.set((e.clientX - rect.left) / rect.width - 0.5);
        mvY.set((e.clientY - rect.top) / rect.height - 0.5);
    };

    const handleLeave = () => {
        mvX.set(0);
        mvY.set(0);
    };

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            className="relative"
            style={{ perspective: 1200 }}
        >
            {/* Violet halo beneath the card */}
            <div
                className="absolute -inset-x-10 -bottom-10 h-40 blur-3xl pointer-events-none"
                style={{
                    background:
                        "radial-gradient(50% 100% at 50% 100%, rgba(139, 92, 246, 0.3) 0%, transparent 70%)",
                }}
            />

            <motion.div
                style={{ rotateY, rotateX, transformStyle: "preserve-3d" }}
                className="relative rounded-3xl border border-white/12 bg-[#0c0c16]/80 backdrop-blur-2xl shadow-2xl shadow-black/60 overflow-hidden"
            >
                {/* The beam sits above the card's content, below interactive areas. */}
                <BorderBeam size={260} duration={9} colorFrom="#a78bfa" colorTo="transparent" />
                <BorderBeam size={220} duration={11} delay={4} colorFrom="#e879f9" colorTo="transparent" />

                {/* Window chrome */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                        <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                    </div>
                    <div className="text-[11px] font-mono text-white/45">
                        tradeinsight.ai/results
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-md bg-violet-500/15 border border-violet-400/30 px-2 py-0.5 text-[10px] font-medium text-violet-200">
                        <Sparkles className="h-3 w-3" />
                        Live
                    </div>
                </div>

                {/* Body */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-5">
                    {/* Left: sector cards */}
                    <div className="md:col-span-2 space-y-3">
                        {PREVIEW_SECTORS.map((s) => (
                            <div
                                key={s.name}
                                className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] hover:border-violet-400/25 hover:bg-white/[0.06] transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm font-medium text-white">{s.name}</span>
                                        <span
                                            className={`inline-flex items-center gap-1 text-xs font-semibold ${s.change >= 0 ? "text-emerald-300" : "text-rose-300"
                                                }`}
                                        >
                                            {s.change >= 0 ? (
                                                <TrendingUp className="h-3 w-3" />
                                            ) : (
                                                <TrendingDown className="h-3 w-3" />
                                            )}
                                            {s.change >= 0 ? "+" : ""}
                                            {s.change.toFixed(2)}%
                                        </span>
                                    </div>
                                    <div className="flex items-end gap-1 h-8">
                                        {s.bars.map((h, i) => (
                                            <div
                                                key={i}
                                                className={`flex-1 rounded-sm ${s.change >= 0
                                                    ? "bg-gradient-to-t from-violet-500/40 to-fuchsia-400/60"
                                                    : "bg-rose-400/40"
                                                    }`}
                                                style={{ height: `${h}%` }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right: report excerpt */}
                    <div className="space-y-3">
                        <div className="p-4 rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                            <div className="text-[10px] font-medium uppercase tracking-wider text-violet-300/80 mb-2">
                                Top Opportunity
                            </div>
                            <p className="text-[13px] leading-relaxed text-white/80">
                                Pharma CDMOs continue to benefit from US supply-chain reshoring
                                <a
                                    href="#"
                                    className="inline-block align-super text-[10px] font-medium text-violet-200 bg-violet-500/20 border border-violet-400/25 rounded px-1 mx-0.5 no-underline"
                                    onClick={(e) => e.preventDefault()}
                                >
                                    [3]
                                </a>
                                , with Q1 order books up 18% YoY.
                            </p>
                        </div>
                        <div className="p-4 rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                            <div className="text-[10px] font-medium uppercase tracking-wider text-rose-300/80 mb-2">
                                Primary Risk
                            </div>
                            <p className="text-[13px] leading-relaxed text-white/80">
                                USD weakness offsets margin expansion for exporters — hedge
                                window is narrowing.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-white/[0.08] bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10">
                            <Zap className="h-3.5 w-3.5 text-fuchsia-300" />
                            <span className="text-[11px] font-medium text-white/70">
                                Generated in 12.4s · 3 cited sources
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}