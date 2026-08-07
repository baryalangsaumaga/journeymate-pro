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

const MIN_INTERVAL_MS = 500; // Fast enough for smooth navigation

function computeHeading(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const toDeg = (rad: number) => rad * 180 / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function useGeolocation(enabled = true) {
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const lastEmit = useRef(0);

  const handlePosition = useCallback((pos: GeolocationPosition) => {
    const now = Date.now();
    if (now - lastEmit.current < MIN_INTERVAL_MS) return; // throttle
    lastEmit.current = now;

    const newLat = pos.coords.latitude;
    const newLng = pos.coords.longitude;

    setFix(prev => {
      // Calculate a synthetic heading if the device doesn't provide a compass heading
      // and the user has moved at least ~1 meter.
      let finalHeading = pos.coords.heading;
      if (finalHeading === null && prev && prev.lat !== newLat && prev.lng !== newLng) {
         const dist = distanceMeters({lat: prev.lat, lng: prev.lng}, {lat: newLat, lng: newLng});
         if (dist > 1.0) {
            finalHeading = computeHeading(prev.lat, prev.lng, newLat, newLng);
         } else {
            finalHeading = prev.heading; // retain previous heading if we barely moved
         }
      }

      // Skip update if coords haven't moved (avoids re-render)
      if (prev && prev.lat === newLat && prev.lng === newLng) {
        if (prev.heading === finalHeading && prev.speed === pos.coords.speed && Math.abs(prev.accuracy - pos.coords.accuracy) < 5) {
          return prev;
        }
        return { ...prev, heading: finalHeading, speed: pos.coords.speed, accuracy: pos.coords.accuracy, ts: pos.timestamp };
      }
      return {
        lat: newLat, lng: newLng,
        heading: finalHeading, speed: pos.coords.speed,
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

