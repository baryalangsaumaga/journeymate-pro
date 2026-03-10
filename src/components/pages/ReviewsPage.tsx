import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Star, ThumbsUp, MapPin, TrendingUp, Award, MessageSquare,
  Plus, Flame, X
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { mockReviews, heatmapData } from "@/data/mockData";

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };

function HeatmapMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, {
      center: [13.5, 121.0], zoom: 7, zoomControl: false, attributionControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png").addTo(map);
    heatmapData.forEach(point => {
      L.circle([point.lat, point.lng], {
        radius: point.intensity * 25000, color: "transparent",
        fillColor: `hsl(162, 72%, ${30 + point.intensity * 30}%)`,
        fillOpacity: 0.4 + point.intensity * 0.3,
      }).addTo(map);
    });
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  return <div ref={mapRef} className="h-72 w-full" />;
}

export default function ReviewsPage() {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewLocation, setReviewLocation] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [helpfulIds, setHelpfulIds] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const handleSubmitReview = () => {
    if (!reviewText.trim() || !reviewLocation.trim()) return;
    toast({ title: "⭐ Review Published!", description: `Your review of "${reviewLocation}" has been posted.` });
    setReviewText("");
    setReviewLocation("");
    setReviewRating(5);
    setReviewOpen(false);
  };

  const toggleHelpful = (id: string) => {
    const isHelpful = helpfulIds.includes(id);
    setHelpfulIds(prev => isHelpful ? prev.filter(h => h !== id) : [...prev, id]);
    if (!isHelpful) toast({ title: "👍 Marked Helpful" });
  };

  const handleReply = (reviewId: string) => {
    if (!replyText.trim()) return;
    toast({ title: "💬 Reply Posted!", description: "Your reply has been added." });
    setReplyText("");
    setReplyingTo(null);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="px-4 py-4 pb-6 space-y-4">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl tracking-tight">Reviews & Heatmap</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Your travel footprint</p>
        </div>
        <Button size="sm" className="h-8 gap-1.5 rounded-xl shadow-travel text-xs font-semibold" onClick={() => setReviewOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> Review
        </Button>
      </motion.div>

      <Tabs defaultValue="heatmap">
        <TabsList className="w-full h-10 p-1 rounded-xl bg-muted">
          <TabsTrigger value="heatmap" className="flex-1 text-xs rounded-lg font-semibold data-[state=active]:shadow-sm">Heatmap</TabsTrigger>
          <TabsTrigger value="reviews" className="flex-1 text-xs rounded-lg font-semibold data-[state=active]:shadow-sm">Reviews</TabsTrigger>
          <TabsTrigger value="stats" className="flex-1 text-xs rounded-lg font-semibold data-[state=active]:shadow-sm">Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="heatmap" className="space-y-4 mt-3">
          <motion.div variants={item}>
            <Card className="border-0 card-elevated overflow-hidden">
              <CardContent className="p-0 relative">
                <HeatmapMap />
                <div className="absolute bottom-3 right-3 glass-ultra rounded-xl px-3 py-2 z-[400]">
                  <div className="flex items-center gap-3 text-[9px] font-medium">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-primary/30" /> Low</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-primary/60" /> Med</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-primary" /> High</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-3 gap-2">
            {[
              { label: "Places Visited", value: "10", icon: MapPin },
              { label: "Cities Explored", value: "6", icon: TrendingUp },
              { label: "Travel Score", value: "87", icon: Award },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label} className="border-0 card-interactive">
                <CardContent className="p-3 text-center">
                  <Icon className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="font-display font-bold text-lg leading-none">{value}</p>
                  <p className="text-[9px] text-muted-foreground font-medium mt-1">{label}</p>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          <motion.div variants={item}>
            <h3 className="section-header mb-3 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-accent" /> Most Visited
            </h3>
            <Card className="border-0 card-elevated">
              <CardContent className="p-3.5">
                {[...heatmapData].sort((a, b) => b.intensity - a.intensity).slice(0, 5).map((point, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0">
                    <span className="text-xs font-display font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold">{point.name}</p>
                      <div className="h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${point.intensity * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground font-semibold">{Math.round(point.intensity * 100)}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-3 mt-3">
          {mockReviews.map(review => (
            <motion.div key={review.id} variants={item}>
              <Card className="border-0 card-interactive">
                <CardContent className="p-3.5">
                  <div className="flex items-start gap-2.5">
                    <img src={review.userAvatar} className="w-9 h-9 rounded-xl flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-semibold">{review.userName}</p>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(review.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">{review.locationName}</span>
                      </div>
                      <div className="flex items-center gap-0.5 mt-1.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < review.rating ? "text-accent fill-accent" : "text-muted"}`} />
                        ))}
                      </div>
                      <p className="text-xs mt-2 leading-relaxed text-foreground/80">{review.comment}</p>
                      <div className="flex items-center gap-3 mt-2.5">
                        <Button
                          variant="ghost" size="sm"
                          className={`h-7 text-[10px] gap-1 rounded-lg ${helpfulIds.includes(review.id) ? "text-primary" : "text-muted-foreground"}`}
                          onClick={() => toggleHelpful(review.id)}
                        >
                          <ThumbsUp className={`w-3 h-3 ${helpfulIds.includes(review.id) ? "fill-primary" : ""}`} />
                          {review.helpful + (helpfulIds.includes(review.id) ? 1 : 0)}
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 text-[10px] gap-1 text-muted-foreground rounded-lg"
                          onClick={() => setReplyingTo(replyingTo === review.id ? null : review.id)}
                        >
                          <MessageSquare className="w-3 h-3" /> Reply
                        </Button>
                      </div>
                      {replyingTo === review.id && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 flex gap-2">
                          <Input
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleReply(review.id)}
                            placeholder="Write a reply..."
                            className="h-8 text-[11px] border-0 bg-muted rounded-lg"
                          />
                          <Button size="sm" className="h-8 text-[10px] rounded-lg px-3" onClick={() => handleReply(review.id)} disabled={!replyText.trim()}>
                            Send
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>

        <TabsContent value="stats" className="space-y-3 mt-3">
          <motion.div variants={item}>
            <Card className="border-0 card-elevated">
              <CardContent className="p-4">
                <h3 className="section-header mb-4">Travel Statistics</h3>
                <div className="space-y-4">
                  {[
                    { label: "Total Distance", value: "1,240 km", pct: 62 },
                    { label: "Countries", value: "1", pct: 10 },
                    { label: "Cities", value: "6", pct: 30 },
                    { label: "Reviews Written", value: "4", pct: 40 },
                    { label: "Photos Shared", value: "128", pct: 85 },
                  ].map(stat => (
                    <div key={stat.label}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground font-medium">{stat.label}</span>
                        <span className="font-semibold">{stat.value}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${stat.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Add Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Write a Review</DialogTitle>
            <DialogDescription>Share your experience</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Location</label>
              <Input value={reviewLocation} onChange={e => setReviewLocation(e.target.value)} placeholder="e.g. Tagaytay Ridge" className="mt-1.5 h-10 rounded-xl border-border" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Rating</label>
              <div className="flex gap-1 mt-1.5">
                {[1, 2, 3, 4, 5].map(r => (
                  <button key={r} onClick={() => setReviewRating(r)} className="p-1">
                    <Star className={`w-6 h-6 transition-colors ${r <= reviewRating ? "text-accent fill-accent" : "text-muted"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Your Review</label>
              <textarea
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                placeholder="Tell others about your experience..."
                className="mt-1.5 w-full h-24 p-3 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <Button className="w-full h-10 rounded-xl shadow-travel font-semibold" onClick={handleSubmitReview} disabled={!reviewText.trim() || !reviewLocation.trim()}>
            <Star className="w-4 h-4 mr-1" /> Publish Review
          </Button>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
