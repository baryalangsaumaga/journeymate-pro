// Mini state machine for ordering stops on the planner tab.
// Provides reorder, insert, remove + a derived per-leg distance/duration estimate.
import { useCallback, useMemo, useState } from "react";
import type { Location, TransitType } from "@/types/travel";

export interface PlannedStop {
  id: string;
  location: Location;
  transitType: TransitType;
  notes?: string;
}

export interface Leg {
  fromId: string;
  toId: string;
  distanceKm: number;
  durationMin: number;
}

const SPEED_KMH: Record<TransitType, number> = {
  car: 70, bus: 50, train: 110, plane: 700, ferry: 35, bike: 18, walk: 5,
};

function haversineKm(a: Location, b: Location): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function useRoutePlanner(initial: PlannedStop[] = []) {
  const [stops, setStops] = useState<PlannedStop[]>(initial);

  const add = useCallback((s: PlannedStop) => setStops(prev => [...prev, s]), []);
  const removeAt = useCallback((i: number) => setStops(prev => prev.filter((_, idx) => idx !== i)), []);
  const move = useCallback((from: number, to: number) => {
    setStops(prev => {
      if (to < 0 || to >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  }, []);
  const setMode = useCallback((i: number, transitType: TransitType) => {
    setStops(prev => prev.map((s, idx) => idx === i ? { ...s, transitType } : s));
  }, []);
  const reset = useCallback((next: PlannedStop[] = []) => setStops(next), []);

  const legs = useMemo<Leg[]>(() => {
    const out: Leg[] = [];
    for (let i = 1; i < stops.length; i++) {
      const a = stops[i - 1]; const b = stops[i];
      const km = haversineKm(a.location, b.location);
      out.push({
        fromId: a.id,
        toId: b.id,
        distanceKm: km,
        durationMin: Math.round((km / SPEED_KMH[b.transitType]) * 60),
      });
    }
    return out;
  }, [stops]);

  const totals = useMemo(() => ({
    distanceKm: legs.reduce((s, l) => s + l.distanceKm, 0),
    durationMin: legs.reduce((s, l) => s + l.durationMin, 0),
  }), [legs]);

  return { stops, legs, totals, add, removeAt, move, setMode, reset };
}
