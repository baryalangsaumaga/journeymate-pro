// Unified place row used across Explore, Planner, and Auto-itinerary.
import { MapPin, Star, Plus, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Location } from "@/types/travel";

interface Props {
  place: Location;
  distanceKm?: number;
  score?: number;          // 0-100 for auto-itinerary ranking
  isFavorite?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  onFavorite?: () => void;
  onClick?: () => void;
}

export function PlaceCard({ place, distanceKm, score, isFavorite, actionLabel, onAction, onFavorite, onClick }: Props) {
  return (
    <Card className="border-0 card-interactive cursor-pointer" onClick={onClick}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="font-semibold text-[13px] truncate">{place.name}</h4>
            {typeof score === "number" && (
              <Badge className="text-[8px] h-[15px] bg-primary/10 text-primary font-bold border-0">{score}%</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {place.rating != null && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Star className="w-2.5 h-2.5 text-accent fill-accent" /> {place.rating}
              </span>
            )}
            {typeof distanceKm === "number" && (
              <span className="text-[10px] text-muted-foreground">{distanceKm.toFixed(1)} km</span>
            )}
            <span className="text-[10px] text-muted-foreground capitalize truncate">· {place.type}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {onFavorite && (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={e => { e.stopPropagation(); onFavorite(); }}>
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-destructive text-destructive" : ""}`} />
            </Button>
          )}
          {onAction && (
            <Button size="sm" className="h-7 px-2 text-[10px] rounded-lg font-semibold gap-1" onClick={e => { e.stopPropagation(); onAction(); }}>
              <Plus className="w-3 h-3" /> {actionLabel ?? "Add"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
