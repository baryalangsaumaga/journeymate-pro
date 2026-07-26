import { useEffect, useState } from "react";
import { weatherApi } from "@/lib/api";
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

const snap = (v: number) => Math.round(v * 100) / 100;
const weatherCache: Record<string, WeatherSnapshot> = {};

export function useWeather(lat?: number, lng?: number) {
  const [data, setData] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lat == null || lng == null) return;

    const cacheKey = `${snap(lat)}_${snap(lng)}`;
    if (weatherCache[cacheKey]) {
      setData(weatherCache[cacheKey]);
      return;
    }

    let mounted = true;
    
    async function fetchWeather() {
      setLoading(true);
      try {
        const res = await weatherApi.getWeather({ lat: lat!, lng: lng! });
        if (mounted) {
          // Map backend format to WeatherSnapshot
          const w = res.data;
          
          // Try to map icon to local condition string if it doesn't match perfectly
          let cond: WeatherCondition = "sunny";
          const lowerSummary = String(w.summary || '').toLowerCase();
          if (lowerSummary.includes('rain')) cond = "rainy";
          else if (lowerSummary.includes('cloud')) cond = "cloudy";
          else if (lowerSummary.includes('storm')) cond = "stormy";
          else if (lowerSummary.includes('snow')) cond = "snowy";
          else if (lowerSummary.includes('fog')) cond = "foggy";
          else if (lowerSummary.includes('wind')) cond = "windy";

          const snapshot: WeatherSnapshot = {
            condition: cond,
            tempC: Math.round(w.tempC || 25),
            feelsLikeC: Math.round(w.feelsLikeC || w.tempC || 27),
            humidity: Math.round(w.humidity || 50),
            windKph: Math.round(w.windKph || 10),
            precipMm: w.precipMm || 0,
            uvIndex: w.uvIndex || 0,
            summary: w.summary || "Clear skies",
          };
          weatherCache[cacheKey] = snapshot;
          setData(snapshot);
        }
      } catch (e) {
        if (mounted) {
          // Fallback if weather API fails
          setData({
            condition: "sunny",
            tempC: 28,
            feelsLikeC: 30,
            humidity: 60,
            windKph: 10,
            precipMm: 0,
            uvIndex: 5,
            summary: "Sunny",
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    
    fetchWeather();
    
    return () => { mounted = false; };
  }, [lat, lng]);

  return { data, loading };
}
