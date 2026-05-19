// OSRM public demo routing — returns real street-level geometry + turn-by-turn steps.
// Note: the public demo server is best-effort. Falls back to a straight line on failure.

export interface RouteStep {
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  maneuver: string; // "turn", "depart", "arrive", "merge", "roundabout", etc.
  modifier?: string; // "left", "right", "slight left", etc.
  name: string; // street name
  location: [number, number]; // [lat, lng]
}

export interface RouteResult {
  coordinates: [number, number][]; // [lat,lng]
  distance: number; // meters
  duration: number; // seconds
  steps: RouteStep[];
}

const PROFILE_MAP: Record<string, string> = {
  car: "driving",
  bike: "cycling",
  walk: "foot",
  transit: "driving", // OSRM demo doesn't have transit
};

export async function fetchRoute(
  start: [number, number],
  end: [number, number],
  mode: "car" | "bike" | "walk" | "transit" = "car"
): Promise<RouteResult> {
  const profile = PROFILE_MAP[mode] || "driving";
  const url = `https://router.project-osrm.org/route/v1/${profile}/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=true`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = await res.json();
    if (!data.routes?.[0]) throw new Error("no route");

    const route = data.routes[0];
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

    return {
      coordinates,
      distance: route.distance,
      duration: route.duration,
      steps,
    };
  } catch (e) {
    // Fallback straight line
    return {
      coordinates: [start, end],
      distance: haversine(start, end),
      duration: haversine(start, end) / 13.9, // ~50 km/h
      steps: [
        { instruction: "Head toward destination", distance: haversine(start, end), duration: 0, maneuver: "depart", name: "", location: start },
        { instruction: "Arrive at destination", distance: 0, duration: 0, maneuver: "arrive", name: "", location: end },
      ],
    };
  }
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
