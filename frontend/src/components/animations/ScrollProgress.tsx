"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/**
 * A 2px emerald hairline pinned to the top of the viewport that fills left
 * to right as you scroll. Tracked with a light spring so it feels alive
 * without being frenetic.
 */
export function ScrollProgress() {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 140,
        damping: 26,
        mass: 0.35,
    });

    return (
        <motion.div
            style={{ scaleX, transformOrigin: "0% 50%" }}
            className="fixed left-0 right-0 top-0 z-[60] h-[2px] bg-gradient-to-r from-primary via-emerald-400 to-primary/80 pointer-events-none"
        />
    );
}
