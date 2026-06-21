# Handoff Report: TradeInsight AI Frontend Layout Scroll-Trapping Analysis

This report is a complete, self-contained summary of the layout analysis conducted on the scroll-trapping behavior within the TradeInsight AI frontend under Milestone 1 (Keyboard Scroll Fix).

## 1. Observation
The following verbatim class configurations were found in the layout and page files:

*   **`frontend/src/app/results/layout.tsx`**:
    *   Line 11: `<div className="flex h-screen bg-background overflow-hidden relative">`
    *   Line 13: `<main className="flex-1 overflow-y-auto w-full">`
*   **`frontend/src/app/compare/layout.tsx`**:
    *   Line 7: `<div className="flex h-screen bg-background overflow-hidden relative">`
    *   Line 9: `<main className="flex-1 overflow-y-auto w-full">{children}</main>`
*   **`frontend/src/app/alerts/layout.tsx`**:
    *   Line 7: `<div className="flex h-screen bg-background overflow-hidden relative">`
    *   Line 9: `<main className="flex-1 overflow-y-auto w-full">{children}</main>`
*   **`frontend/src/app/favorites/layout.tsx`**:
    *   Line 7: `<div className="flex h-screen bg-background overflow-hidden relative">`
    *   Line 9: `<main className="flex-1 overflow-y-auto w-full">{children}</main>`
*   **`frontend/src/app/history/layout.tsx`**:
    *   Line 7: `<div className="flex h-screen bg-background overflow-hidden relative">`
    *   Line 9: `<main className="flex-1 overflow-y-auto w-full">{children}</main>`
*   **`frontend/src/app/settings/layout.tsx`**:
    *   Line 11: `<div className="flex h-screen bg-background overflow-hidden relative">`
    *   Line 13: `<main className="flex-1 overflow-y-auto w-full">`
*   **`frontend/src/app/dashboard/page.tsx`**:
    *   Line 107: `<div className="flex h-screen bg-background">`
    *   Line 110: `<main className="flex-1 overflow-y-auto w-full">`
*   **`frontend/src/components/dashboard/Sidebar.tsx`**:
    *   Lines 103-106:
        ```tsx
        className={cn(
          "h-screen bg-card border-r border-border flex flex-col transition-all duration-300",
          isCollapsed ? "w-[72px]" : "w-64"
        )}
        ```
*   **`frontend/src/app/voice/page.tsx`** (Reference Implementation):
    *   Line 47: `<div className="flex min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.06),_transparent_55%),linear-gradient(180deg,#04070a,#06090d)]">`
    *   Line 49: `<main className="flex-1 px-4 py-6 sm:px-8 lg:px-12">`

---

## 2. Logic Chain
1. **Viewport Constraints:** The application of `h-screen overflow-hidden` on the layout wrapper restricts the scrollable height of the viewport to `100vh` and hides any content exceeding it.
2. **Local Content Scrolling:** The presence of `overflow-y-auto` on the child `<main>` element creates a nested, local scroll wrapper for page content.
3. **Window Scroll Bypass:** Because scrolling occurs only within the `<main>` container, the main window (`window.scrollY`) stays at `0`.
4. **Keyboard & Animation Failures:** 
    *   Standard keyboard scrolling controls (e.g. `Spacebar`, `Page Down`, `Page Up`, scroll keys) that target the window/document body scroll context fail to scroll the container.
    *   `SmoothScroll.tsx` (using Lenis) and `ScrollProgress.tsx` (using Framer Motion's `useScroll()`), which listen to the window's scroll context, are rendered completely inactive.
5. **The Solution:** Changing layout outer wrappers to `min-h-screen` (removing `h-screen overflow-hidden`) and removing `<main>`'s `overflow-y-auto` redirects overflow to the main window.
6. **Sidebar Sticking:** To keep the sidebar visible and stationary relative to the screen height as the user scrolls, the sidebar must use `sticky top-0 h-screen` (tested and proven via the `voice/page.tsx` reference page).

---

## 3. Caveats
*   We did not investigate whether other pages (not listed in the prompt) also implement custom layouts. However, a grep search for `<Sidebar />` confirmed that only the targets (plus the already-fixed `voice/page.tsx`) render the sidebar.
*   No testing of mobile responsive touch gestures was performed, though touch momentum scrolling is handled natively.

---

## 4. Conclusion
The scroll-trapping issue can be fully resolved by:
1. Swapping `h-screen overflow-hidden` with `min-h-screen` in the 6 layout files and `dashboard/page.tsx`.
2. Removing `overflow-y-auto` from the `<main>` tag in the 6 layout files and `dashboard/page.tsx`.
3. Adding `sticky top-0` to the sidebar container class in `Sidebar.tsx`.

This transition will restore standard keyboard scroll behaviors, activate the Lenis smooth-scroll engine, and fix the Framer Motion scroll progress indicator, matching the working reference implementation in `voice/page.tsx`.

---

## 5. Verification Method
1. **Compilation Check:** Run `cd frontend && npx tsc --noEmit` and `npm run lint` to verify that layout files compile correctly and do not throw type or styling exceptions.
2. **Behavioral Liveness Check:** Open the application in a browser after the changes are made, navigate to a page like `/dashboard`, and press `Space` or `Page Down`. The main window must scroll.
3. **Animation / Indicator Check:** Check that the 2px green indicator line at the top (`ScrollProgress.tsx`) fills up as you scroll, and that momentum scrolling via Lenis is functional.
