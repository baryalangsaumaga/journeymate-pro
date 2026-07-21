// Mock multi-leg transit planner (Manila-focused).
// Suggests 1–3 candidate rides for a point-to-point trip when OSRM cannot
// produce transit itineraries. Each plan is a chain of legs: walk → ride →
// transfer → ride → walk, annotated with fare and duration.

import type { Location } from "@/types/travel";

export type TransitLegMode = "walk" | "jeepney" | "bus" | "lrt" | "mrt" | "tricycle" | "ferry";

export interface TransitLeg {
  mode: TransitLegMode;
  line: string;         // e.g. "LRT-1", "Jeepney 04C"
  from: string;         // stop / boarding point name
  to: string;           // alighting point name
  durationMin: number;
  fare: number;         // PHP
  note?: string;        // transfer hint, e.g. "5 min walk to next stop"
}

export interface TransitPlan {
  id: string;
  label: string;        // e.g. "Fastest via LRT-1"
  totalMin: number;
  totalFare: number;
  transfers: number;
  legs: TransitLeg[];
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Rough Manila transit line catalog for mock planning.
const LINES: Array<{ mode: TransitLegMode; line: string; along: [number, number]; hint: string }> = [
  { mode: "lrt", line: "LRT-1", along: [14.60, 120.98], hint: "Roxas / Taft corridor" },
  { mode: "mrt", line: "MRT-3", along: [14.58, 121.05], hint: "EDSA corridor" },
  { mode: "lrt", line: "LRT-2", along: [14.62, 121.03], hint: "Recto → Antipolo" },
  { mode: "bus", line: "EDSA Carousel", along: [14.58, 121.05], hint: "EDSA busway" },
  { mode: "jeepney", line: "Jeepney 04C", along: [14.60, 121.00], hint: "Quiapo loop" },
  { mode: "jeepney", line: "Jeepney 10H", along: [14.55, 121.02], hint: "Makati loop" },
];

function pickNearestLine(mid: { lat: number; lng: number }) {
  return LINES.slice().sort((a, b) =>
    haversineKm(mid, { lat: a.along[0], lng: a.along[1] }) -
    haversineKm(mid, { lat: b.along[0], lng: b.along[1] })
  );
}

function fareFor(mode: TransitLegMode, km: number): number {
  switch (mode) {
    case "walk": return 0;
    case "jeepney": return Math.round(13 + Math.max(0, km - 4) * 1.8);
    case "bus": return Math.round(15 + Math.max(0, km - 5) * 2.2);
    case "lrt":
    case "mrt": return Math.round(15 + km * 1.5);
    case "tricycle": return Math.round(20 + km * 6);
    case "ferry": return Math.round(50 + km * 2);
  }
}

function walkLeg(fromName: string, toName: string, km: number): TransitLeg {
  return {
    mode: "walk",
    line: "Walk",
    from: fromName,
    to: toName,
    durationMin: Math.max(1, Math.round((km / 5) * 60)),
    fare: 0,
  };
}

function rideLeg(mode: TransitLegMode, line: string, fromName: string, toName: string, km: number, speedKmh: number): TransitLeg {
  return {
    mode, line, from: fromName, to: toName,
    durationMin: Math.max(3, Math.round((km / speedKmh) * 60)),
    fare: fareFor(mode, km),
  };
}

function summarize(legs: TransitLeg[]): Pick<TransitPlan, "totalMin" | "totalFare" | "transfers"> {
  const rides = legs.filter(l => l.mode !== "walk").length;
  return {
    totalMin: legs.reduce((s, l) => s + l.durationMin, 0),
    totalFare: legs.reduce((s, l) => s + l.fare, 0),
    transfers: Math.max(0, rides - 1),
  };
}

export function planTransit(start: Location | { lat: number; lng: number; name?: string }, end: Location): TransitPlan[] {
  const startPt = { lat: start.lat, lng: start.lng };
  const endPt = { lat: end.lat, lng: end.lng };
  const startName = (start as any).name || "Your location";
  const endName = end.name;
  const totalKm = haversineKm(startPt, endPt);
  const mid = { lat: (startPt.lat + endPt.lat) / 2, lng: (startPt.lng + endPt.lng) / 2 };

  // Very short — walk only.
  if (totalKm < 1.2) {
    const only = walkLeg(startName, endName, totalKm);
    return [{
      id: "walk-only",
      label: "Walk all the way",
      legs: [only],
      ...summarize([only]),
    }];
  }

  // Short — single tricycle / jeepney hop.
  if (totalKm < 3.5) {
    const walkIn = walkLeg(startName, "Nearest jeepney stop", 0.3);
    const ride = rideLeg("jeepney", "Jeepney (short hop)", "Nearest jeepney stop", `Near ${endName}`, totalKm - 0.5, 22);
    const walkOut = walkLeg(`Near ${endName}`, endName, 0.2);
    const legsA: TransitLeg[] = [walkIn, ride, walkOut];
    const tri = rideLeg("tricycle", "Tricycle", startName, endName, totalKm, 20);
    return [
      { id: "jeep-hop", label: "Jeepney hop", legs: legsA, ...summarize(legsA) },
      { id: "tricycle", label: "Tricycle direct", legs: [tri], ...summarize([tri]) },
    ];
  }

  // Medium/long — build 2 plans: rail-first and bus/jeep combo.
  const nearest = pickNearestLine(mid);
  const primaryLine = nearest[0];
  const secondaryLine = nearest.find(l => l.line !== primaryLine.line) ?? nearest[1] ?? primaryLine;

  const primarySpeed = primaryLine.mode === "lrt" || primaryLine.mode === "mrt" ? 40 : primaryLine.mode === "bus" ? 22 : 18;
  const secondarySpeed = secondaryLine.mode === "lrt" || secondaryLine.mode === "mrt" ? 40 : secondaryLine.mode === "bus" ? 22 : 18;

  const planA: TransitLeg[] = [
    walkLeg(startName, `${primaryLine.line} station`, 0.4),
    rideLeg(primaryLine.mode, primaryLine.line, `${primaryLine.line} station`, `${primaryLine.line} · alight near ${endName}`, totalKm * 0.7, primarySpeed),
    { ...walkLeg(`${primaryLine.line} exit`, endName, 0.5), note: "Transfer: walk to destination" },
  ];

  const planB: TransitLeg[] = [
    walkLeg(startName, `${secondaryLine.line} stop`, 0.35),
    rideLeg(secondaryLine.mode, secondaryLine.line, `${secondaryLine.line} stop`, "Interchange", totalKm * 0.45, secondarySpeed),
    { ...walkLeg("Interchange", `${primaryLine.line} stop`, 0.25), note: `Transfer at Interchange · ~3 min walk` },
    rideLeg(primaryLine.mode, primaryLine.line, `${primaryLine.line} stop`, `Near ${endName}`, totalKm * 0.4, primarySpeed),
    walkLeg(`Near ${endName}`, endName, 0.3),
  ];

  return [
    { id: "rail-first", label: `Fastest via ${primaryLine.line}`, legs: planA, ...summarize(planA) },
    { id: "combo", label: `Cheaper: ${secondaryLine.line} → ${primaryLine.line}`, legs: planB, ...summarize(planB) },
  ].sort((a, b) => a.totalMin - b.totalMin);
}

export const transitModeIcon: Record<TransitLegMode, string> = {
  walk: "🚶",
  jeepney: "🚐",
  bus: "🚌",
  lrt: "🚈",
  mrt: "🚊",
  tricycle: "🛺",
  ferry: "⛴️",
};
