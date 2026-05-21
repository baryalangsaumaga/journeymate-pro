// Drag-to-reorder route planner. Lives inside ItineraryPage detail view.
import { GripVertical, X, ArrowUp, ArrowDown, Route as RouteIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRoutePlanner, type PlannedStop } from "@/hooks/useRoutePlanner";
import { PlaceSearchInput } from "@/components/travel/PlaceSearchInput";
import type { TransitType } from "@/types/travel";

const MODES: TransitType[] = ["car", "bus", "train", "bike", "walk"];

interface Props {
  initial?: PlannedStop[];
}

export function RoutePlannerPanel({ initial = [] }: Props) {
  const { stops, legs, totals, add, removeAt, move, setMode } = useRoutePlanner(initial);

  return (
    <div className="space-y-3">
      <PlaceSearchInput
        placeholder="Add a stop to your route…"
        exclude={stops.map(s => s.id)}
        onPick={place => add({ id: place.id, location: place, transitType: "car" })}
      />

      {stops.length === 0 ? (
        <Card className="border-0 card-interactive">
          <CardContent className="p-6 text-center">
            <RouteIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs font-semibold text-muted-foreground">No stops yet</p>
            <p className="text-[10px] text-muted-foreground mt-1">Search above to start planning your route.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-1.5">
            {stops.map((s, i) => (
              <div key={s.id}>
                <Card className="border-0 card-interactive">
                  <CardContent className="p-2.5 flex items-center gap-2">
                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{s.location.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize truncate">{s.location.type}</p>
                    </div>
                    <select
                      value={s.transitType}
                      onChange={e => setMode(i, e.target.value as TransitType)}
                      className="text-[10px] h-7 px-1.5 rounded-lg bg-muted border-0 font-semibold capitalize"
                    >
                      {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <div className="flex flex-col gap-0.5">
                      <Button variant="ghost" size="icon" className="h-5 w-5" disabled={i === 0} onClick={() => move(i, i - 1)}>
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-5 w-5" disabled={i === stops.length - 1} onClick={() => move(i, i + 1)}>
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeAt(i)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </CardContent>
                </Card>
                {legs[i] && (
                  <div className="flex items-center gap-2 pl-8 py-1 text-[10px] text-muted-foreground">
                    <div className="w-0.5 h-3 bg-border rounded" />
                    <span>{legs[i].distanceKm.toFixed(1)} km · {legs[i].durationMin} min</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Card className="border-0 card-elevated">
            <CardContent className="p-3 flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <RouteIcon className="w-3.5 h-3.5 text-primary" /> Route Total
              </span>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px] font-semibold">{totals.distanceKm.toFixed(1)} km</Badge>
                <Badge variant="outline" className="text-[10px] font-semibold">{totals.durationMin} min</Badge>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
