// Persists & restores routes per trip so navigation continues without a signal.
// Legacy single-slot key is preserved for back-compat with the current NavigationPage.
import type { RouteResult } from "@/lib/routing";
import type { Location } from "@/types/travel";

const LEGACY_KEY = "Intellitravel:offlineRoute:v1";
const KEYED_PREFIX = "Intellitravel:offlineRoute:v2:";
const INDEX_KEY = "Intellitravel:offlineRoute:index:v2";

export interface OfflineRouteCache {
  savedAt: number;
  destination: Location | null;
  route: RouteResult | null;
  alternates?: RouteResult[];
  nearby: Location[];
  mode: string;
  tripId?: string;
  tripTitle?: string;
}

// --- Legacy single-slot API (still used by NavigationPage fallback) ---
export function saveOfflineRoute(c: Omit<OfflineRouteCache, "savedAt">) {
  try { localStorage.setItem(LEGACY_KEY, JSON.stringify({ ...c, savedAt: Date.now() })); } catch { /* ignore */ }
}

export function loadOfflineRoute(): OfflineRouteCache | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    return raw ? (JSON.parse(raw) as OfflineRouteCache) : null;
  } catch { return null; }
}

export function clearOfflineRoute() {
  try { localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
}

// --- Keyed multi-trip API ---
function readIndex(): string[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

function writeIndex(ids: string[]) {
  try { localStorage.setItem(INDEX_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
}

export function saveTripOffline(tripId: string, c: Omit<OfflineRouteCache, "savedAt" | "tripId">) {
  try {
    localStorage.setItem(KEYED_PREFIX + tripId, JSON.stringify({ ...c, tripId, savedAt: Date.now() }));
    const idx = readIndex();
    if (!idx.includes(tripId)) writeIndex([...idx, tripId]);
  } catch { /* ignore */ }
}

export function getCachedTrip(tripId: string): OfflineRouteCache | null {
  try {
    const raw = localStorage.getItem(KEYED_PREFIX + tripId);
    return raw ? (JSON.parse(raw) as OfflineRouteCache) : null;
  } catch { return null; }
}

export function listCachedTrips(): OfflineRouteCache[] {
  return readIndex()
    .map(id => getCachedTrip(id))
    .filter((x): x is OfflineRouteCache => !!x);
}

export function removeCachedTrip(tripId: string) {
  try {
    localStorage.removeItem(KEYED_PREFIX + tripId);
    writeIndex(readIndex().filter(id => id !== tripId));
  } catch { /* ignore */ }
}
