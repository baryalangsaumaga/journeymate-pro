// Thin wrapper over navigator.geolocation.watchPosition with a Manila fallback.
// GPS fixes are throttled (≥2 s apart) and coordinates are rounded to ~100 m
// so small drifts don't cascade into expensive re-renders / API refetches.
import { useEffect, useRef, useState, useCallback } from "react";

export interface GeoFix {
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;     // m/s
  accuracy: number;
  ts: number;
}

const FALLBACK: GeoFix = {
  lat: 14.5895, lng: 120.9740, heading: null, speed: null, accuracy: 9999, ts: Date.now(),
};

// Round to 3 decimal places (~111 m precision) so micro-drift is ignored.
const snap = (v: number) => Math.round(v * 1000) / 1000;

const MIN_INTERVAL_MS = 2000; // ignore fixes closer together than this

export function useGeolocation(enabled = true) {
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const lastEmit = useRef(0);

  const handlePosition = useCallback((pos: GeolocationPosition) => {
    const now = Date.now();
    if (now - lastEmit.current < MIN_INTERVAL_MS) return; // throttle
    lastEmit.current = now;

    const newLat = snap(pos.coords.latitude);
    const newLng = snap(pos.coords.longitude);

    setFix(prev => {
      // Skip update if snapped coords haven't moved (avoids re-render)
      if (prev && prev.lat === newLat && prev.lng === newLng) {
        // Still update speed/heading/accuracy silently — they don't feed query keys
        if (prev.heading === pos.coords.heading && prev.speed === pos.coords.speed && Math.abs(prev.accuracy - pos.coords.accuracy) < 5) {
          return prev; // truly identical — no update
        }
        return { ...prev, heading: pos.coords.heading, speed: pos.coords.speed, accuracy: pos.coords.accuracy, ts: pos.timestamp };
      }
      return {
        lat: newLat, lng: newLng,
        heading: pos.coords.heading, speed: pos.coords.speed,
        accuracy: pos.coords.accuracy, ts: pos.timestamp,
      };
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported");
      setFix(FALLBACK);
      return;
    }
    watchId.current = navigator.geolocation.watchPosition(
      handlePosition,
      err => { setError(err.message); setFix(prev => prev ?? FALLBACK); },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 },
    );
    return () => { if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current); };
  }, [enabled, handlePosition]);

  return { fix, error };
}

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

