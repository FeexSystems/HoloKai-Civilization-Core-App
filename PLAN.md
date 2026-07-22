# HoloKai Next Move Plan

Plan based on the uploaded state and a fresh review of the codebase.

## What we’re trying to do

1. Make `HoloKai - landingpage/` the public orbital-lab entry point that routes users into the `holo-kai/` Civilization Core.
2. Fix the 6 implementation bugs left over from the frontend port.
3. Apply the 3 landing-page polish requests.
4. Keep the existing project structure intact.

## What the code looks like now

- **Backend:** `python main.py` on port 8000. FastAPI with a JSON-fallback knowledge store and a broken Base44 auth integration.
- **Active frontend:** `holo-kai/` (Vite + npm + React + Base44 SDK). Runs on port 5000.
- **Landing page:** `HoloKai - landingpage/` (Vite + pnpm + React/Express). Built, but not wired into a Replit workflow.
- **Auth:** `holo-kai/src/App.jsx` wraps `/core` in `ProtectedRoute`; `AuthContext` calls Base44 endpoints that 404 because `VITE_BASE44_APP_ID` is not set. This is **outside** the scope of this plan.
- **Data:** `/api/library/search` returns seed records with `item_type`, `era`, `region`, `language`, `editorial_status`. It does **not** return `lat/lng`, `civilization`, `type`, or `summary`.

## Phase 1 — Core UI bug fixes

### 1.1 VanguardPanel double-render
- **File:** `holo-kai/src/pages/CivilizationCore.jsx`
- **Change:** Render the floating `<VanguardPanel>` only when `view !== 'vanguard'`.
- **Detail:** Line 123 should become `{view !== 'vanguard' && <VanguardPanel onOpenCitation={handleOpenCitation} />}` so the sidebar Vanguard item gets the full main-content panel and the floating overlay does not cover it.

### 1.2 Timeline era filter
- **File:** `holo-kai/src/components/core/TimelineExplorer.jsx`
- **Change:** Complete the era filter chain in the `events` memo so all six eras work.
- **Bounds:**
  - `ancient`: year < -1000
  - `classical`: -1000 <= year < 500
  - `medieval-early`: 500 <= year < 1000
  - `medieval-late`: 1000 <= year < 1500
  - `early-modern`: 1500 <= year < 1800
  - `modern`: year >= 1800
- **Also:** Normalize API era strings (e.g., `"ancient"`) to a representative year so API results participate in the filter.

### 1.3 InteractiveMap API data
- **File:** `holo-kai/src/components/core/InteractiveMap.jsx`
- **Problem:** API sources have no `lat`/`lng`, so the filter drops everything and the map always falls back to mock data.
- **Change:**
  - Add a `GEOCODE_LOOKUP` dictionary keyed by `civilization` or `region` to supply coordinates for API sources that lack them.
  - When mapping API results, look up coordinates first, then keep only items with valid coordinates.
  - If zero API items are mappable, fall back to `MOCK_MAP_LOCATIONS`.
  - Keep the existing region/layer filtering behavior.

### 1.4 Library debounce
- **File:** `holo-kai/src/components/core/Library.jsx`
- **Change:** Introduce a `useDebounce` hook (or inline timeout) and use `debouncedSearch` as the dependency for `loadFromApi` instead of `search`.
- **Target:** 300 ms.

### 1.5 Library pass all filter params to API
- **Files:** `holo-kai/src/components/core/Library.jsx`, `holo-kai/src/lib/holokaiApi.js`
- **Change:**
  - `searchLibrary` should accept `civilization` and `type` and include them in the query string.
  - `Library.jsx` should pass `filters.civilization` and `filters.type` to `searchLibrary`.
  - Keep client-side filtering as a safety net because the backend currently indexes `item_type` rather than `type` and does not store `civilization`.
- **Optional follow-up:** Extend `library_search_sources` in `main.py` / `library_catalog.py` to support `civilization` and `item_type` filters and return the fields the frontend expects.

### 1.6 Sidebar cleanup
- **File:** `holo-kai/src/components/core/Sidebar.jsx`
- **Change:** Remove the unused `Shield` import from the `lucide-react` import list.

## Phase 2 — Landing page user requests

### 2.1 Vanguard card transparency
- **File:** `HoloKai - landingpage/client/pages/Index.tsx`
- **Changes in the Vanguard section cards:**
  - Remove the `bg-zinc-950` class on the card button.
  - Remove the gradient overlay `bg-gradient-to-t from-[#020202] via-[#020202]/50 to-transparent`.
  - Add `mix-blend-mode: screen` to the unit image (`style={{ mixBlendMode: 'screen' }}` or Tailwind `mix-blend-screen`).

### 2.2 Add a navigation button to route pages from UnitLabViewer
- **File:** `HoloKai - landingpage/client/components/lab/UnitLabViewer.tsx`
- **Change:** Do **not** remove the RETURN button. Instead, add a new navigation button that routes to another key page (e.g., the Civilization Core, Library, or a unit-selection page).
- **Also:** Add the needed routing icon to the `lucide-react` import if it is not already present.
- **File:** `HoloKai - landingpage/client/pages/Index.tsx`
- **Change:** Keep `onReturnToLanding` for the RETURN button. Pass the new navigation callback (e.g., `onNavigateToCore`) to `UnitLabViewer` if it needs to route to the Civilization Core.

### 2.3 Clearer access points to Civilization Core / Library / Spline robot
- **File:** `HoloKai - landingpage/client/pages/Index.tsx`
- **Change:**
  - Replace the hardcoded `http://localhost:5173` URLs with an environment-aware URL.
  - Add `VITE_CORE_URL` to the landing page env (e.g., `http://localhost:5000` for local dev, Replit dev URL on Replit).
  - In `holo-kai/vite.config.js`, the `/api` proxy stays pointed at `http://localhost:8000`; the landing page only needs to link to the `holo-kai` root.
  - Add at least one more obvious CTA:
    - Header: keep `ENTER ALKEBULAN` and add a `CIVILIZATION CORE` text link.
    - Hero: add an `OPEN LIBRARY` or `MEET THE ROBOT` secondary button.
    - Vanguard section: add an `ACCESS CORE` strip at the bottom.

## Phase 3 — Environment & workflow

- Add a root script for landing page development:
  - In root `package.json`, add `"dev:landingpage": "cd 'HoloKai - landingpage' && pnpm dev"`.
- Add a `Landing Page (Vite)` workflow on its configured port (e.g., 8080). Note: the user can only view one preview at a time, so this is mainly for testing the entry flow.
- Add `VITE_CORE_URL` to the landing page `.env` and to Replit env vars if needed (this is a URL, not a secret).

## Phase 4 — Verify & commit

- Run `npm run build` in `holo-kai`.
- Run `pnpm build` in `HoloKai - landingpage`.
- Run both dev servers and exercise:
  - Vanguard sidebar vs overlay.
  - Timeline era filters.
  - Library search debounce and filters.
  - Map markers.
  - Landing page CTAs and links.
- Commit and push:
  - `git add -A`
  - `git commit -m "fix: post-port audit issues and landing page polish"`
  - `git push origin main`

## What is NOT in this plan

- **No auth refactor.** Base44 auth still requires `VITE_BASE44_APP_ID` and a real backend; otherwise `/core` will redirect to `/login`. That is a separate follow-up.
- **No backend data enrichment.** We are not adding `lat/lng`/`civilization`/`type` to the catalog records in this pass; the frontend will geocode/fallback gracefully.
- **No monorepo restructure.** The two frontends stay separate.

## Optional bigger follow-up (not in this plan)

Consolidate `holo-kai/` and `HoloKai - landingpage/` into a single pnpm workspace with shared components, environment variables, and one dev/build command. This would reduce duplication and make the landing-page-to-core routing seamless, but it requires moving the npm-based `holo-kai` app to pnpm and reconciling its Base44 dependencies with the landing page's Express/Vite setup. This is proposed as a separate follow-up task rather than done here.
