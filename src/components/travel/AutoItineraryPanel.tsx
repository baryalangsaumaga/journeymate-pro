// "Generate from prompt" – weighted-score recommender + schedule arrangement.
import { useMemo, useState } from "react";
import { Sparkles, Loader2, Zap, Clock, Brain, Coffee, Utensils, Calendar, Plus, Compass } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { placesApi, itinerariesApi } from "@/lib/api";
import { PlaceCard } from "@/components/travel/PlaceCard";
import type { Location, ItineraryStop } from "@/types/travel";
import { toast } from "@/hooks/use-toast";

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
  trip?: any;
  centerLat?: number;
  centerLng?: number;
  onUseAsTrip?: (stops: ItineraryStop[], strategy: Strategy, pace: Pace) => void;
  onPlanComplete?: () => void;
}

export function AutoItineraryPanel({ trip, centerLat = 14.5895, centerLng = 120.9740, onUseAsTrip, onPlanComplete }: Props) {
  const [prompt, setPrompt] = useState("");
  const [picked, setPicked] = useState<string[]>(["culture", "food"]);
  const [strategy, setStrategy] = useState<Strategy>("time");
  const [pace, setPace] = useState<Pace>("balanced");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<ItineraryStop[] | null>(null);

  const [planningRemaining, setPlanningRemaining] = useState(false);
  const [previewStops, setPreviewStops] = useState<any[] | null>(null);
  const [approving, setApproving] = useState(false);

  const tripDays = useMemo(() => {
    if (!trip?.startDate || !trip?.endDate) return 1;
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [trip]);

  const hasDay1Stops = useMemo(() => {
    return trip?.stops?.some((s: any) => s.dayNumber === 1) || false;
  }, [trip]);

  const handleAutoPlanRemaining = async () => {
    if (!trip) return;
    setPlanningRemaining(true);
    try {
      const res = await itinerariesApi.autoPlan(trip.id, true);
      if (res.data?.preview && res.data?.stops) {
        setPreviewStops(res.data.stops);
        toast({
          title: "📋 Proposed Itinerary Generated",
          description: `Review your AI-generated ${res.data.stops.length} stops below and click Approve to finalize!`
        });
      } else {
        toast({
          title: "✨ Plan Confirm",
          description: "Itinerary was successfully saved."
        });
        window.location.reload();
      }
    } catch (err: any) {
      toast({
        title: "Planning Failed",
        description: err.response?.data?.message || "Could not generate co-planner itinerary.",
        variant: "destructive"
      });
    } finally {
      setPlanningRemaining(false);
    }
  };

  const handleApprovePlan = async () => {
    if (!trip) return;
    setApproving(true);
    try {
      await itinerariesApi.autoPlan(trip.id, false);
      toast({
        title: "✨ Itinerary Confirmed!",
        description: `Successfully planned the remaining ${tripDays - 1} days based on your style.`
      });
      setPreviewStops(null);
      if (onPlanComplete) {
        onPlanComplete();
      }
      window.location.reload();
    } catch (err: any) {
      toast({
        title: "Confirmation Failed",
        description: err.response?.data?.message || "Could not save co-planner itinerary.",
        variant: "destructive"
      });
    } finally {
      setApproving(false);
    }
  };

  const handleAddDay1Stop = async (place: any, time: string, duration: number) => {
    if (!trip) return;
    try {
      await itinerariesApi.create({
        trip_id: Number(trip.id),
        place_id: place.id,
        place_name: place.name,
        place_address: place.description || place.name,
        lat: Number(place.lat),
        lng: Number(place.lng),
        day_number: 1,
        order: (trip.stops?.length || 0) + 1,
        time: time,
        duration_minutes: duration,
      });
      toast({
        title: "Added to Day 1",
        description: `Successfully added ${place.name} as a stop.`
      });
      window.location.reload();
    } catch (err: any) {
      toast({
        title: "Addition Failed",
        description: err.response?.data?.message || "Could not add stop to Day 1.",
        variant: "destructive"
      });
    }
  };

  const toggle = (id: string) =>
    setPicked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const { data: popularPlaces = [] } = useQuery({
    queryKey: ['auto_places', centerLat, centerLng],
    queryFn: async () => {
      const res = await placesApi.popular({ lat: centerLat, lng: centerLng }).catch(() => ({ data: [] }));
      return (res.data || []) as Location[];
    },
  });

  const day1Suggestions = useMemo(() => {
    if (!popularPlaces || popularPlaces.length === 0) return null;
    
    const lunch = popularPlaces.find((p: any) => 
      p.type === "restaurant" || p.type === "food" || p.type === "catering"
    );
    
    const snack = popularPlaces.find((p: any) => 
      (p.type === "cafe" || p.type === "bakery" || p.type === "bar" || p.type === "restaurant") && p.id !== lunch?.id
    );

    return { 
      lunch: lunch || popularPlaces[0], 
      snack: snack || popularPlaces[1] || popularPlaces[0] 
    };
  }, [popularPlaces]);

  const ranked = useMemo(() => {
    if (!popularPlaces.length) return [];
    const matchTypes = new Set(INTERESTS.filter(i => picked.includes(i.id)).flatMap(i => i.types));
    const dists = popularPlaces.map((l: any) => Math.hypot(l.lat - centerLat, l.lng - centerLng));
    const maxD = Math.max(...dists, 0.001);
    return popularPlaces.map((p: any, i: number) => {
      const ratingScore = ((p.rating ?? 3) / 5) * 20;
      const interestScore = matchTypes.has(p.type) ? 40 : 0;
      // Time-optimized weighs distance more; experience-optimized weighs rating more.
      const distanceWeight = strategy === "time" ? 60 : 25;
      const ratingWeight = strategy === "time" ? 20 : 55;
      const distanceScore = (1 - dists[i] / maxD) * distanceWeight;
      const score = (ratingScore / 20) * ratingWeight + interestScore + distanceScore;
      return { place: p, score: Math.round(score), dist: dists[i] };
    }).sort((a: any, b: any) => b.score - a.score);
  }, [picked, centerLat, centerLng, strategy, popularPlaces]);

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

  if (previewStops) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-display font-bold uppercase tracking-wider text-muted-foreground">Proposed AI Plan</h3>
          </div>
          <Badge className="bg-primary/10 text-primary border-0 text-[9px] font-semibold">{previewStops.length} stops</Badge>
        </div>

        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
          {Array.from({ length: tripDays - 1 }).map((_, dIdx) => {
            const dayNum = dIdx + 2;
            const dayStops = previewStops.filter((s: any) => s.dayNumber === dayNum);
            
            return (
              <div key={dayNum} className="space-y-2.5 bg-muted/40 p-3 rounded-2xl border border-border/40">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-display font-bold text-primary tracking-wide uppercase bg-primary/10 px-2.5 py-1 rounded-lg">
                    Day {dayNum} Proposed
                  </span>
                  <span className="text-[9px] text-muted-foreground font-semibold">{dayStops.length} stops</span>
                </div>

                <div className="space-y-2">
                  {dayStops.map((stop: any) => {
                    const isMeal = stop.notes.toLowerCase().includes("lunch") || stop.notes.toLowerCase().includes("snack") || stop.notes.toLowerCase().includes("dinner");
                    const Icon = stop.notes.toLowerCase().includes("snack") 
                      ? Coffee 
                      : isMeal 
                      ? Utensils 
                      : Compass;

                    return (
                      <div key={stop.id} className="flex gap-2.5 items-start bg-card p-2.5 rounded-xl border border-border/45 shadow-sm">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-semibold text-[11px] truncate leading-tight">{stop.location.name}</h4>
                            <span className="text-[9px] font-semibold text-primary flex-shrink-0 bg-primary/5 px-1.5 py-0.5 rounded-md">
                              {stop.arrivalTime}
                            </span>
                          </div>
                          <p className="text-[9px] text-muted-foreground truncate leading-normal">{stop.location.address}</p>
                          <span className="text-[8px] font-semibold text-accent/80 italic mt-0.5 block">
                            💡 {stop.notes}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            className="h-9 rounded-xl text-xs font-bold border-border"
            onClick={() => setPreviewStops(null)}
            disabled={approving}
          >
            Cancel Preview
          </Button>
          <Button
            className="h-9 rounded-xl text-xs font-bold gap-1.5 shadow-travel"
            onClick={handleApprovePlan}
            disabled={approving}
          >
            {approving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Applying Plan...
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 fill-current" />
                Approve & Apply
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {trip && tripDays > 1 && (
        <Card className="border-0 card-elevated overflow-hidden relative bg-gradient-to-tr from-primary to-accent text-primary-foreground shadow-travel mb-3">
          <div className="absolute top-0 right-0 p-3 opacity-15">
            <Brain className="w-16 h-16 rotate-12 text-white" />
          </div>
          <CardContent className="p-4 space-y-3 relative z-10">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-white fill-white animate-pulse" />
              <span className="text-[10px] font-display font-bold tracking-wide uppercase">AI Multi-Day Co-Planner</span>
            </div>
            
            <div className="space-y-1">
              <h4 className="font-display font-bold text-xs">Plan Days 2 to {tripDays}</h4>
              <p className="text-[10px] text-white/80 leading-normal">
                You've planned Day 1. Let the AI analyze your choices and automatically schedule the remaining {tripDays - 1} days with handpicked local spots!
              </p>
            </div>

            {!hasDay1Stops ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-[9px] leading-relaxed text-white border border-white/10 flex items-start gap-2">
                <span>💡</span>
                <span>Please add at least one stop to <strong>Day 1</strong> first so the AI can understand your personal travel style!</span>
              </div>
            ) : (
              <Button
                onClick={handleAutoPlanRemaining}
                disabled={planningRemaining}
                className="w-full h-8 rounded-xl bg-white hover:bg-white/90 text-primary font-bold text-[10px] gap-1.5 shadow-sm"
              >
                {planningRemaining ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Analyzing & Scheduling...
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3 fill-current" />
                    Auto-Plan {tripDays - 1} Days with AI
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {trip && day1Suggestions && (
        <Card className="border-0 bg-accent/5 card-elevated p-3.5 space-y-2 mb-3">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span className="text-[10px] font-display font-bold tracking-wide uppercase">Day 1 AI Suggestions</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-normal">
            Need lunch or snack spot ideas for your first day? Add these AI matches instantly:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {day1Suggestions.lunch && (
              <div className="bg-card p-2.5 rounded-xl border border-border/40 space-y-1.5 flex flex-col justify-between">
                <div>
                  <Badge className="text-[8px] h-4 bg-primary/10 text-primary border-0 font-bold">Lunch Suggestion</Badge>
                  <h5 className="font-semibold text-[10px] line-clamp-1 mt-1">{day1Suggestions.lunch.name}</h5>
                  <p className="text-[8px] text-muted-foreground line-clamp-1">{day1Suggestions.lunch.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-6 text-[9px] rounded-lg mt-1 font-bold gap-1"
                  onClick={() => handleAddDay1Stop(day1Suggestions.lunch, "12:30", 90)}
                >
                  <Plus className="w-2.5 h-2.5" /> Add Stop
                </Button>
              </div>
            )}
            {day1Suggestions.snack && (
              <div className="bg-card p-2.5 rounded-xl border border-border/40 space-y-1.5 flex flex-col justify-between">
                <div>
                  <Badge className="text-[8px] h-4 bg-accent/15 text-accent border-0 font-bold">Snack / Coffee</Badge>
                  <h5 className="font-semibold text-[10px] line-clamp-1 mt-1">{day1Suggestions.snack.name}</h5>
                  <p className="text-[8px] text-muted-foreground line-clamp-1">{day1Suggestions.snack.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-6 text-[9px] rounded-lg mt-1 font-bold gap-1"
                  onClick={() => handleAddDay1Stop(day1Suggestions.snack, "16:00", 45)}
                >
                  <Plus className="w-2.5 h-2.5" /> Add Stop
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

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
