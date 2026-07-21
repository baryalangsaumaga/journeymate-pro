
## Goal

Make maps, trips, and navigation reliably usable offline, and enrich the Navigation page with **alternative routes** per transport mode — including **transit suggestions** (what to ride, transfer hints) and correctly calibrated **walk** and **bike** paths.

---

## 1. Offline reliability (maps, trips, navigation)

### Service worker (`public/sw.js`)
- Precache the app shell + Leaflet CSS/JS + marker assets on install.
- Add an explicit **tile cache** (`trailsync-tiles-v1`) with an LRU cap (~400 tiles) using stale-while-revalidate for `*.tile.openstreetmap.org`, `basemaps.cartocdn.com`, and the ArcGIS satellite host.
- Cache OSRM responses in a `trailsync-osrm-v1` bucket (cache-first, 24h TTL) so a re-opened trip has its route even without a signal.
- Cache Nominatim/Geoapify search responses (network-first, fallback to cache).
- Bump `VERSION` and add old-cache cleanup.

### Trip + route persistence
- Extend `src/lib/offlineRoute.ts` from single-slot to **keyed cache per trip id** (`trailsync:offlineRoute:v2:<tripId>`), with `listCachedTrips()`, `getCachedTrip(id)`, `clearAll()`.
- On trip start (`NavigationPage.tsx` + `ItineraryPage.tsx`), save: route geometry, steps, all alternatives, nearby POIs, mode, destination, stop list.
- New helper `src/lib/offlineTiles.ts`: given a route bbox + zoom range (13–16), pre-warm the tile cache by fetching tiles through `fetch()` so the SW stores them. Wire a **"Make available offline"** button on the itinerary card.

### UI signals
- Add a small **Offline** badge in `AppShell` when `navigator.onLine === false`, pulled from a new `useOnlineStatus` hook.
- Navigation page: if a fetch fails and a cached route exists, load it and show an "Offline route" chip.

---

## 2. Multi-route alternatives

### Routing layer (`src/lib/routing.ts`)
- Extend `fetchRoute` to request `alternatives=true` from OSRM and return `RouteResult[]` (primary + up to 2 alternates). Keep the existing single-return signature as `fetchPrimaryRoute` for callers that only want one.
- Each alternate carries a computed **label** (`Fastest`, `Shorter`, `Scenic`) derived from relative distance/duration deltas.
- Fallback: if OSRM returns only one route, synthesize an alternate by requesting with a mid-waypoint offset (small perpendicular nudge) — best-effort, still real geometry.

### Navigation UI (`src/components/pages/NavigationPage.tsx`)
- Render all alternates as translucent polylines; primary is bold/primary color, others are muted with dashed stroke.
- Add a **Routes** chip row above the bottom sheet: `Fastest 24m · 12km` / `Shorter 26m · 11km` / `Scenic 31m · 14km`. Tapping swaps the primary route and re-fits bounds.
- Keep alternates hidden in Trip Mode by default (toggleable) to reduce clutter.

---

## 3. Mode-specific routing

### Walk (`mode === "walk"`)
- Use OSRM `foot` profile (already mapped) but also request `alternatives=true` and `continue_straight=false` for footpath variety.
- Set map default zoom to 17 when navigating on foot for sidewalk-level detail.
- Filter step instructions to hide motorway-only maneuvers.

### Bike (`mode === "bike"`)
- Use `cycling` profile with alternatives.
- Prefer routes tagged with lower speed; when synthesizing alternates, bias one variant toward parks/greenways using the `viewpoint` POIs from `mockLocations` as soft waypoints.
- Show a **"Bike-friendly"** badge on alternates that avoid trunk roads (heuristic: fewer `merge`/`motorway` steps).

### Transit (`mode === "transit"`)
- OSRM public demo has no transit, so add a **mock transit planner** `src/lib/transitPlanner.ts`:
  - Input: start + end + optional intermediate stops.
  - Output: `TransitPlan { legs: TransitLeg[] }` where each leg is `{ mode: "walk"|"jeepney"|"bus"|"train"|"tricycle", line: string, from: string, to: string, durationMin, fare }`.
  - Uses the existing `repo.cms.transitInfo` list plus a small hand-authored Manila-area line/stop dataset to build 1–3 candidate plans (e.g., "Walk 5m → LRT-1 to EDSA → Bus 12m → Walk 3m").
- New component `src/components/travel/TransitPlanCard.tsx` renders each plan with per-leg mode icons, transfer callouts, total time, and total fare. Renders inside the Navigation bottom sheet when `mode === "transit"`.
- For point-to-point with multiple rides, the planner explicitly annotates each **transfer** ("Transfer at Taft Ave · 3 min walk").

---

## 4. Technical notes

- No backend changes; everything stays in `src/lib/*`, hooks, and page components per the mock-first architecture in `storage.ts`.
- Types: extend `RouteResult` with `label?: "fastest"|"shorter"|"scenic"`; add `RoutePlan { primary: RouteResult; alternates: RouteResult[] }`.
- Service worker version bump requires users to refresh once; existing kill-switch pattern already in place.
- Voice guide continues to read the primary route's steps; switching routes restarts the step index.

---

## Files touched

- `public/sw.js` — tile + OSRM + geocoding caches, version bump.
- `src/lib/routing.ts` — alternatives, labels, `fetchRoutePlan`.
- `src/lib/offlineRoute.ts` — keyed multi-trip cache.
- `src/lib/offlineTiles.ts` *(new)* — bbox tile pre-warm.
- `src/lib/transitPlanner.ts` *(new)* — mock multi-leg transit planner.
- `src/hooks/useOnlineStatus.ts` *(new)*.
- `src/components/travel/TransitPlanCard.tsx` *(new)*.
- `src/components/pages/NavigationPage.tsx` — alternates rendering, route chips, mode-specific zoom/filters, transit panel, offline fallback.
- `src/components/pages/ItineraryPage.tsx` — "Make available offline" action, uses new cache API.
- `src/components/layout/AppShell.tsx` — offline badge.

---

## Out of scope

- Real transit data (GTFS) — mock dataset only, per existing "backend as mocks" direction.
- Downloading entire country map regions — tile pre-warm is bounded to the active route bbox.
