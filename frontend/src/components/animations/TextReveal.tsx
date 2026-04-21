"use client";

import { motion, useInView } from "framer-motion";
import { Fragment, ReactElement, ReactNode, useRef, isValidElement, cloneElement } from "react";
import { cn } from "@/lib/utils";

/**
 * Scroll-triggered word-by-word reveal with a subtle blur → sharp transition.
 * Works on plain strings OR on a React tree that contains strings — for
 * headings with inline spans we recurse so every word gets its own fade,
 * preserving the original markup (e.g. a serif-italic <span> stays intact
 * but its words still stagger in individually).
 */
// Only allow heading/paragraph-ish tags. Keeps the polymorphic `as` type
// narrow enough for TS to resolve the ref type without unioning every
// SVG element ever.
type TextRevealTag = "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export function TextReveal({
    children,
    className,
    as: Tag = "span",
    // How much delay per word. 0.04 = subtle, 0.08 = deliberate.
    stagger = 0.055,
    once = true,
}: {
    children: ReactNode;
    className?: string;
    as?: TextRevealTag;
    stagger?: number;
    once?: boolean;
}) {
    const ref = useRef<HTMLElement | null>(null);
    const inView = useInView(ref, { once, margin: "-80px" });
    // Shared counter so cumulative word index survives nested spans.
    const wordIndex = { current: 0 };

    const Component = Tag as React.ElementType;
    return (
        <Component ref={ref as unknown as React.Ref<HTMLElement>} className={className}>
            {renderWords(children, inView, stagger, wordIndex)}
        </Component>
    );
}

function renderWords(
    node: ReactNode,
    inView: boolean,
    stagger: number,
    index: { current: number },
): ReactNode {
    if (typeof node === "string") {
        // Split preserving spaces so the layout (line breaks, spacing) matches
        // what the browser would produce with plain text.
        const parts = node.split(/(\s+)/);
        return parts.map((part, i) => {
            if (part === "") return <Fragment key={`e-${i}`} />;
            if (/^\s+$/.test(part)) return <Fragment key={`w-${i}`}>{part}</Fragment>;
            const delay = index.current * stagger;
            index.current += 1;
            return (
                <motion.span
                    key={`${i}-${part}`}
                    initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                    animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
                    transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
                    className="inline-block will-change-transform"
                >
                    {part}
                </motion.span>
            );
        });
    }

    if (Array.isArray(node)) {
        return node.map((child, i) => (
            <Fragment key={i}>{renderWords(child, inView, stagger, index)}</Fragment>
        ));
    }

    if (isValidElement(node)) {
        const element = node as ReactElement<{ children?: ReactNode }>;
        return cloneElement(
            element,
            undefined,
            renderWords(element.props.children, inView, stagger, index),
        );
    }

    return node;
}

/**
 * Simpler fade-up reveal for paragraphs and non-headline copy.
 */
export function FadeUp({
    children,
    className,
    delay = 0,
    duration = 0.5,
    distance = 12,
    once = true,
}: {
    children: ReactNode;
    className?: string;
    delay?: number;
    duration?: number;
    distance?: number;
    once?: boolean;
}) {
    const ref = useRef(null);
    const inView = useInView(ref, { once, margin: "-60px" });
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: distance }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
            className={cn(className)}
        >
            {children}
        </motion.div>
    );
}
