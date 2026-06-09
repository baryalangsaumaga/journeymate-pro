// Shared place-details modal: photo gallery, historical info, app user reviews
// (filterable by rating/recency/source/nearby), simulated Google reviews,
// and an optional Get Directions button.
import { useMemo, useState } from "react";
import { Star, Navigation, Share2, MapPin, BookOpen, MessageSquare, Globe, Images, Camera } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { mockReviews } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
import { useGeolocation, distanceMeters } from "@/hooks/useGeolocation";
import type { Location } from "@/types/travel";

interface Props {
  place: Location | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  showDirections?: boolean;
  onNavigate?: (place: Location) => void;
}

const HISTORY: Record<string, string> = {
  landmark: "This landmark has welcomed visitors for centuries. It played a key role during the Spanish colonial period and has been preserved as a national treasure since 1951.",
  hotel: "Opened in the early 1900s, this property has hosted heads of state, artists and luminaries. The architecture blends Beaux-Arts elegance with tropical motifs.",
  restaurant: "A modern reinterpretation of regional cuisine. The kitchen sources from a network of smallholder farms and changes its tasting menu seasonally.",
  viewpoint: "Formed by volcanic uplift, this ridge offers one of the most photographed panoramas in the country. Best visited near sunrise or just before sunset.",
  city: "A bustling urban district with origins as a fishing village. Today it's known for art galleries, contemporary architecture, and a vibrant food scene.",
  poi: "A favorite among locals and travelers alike, this spot has steadily grown in popularity over the past decade.",
  "gas-station": "A 24-hour fuel & rest station along the expressway with restrooms, convenience store and a small food court.",
};

interface ExtReview { author: string; avatar: string; rating: number; text: string; source: "Google" | "TripAdvisor"; timestamp: string; }
const GOOGLE_REVIEWS: ExtReview[] = [
  { author: "Jordan M.", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan", rating: 5, text: "Absolutely worth the trip. Staff were friendly and the views are unreal.", source: "Google", timestamp: "2026-05-21T10:00:00Z" },
  { author: "Aria S.", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aria", rating: 4, text: "Great experience overall, can get crowded on weekends — go early.", source: "Google", timestamp: "2026-04-12T10:00:00Z" },
  { author: "Diego R.", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Diego", rating: 5, text: "Easy parking, friendly staff, beautiful setting. Highly recommend.", source: "TripAdvisor", timestamp: "2026-02-02T10:00:00Z" },
];

// Mock gallery — three "user" photos + three "imported" photos per place.
function galleryFor(place: Location) {
  const seed = encodeURIComponent(place.name);
  const usersAvatars = ["Jordan","Aria","Diego","Maya","Kai","Luna"];
  const user = (n: number) => ({
    src: `https://picsum.photos/seed/${seed}-u${n}/600/400`,
    by: usersAvatars[n % usersAvatars.length],
    source: "App user" as const,
  });
  const imported = (n: number) => ({
    src: `https://picsum.photos/seed/${seed}-i${n}/600/400`,
    by: n % 2 ? "Google" : "Unsplash",
    source: "Imported" as const,
  });
  return [user(1), imported(1), user(2), imported(2), user(3), imported(3)];
}

type SortKey = "recent" | "rating-high" | "rating-low";
type SourceFilter = "all" | "app" | "google";

export function PlaceDetailsSheet({ place, open, onOpenChange, showDirections = false, onNavigate }: Props) {
  const [sort, setSort] = useState<SortKey>("recent");
  const [source, setSource] = useState<SourceFilter>("all");
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const { fix } = useGeolocation();

  const userReviews = useMemo(
    () => place ? mockReviews.filter(r => r.locationId === place.id || r.locationName === place.name) : [],
    [place],
  );

  // Unified review list with source for filtering
  const allReviews = useMemo(() => {
    if (!place) return [];
    const app = userReviews.map(r => ({
      kind: "app" as const, id: r.id, author: r.userName, avatar: r.userAvatar,
      rating: r.rating, text: r.comment, source: "App" as const, timestamp: r.timestamp,
    }));
    const ext = GOOGLE_REVIEWS.map((r, i) => ({
      kind: "ext" as const, id: `g-${i}`, author: r.author, avatar: r.avatar,
      rating: r.rating, text: r.text, source: r.source, timestamp: r.timestamp,
    }));
    let merged = [...app, ...ext];
    if (source === "app") merged = merged.filter(r => r.kind === "app");
    if (source === "google") merged = merged.filter(r => r.kind === "ext");
    if (nearbyOnly && fix) {
      // Mock: keep app reviews from users within ~75km of the user's GPS.
      // (External reviews always pass — no location data.)
      merged = merged.filter(r => r.kind === "ext" || distanceMeters({ lat: fix.lat, lng: fix.lng }, { lat: place.lat, lng: place.lng }) < 75000);
    }
    if (sort === "recent") merged.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
    else if (sort === "rating-high") merged.sort((a, b) => b.rating - a.rating);
    else merged.sort((a, b) => a.rating - b.rating);
    return merged;
  }, [place, userReviews, sort, source, nearbyOnly, fix?.lat, fix?.lng]);

  const gallery = useMemo(() => place ? galleryFor(place) : [], [place]);

  if (!place) return null;
  const history = HISTORY[place.type] ?? "No historical details available for this place yet.";

  const handleShare = () => {
    navigator.clipboard.writeText(`Check out ${place.name} on TrailSync!`);
    toast({ title: "🔗 Link Copied", description: place.name });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px] rounded-2xl p-0 overflow-hidden max-h-[88dvh] flex flex-col">
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
            <span className="text-[10px] text-muted-foreground">· {allReviews.length} reviews · {gallery.length} photos</span>
          </div>
        </DialogHeader>

        <Tabs defaultValue="photos" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 h-9 p-1 rounded-xl bg-muted flex-shrink-0">
            <TabsTrigger value="photos" className="flex-1 text-[11px] rounded-lg font-semibold gap-1"><Images className="w-3 h-3" /> Photos</TabsTrigger>
            <TabsTrigger value="history" className="flex-1 text-[11px] rounded-lg font-semibold gap-1"><BookOpen className="w-3 h-3" /> History</TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1 text-[11px] rounded-lg font-semibold gap-1"><MessageSquare className="w-3 h-3" /> Reviews</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
            <TabsContent value="photos" className="mt-0 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {gallery.map((g, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden bg-muted aspect-[4/3]">
                    <img src={g.src} alt={`${place.name} photo ${i+1}`} loading="lazy" className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                      <Badge className="text-[8px] h-[14px] bg-black/55 text-white border-0 gap-0.5">
                        <Camera className="w-2 h-2" /> {g.by}
                      </Badge>
                      <Badge className={`text-[8px] h-[14px] border-0 ${g.source === "App user" ? "bg-primary/85 text-primary-foreground" : "bg-accent/85 text-accent-foreground"}`}>
                        {g.source}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-0 space-y-2">
              <p className="text-xs leading-relaxed text-foreground/85">{history}</p>
            </TabsContent>

            <TabsContent value="reviews" className="mt-0 space-y-2">
              {/* Filters */}
              <div className="grid grid-cols-2 gap-2">
                <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <SelectTrigger className="h-8 text-[11px]"><SelectValue placeholder="Sort" /></SelectTrigger>
                  <SelectContent className="z-[80]">
                    <SelectItem value="recent" className="text-xs">Most recent</SelectItem>
                    <SelectItem value="rating-high" className="text-xs">Highest rated</SelectItem>
                    <SelectItem value="rating-low" className="text-xs">Lowest rated</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={source} onValueChange={(v) => setSource(v as SourceFilter)}>
                  <SelectTrigger className="h-8 text-[11px]"><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent className="z-[80]">
                    <SelectItem value="all" className="text-xs">All sources</SelectItem>
                    <SelectItem value="app" className="text-xs">App users</SelectItem>
                    <SelectItem value="google" className="text-xs">Google / Web</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-lg bg-muted">
                <span className="text-muted-foreground">Show nearby-user reviews only</span>
                <Switch checked={nearbyOnly} onCheckedChange={setNearbyOnly} />
              </label>

              {allReviews.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-6">No reviews match these filters.</p>
              )}
              {allReviews.map(r => (
                <Card key={r.id} className="border-0 card-interactive">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <img src={r.avatar} className="w-7 h-7 rounded-lg" alt="" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold truncate">{r.author}</p>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-2.5 h-2.5 ${i < r.rating ? "text-accent fill-accent" : "text-muted"}`} />
                          ))}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px] h-[16px] gap-0.5">
                        {r.kind === "ext" ? <Globe className="w-2 h-2" /> : null}{r.source}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{r.text}</p>
                    <p className="text-[9px] text-muted-foreground/70 mt-1">{new Date(r.timestamp).toLocaleDateString()}</p>
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
