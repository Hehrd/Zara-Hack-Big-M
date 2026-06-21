# Pull homepage-animation changes + rerun

## Context
The friending + settings feature is code-complete and E2E-verified, but its work
is **uncommitted** in the working tree. The user pushed a new commit to
`origin/main` — `e7730ff "Polish homepage onboarding animations"` — and wants to
pull it and rerun the app.

History has diverged: local has `12e20a4` (scoring-weights, committed) that origin
lacks; origin has `e7730ff` that local lacks. So `git pull` will create a **merge
commit** (not a fast-forward).

### What the incoming commit actually changes (verified)
`e7730ff` touches **only 5 frontend files** — it does NOT touch the backend:
- `frontend/package.json` + `package-lock.json` — adds dependency `motion ^12.40.0`
- `frontend/src/pages/HomePage.jsx` — +342 lines of onboarding animations
- `frontend/src/index.css` — 8 lines of animation styles
- `frontend/src/components/layout/AppShell.jsx` — homepage header redesign
  (adds `isHome` prop to `PublicShell`, restyles the public header)

The backend deltas seen in `git diff HEAD..origin/main` are pure divergence noise
from local `12e20a4`; the merge keeps that feature and `AnalysisService`'s
`getAnalysisSummaries` / `getAnalysisDetail` (which `FriendService` depends on) are
untouched. Backend needs no rebuild/restart.

## The one real conflict
Only `AppShell.jsx` overlaps. My uncommitted local edits to it:
- import `Settings, Users` from lucide
- add `{ to: '/friends', ... }` and `{ to: '/settings', ... }` to `productLinks`
- extend `isPublic` with `|| pathname.startsWith('/api/add-friend')`

Origin's `e7730ff` rewrote the `isPublic` return line (`<PublicShell isHome=... />`)
and the whole `PublicShell` body. The `productLinks` + import edits are in a
different region origin didn't touch, so those apply cleanly. The collision is the
`isPublic` line. Because committed `HEAD` AppShell == merge-base AppShell (local
`12e20a4` never touched it), the `git pull` merge itself is clean — the conflict
only appears when re-applying my stashed edits.

## Plan

1. **Stash only the conflicting file** so the merge runs clean:
   `git stash push -- frontend/src/components/layout/AppShell.jsx`
   (Other dirty tracked files — AuthForm.jsx, the two backend files, routeTree.gen.js
   — aren't touched by `e7730ff`, so they're fine. Untracked new feature files don't
   exist on origin, so they don't conflict.)

2. **Pull (merge):** `git pull --no-rebase origin main` — brings in HomePage.jsx,
   index.css, package.json/lock, and origin's AppShell.jsx; creates a merge commit.

3. **Re-apply my AppShell edits:** `git stash pop` → expect a conflict in the
   `isPublic` region. Resolve by **combining both**:
   ```js
   const isPublic = pathname === '/' || pathname === '/login' || pathname === '/register'
     || pathname.startsWith('/api/add-friend')
   return isPublic ? <PublicShell isHome={pathname === '/'} /> : <ProductShell />
   ```
   Keep origin's redesigned `PublicShell` body verbatim; keep my `Settings, Users`
   imports and the Friends/Settings `productLinks` entries (these apply without
   conflict). Then `git stash drop` if the entry remains.
   Net result: feature work stays **uncommitted** (matching current state); only the
   pulled commit + merge commit are committed.

4. **Install the new dependency:** `cd frontend && npm install` (adds `motion`,
   currently absent from node_modules).

5. **Rerun the frontend dev server** on :3000 (restart so Vite re-optimizes deps and
   picks up `motion`). Backend on :6969 keeps running as-is (no backend changes).

## Verification
- `cd frontend && npm run build` — confirms the merged AppShell + new `motion`
  import compile cleanly.
- Browser (agent-browser) on `http://localhost:3000/`:
  - Homepage renders with the new animated header (How it works / Signals nav,
    "Analyze a location" CTA) and onboarding animations play.
  - Regression check that my feature still works: log in as
    `locus2@gmail.com / 123456789` → Settings shows the add-friend link; Friends nav
    link present and functional.
