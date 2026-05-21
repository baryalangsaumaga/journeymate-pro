// Mock weather hook — deterministic per lat/lng so the UI is stable across renders.
// Swap the body with a real API call later without touching consumers.
import { useEffect, useState } from "react";
import type { WeatherCondition } from "@/types/travel";

export interface WeatherSnapshot {
  condition: WeatherCondition;
  tempC: number;
  feelsLikeC: number;
  humidity: number;       // %
  windKph: number;
  precipMm: number;
  uvIndex: number;
  summary: string;
}

const CONDITIONS: WeatherCondition[] = ["sunny", "cloudy", "rainy", "stormy", "snowy", "foggy", "windy"];

// Deterministic pseudo-random based on coordinate hash.
function seeded(lat: number, lng: number, salt = 0): number {
  const n = Math.sin((lat * 12.9898 + lng * 78.233 + salt) * 43758.5453) * 10000;
  return n - Math.floor(n);
}

export function useWeather(lat?: number, lng?: number) {
  const [data, setData] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lat == null || lng == null) return;
    setLoading(true);
    // Simulate network latency.
    const handle = setTimeout(() => {
      const cond = CONDITIONS[Math.floor(seeded(lat, lng) * CONDITIONS.length)];
      const tempC = Math.round(18 + seeded(lat, lng, 1) * 18);
      setData({
        condition: cond,
        tempC,
        feelsLikeC: tempC + Math.round(seeded(lat, lng, 2) * 4 - 2),
        humidity: Math.round(40 + seeded(lat, lng, 3) * 50),
        windKph: Math.round(seeded(lat, lng, 4) * 35),
        precipMm: Math.round(seeded(lat, lng, 5) * 10) / 10,
        uvIndex: Math.round(seeded(lat, lng, 6) * 11),
        summary: humanize(cond, tempC),
      });
      setLoading(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [lat, lng]);

  return { data, loading };
}

function humanize(c: WeatherCondition, t: number): string {
  const base: Record<WeatherCondition, string> = {
    sunny: "Clear skies", cloudy: "Overcast", rainy: "Light showers",
    stormy: "Thunderstorms", snowy: "Snowfall", foggy: "Low visibility", windy: "Gusty winds",
  };
  return `${base[c]} · ${t}°C`;
}
