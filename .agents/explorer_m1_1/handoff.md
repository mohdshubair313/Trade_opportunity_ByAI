# Handoff Report — Scroll-Trapping Layout Investigation

## 1. Observation

During our investigation of the `TradeInsight AI` frontend codebase, we observed the following:

- **Results Layout (`frontend/src/app/results/layout.tsx`):**
  - Line 11: `<div className="flex h-screen bg-background overflow-hidden relative">`
  - Line 13: `<main className="flex-1 overflow-y-auto w-full">`
- **Compare Layout (`frontend/src/app/compare/layout.tsx`):**
  - Line 7: `<div className="flex h-screen bg-background overflow-hidden relative">`
  - Line 9: `<main className="flex-1 overflow-y-auto w-full">{children}</main>`
- **Alerts Layout (`frontend/src/app/alerts/layout.tsx`):**
  - Line 7: `<div className="flex h-screen bg-background overflow-hidden relative">`
  - Line 9: `<main className="flex-1 overflow-y-auto w-full">{children}</main>`
- **Favorites Layout (`frontend/src/app/favorites/layout.tsx`):**
  - Line 7: `<div className="flex h-screen bg-background overflow-hidden relative">`
  - Line 9: `<main className="flex-1 overflow-y-auto w-full">{children}</main>`
- **History Layout (`frontend/src/app/history/layout.tsx`):**
  - Line 7: `<div className="flex h-screen bg-background overflow-hidden relative">`
  - Line 9: `<main className="flex-1 overflow-y-auto w-full">{children}</main>`
- **Settings Layout (`frontend/src/app/settings/layout.tsx`):**
  - Line 11: `<div className="flex h-screen bg-background overflow-hidden relative">`
  - Line 13: `<main className="flex-1 overflow-y-auto w-full">`
- **Dashboard Page (`frontend/src/app/dashboard/page.tsx`):**
  - Line 107: `<div className="flex h-screen bg-background">`
  - Line 110: `<main className="flex-1 overflow-y-auto w-full">`
- **Sidebar Component (`frontend/src/components/dashboard/Sidebar.tsx`):**
  - Line 104: `"h-screen bg-card border-r border-border flex flex-col transition-all duration-300",`
- **Root Layout (`frontend/src/app/layout.tsx`):**
  - Lines 106–109:
    ```tsx
    <body className="min-h-screen bg-background font-sans antialiased">
      <SmoothScroll />
      <ScrollProgress />
      {children}
    ```
- **Smooth Scroll (`frontend/src/components/animations/SmoothScroll.tsx`):**
  - Initiates Lenis smooth scrolling for the global window object.
- **Scroll Progress (`frontend/src/components/animations/ScrollProgress.tsx`):**
  - Tracks scroll progress of the window via Framer Motion's `useScroll()`.

---

## 2. Logic Chain

1. The 6 layout files and `dashboard/page.tsx` set `h-screen overflow-hidden` on their parent containers and `overflow-y-auto` on the `<main>` tag. This locks the outer HTML/body to the height of the viewport and traps scrolling within the `<main>` element.
2. Because the browser window scrollbar never moves (remains locked at `0`), both the `SmoothScroll` (Lenis) and `ScrollProgress` (Framer Motion) components, which rely on the `window` scroll event, are rendered completely broken or inactive.
3. Simply removing `h-screen overflow-hidden` from the layout files will let the window scroll, but it will cause the `<Sidebar />` to scroll off-screen since it is positioned statically in the flex flow with a fixed height of `h-screen`.
4. Therefore, the sidebar class in `Sidebar.tsx` must be updated to `sticky top-0 h-screen`. This will lock it to the viewport as the user scrolls, while the layouts are updated to use `min-h-screen` and allow window-level scroll without `overflow-y-auto`.

---

## 3. Caveats

- We assumed that there are no CSS styles or animations in individual pages that strictly depend on the main area being `overflow-y-auto`. However, if any page contents depend on explicit parent element height (e.g. absolute height bounds on subcomponents), they might need minor adjustments.

---

## 4. Conclusion

The scroll-trapping problem can be resolved cleanly by:
1. Prepending `sticky top-0` to the `Sidebar`'s classes in `Sidebar.tsx`.
2. Swapping parent classes in the 6 layouts and `dashboard/page.tsx` from `h-screen overflow-hidden` to `min-h-screen`.
3. Removing `overflow-y-auto` from the `<main>` containers in these files.
Detailed proposed code changes are written in `d:\Projects\Trade_opportunity_ByAI\.agents\explorer_m1_1\analysis.md`.

---

## 5. Verification Method

To verify these changes:
1. Apply the class changes specified in `analysis.md`.
2. Start the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```
3. Open the browser and visit the dashboard (`http://localhost:3000/dashboard`), search for a sector, and verify the following:
   - The scrollbar appears on the window, not trapped inside the main content area.
   - Smooth scrolling is active.
   - The top-of-screen `ScrollProgress` green line fills as you scroll down the page.
   - The sidebar remains docked/sticky at the left edge of the viewport.
