"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface MarqueeProps {
    children: ReactNode;
    className?: string;
    pauseOnHover?: boolean;
    reverse?: boolean;
    // Seconds for one full loop. Slower = feels more luxe.
    speed?: number;
    // Mask the edges so items fade in/out rather than cut off.
    fade?: boolean;
}

/**
 * Infinite horizontal scroller. The trick is to duplicate the content inline
 * and translate the inner track by exactly -50% — because half the track is
 * an exact clone, the loop point is seamless.
 */
export function Marquee({
    children,
    className,
    pauseOnHover = true,
    reverse = false,
    speed = 40,
    fade = true,
}: MarqueeProps) {
    return (
        <div
            className={cn(
                "group flex overflow-hidden",
                fade &&
                "[mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]",
                className,
            )}
        >
            <div
                className={cn(
                    "flex shrink-0 items-center gap-10 pr-10 whitespace-nowrap",
                    "[animation:marquee-scroll_var(--marquee-duration)_linear_infinite]",
                    reverse && "[animation-direction:reverse]",
                    pauseOnHover && "group-hover:[animation-play-state:paused]",
                )}
                style={{ ["--marquee-duration" as string]: `${speed}s` }}
            >
                {children}
                {children}
            </div>
        </div>
    );
}
