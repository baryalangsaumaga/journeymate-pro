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

export type RouteLabel = "fastest" | "shorter" | "scenic" | "alternate";

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

export async function fetchRoutePlan(
  start: [number, number],
  end: [number, number],
  mode: Mode = "car"
): Promise<RoutePlan> {
  const profile = PROFILE_MAP[mode] || "driving";
  const coords = `${start[1]},${start[0]};${end[1]},${end[0]}`;
  // Walk/bike get continue_straight=false for more path variety.
  const extra = mode === "walk" || mode === "bike" ? "&continue_straight=false" : "";

  try {
    const res = await fetch(osrmUrl(profile, coords, true, extra));
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = await res.json();
    if (!data.routes?.length) throw new Error("no route");

    const all = data.routes.map(parseRoute);
    const primary = all[0];
    const alternates = all.slice(1, 3);

    // Label by relative characteristics vs primary.
    const labeled: RouteResult[] = [primary, ...alternates].map((r, i) => {
      if (i === 0) return { ...r, label: "fastest" as RouteLabel };
      const distDelta = r.distance - primary.distance;
      const durDelta = r.duration - primary.duration;
      let label: RouteLabel = "alternate";
      if (distDelta < -100) label = "shorter";
      else if (durDelta > primary.duration * 0.1) label = "scenic";
      return { ...r, label };
    });

    return { primary: labeled[0], alternates: labeled.slice(1) };
  } catch {
    // Fallback straight line — no alternates.
    const line: RouteResult = {
      coordinates: [start, end],
      distance: haversine(start, end),
      duration: haversine(start, end) / 13.9,
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
