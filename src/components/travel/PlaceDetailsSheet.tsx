// Shared place-details modal: historical info, app user reviews, "Google" reviews,
// and an optional Get Directions button.
import { useMemo } from "react";
import { Star, Navigation, Share2, MapPin, BookOpen, MessageSquare, Globe } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { mockReviews } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
import type { Location } from "@/types/travel";

interface Props {
  place: Location | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  showDirections?: boolean;
  onNavigate?: (place: Location) => void;
}

// Mock "historical" blurbs per type
const HISTORY: Record<string, string> = {
  landmark: "This landmark has welcomed visitors for centuries. It played a key role during the Spanish colonial period and has been preserved as a national treasure since 1951.",
  hotel: "Opened in the early 1900s, this property has hosted heads of state, artists and luminaries. The architecture blends Beaux-Arts elegance with tropical motifs.",
  restaurant: "A modern reinterpretation of regional cuisine. The kitchen sources from a network of smallholder farms and changes its tasting menu seasonally.",
  viewpoint: "Formed by volcanic uplift, this ridge offers one of the most photographed panoramas in the country. Best visited near sunrise or just before sunset.",
  city: "A bustling urban district with origins as a fishing village. Today it's known for art galleries, contemporary architecture, and a vibrant food scene.",
  poi: "A favorite among locals and travelers alike, this spot has steadily grown in popularity over the past decade.",
  "gas-station": "A 24-hour fuel & rest station along the expressway with restrooms, convenience store and a small food court.",
};

// Mock external (Google-style) reviews
const GOOGLE_REVIEWS = [
  { author: "Jordan M.", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan", rating: 5, text: "Absolutely worth the trip. Staff were friendly and the views are unreal.", source: "Google" as const },
  { author: "Aria S.", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aria", rating: 4, text: "Great experience overall, can get crowded on weekends — go early.", source: "Google" as const },
  { author: "Diego R.", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Diego", rating: 5, text: "Easy parking, friendly staff, beautiful setting. Highly recommend.", source: "TripAdvisor" as const },
];

export function PlaceDetailsSheet({ place, open, onOpenChange, showDirections = false, onNavigate }: Props) {
  const userReviews = useMemo(
    () => place ? mockReviews.filter(r => r.locationId === place.id || r.locationName === place.name) : [],
    [place],
  );

  if (!place) return null;
  const history = HISTORY[place.type] ?? "No historical details available for this place yet.";

  const handleShare = () => {
    navigator.clipboard.writeText(`Check out ${place.name} on TrailSync!`);
    toast({ title: "🔗 Link Copied", description: place.name });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px] rounded-2xl p-0 overflow-hidden max-h-[85dvh] flex flex-col">
        <div className="h-28 bg-gradient-to-br from-primary/80 to-accent relative flex-shrink-0">
          <div className="absolute inset-0 flex items-end p-4">
            <div className="text-primary-foreground">
              <Badge className="text-[9px] h-[16px] bg-white/20 backdrop-blur-sm border-0 capitalize mb-1">{place.type.replace("-", " ")}</Badge>
              <h2 className="font-display font-bold text-lg leading-tight">{place.name}</h2>
            </div>
          </div>
        </div>

        <DialogHeader className="px-4 pt-3 pb-2 flex-shrink-0">
          <DialogTitle className="sr-only">{place.name}</DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> {place.description ?? "—"}
          </DialogDescription>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(place.rating ?? 0) ? "text-accent fill-accent" : "text-muted"}`} />
              ))}
            </div>
            <span className="text-xs font-semibold">{place.rating?.toFixed(1) ?? "—"}</span>
            <span className="text-[10px] text-muted-foreground">· {userReviews.length + GOOGLE_REVIEWS.length} reviews</span>
          </div>
        </DialogHeader>

        <Tabs defaultValue="history" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 h-9 p-1 rounded-xl bg-muted flex-shrink-0">
            <TabsTrigger value="history" className="flex-1 text-[11px] rounded-lg font-semibold gap-1"><BookOpen className="w-3 h-3" /> History</TabsTrigger>
            <TabsTrigger value="users" className="flex-1 text-[11px] rounded-lg font-semibold gap-1"><MessageSquare className="w-3 h-3" /> App</TabsTrigger>
            <TabsTrigger value="web" className="flex-1 text-[11px] rounded-lg font-semibold gap-1"><Globe className="w-3 h-3" /> Google</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
            <TabsContent value="history" className="mt-0 space-y-2">
              <p className="text-xs leading-relaxed text-foreground/85">{history}</p>
            </TabsContent>

            <TabsContent value="users" className="mt-0 space-y-2">
              {userReviews.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-6">No reviews from app users yet.</p>
              )}
              {userReviews.map(r => (
                <Card key={r.id} className="border-0 card-interactive">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <img src={r.userAvatar} className="w-7 h-7 rounded-lg" alt="" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold truncate">{r.userName}</p>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-2.5 h-2.5 ${i < r.rating ? "text-accent fill-accent" : "text-muted"}`} />
                          ))}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px] h-[16px]">App</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{r.comment}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="web" className="mt-0 space-y-2">
              {GOOGLE_REVIEWS.map((r, i) => (
                <Card key={i} className="border-0 card-interactive">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <img src={r.avatar} className="w-7 h-7 rounded-lg" alt="" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold truncate">{r.author}</p>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <Star key={j} className={`w-2.5 h-2.5 ${j < r.rating ? "text-accent fill-accent" : "text-muted"}`} />
                          ))}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px] h-[16px]">{r.source}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{r.text}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </div>
        </Tabs>

        <div className="p-3 border-t border-border/40 flex-shrink-0 flex gap-2">
          {showDirections && onNavigate && (
            <Button className="flex-1 h-10 rounded-xl font-semibold gap-1.5" onClick={() => { onNavigate(place); onOpenChange(false); }}>
              <Navigation className="w-4 h-4" /> Get Directions
            </Button>
          )}
          <Button variant="outline" className={`${showDirections ? "" : "flex-1"} h-10 rounded-xl font-semibold gap-1.5`} onClick={handleShare}>
            <Share2 className="w-4 h-4" /> Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
