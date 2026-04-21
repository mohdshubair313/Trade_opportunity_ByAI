"use client";

import { cn } from "@/lib/utils";

interface BorderBeamProps {
    className?: string;
    size?: number;
    duration?: number;
    delay?: number;
    colorFrom?: string;
    colorTo?: string;
}

/**
 * Magicui-style border beam. A small bright arc travels around the inside
 * edge of the parent container using `offset-path: rect()` + `offset-distance`
 * animation. The parent MUST be `position: relative` and `overflow-hidden` —
 * typical for any rounded card.
 */
export function BorderBeam({
    className,
    size = 200,
    duration = 7,
    delay = 0,
    colorFrom = "hsl(var(--primary))",
    colorTo = "transparent",
}: BorderBeamProps) {
    return (
        <div
            className={cn(
                "pointer-events-none absolute inset-0 rounded-[inherit] [border:calc(var(--border-width)*1px)_solid_transparent] ![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]",
                // The ::after element is the moving arc. We set a fixed-width
                // gradient then animate `offset-distance` along a rect() path
                // that traces the parent's inner border.
                "after:absolute after:aspect-square after:w-[var(--size)] after:animate-border-beam after:[animation-delay:var(--delay)] after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)] after:[offset-anchor:90%_50%] after:[offset-path:rect(0_auto_auto_0_round_var(--size))]",
                className,
            )}
            style={
                {
                    "--size": `${size}px`,
                    // The tailwind keyframe is `calc(var(--duration) * 1s)` so
                    // this must stay unit-less.
                    "--duration": `${duration}`,
                    "--delay": `-${delay}s`,
                    "--color-from": colorFrom,
                    "--color-to": colorTo,
                    "--border-width": 1.4,
                } as React.CSSProperties
            }
        />
    );
}
