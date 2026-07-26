// Shared place-details modal: photo gallery, historical info, app user reviews
// (filterable by rating/recency/source/nearby), simulated Google reviews,
// and an optional Get Directions button.
import { useMemo, useState, useEffect } from "react";
import { Star, Navigation, Share2, MapPin, BookOpen, MessageSquare, Globe, Images, Camera, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useGeolocation, distanceMeters } from "@/hooks/useGeolocation";
import type { Location } from "@/types/travel";
import { useReviews } from "@/hooks/useReviews";
import { placesApi } from "@/lib/api";

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

// Mock gallery fallback
function galleryFor(place: Location) {
  const seed = encodeURIComponent(place.name);
  return [
    { src: `https://picsum.photos/seed/${seed}-1/600/400`, by: "Google", source: "Imported" as "Imported" | "App user" },
    { src: `https://picsum.photos/seed/${seed}-2/600/400`, by: "Unsplash", source: "Imported" as "Imported" | "App user" }
  ];
}

type SortKey = "recent" | "rating-high" | "rating-low";
type SourceFilter = "all" | "app" | "google";
export const placeDetailsCache: Record<string, Location> = {};

export function PlaceDetailsSheet({ place, open, onOpenChange, showDirections = false, onNavigate }: Props) {
  const [sort, setSort] = useState<SortKey>("recent");
  const [source, setSource] = useState<SourceFilter>("all");
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const { fix } = useGeolocation();

  const [detailedPlace, setDetailedPlace] = useState<Location | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (!open || !place) {
      setDetailedPlace(null);
      return;
    }

    // Check if place object already has details populated (like rating or photo references)
    const isFullDetails = place.rating !== undefined && place.rating !== null && 
                          ((place.photo_references && place.photo_references.length > 0) || place.description);

    if (isFullDetails) {
      setDetailedPlace(place);
      return;
    }

    // Check cache
    const cacheKey = place.id || `${place.name}_${place.lat}_${place.lng}`;
    if (placeDetailsCache[cacheKey]) {
      setDetailedPlace(placeDetailsCache[cacheKey]);
      return;
    }

    // Fetch details from search API
    let mounted = true;
    async function fetchDetails() {
      setLoadingDetails(true);
      try {
        const response = await placesApi.search({
          lat: place!.lat,
          lng: place!.lng,
          query: place!.name,
          _t: Date.now()
        } as any);
        
        const results = response.data as Location[];
        const match = results.find(r => r.name.toLowerCase().includes(place!.name.toLowerCase())) || results[0];
        
        if (match && mounted) {
          const merged = { ...place, ...match, id: place!.id };
          placeDetailsCache[cacheKey] = merged;
          setDetailedPlace(merged);
        } else if (mounted) {
          setDetailedPlace(place);
        }
      } catch (err) {
        console.error("Failed to fetch place details:", err);
        if (mounted) setDetailedPlace(place);
      } finally {
        if (mounted) setLoadingDetails(false);
      }
    }

    fetchDetails();

    return () => {
      mounted = false;
    };
  }, [place, open]);

  const currentPlace = detailedPlace || place;

  const { reviews: fetchedReviews } = useReviews();

  const userReviews = useMemo(
    () => currentPlace ? fetchedReviews.filter((r: any) => r.locationId === currentPlace.id || r.place_name === currentPlace.name) : [],
    [currentPlace, fetchedReviews],
  );

  // Unified review list with source for filtering
  const allReviews = useMemo(() => {
    if (!currentPlace) return [];
    const app = userReviews.map((r: any) => ({
      kind: "app" as const, id: r.id, author: r.user?.username || r.userName || "App User", avatar: r.user?.profile_pic || r.userAvatar || `https://ui-avatars.com/api/?name=${r.user?.username || "A"}`,
      rating: r.rating, text: r.review_text || r.comment, source: "App" as const, timestamp: r.created_at || r.timestamp,
    }));
    const extReviews = currentPlace.reviews_data || [];
    const ext = extReviews.map((r, i) => ({
      kind: "ext" as const, id: `g-${i}`, author: r.author, avatar: r.avatar || `https://ui-avatars.com/api/?name=${r.author}`,
      rating: r.rating, text: r.text, source: r.source, timestamp: r.timestamp,
    }));
    let merged = [...app, ...ext];
    if (source === "app") merged = merged.filter(r => r.kind === "app");
    if (source === "google") merged = merged.filter(r => r.kind === "ext");
    if (nearbyOnly && fix && currentPlace) {
      merged = merged.filter(r => r.kind === "ext" || distanceMeters({ lat: fix.lat, lng: fix.lng }, { lat: currentPlace.lat, lng: currentPlace.lng }) < 75000);
    }
    if (sort === "recent") merged.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
    else if (sort === "rating-high") merged.sort((a, b) => b.rating - a.rating);
    else merged.sort((a, b) => a.rating - b.rating);
    return merged;
  }, [currentPlace, userReviews, sort, source, nearbyOnly, fix?.lat, fix?.lng]);

  const gallery = useMemo(() => {
    if (!currentPlace) return [];
    if (currentPlace.photo_references && currentPlace.photo_references.length > 0) {
      return currentPlace.photo_references.map(ref => ({
        src: placesApi.getPhoto(ref),
        by: "Google",
        source: "Imported" as "Imported" | "App user",
      }));
    }
    return galleryFor(currentPlace);
  }, [currentPlace]);

  if (!place) return null;
  const history = (currentPlace as any)?.editorial_summary || 
                  (currentPlace as any)?.editorialSummary?.text || 
                  HISTORY[currentPlace?.type || "poi"] || 
                  "No historical details available for this place yet.";

  const handleShare = () => {
    if (!currentPlace) return;
    navigator.clipboard.writeText(`Check out ${currentPlace.name} on Intellitravel!`);
    toast({ title: "🔗 Link Copied", description: currentPlace.name });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px] rounded-2xl p-0 overflow-hidden max-h-[88dvh] flex flex-col">
        <div className="h-28 bg-gradient-to-br from-primary/80 to-accent relative flex-shrink-0">
          <div className="absolute inset-0 flex items-end p-4">
            <div className="text-primary-foreground">
              <Badge className="text-[9px] h-[16px] bg-white/20 backdrop-blur-sm border-0 capitalize mb-1">{((currentPlace?.type || place.type || "Place")).replace("-", " ")}</Badge>
              <h2 className="font-display font-bold text-lg leading-tight">{currentPlace?.name || place.name}</h2>
            </div>
          </div>
        </div>

        <DialogHeader className="px-4 pt-3 pb-2 flex-shrink-0">
          <DialogTitle className="sr-only">{currentPlace?.name || place.name}</DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> {currentPlace?.address || currentPlace?.description || place.address || place.description || "—"}
          </DialogDescription>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(currentPlace?.rating ?? 0) ? "text-accent fill-accent" : "text-muted"}`} />
              ))}
            </div>
            <span className="text-xs font-semibold">{currentPlace?.rating?.toFixed(1) ?? "—"}</span>
            <span className="text-[10px] text-muted-foreground">· {allReviews.length} reviews · {gallery.length} photos</span>
          </div>
        </DialogHeader>

        {loadingDetails ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-primary mb-2" />
            <span className="text-[11px] text-muted-foreground font-medium">Fetching place details...</span>
          </div>
        ) : (
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
                    <div 
                      key={i} 
                      className="relative rounded-xl overflow-hidden bg-muted aspect-[4/3] cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setSelectedPhotoIndex(i)}
                    >
                      <img src={g.src} alt={`${currentPlace?.name || place.name} photo ${i + 1}`} loading="lazy" className="w-full h-full object-cover" />
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
        )}

        <div className="p-3 border-t border-border/40 flex-shrink-0 flex gap-2">
          {showDirections && onNavigate && currentPlace && (
            <Button className="flex-1 h-10 rounded-xl font-semibold gap-1.5" onClick={() => { onNavigate(currentPlace); onOpenChange(false); }}>
              <Navigation className="w-4 h-4" /> Get Directions
            </Button>
          )}
          <Button variant="outline" className={`${showDirections ? "" : "flex-1"} h-10 rounded-xl font-semibold gap-1.5`} onClick={handleShare}>
            <Share2 className="w-4 h-4" /> Share
          </Button>
        </div>
      </DialogContent>

      {/* Full screen photo viewer */}
      <Dialog open={selectedPhotoIndex !== null} onOpenChange={(open) => !open && setSelectedPhotoIndex(null)}>
        <DialogContent className="max-w-[95vw] w-full p-0 bg-transparent border-0 shadow-none flex items-center justify-center h-screen max-h-screen [&>button]:hidden">
          <DialogTitle className="sr-only">Photo view</DialogTitle>
          {selectedPhotoIndex !== null && gallery[selectedPhotoIndex] && (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 z-10 text-white bg-black/40 hover:bg-black/60 rounded-full" 
                onClick={() => setSelectedPhotoIndex(null)}
              >
                <X className="w-5 h-5" />
              </Button>
              <img src={gallery[selectedPhotoIndex].src} className="max-w-full max-h-[90dvh] object-contain rounded-xl" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
