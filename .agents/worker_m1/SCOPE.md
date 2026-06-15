# Scope: Milestone 1 - Keyboard Scroll Fix

## Architecture
- Next.js 14 layouts and components in the frontend.

## Concrete Tasks
1. Edit `frontend/src/components/dashboard/Sidebar.tsx` to add `sticky top-0` to the sidebar class name.
2. Edit layout files to remove `h-screen overflow-hidden` on parent wrapper and `overflow-y-auto` on main:
   - `frontend/src/app/results/layout.tsx`
   - `frontend/src/app/compare/layout.tsx`
   - `frontend/src/app/alerts/layout.tsx`
   - `frontend/src/app/favorites/layout.tsx`
   - `frontend/src/app/history/layout.tsx`
   - `frontend/src/app/settings/layout.tsx`
3. Edit `frontend/src/app/dashboard/page.tsx` to apply the same change.
4. Run `npx tsc --noEmit` in the `frontend` folder to verify that type checking compiles clean.
