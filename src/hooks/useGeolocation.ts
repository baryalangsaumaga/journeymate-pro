// Thin wrapper over navigator.geolocation.watchPosition with a Manila fallback.
import { useEffect, useRef, useState } from "react";

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

export function useGeolocation(enabled = true) {
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported");
      setFix(FALLBACK);
      return;
    }
    watchId.current = navigator.geolocation.watchPosition(
      pos => setFix({
        lat: pos.coords.latitude, lng: pos.coords.longitude,
        heading: pos.coords.heading, speed: pos.coords.speed,
        accuracy: pos.coords.accuracy, ts: pos.timestamp,
      }),
      err => { setError(err.message); setFix(prev => prev ?? FALLBACK); },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 },
    );
    return () => { if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current); };
  }, [enabled]);

  return { fix, error };
}

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
