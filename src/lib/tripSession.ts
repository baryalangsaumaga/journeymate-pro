// Tiny cross-page bus: lets ItineraryPage hand a planned trip to NavigationPage,
// and lets any card jump to the navigate tab with a destination already loaded.
import type { ItineraryStop, Location } from "@/types/travel";

export type ScheduleStrategy = "time" | "experience";
export type Pace = "relaxed" | "balanced" | "packed";

export interface PendingTrip {
  title: string;
  stops: ItineraryStop[];
  strategy: ScheduleStrategy;
  pace: Pace;
  startFrom?: { lat: number; lng: number }; // user GPS
}

export interface PendingDestination {
  location: Location;
}

let pendingTrip: PendingTrip | null = null;
let pendingDest: PendingDestination | null = null;

export const tripSession = {
  setTrip(p: PendingTrip | null) { pendingTrip = p; },
  takeTrip(): PendingTrip | null { const p = pendingTrip; pendingTrip = null; return p; },
  setDestination(d: PendingDestination | null) { pendingDest = d; },
  takeDestination(): PendingDestination | null { const p = pendingDest; pendingDest = null; return p; },
};

export function appNavigate(tab: string) {
  window.dispatchEvent(new CustomEvent("app:navigate", { detail: tab }));
}
