import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search, MapPin, Star, Hotel, UtensilsCrossed,
  Fuel, Eye, Landmark, SlidersHorizontal, Heart,
  TrendingUp, Compass, Clock, Locate
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { mockLocations } from "@/data/mockData";
import { PlaceDetailsSheet } from "@/components/travel/PlaceDetailsSheet";
import { useGeolocation, distanceMeters } from "@/hooks/useGeolocation";
import { tripSession, appNavigate } from "@/lib/tripSession";
import type { Location } from "@/types/travel";

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };

const categories = [
  { id: "all", label: "All", icon: Compass },
  { id: "hotel", label: "Hotels", icon: Hotel },
  { id: "restaurant", label: "Food", icon: UtensilsCrossed },
  { id: "landmark", label: "Landmarks", icon: Landmark },
  { id: "viewpoint", label: "Views", icon: Eye },
  { id: "gas-station", label: "Gas", icon: Fuel },
];

const experiences = [
  { name: "Sunset Cruise", desc: "Manila Bay golden hour sail", price: "₱2,500", rating: 4.8, duration: "2h", image: "🚢", lat: 14.5895, lng: 120.9740 },
  { name: "Food Tour", desc: "Binondo Chinatown walking tour", price: "₱1,200", rating: 4.9, duration: "3h", image: "🥟", lat: 14.6000, lng: 120.9740 },
  { name: "History Walk", desc: "Intramuros guided heritage tour", price: "₱800", rating: 4.7, duration: "2.5h", image: "🏛️", lat: 14.5895, lng: 120.9740 },
];

// Helper: turn an experience/hotel/food card into a Location for the sheet.
function asPlace(name: string, desc: string, rating: number, lat: number, lng: number, type: Location["type"]): Location {
  return { id: `dyn-${name}`, name, lat, lng, type, rating, description: desc };
}

export default function ExplorePage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Location | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"rating" | "distance" | "name">("distance");

  const { fix } = useGeolocation();
  const userPos = fix ? { lat: fix.lat, lng: fix.lng } : { lat: 14.5895, lng: 120.9740 };

  const withDistance = useMemo(
    () => mockLocations.map(l => ({ ...l, _dist: distanceMeters(userPos, l) })),
    [userPos.lat, userPos.lng],
  );

  const filteredLocations = withDistance
    .filter(l =>
      (activeCategory === "all" || l.type === activeCategory) &&
      (!searchQuery || l.name.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return a._dist - b._dist;
    });

  // GPS-aware "near you" feeds
  const nearbyHotels = useMemo(
    () => withDistance.filter(l => l.type === "hotel").sort((a, b) => a._dist - b._dist).slice(0, 5),
    [withDistance],
  );
  const nearbyFood = useMemo(
    () => withDistance.filter(l => l.type === "restaurant" || l.type === "poi").sort((a, b) => a._dist - b._dist).slice(0, 6),
    [withDistance],
  );

  const toggleFavorite = (id: string, name: string) => {
    const isFav = favorites.includes(id);
    setFavorites(prev => isFav ? prev.filter(f => f !== id) : [...prev, id]);
    toast({ title: isFav ? "Removed from Favorites" : "Added to Favorites", description: name });
  };

  const openDetails = (place: Location) => { setSelectedPlace(place); setDetailOpen(true); };

  const handleNavigate = (place: Location) => {
    tripSession.setDestination({ location: place });
    appNavigate("navigate");
    toast({ title: "🧭 Opening Navigation", description: `Routing to ${place.name}` });
  };

  const fmtDist = (m: number) => m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="px-4 py-4 pb-6 space-y-4">
      <motion.div variants={item} className="flex items-start justify-between">
        <div>
          <h2 className="font-display font-bold text-xl tracking-tight">Explore</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <Locate className="w-3 h-3" /> Near your location
          </p>
        </div>
      </motion.div>

      <motion.div variants={item} className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search places, hotels, restaurants..."
          className="pl-10 h-11 border-0 bg-muted text-sm rounded-xl"
        />
        <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl" onClick={() => setFilterOpen(!filterOpen)}>
          <SlidersHorizontal className="w-4 h-4" />
        </Button>
      </motion.div>

      {filterOpen && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex gap-2">
          {(["distance", "rating", "name"] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all ${
                sortBy === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              Sort by {s}
            </button>
          ))}
        </motion.div>
      )}

      <motion.div variants={item} className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {categories.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveCategory(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all tap-highlight ${
              activeCategory === id ? "bg-primary text-primary-foreground shadow-travel" : "bg-muted text-muted-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </motion.div>

      {/* Experiences */}
      {activeCategory === "all" && (
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="section-header flex items-center gap-1.5">
              <Star className="w-4 h-4 text-accent" /> Top Experiences
            </h3>
            <Badge variant="outline" className="text-[9px] h-5 font-semibold">
              <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> Popular
            </Badge>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4">
            {experiences.map((exp, i) => (
              <Card key={i} className="border-0 card-interactive min-w-[200px] flex-shrink-0 cursor-pointer"
                onClick={() => openDetails(asPlace(exp.name, exp.desc, exp.rating, exp.lat, exp.lng, "poi"))}
              >
                <CardContent className="p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl">{exp.image}</span>
                    <Badge className="text-[8px] h-[16px] bg-success/10 text-success font-semibold border-0">Bookable</Badge>
                  </div>
                  <h4 className="font-semibold text-[13px]">{exp.name}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{exp.desc}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-accent fill-accent" />
                      <span className="text-[11px] font-semibold">{exp.rating}</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] h-[16px] gap-0.5 font-medium">
                      <Clock className="w-2 h-2" /> {exp.duration}
                    </Badge>
                  </div>
                  <p className="text-xs font-bold text-primary mt-2">{exp.price}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Hotels — near you */}
      {(activeCategory === "all" || activeCategory === "hotel") && nearbyHotels.length > 0 && (
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="section-header flex items-center gap-1.5">
              <Hotel className="w-4 h-4 text-primary" /> Hotels Near You
            </h3>
            <Badge variant="outline" className="text-[9px] h-5 font-semibold">Near you</Badge>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4">
            {nearbyHotels.map(h => (
              <Card key={h.id} className="border-0 card-interactive min-w-[170px] flex-shrink-0 cursor-pointer" onClick={() => openDetails(h)}>
                <CardContent className="p-3.5">
                  <div className="flex items-start justify-between">
                    <span className="text-2xl">🏨</span>
                    <Badge className="text-[8px] h-[16px] bg-accent/10 text-accent font-semibold">Hotel</Badge>
                  </div>
                  <h4 className="font-semibold text-[13px] mt-2 truncate">{h.name}</h4>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3 h-3 text-accent fill-accent" />
                    <span className="text-[11px] font-medium">{h.rating}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">{fmtDist(h._dist)} away</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Food — near you */}
      {(activeCategory === "all" || activeCategory === "restaurant") && nearbyFood.length > 0 && (
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="section-header flex items-center gap-1.5">
              <UtensilsCrossed className="w-4 h-4 text-accent" /> Food & Dining Near You
            </h3>
            <Badge variant="outline" className="text-[9px] h-5 font-semibold">
              <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> Trending
            </Badge>
          </div>
          <div className="space-y-2">
            {nearbyFood.map(f => (
              <Card key={f.id} className="border-0 card-interactive cursor-pointer" onClick={() => openDetails(f)}>
                <CardContent className="p-3.5 flex items-center gap-3">
                  <span className="text-2xl">🍽️</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-[13px] truncate">{f.name}</h4>
                    <p className="text-[10px] text-muted-foreground truncate">{f.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-accent fill-accent" />
                      <span className="text-[11px] font-bold">{f.rating}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{fmtDist(f._dist)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* All — sorted by GPS distance */}
      <motion.div variants={item}>
        <h3 className="section-header mb-2.5">
          {activeCategory === "all" ? "Places Near You" : categories.find(c => c.id === activeCategory)?.label}
        </h3>
        {filteredLocations.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">No results found</p>
          </div>
        )}
        <div className="space-y-2">
          {filteredLocations.map(loc => (
            <Card key={loc.id} className="border-0 card-interactive cursor-pointer" onClick={() => openDetails(loc)}>
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-[13px] truncate">{loc.name}</h4>
                  <p className="text-[10px] text-muted-foreground truncate">{loc.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-0.5 justify-end">
                      <Star className="w-3 h-3 text-accent fill-accent" />
                      <span className="text-[11px] font-medium">{loc.rating}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground">{fmtDist(loc._dist)}</p>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 rounded-xl"
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(loc.id, loc.name); }}
                  >
                    <Heart className={`w-4 h-4 transition-colors ${favorites.includes(loc.id) ? "fill-destructive text-destructive" : ""}`} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      <PlaceDetailsSheet
        place={selectedPlace}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        showDirections
        onNavigate={handleNavigate}
      />
    </motion.div>
  );
}
