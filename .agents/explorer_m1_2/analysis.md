# Scroll-Trapping Layout Analysis & Transition Plan

## Executive Summary
The TradeInsight AI frontend implements scroll trapping by applying `h-screen` and `overflow-hidden` classes to the outer layout wrappers of seven key files, coupled with `overflow-y-auto` on their `<main>` content elements. This prevents native browser/window-level scrolling, which breaks keyboard accessibility (such as `Space`, `PageUp`, `PageDown`, and arrow keys) and disables standard scrolling features like smooth scroll momentum (Lenis) and viewport scroll progress tracking (Framer Motion). 

By transitioning layouts to a `min-h-screen` structure, removing `overflow-y-auto` from the main content elements, and configuring the sidebar with `sticky top-0 h-screen`, we can restore natural window-level scrolling while keeping the sidebar pinned to the side.

---

## 1. Scroll-Trapping Class Breakdown
Below is the precise mapping of files, line numbers, and styling classes responsible for trapping the scroll within viewport boundaries:

### A. Layout Files (`frontend/src/app/...`)

| File Path | Outer Wrapper (Scroll-Trapped Parent) | Main Content Area (Child Scroll View) |
|---|---|---|
| **`results/layout.tsx`** | Line 11: `<div className="flex h-screen bg-background overflow-hidden relative">` | Line 13: `<main className="flex-1 overflow-y-auto w-full">` |
| **`compare/layout.tsx`** | Line 7: `<div className="flex h-screen bg-background overflow-hidden relative">` | Line 9: `<main className="flex-1 overflow-y-auto w-full">{children}</main>` |
| **`alerts/layout.tsx`** | Line 7: `<div className="flex h-screen bg-background overflow-hidden relative">` | Line 9: `<main className="flex-1 overflow-y-auto w-full">{children}</main>` |
| **`favorites/layout.tsx`** | Line 7: `<div className="flex h-screen bg-background overflow-hidden relative">` | Line 9: `<main className="flex-1 overflow-y-auto w-full">{children}</main>` |
| **`history/layout.tsx`** | Line 7: `<div className="flex h-screen bg-background overflow-hidden relative">` | Line 9: `<main className="flex-1 overflow-y-auto w-full">{children}</main>` |
| **`settings/layout.tsx`** | Line 11: `<div className="flex h-screen bg-background overflow-hidden relative">` | Line 13: `<main className="flex-1 overflow-y-auto w-full">` |

### B. Page Files (`frontend/src/app/...`)

| File Path | Outer Wrapper (Scroll-Trapped Parent) | Main Content Area (Child Scroll View) |
|---|---|---|
| **`dashboard/page.tsx`** | Line 107: `<div className="flex h-screen bg-background">` | Line 110: `<main className="flex-1 overflow-y-auto w-full">` |

---

## 2. Current Sidebar Configuration & Positioning
- **Layout Flow:** The `<Sidebar />` component (defined in `frontend/src/components/dashboard/Sidebar.tsx`) is rendered as the first immediate child of a flex container (`flex`) in each layout or page. The second child is the `<main>` tag containing the page content.
- **Dimensionality:** 
  - The sidebar uses `h-screen` (Line 104 in `Sidebar.tsx`) to occupy the exact height of the viewport.
  - The layout's outer wrapper uses `h-screen overflow-hidden` to restrict the viewport height and hide overflow.
  - The `<main>` tag is assigned `flex-1 overflow-y-auto w-full` to occupy the remaining width and handle all scrollable content locally.
- **Scroll Behavior:** Under this setup, the sidebar remains visually fixed because the overall window does not scroll. The browser viewport itself has zero scroll height. Only the `<main>` element has scrollable height.
- **The Issue:** Since the `<main>` element holds the scrollbar rather than the window (`body`), browser features relying on window scroll (e.g. keyboard shortcuts, momentum smooth scrolling engines, scrollbar indicators) fail to trigger or measure correctly.

---

## 3. Transition Plan & Concrete Class Changes

To enable natural window-level scrolling while maintaining the desktop layout (a pinned, full-height sidebar and scrolling content), we must:
1. Allow the root/parent layout wrappers to expand naturally to content height (`min-h-screen` instead of `h-screen`).
2. Remove the local scrollbars from the `<main>` element (remove `overflow-y-auto`).
3. Make the Sidebar sticky so it stays in place relative to the viewport (`sticky top-0 h-screen`) while the page scrolls.

### Proposed File Modifications

#### 1. `frontend/src/app/results/layout.tsx`
* **Before (Lines 11-15):**
  ```tsx
  <div className="flex h-screen bg-background overflow-hidden relative">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">
          {children}
      </main>
  </div>
  ```
* **After (Lines 11-15):**
  ```tsx
  <div className="flex min-h-screen bg-background relative">
      <Sidebar />
      <main className="flex-1 w-full">
          {children}
      </main>
  </div>
  ```

#### 2. `frontend/src/app/compare/layout.tsx`
* **Before (Lines 7-10):**
  ```tsx
  <div className="flex h-screen bg-background overflow-hidden relative">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">{children}</main>
  </div>
  ```
* **After (Lines 7-10):**
  ```tsx
  <div className="flex min-h-screen bg-background relative">
      <Sidebar />
      <main className="flex-1 w-full">{children}</main>
  </div>
  ```

#### 3. `frontend/src/app/alerts/layout.tsx`
* **Before (Lines 7-10):**
  ```tsx
  <div className="flex h-screen bg-background overflow-hidden relative">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">{children}</main>
  </div>
  ```
* **After (Lines 7-10):**
  ```tsx
  <div className="flex min-h-screen bg-background relative">
      <Sidebar />
      <main className="flex-1 w-full">{children}</main>
  </div>
  ```

#### 4. `frontend/src/app/favorites/layout.tsx`
* **Before (Lines 7-10):**
  ```tsx
  <div className="flex h-screen bg-background overflow-hidden relative">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">{children}</main>
  </div>
  ```
* **After (Lines 7-10):**
  ```tsx
  <div className="flex min-h-screen bg-background relative">
      <Sidebar />
      <main className="flex-1 w-full">{children}</main>
  </div>
  ```

#### 5. `frontend/src/app/history/layout.tsx`
* **Before (Lines 7-10):**
  ```tsx
  <div className="flex h-screen bg-background overflow-hidden relative">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">{children}</main>
  </div>
  ```
* **After (Lines 7-10):**
  ```tsx
  <div className="flex min-h-screen bg-background relative">
      <Sidebar />
      <main className="flex-1 w-full">{children}</main>
  </div>
  ```

#### 6. `frontend/src/app/settings/layout.tsx`
* **Before (Lines 11-15):**
  ```tsx
  <div className="flex h-screen bg-background overflow-hidden relative">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">
          {children}
      </main>
  </div>
  ```
* **After (Lines 11-15):**
  ```tsx
  <div className="flex min-h-screen bg-background relative">
      <Sidebar />
      <main className="flex-1 w-full">
          {children}
      </main>
  </div>
  ```

#### 7. `frontend/src/app/dashboard/page.tsx`
* **Before (Lines 107-110):**
  ```tsx
      <div className="flex h-screen bg-background">
        <Sidebar />
  
        <main className="flex-1 overflow-y-auto w-full">
  ```
* **After (Lines 107-110):**
  ```tsx
      <div className="flex min-h-screen bg-background">
        <Sidebar />
  
        <main className="flex-1 w-full">
  ```

#### 8. `frontend/src/components/dashboard/Sidebar.tsx`
To make the sidebar stick during scrolling without replicating classes in every layout, we apply the `sticky` and `top-0` layout classes directly within the Sidebar's outer element definition.
* **Before (Lines 103-106):**
  ```tsx
      className={cn(
        "h-screen bg-card border-r border-border flex flex-col transition-all duration-300",
        isCollapsed ? "w-[72px]" : "w-64"
      )}
  ```
* **After (Lines 103-106):**
  ```tsx
      className={cn(
        "sticky top-0 h-screen bg-card border-r border-border flex flex-col transition-all duration-300",
        isCollapsed ? "w-[72px]" : "w-64"
      )}
  ```

---

## 4. Architectural Verification and Impact Analysis

### A. Support for Global Animations & Lenis Smooth Scroll
- **Lenis Smooth Scroll (`SmoothScroll.tsx`):**
  - Lenis intercepts default window wheel events and applies a customized ease-out momentum tween. 
  - In the current layout, because the window's root body doesn't overflow, the window scroll event is never triggered, rendering the smooth-scroll engine completely non-functional.
  - After applying the proposed changes, the window will overflow normally, activating Lenis to deliver the intended smooth scroll momentum.
- **Framer Motion Scroll Progress (`ScrollProgress.tsx`):**
  - The progress bar tracks `scrollYProgress` from Framer Motion's `useScroll()`, which defaults to monitoring the window's vertical scroll percentage.
  - Currently, since the window scroll position is stuck at `0`, the indicator remains frozen and hidden.
  - Transitioning to a window-level scroll will automatically re-enable `useScroll()`, making the emerald scroll progress bar function correctly.

### B. Mobile vs Desktop Considerations
- **Desktop:** The sidebar stays locked in viewport view (`sticky top-0 h-screen`), and content scrolls alongside it.
- **Mobile:** The sidebar is typically collapsed or hidden on smaller breakpoints via CSS. This transition maintains responsive behavior, as standard responsive classes (e.g. `md:flex`, hidden states, or mobile overlays) will continue to layout cleanly.

### C. Reference Implementation
The voice agent page (`frontend/src/app/voice/page.tsx`) already uses this non-scroll-trapping configuration:
- Line 47: `<div className="flex min-h-screen bg-...`
- Line 48: `<Sidebar />`
- Line 49: `<main className="flex-1 px-4 py-6 ...`
This proves that the proposed layout model is already functional in the workspace, compiles without errors, and achieves the exact keyboard scroll fix desired.
