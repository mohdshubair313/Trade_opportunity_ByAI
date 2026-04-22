import type { MetadataRoute } from "next";

/**
 * Web App Manifest — serves `/manifest.webmanifest` automatically.
 *
 * Why this file exists:
 * - Makes the site installable as a Progressive Web App on Android / iOS
 *   (users get an "Add to Home Screen" prompt; the icon matches our brand).
 * - Silences the "No manifest detected" warning in Chrome DevTools →
 *   Application → Manifest, and the equivalent check from the Facebook
 *   debugger / Lighthouse.
 * - Tints the stand-alone app shell (tab bar + splash screen background)
 *   to match our near-black canvas, so the installed app doesn't flash
 *   white while loading.
 *
 * Icons reference the same `icon.png` (512×512) already colocated in this
 * directory. Chrome / Safari handle downscaling for smaller contexts
 * without visible quality loss because the source is rendered in vector
 * at 512px.
 */
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "TradeInsight AI",
        short_name: "TradeInsight",
        description:
            "AI-powered market intelligence for Indian equity sectors. Pick a sector, get a cited, persona-tuned report in under fifteen seconds.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0A0A0A",
        theme_color: "#0A0A0A",
        lang: "en-IN",
        categories: ["finance", "business", "productivity"],
        icons: [
            {
                src: "/icon.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
            {
                // Dedicated maskable variant — same mark inset into a 20% brand
                // safe-zone so Android's circle / squircle / rounded-square
                // clips never crop the logo.
                src: "/icon-maskable.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
            {
                src: "/apple-icon.png",
                sizes: "180x180",
                type: "image/png",
                purpose: "any",
            },
        ],
    };
}
