# TradeInsight AI Scroll-Trapping Layout Analysis

This report documents the detailed investigation into the scroll-trapping layout architecture of the TradeInsight AI frontend. It outlines the current issues, identifies the exact file and line locations where scroll-trapping classes are applied, explains the sidebar positioning relative to the content, and proposes concrete class changes to transition to a modern `min-h-screen` window-scrolling structure with a sticky sidebar.

---

## 1. Summary of Findings

1. **Scroll-Trapping Wrappers:** Across 6 layout files (`results/layout.tsx`, `compare/layout.tsx`, `alerts/layout.tsx`, `favorites/layout.tsx`, `history/layout.tsx`, `settings/layout.tsx`) and 1 page file (`dashboard/page.tsx`), the application sets `h-screen` and `overflow-hidden` on parent wrappers and `overflow-y-auto` on the child `<main>` element. This prevents the browser window from scrolling, trapping scrolling inside the sub-containers.
2. **Broken UX Enhancements:** 
   - **Lenis Smooth Scroll (`SmoothScroll.tsx`):** Since it hooks into the `window` scroll event, momentum-based smooth scrolling is completely inactive on these layout routes.
   - **Scroll Progress Hairline (`ScrollProgress.tsx`):** Tracks the window scroll position (`scrollYProgress` from Framer Motion). Because the window scroll is locked at `0`, the progress bar remains stuck at the start and does not fill as the user scrolls content.
3. **Sidebar Independence:** The `<Sidebar />` component relies on `h-screen` but lacks sticky or fixed positioning. If the parent layout scroll-trapping is removed without adjusting the sidebar, the sidebar will scroll out of view. Changing the sidebar wrapper to `sticky top-0 h-screen` resolves this, keeping the navigation docked while letting the main layout content scroll naturally.

---

## 2. Detailed Breakdown of Checked Files

Here is the exact analysis of each file identified by the request:

### 2.1 `frontend/src/app/results/layout.tsx`
- **Exact Scroll-Trapping Lines:**
  - **Line 11:** `<div className="flex h-screen bg-background overflow-hidden relative">`
  - **Line 13:** `<main className="flex-1 overflow-y-auto w-full">`
- **Sidebar Integration:** The layout places the `<Sidebar />` adjacent to `<main>` as a flex child. The viewport-locked parent wrapper restricts height to `100vh`.

### 2.2 `frontend/src/app/compare/layout.tsx`
- **Exact Scroll-Trapping Lines:**
  - **Line 7:** `<div className="flex h-screen bg-background overflow-hidden relative">`
  - **Line 9:** `<main className="flex-1 overflow-y-auto w-full">{children}</main>`
- **Sidebar Integration:** Flex container pattern similar to `results/layout.tsx`.

### 2.3 `frontend/src/app/alerts/layout.tsx`
- **Exact Scroll-Trapping Lines:**
  - **Line 7:** `<div className="flex h-screen bg-background overflow-hidden relative">`
  - **Line 9:** `<main className="flex-1 overflow-y-auto w-full">{children}</main>`
- **Sidebar Integration:** Flex container pattern similar to `results/layout.tsx`.

### 2.4 `frontend/src/app/favorites/layout.tsx`
- **Exact Scroll-Trapping Lines:**
  - **Line 7:** `<div className="flex h-screen bg-background overflow-hidden relative">`
  - **Line 9:** `<main className="flex-1 overflow-y-auto w-full">{children}</main>`
- **Sidebar Integration:** Flex container pattern similar to `results/layout.tsx`.

### 2.5 `frontend/src/app/history/layout.tsx`
- **Exact Scroll-Trapping Lines:**
  - **Line 7:** `<div className="flex h-screen bg-background overflow-hidden relative">`
  - **Line 9:** `<main className="flex-1 overflow-y-auto w-full">{children}</main>`
- **Sidebar Integration:** Flex container pattern similar to `results/layout.tsx`.

### 2.6 `frontend/src/app/settings/layout.tsx`
- **Exact Scroll-Trapping Lines:**
  - **Line 11:** `<div className="flex h-screen bg-background overflow-hidden relative">`
  - **Line 13:** `<main className="flex-1 overflow-y-auto w-full">`
- **Sidebar Integration:** Flex container pattern similar to `results/layout.tsx`.

### 2.7 `frontend/src/app/dashboard/page.tsx`
- **Exact Scroll-Trapping Lines:**
  - **Line 107:** `<div className="flex h-screen bg-background">`
  - **Line 110:** `<main className="flex-1 overflow-y-auto w-full">`
- **Sidebar Integration:** This page does not use a layout file wrapper; instead, it directly imports and positions the `<Sidebar />` component next to a `<main>` container within its own return block.

---

## 3. Sidebar Positioning & Configuration

In `frontend/src/components/dashboard/Sidebar.tsx` (Lines 100–107):
```tsx
<motion.aside
  initial={{ x: -20, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  className={cn(
    "h-screen bg-card border-r border-border flex flex-col transition-all duration-300",
    isCollapsed ? "w-[72px]" : "w-64"
  )}
>
```
- **Height Configuration:** The sidebar uses the `h-screen` class (`100vh`) to take up the full viewport height.
- **Scroll Configuration:** The navigation portion inside the sidebar uses `flex-1 py-4 overflow-y-auto` (Line 140). This allows navigation items to scroll independently if they exceed the viewport height (e.g., on short displays or mobile screens), while keeping the sidebar's top header and user profile bottom footer pinned.
- **Positioning:** Since the parent wrapper has `flex`, the sidebar is placed as a sibling to `<main>`. Once `h-screen overflow-hidden` is removed from parent containers, a static `h-screen` sidebar will scroll out of view with the page. Adding `sticky top-0` keeps it locked in the viewport.

---

## 4. Concrete Layout Class Changes

To migrate the application to a modern window-scrolling architecture while maintaining sticky sidebars, apply the following class modifications:

### 4.1 Update `Sidebar.tsx`
Modify `frontend/src/components/dashboard/Sidebar.tsx` class definition on line 104 to prepend `sticky top-0`:
- **Before:**
  ```tsx
  className={cn(
    "h-screen bg-card border-r border-border flex flex-col transition-all duration-300",
    isCollapsed ? "w-[72px]" : "w-64"
  )}
  ```
- **After:**
  ```tsx
  className={cn(
    "sticky top-0 h-screen bg-card border-r border-border flex flex-col transition-all duration-300",
    isCollapsed ? "w-[72px]" : "w-64"
  )}
  ```

### 4.2 Update Layouts (`results`, `compare`, `alerts`, `favorites`, `history`, `settings`)
In each layout file, replace `h-screen` and `overflow-hidden` on the outer `div` with `min-h-screen`, and remove `overflow-y-auto` from the `<main>` tag:

- **Before:**
  ```tsx
  <div className="flex h-screen bg-background overflow-hidden relative">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">
          {children}
      </main>
  </div>
  ```
- **After:**
  ```tsx
  <div className="flex min-h-screen bg-background relative">
      <Sidebar />
      <main className="flex-1 w-full">
          {children}
      </main>
  </div>
  ```

### 4.3 Update `dashboard/page.tsx`
Apply the same changes in `frontend/src/app/dashboard/page.tsx` around line 107:
- **Before:**
  ```tsx
  <div className="flex h-screen bg-background">
    <Sidebar />
    <main className="flex-1 overflow-y-auto w-full">
  ```
- **After:**
  ```tsx
  <div className="flex min-h-screen bg-background">
    <Sidebar />
    <main className="flex-1 w-full">
  ```

### 4.4 Why this layout is robust
1. **Window-Level Scrolling:** The `min-h-screen` on the container tells the page to expand vertically to fit the content, delegating scrollbar management to the browser's global window.
2. **Sticky Navigation:** Prepending `sticky top-0 h-screen` to the `<Sidebar />` ensures it occupies the exact viewport height and docks to the top edge during scrolling.
3. **No Layout Shifts:** Content widths (`flex-1 w-full` / `w-64` / `w-[72px]`) are preserved, ensuring layout geometry remains identical.
4. **Restored Features:** Automatically reactivates the custom Lenis smooth scroll and enables the `ScrollProgress` hairline to correctly fill as the page scrolls.
