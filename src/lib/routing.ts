// OSRM public demo routing — returns real street-level geometry + turn-by-turn steps.
// Now supports alternatives per mode and returns a RoutePlan with labeled variants.

export interface RouteStep {
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  maneuver: string;
  modifier?: string;
  name: string;
  location: [number, number]; // [lat, lng]
}

export type RouteLabel = "fastest" | "shorter" | "scenic" | "alternate" | "toll-free";

export interface RouteResult {
  coordinates: [number, number][]; // [lat,lng]
  distance: number; // meters
  duration: number; // seconds
  steps: RouteStep[];
  label?: RouteLabel;
}

export interface RoutePlan {
  primary: RouteResult;
  alternates: RouteResult[];
}

const PROFILE_MAP: Record<string, string> = {
  car: "driving",
  bike: "cycling",
  walk: "foot",
  transit: "driving", // OSRM demo has no transit; handled by transitPlanner
};

type Mode = "car" | "bike" | "walk" | "transit";

function osrmUrl(profile: string, coords: string, alternatives: boolean, extra = "") {
  const alt = alternatives ? "true" : "false";
  return `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=true&alternatives=${alt}${extra}`;
}

function parseRoute(route: any): RouteResult {
  const coordinates: [number, number][] = route.geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng]
  );
  const steps: RouteStep[] = (route.legs?.[0]?.steps ?? []).map((s: any) => ({
    instruction: humanizeStep(s),
    distance: s.distance,
    duration: s.duration,
    maneuver: s.maneuver.type,
    modifier: s.maneuver.modifier,
    name: s.name || "",
    location: [s.maneuver.location[1], s.maneuver.location[0]],
  }));
  return { coordinates, distance: route.distance, duration: route.duration, steps };
}

import { itinerariesApi } from "@/lib/api";

export async function fetchRoutePlan(
  start: [number, number],
  end: [number, number],
  mode: Mode = "car"
): Promise<RoutePlan & { speed_limits?: any[] }> {
  try {
    const res = await itinerariesApi.calculateGeneric({
      start_lat: start[0],
      start_lng: start[1],
      end_lat: end[0],
      end_lng: end[1],
      mode
    });

    const data = res.data;
    if (!data.primary) throw new Error("no route");

    const primary = parseRoute(data.primary);
    primary.label = "fastest";
    
    if (mode === "transit") {
      // Geoapify provides accurate transit duration, no scaling needed.
    }

    const alternates = (data.alternatives || []).map((r: any) => {
        const parsed = parseRoute(r);
        if (mode === "transit") {
          // No scaling needed.
        }
        const distDelta = parsed.distance - primary.distance;
        const durDelta = parsed.duration - primary.duration;
        let label: RouteLabel = "alternate";
        
        if (r.is_toll_free) {
            label = "toll-free";
        } else if (distDelta < -100) {
            label = "shorter";
        } else if (durDelta > primary.duration * 0.1) {
            label = "scenic";
        }
        
        parsed.label = label;
        return parsed;
    });

    return { primary, alternates, speed_limits: data.speed_limits };
  } catch (err) {
    console.error("Backend route fetch failed, falling back", err);
    
    // Choose realistic speed divisor based on travel mode
    let speed = 13.9; // driving speed (~50 km/h)
    if (mode === "walk") speed = 1.4; // walking speed (~5 km/h)
    else if (mode === "bike") speed = 4.5; // biking speed (~16 km/h)
    else if (mode === "transit") speed = 6.0; // transit speed (~22 km/h)

    // Fallback straight line — no alternates.
    const line: RouteResult = {
      coordinates: [start, end],
      distance: haversine(start, end),
      duration: haversine(start, end) / speed,
      steps: [
        { instruction: "Head toward destination", distance: haversine(start, end), duration: 0, maneuver: "depart", name: "", location: start },
        { instruction: "Arrive at destination", distance: 0, duration: 0, maneuver: "arrive", name: "", location: end },
      ],
      label: "fastest",
    };
    return { primary: line, alternates: [] };
  }
}

// Back-compat: single-route fetch used by pages that only need the primary path.
export async function fetchRoute(
  start: [number, number],
  end: [number, number],
  mode: Mode = "car"
): Promise<RouteResult> {
  const plan = await fetchRoutePlan(start, end, mode);
  return plan.primary;
}

function humanizeStep(s: any): string {
  const type = s.maneuver.type;
  const mod = s.maneuver.modifier;
  const name = s.name ? ` onto ${s.name}` : "";
  if (type === "depart") return `Head ${mod || "out"}${name}`;
  if (type === "arrive") return `Arrive at destination`;
  if (type === "turn") return `Turn ${mod}${name}`;
  if (type === "merge") return `Merge ${mod || ""}${name}`.trim();
  if (type === "roundabout") return `Take the roundabout${name}`;
  if (type === "fork") return `Keep ${mod || "straight"}${name}`;
  if (type === "continue") return `Continue ${mod || "straight"}${name}`;
  if (type === "new name") return `Continue${name}`;
  return `${type} ${mod || ""}${name}`.trim();
}

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}
