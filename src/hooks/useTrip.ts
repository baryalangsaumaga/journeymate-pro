// Wraps trip lookup against the mock dataset. Single source of truth so pages,
// the wizard, and the planner all stay consistent when we swap to Cloud later.
import { useCallback, useState } from "react";
import { mockTrips } from "@/data/mockData";
import type { Trip, ItineraryStop } from "@/types/travel";

export function useTrip(initial?: Trip) {
  const [trips, setTrips] = useState<Trip[]>(mockTrips);
  const [activeId, setActiveId] = useState<string>(initial?.id ?? mockTrips[0]?.id);

  const active = trips.find(t => t.id === activeId) ?? trips[0];

  const upsert = useCallback((trip: Trip) => {
    setTrips(prev => {
      const idx = prev.findIndex(t => t.id === trip.id);
      if (idx === -1) return [trip, ...prev];
      const copy = [...prev]; copy[idx] = trip; return copy;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setTrips(prev => prev.filter(t => t.id !== id));
  }, []);

  const setStops = useCallback((id: string, stops: ItineraryStop[]) => {
    setTrips(prev => prev.map(t => t.id === id ? { ...t, stops } : t));
  }, []);

  return { trips, active, setActiveId, upsert, remove, setStops, setTrips };
}
