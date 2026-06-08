// "Generate from prompt" – weighted-score recommender + schedule arrangement.
// Caller can grab the generated `scheduled` stops and pass them to Navigation.
import { useMemo, useState } from "react";
import { Sparkles, Loader2, Zap, Clock, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { mockLocations } from "@/data/mockData";
import { PlaceCard } from "@/components/travel/PlaceCard";
import type { Location, ItineraryStop } from "@/types/travel";

const INTERESTS: { id: string; label: string; types: Location["type"][] }[] = [
  { id: "food", label: "Foodie", types: ["restaurant"] },
  { id: "culture", label: "Culture", types: ["landmark"] },
  { id: "nature", label: "Nature", types: ["viewpoint"] },
  { id: "luxury", label: "Stay", types: ["hotel"] },
  { id: "city", label: "City Life", types: ["city", "poi"] },
];

export type Strategy = "time" | "experience";
export type Pace = "relaxed" | "balanced" | "packed";

const PACE_STOPS: Record<Pace, number> = { relaxed: 3, balanced: 5, packed: 7 };
const PACE_DUR: Record<Pace, number> = { relaxed: 120, balanced: 75, packed: 45 }; // minutes per stop

interface Props {
  centerLat?: number;
  centerLng?: number;
  onUseAsTrip?: (stops: ItineraryStop[], strategy: Strategy, pace: Pace) => void;
}

export function AutoItineraryPanel({ centerLat = 14.5895, centerLng = 120.9740, onUseAsTrip }: Props) {
  const [prompt, setPrompt] = useState("");
  const [picked, setPicked] = useState<string[]>(["culture", "food"]);
  const [strategy, setStrategy] = useState<Strategy>("time");
  const [pace, setPace] = useState<Pace>("balanced");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<ItineraryStop[] | null>(null);

  const toggle = (id: string) =>
    setPicked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const ranked = useMemo(() => {
    const matchTypes = new Set(INTERESTS.filter(i => picked.includes(i.id)).flatMap(i => i.types));
    const dists = mockLocations.map(l => Math.hypot(l.lat - centerLat, l.lng - centerLng));
    const maxD = Math.max(...dists, 0.001);
    return mockLocations.map((p, i) => {
      const ratingScore = ((p.rating ?? 3) / 5) * 20;
      const interestScore = matchTypes.has(p.type) ? 40 : 0;
      // Time-optimized weighs distance more; experience-optimized weighs rating more.
      const distanceWeight = strategy === "time" ? 60 : 25;
      const ratingWeight = strategy === "time" ? 20 : 55;
      const distanceScore = (1 - dists[i] / maxD) * distanceWeight;
      const score = (ratingScore / 20) * ratingWeight + interestScore + distanceScore;
      return { place: p, score: Math.round(score), dist: dists[i] };
    }).sort((a, b) => b.score - a.score);
  }, [picked, centerLat, centerLng, strategy]);

  const generate = () => {
    setGenerating(true);
    setTimeout(() => {
      const count = PACE_STOPS[pace];
      const slot = PACE_DUR[pace];
      let cursor = 9 * 60; // start at 09:00, minutes since midnight
      const stops: ItineraryStop[] = ranked.slice(0, count).map((r, idx) => {
        const arr = cursor;
        const dep = arr + slot;
        cursor = dep + 30; // 30-min travel between stops
        // Slot meals: a restaurant near 12:00 and 18:30 wins a small boost (already handled via interests).
        const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
        return {
          id: `auto-${idx}-${r.place.id}`,
          location: r.place,
          arrivalTime: fmt(arr),
          departureTime: fmt(dep),
          notes: `Suggested by Tour Guide · score ${r.score}`,
          transitType: idx === 0 ? "walk" : "car",
          isCompleted: false,
        };
      });
      setGenerated(stops);
      setGenerating(false);
    }, 700);
  };

  return (
    <div className="space-y-3">
      <Card className="border-0 card-elevated bg-gradient-to-br from-primary/8 to-accent/5">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-display font-bold">Personal Tour Guide</span>
            <Badge className="text-[8px] h-[15px] bg-primary/10 text-primary border-0 ml-auto">Auto</Badge>
          </div>

          <Input
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g. romantic weekend with great food & views"
            className="h-9 rounded-xl text-xs border-border bg-card"
          />

          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Interests</p>
            <div className="flex flex-wrap gap-1.5">
              {INTERESTS.map(i => (
                <button
                  key={i.id}
                  onClick={() => toggle(i.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                    picked.includes(i.id) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1"><Brain className="w-2.5 h-2.5" /> Strategy</p>
              <div className="grid grid-cols-2 gap-1">
                {(["time", "experience"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setStrategy(s)}
                    className={`px-1.5 py-1.5 rounded-lg text-[10px] font-semibold capitalize transition-all ${
                      strategy === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s === "time" ? "Time" : "Experience"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Pace</p>
              <div className="grid grid-cols-3 gap-1">
                {(["relaxed", "balanced", "packed"] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPace(p)}
                    className={`px-1 py-1.5 rounded-lg text-[9px] font-semibold capitalize transition-all ${
                      pace === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={generate} disabled={generating || picked.length === 0} className="w-full h-10 rounded-xl gap-1.5 shadow-travel font-semibold text-xs">
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            {generating ? "Arranging…" : "Generate Itinerary"}
          </Button>
        </CardContent>
      </Card>

      {generated && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="section-header">Your Day, Arranged</h3>
            <Badge variant="outline" className="text-[9px] font-semibold">{generated.length} stops · {pace}</Badge>
          </div>
          {generated.map(s => (
            <PlaceCard
              key={s.id}
              place={s.location}
              score={0}
              actionLabel={`${s.arrivalTime} – ${s.departureTime}`}
              onAction={() => { /* schedule preview */ }}
            />
          ))}
          {onUseAsTrip && (
            <Button
              className="w-full h-10 rounded-xl shadow-travel font-semibold text-xs gap-1.5"
              onClick={() => onUseAsTrip(generated, strategy, pace)}
            >
              <Sparkles className="w-3.5 h-3.5" /> Use as Trip
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
