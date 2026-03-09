import { useState } from "react";
import { motion } from "framer-motion";
import {
  Star, ThumbsUp, MapPin, TrendingUp, Award, MessageSquare,
  Plus, Filter, ChevronRight, Flame
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { mockReviews, heatmapData } from "@/data/mockData";

export default function ReviewsPage() {
  return (
    <div className="px-4 py-4 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl">Reviews & Heatmap</h2>
          <p className="text-xs text-muted-foreground">Your travel footprint</p>
        </div>
        <Button size="sm" className="h-8 gap-1 rounded-full shadow-travel">
          <Plus className="w-3.5 h-3.5" /> Review
        </Button>
      </div>

      <Tabs defaultValue="heatmap">
        <TabsList className="w-full">
          <TabsTrigger value="heatmap" className="flex-1 text-xs">Heatmap</TabsTrigger>
          <TabsTrigger value="reviews" className="flex-1 text-xs">Reviews</TabsTrigger>
          <TabsTrigger value="stats" className="flex-1 text-xs">Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="heatmap" className="space-y-3 mt-3">
          {/* Heatmap Visualization */}
          <Card className="border-0 shadow-card overflow-hidden">
            <CardContent className="p-0">
              <div className="h-64 bg-muted map-grid relative">
                <svg className="w-full h-full" viewBox="0 0 400 300">
                  {/* Philippines outline approximation */}
                  <path d="M 180 30 L 200 50 L 210 90 L 200 130 L 220 170 L 200 200 L 180 230 L 190 260 L 170 280 L 160 250 L 150 200 L 160 150 L 150 100 L 170 60 Z" fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" />
                  {/* Heatmap dots */}
                  {heatmapData.map((point, i) => {
                    const x = 120 + ((point.lng - 120) * 200);
                    const y = 20 + ((17 - point.lat) * 35);
                    const r = 8 + point.intensity * 20;
                    return (
                      <g key={i}>
                        <circle cx={x} cy={y} r={r} fill={`hsl(var(--primary) / ${point.intensity * 0.3})`} />
                        <circle cx={x} cy={y} r={r * 0.5} fill={`hsl(var(--primary) / ${point.intensity * 0.6})`} />
                        <circle cx={x} cy={y} r={4} fill="hsl(var(--primary))" />
                        <text x={x} y={y + r + 12} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">{point.name}</text>
                      </g>
                    );
                  })}
                </svg>
                {/* Legend */}
                <div className="absolute bottom-2 right-2 glass rounded-lg px-2 py-1">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-primary/20" />
                      <span className="text-[8px]">Low</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-primary/50" />
                      <span className="text-[8px]">Med</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-[8px]">High</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Heatmap Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Places Visited", value: "10", icon: MapPin },
              { label: "Cities Explored", value: "6", icon: TrendingUp },
              { label: "Travel Score", value: "87", icon: Award },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label} className="border-0 shadow-card">
                <CardContent className="p-3 text-center">
                  <Icon className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="font-display font-bold text-lg">{value}</p>
                  <p className="text-[9px] text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Most Visited */}
          <div>
            <h3 className="font-display font-semibold text-sm mb-2 flex items-center gap-1">
              <Flame className="w-4 h-4 text-accent" /> Most Visited
            </h3>
            {heatmapData.sort((a, b) => b.intensity - a.intensity).slice(0, 5).map((point, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <span className="text-xs font-display font-bold text-muted-foreground w-5">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{point.name}</p>
                  <Progress value={point.intensity * 100} className="h-1.5 mt-1" />
                </div>
                <span className="text-xs text-muted-foreground">{Math.round(point.intensity * 100)}%</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-3 mt-3">
          {mockReviews.map(review => (
            <Card key={review.id} className="border-0 shadow-card">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <img src={review.userAvatar} className="w-8 h-8 rounded-full flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{review.userName}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(review.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{review.locationName}</span>
                    </div>
                    <div className="flex items-center gap-0.5 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < review.rating ? "text-accent fill-accent" : "text-muted"}`} />
                      ))}
                    </div>
                    <p className="text-xs mt-2 leading-relaxed text-foreground/80">{review.comment}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-muted-foreground">
                        <ThumbsUp className="w-3 h-3" /> {review.helpful}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-muted-foreground">
                        <MessageSquare className="w-3 h-3" /> Reply
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="stats" className="space-y-3 mt-3">
          <Card className="border-0 shadow-card">
            <CardContent className="p-4">
              <h3 className="font-display font-semibold text-sm mb-3">Travel Statistics</h3>
              <div className="space-y-4">
                {[
                  { label: "Total Distance", value: "1,240 km", pct: 62 },
                  { label: "Countries", value: "1", pct: 10 },
                  { label: "Cities", value: "6", pct: 30 },
                  { label: "Reviews Written", value: "4", pct: 40 },
                  { label: "Photos Shared", value: "128", pct: 85 },
                ].map(stat => (
                  <div key={stat.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{stat.label}</span>
                      <span className="font-medium">{stat.value}</span>
                    </div>
                    <Progress value={stat.pct} className="h-1.5" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
