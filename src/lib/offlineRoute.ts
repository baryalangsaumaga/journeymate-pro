// Persists & restores the most recent route, steps, and nearby places so navigation
// continues working without a signal. Stored under a single key in localStorage.
import type { RouteResult } from "@/lib/routing";
import type { Location } from "@/types/travel";

const KEY = "trailsync:offlineRoute:v1";

export interface OfflineRouteCache {
  savedAt: number;
  destination: Location | null;
  route: RouteResult | null;
  nearby: Location[];
  mode: string;
}

export function saveOfflineRoute(c: Omit<OfflineRouteCache, "savedAt">) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...c, savedAt: Date.now() })); } catch { /* ignore */ }
}

export function loadOfflineRoute(): OfflineRouteCache | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as OfflineRouteCache : null;
  } catch { return null; }
}

export function clearOfflineRoute() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
