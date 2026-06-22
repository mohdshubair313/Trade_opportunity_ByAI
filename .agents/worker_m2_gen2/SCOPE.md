# Scope: Milestone 2 - Results Page Redesign Fixes (Gen 2)

## Architecture
- Results page components (`frontend/src/components/results/ResultsComponents.tsx`).

## Tasks

### 1. Fix Recharts Animation Easing TypeScript Mismatch:
In `frontend/src/components/results/ResultsComponents.tsx`:
- Locate all occurrences of `animationEasing="cubic-bezier(0.16, 1, 0.3, 1)"` (e.g. around lines 365, 530, 542).
- Recharts only accepts `AnimationTiming` types: `'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear'`.
- Change `"cubic-bezier(0.16, 1, 0.3, 1)"` to `"ease-out"`.

### 2. Optimize Mouse Hover Coordinate Tracking in `CardShell`:
In `frontend/src/components/results/ResultsComponents.tsx`:
- Currently, calling `getBoundingClientRect()` on every `onMouseMove` event causes layout thrashing.
- Fix this by caching the card's bounding box when the mouse enters the card.
- Example structure:
  ```tsx
  const rectRef = useRef<DOMRect | null>(null);
  const handleMouseEnter = () => {
      if (cardRef.current) {
          rectRef.current = cardRef.current.getBoundingClientRect();
      }
      setIsHovered(true);
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!rectRef.current) return;
      setCoords({
          x: e.clientX - rectRef.current.left,
          y: e.clientY - rectRef.current.top,
      });
  };
  const handleMouseLeave = () => {
      rectRef.current = null;
      setIsHovered(false);
  };
  ```
- Make sure to update the attributes on the container component:
  ```tsx
  onMouseEnter={handleMouseEnter}
  onMouseMove={handleMouseMove}
  onMouseLeave={handleMouseLeave}
  ```

### 3. Verify Compilation:
- Run `npx tsc --noEmit` in the `frontend` folder to verify that type checking compiles clean with zero errors.
