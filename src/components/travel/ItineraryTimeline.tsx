// Pure-render timeline used inside ItineraryPage (and reusable for previews).
import { CheckCircle2, Circle, Clock, Navigation, Car, Bus, Train, Plane, Ship, Bike, Footprints } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ItineraryStop, TransitType, WeatherCondition } from "@/types/travel";

const TRANSIT_ICONS: Record<TransitType, typeof Car> = {
  car: Car, bus: Bus, train: Train, plane: Plane, ferry: Ship, bike: Bike, walk: Footprints,
};
const WEATHER_ICONS: Record<WeatherCondition, string> = {
  sunny: "☀️", cloudy: "⛅", rainy: "🌧️", stormy: "⛈️", snowy: "❄️", foggy: "🌫️", windy: "💨",
};

interface Props {
  stops: ItineraryStop[];
  onToggle?: (stopId: string) => void;
  onPick?: (stop: ItineraryStop) => void;
}

export function ItineraryTimeline({ stops, onToggle, onPick }: Props) {
  return (
    <div className="space-y-0">
      {stops.map((stop, idx) => {
        const TransitIcon = TRANSIT_ICONS[stop.transitType];
        const isNext = !stop.isCompleted && (idx === 0 || stops[idx - 1].isCompleted);
        const showDayHeader = idx === 0 || stop.dayNumber !== stops[idx - 1].dayNumber;
        return (
          <div key={stop.id} className="space-y-2">
            {showDayHeader && (
              <div className="flex items-center gap-2 pt-2.5 pb-2.5 first:pt-0">
                <span className="text-[10px] font-display font-bold text-primary tracking-wide uppercase bg-primary/10 px-2.5 py-1 rounded-lg">
                  Day {stop.dayNumber}
                </span>
                <div className="h-[1px] bg-border flex-1" />
              </div>
            )}
            <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <button
                onClick={() => onToggle?.(stop.id)}
                disabled={!onToggle}
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                  stop.isCompleted ? "bg-success text-success-foreground shadow-sm"
                    : isNext ? "bg-primary text-primary-foreground shadow-travel"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {stop.isCompleted ? <CheckCircle2 className="w-4 h-4" /> : isNext ? <Navigation className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              </button>
              {idx < stops.length - 1 && (
                <div className="flex flex-col items-center flex-1 my-0.5">
                  <div className={`w-0.5 h-6 ${stop.isCompleted ? "bg-success" : "bg-border"}`} />
                  {stops[idx + 1]?.distanceFromPrevious > 0 && (
                    <div className="text-[9px] text-muted-foreground flex flex-col items-center gap-0.5 my-1 bg-background/80 px-1 py-0.5 rounded shadow-sm border border-border/40">
                      <span>{Math.round(stops[idx + 1].distanceFromPrevious!)}km</span>
                      <span>{Math.round(stops[idx + 1].driveTimeFromPrevious!)}m</span>
                    </div>
                  )}
                  <div className={`w-0.5 min-h-6 flex-1 ${stop.isCompleted ? "bg-success" : "bg-border"}`} />
                </div>
              )}
            </div>
            <Card
              onClick={() => onPick?.(stop)}
              className={`flex-1 border-0 mb-3 ${onPick ? "cursor-pointer" : ""} ${isNext ? "card-elevated ring-1 ring-primary/20" : "card-interactive"}`}
            >
              <CardContent className="p-3.5">
                {isNext && <Badge className="text-[8px] h-[16px] bg-primary/10 text-primary font-bold border-0 mb-1.5">NEXT STOP</Badge>}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-[13px]">{stop.location.name}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{stop.notes}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {stop.weather && <span className="text-sm">{WEATHER_ICONS[stop.weather]}</span>}
                    {stop.temperature != null && <span className="text-xs font-semibold">{stop.temperature}°</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2.5">
                  <Badge variant="outline" className="text-[9px] h-5 gap-1 font-medium">
                    <Clock className="w-2.5 h-2.5" /> {stop.arrivalTime} - {stop.departureTime}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] h-5 gap-1 font-medium capitalize">
                    <TransitIcon className="w-2.5 h-2.5" /> {stop.transitType}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    })}
    </div>
  );
}
