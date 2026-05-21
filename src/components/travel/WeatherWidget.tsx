// Compact + expanded weather chip. Reads from useWeather, fails gracefully.
import { Cloud, CloudRain, CloudSnow, CloudFog, Sun, Wind, Zap, Droplets } from "lucide-react";
import { useWeather } from "@/hooks/useWeather";
import type { WeatherCondition } from "@/types/travel";

const ICONS: Record<WeatherCondition, typeof Sun> = {
  sunny: Sun, cloudy: Cloud, rainy: CloudRain, stormy: Zap,
  snowy: CloudSnow, foggy: CloudFog, windy: Wind,
};

interface Props {
  lat: number; lng: number;
  variant?: "chip" | "full";
  className?: string;
}

export function WeatherWidget({ lat, lng, variant = "chip", className = "" }: Props) {
  const { data, loading } = useWeather(lat, lng);

  if (loading || !data) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted text-muted-foreground text-[10px] ${className}`}>
        <div className="w-2 h-2 rounded-full bg-current animate-pulse" /> Loading…
      </div>
    );
  }

  const Icon = ICONS[data.condition];

  if (variant === "chip") {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/8 text-primary text-[10px] font-semibold ${className}`}>
        <Icon className="w-3 h-3" /> {data.tempC}° · {data.condition}
      </span>
    );
  }

  return (
    <div className={`p-3 rounded-2xl bg-gradient-to-br from-primary/8 to-accent/5 border border-primary/10 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Weather</p>
          <p className="font-display font-bold text-xl leading-none mt-1">{data.tempC}°C</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{data.summary}</p>
        </div>
        <Icon className="w-10 h-10 text-primary" strokeWidth={1.5} />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-border/30">
        <Stat label="Feels" value={`${data.feelsLikeC}°`} />
        <Stat label="Wind" value={`${data.windKph} kph`} icon={Wind} />
        <Stat label="Humidity" value={`${data.humidity}%`} icon={Droplets} />
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Wind }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-0.5 text-[9px] text-muted-foreground">
        {Icon && <Icon className="w-2.5 h-2.5" />} {label}
      </div>
      <p className="text-[11px] font-semibold mt-0.5">{value}</p>
    </div>
  );
}
