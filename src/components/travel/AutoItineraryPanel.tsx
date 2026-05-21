// "Generate from prompt" – weighted-score recommender over mockLocations.
// Score = rating*20 + interest match*40 + (1 - normalized distance)*40.
import { useMemo, useState } from "react";
import { Sparkles, Loader2, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { mockLocations } from "@/data/mockData";
import { PlaceCard } from "@/components/travel/PlaceCard";
import type { Location } from "@/types/travel";

const INTERESTS: { id: string; label: string; types: Location["type"][] }[] = [
  { id: "food", label: "Foodie", types: ["restaurant"] },
  { id: "culture", label: "Culture", types: ["landmark"] },
  { id: "nature", label: "Nature", types: ["viewpoint"] },
  { id: "luxury", label: "Stay", types: ["hotel"] },
  { id: "city", label: "City Life", types: ["city", "poi"] },
];

interface Props {
  centerLat?: number;
  centerLng?: number;
}

export function AutoItineraryPanel({ centerLat = 14.5895, centerLng = 120.9740 }: Props) {
  const [prompt, setPrompt] = useState("");
  const [picked, setPicked] = useState<string[]>(["culture", "food"]);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ place: Location; score: number }[] | null>(null);

  const toggle = (id: string) =>
    setPicked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const ranked = useMemo(() => {
    const matchTypes = new Set(INTERESTS.filter(i => picked.includes(i.id)).flatMap(i => i.types));
    const dists = mockLocations.map(l => Math.hypot(l.lat - centerLat, l.lng - centerLng));
    const maxD = Math.max(...dists, 0.001);
    return mockLocations.map((p, i) => {
      const ratingScore = ((p.rating ?? 3) / 5) * 20;
      const interestScore = matchTypes.has(p.type) ? 40 : 0;
      const distanceScore = (1 - dists[i] / maxD) * 40;
      return { place: p, score: Math.round(ratingScore + interestScore + distanceScore) };
    }).sort((a, b) => b.score - a.score);
  }, [picked, centerLat, centerLng]);

  const generate = () => {
    setGenerating(true);
    setTimeout(() => { setGenerated(ranked.slice(0, 5)); setGenerating(false); }, 800);
  };

  return (
    <div className="space-y-3">
      <Card className="border-0 card-elevated bg-gradient-to-br from-primary/8 to-accent/5">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-display font-bold">AI Itinerary Generator</span>
            <Badge className="text-[8px] h-[15px] bg-primary/10 text-primary border-0 ml-auto">Beta</Badge>
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

          <Button onClick={generate} disabled={generating || picked.length === 0} className="w-full h-10 rounded-xl gap-1.5 shadow-travel font-semibold text-xs">
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            {generating ? "Generating…" : "Generate Itinerary"}
          </Button>
        </CardContent>
      </Card>

      {generated && (
        <div className="space-y-2">
          <h3 className="section-header">Suggested Stops</h3>
          {generated.map(({ place, score }) => (
            <PlaceCard
              key={place.id}
              place={place}
              score={score}
              actionLabel="Add"
              onAction={() => { /* could push into useRoutePlanner via context */ }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
