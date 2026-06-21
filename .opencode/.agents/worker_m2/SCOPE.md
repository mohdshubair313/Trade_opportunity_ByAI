# Scope: Milestone 2 - Results Page Redesign

## Architecture
- Results dashboard page (`frontend/src/app/results/page.tsx`) and components (`frontend/src/components/results/ResultsComponents.tsx`).

## Concrete Tasks

### 1. Results Layout & Page Changes (`frontend/src/app/results/page.tsx`):
- Update page title header with high-contrast text gradients and proper display scaling (e.g. `bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent`).
- Fix the row 2 grid container styling. Change `h-[300px]` in `<div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[300px]">` to `md:h-[300px]` or remove the height restriction to prevent mobile layout squishing/overlapping.
- Apply glassmorphism styling to the **AI Executive Summary** wrapper (e.g. translucent backdrop, border highlights, ambient glow).
- Update section headers with modern gradient titles and spacing.
- Enhance loading views with responsive shimmer skeletons instead of simple text spinner fallback overlays.

### 2. Results Components Redesign (`frontend/src/components/results/ResultsComponents.tsx`):
- Refactor `CardShell` into an interactive glassmorphic dashboard card featuring:
  - Translucent bg (`bg-zinc-900/40 backdrop-blur-md`), thin borders (`border-white/[0.06]`), and smooth transition animations.
  - Interactive mouse pointer tracking that maps user cursor coordinates onto a glowing hover spotlight mask (radial-gradient overlay).
- Implement custom shimmer skeleton loaders (`ShimmerCard`) to show while sector vitals, news, or charts are loading.
- Enhance the Line and Area charts (`CapitalFlowChart` and `TrendProjection`):
  - Increase margins to prevent clipping on line edges (`margin={{ top: 15, right: 15, bottom: 10, left: 10 }}`).
  - Add padding or domain adjustments on Axes to ensure peaks and labels fit.
  - Swap default chart Tooltips with a custom glassmorphic `PremiumChartTooltip` component that displays date/label and values clearly.
  - Customize linear area gradients with smooth color fades.
  - Configure charts to render with smooth, slow eased animations (`duration={1000}` or `1200`).
- Ensure all types verify and compile clean.

## Verification
- Run `npx tsc --noEmit` inside the `frontend` directory to ensure zero errors.
