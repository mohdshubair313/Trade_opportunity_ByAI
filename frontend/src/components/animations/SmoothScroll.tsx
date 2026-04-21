"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Site-wide momentum scroll. Wraps the whole app so `lenis` takes over native
 * scrolling on desktop — the result is the silky scroll feel of Linear /
 * Vercel / Arc. Touch devices are left alone (momentum there is already
 * great, and hooking Lenis on mobile can make menus feel sluggish).
 */
export function SmoothScroll() {
    useEffect(() => {
        if (typeof window === "undefined") return;

        // Respect `prefers-reduced-motion` — users with motion sensitivity get
        // the native scroll behavior instead of the momentum tween.
        const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;
        if (prefersReducedMotion) return;

        const lenis = new Lenis({
            duration: 1.15,
            // Classic ease-out-expo — feels weighty but never laggy.
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            wheelMultiplier: 1,
            touchMultiplier: 1.5,
            smoothWheel: true,
        });

        let rafId: number;
        const raf = (time: number) => {
            lenis.raf(time);
            rafId = requestAnimationFrame(raf);
        };
        rafId = requestAnimationFrame(raf);

        return () => {
            cancelAnimationFrame(rafId);
            lenis.destroy();
        };
    }, []);

    return null;
}
