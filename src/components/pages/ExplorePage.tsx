import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, MapPin, Star, Hotel, UtensilsCrossed, Mountain,
  Fuel, Eye, Landmark, SlidersHorizontal, Heart,
  TrendingUp, Compass, ExternalLink, Share2, Clock, Navigation
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { mockLocations } from "@/data/mockData";

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

const hotelRecommendations = [
  { name: "The Manila Hotel", type: "Luxury", price: "₱8,500/night", rating: 4.8, distance: "1.2 km", image: "🏨", reviews: 342 },
  { name: "Red Planet BGC", type: "Budget", price: "₱2,100/night", rating: 4.3, distance: "3.5 km", image: "🏢", reviews: 128 },
  { name: "Solaire Resort", type: "5-Star", price: "₱15,000/night", rating: 4.9, distance: "5.1 km", image: "🌟", reviews: 567 },
];

const foodRecommendations = [
  { name: "Poblacion Rooftop", cuisine: "Filipino Fusion", price: "₱₱₱", rating: 4.7, distance: "2.1 km", image: "🍽️", openNow: true },
  { name: "Toyo Eatery", cuisine: "Modern Filipino", price: "₱₱₱₱", rating: 4.9, distance: "4.2 km", image: "🥘", openNow: true },
  { name: "Jollibee Taft", cuisine: "Fast Food", price: "₱", rating: 4.2, distance: "0.3 km", image: "🐝", openNow: true },
  { name: "Ramen Nagi", cuisine: "Japanese", price: "₱₱", rating: 4.5, distance: "1.8 km", image: "🍜", openNow: false },
];

const experiences = [
  { name: "Sunset Cruise", desc: "Manila Bay golden hour sail", price: "₱2,500", rating: 4.8, duration: "2h", image: "🚢" },
  { name: "Food Tour", desc: "Binondo Chinatown walking tour", price: "₱1,200", rating: 4.9, duration: "3h", image: "🥟" },
  { name: "History Walk", desc: "Intramuros guided heritage tour", price: "₱800", rating: 4.7, duration: "2.5h", image: "🏛️" },
];

export default function ExplorePage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLocations = mockLocations.filter(l =>
    (activeCategory === "all" || l.type === activeCategory) &&
    (!searchQuery || l.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="px-4 py-4 pb-6 space-y-4">
      <motion.div variants={item}>
        <h2 className="font-display font-bold text-xl tracking-tight">Explore</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Discover nearby places & recommendations</p>
      </motion.div>

      {/* Search */}
      <motion.div variants={item} className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search places, hotels, restaurants..."
          className="pl-10 h-11 border-0 bg-muted text-sm rounded-xl"
        />
        <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl">
          <SlidersHorizontal className="w-4 h-4" />
        </Button>
      </motion.div>

      {/* Categories */}
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
              <Card key={i} className="border-0 card-interactive min-w-[200px] flex-shrink-0">
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

      {/* Hotels */}
      {(activeCategory === "all" || activeCategory === "hotel") && (
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="section-header flex items-center gap-1.5">
              <Hotel className="w-4 h-4 text-primary" /> Hotel Recommendations
            </h3>
            <Badge variant="outline" className="text-[9px] h-5 font-semibold">Near you</Badge>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4">
            {hotelRecommendations.map((hotel, i) => (
              <Card key={i} className="border-0 card-interactive min-w-[170px] flex-shrink-0">
                <CardContent className="p-3.5">
                  <div className="flex items-start justify-between">
                    <span className="text-2xl">{hotel.image}</span>
                    <Badge className="text-[8px] h-[16px] bg-accent/10 text-accent font-semibold">{hotel.type}</Badge>
                  </div>
                  <h4 className="font-semibold text-[13px] mt-2">{hotel.name}</h4>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3 h-3 text-accent fill-accent" />
                    <span className="text-[11px] font-medium">{hotel.rating}</span>
                    <span className="text-[10px] text-muted-foreground">({hotel.reviews})</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs font-bold text-primary">{hotel.price}</p>
                    <span className="text-[10px] text-muted-foreground">{hotel.distance}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Food */}
      {(activeCategory === "all" || activeCategory === "restaurant") && (
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="section-header flex items-center gap-1.5">
              <UtensilsCrossed className="w-4 h-4 text-accent" /> Food & Dining
            </h3>
            <Badge variant="outline" className="text-[9px] h-5 font-semibold">
              <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> Trending
            </Badge>
          </div>
          <div className="space-y-2">
            {foodRecommendations.map((food, i) => (
              <Card key={i} className="border-0 card-interactive">
                <CardContent className="p-3.5 flex items-center gap-3">
                  <span className="text-2xl">{food.image}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-semibold text-[13px] truncate">{food.name}</h4>
                      {food.openNow && (
                        <span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{food.cuisine} · {food.price}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-accent fill-accent" />
                      <span className="text-[11px] font-bold">{food.rating}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{food.distance}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* All Locations */}
      <motion.div variants={item}>
        <h3 className="section-header mb-2.5">
          {activeCategory === "all" ? "All Nearby" : categories.find(c => c.id === activeCategory)?.label}
        </h3>

        {filteredLocations.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">No results found</p>
            <p className="text-[11px] text-muted-foreground mt-1">Try a different search or category</p>
          </div>
        )}

        <div className="space-y-2">
          {filteredLocations.map(loc => (
            <Card key={loc.id} className="border-0 card-interactive">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-[13px] truncate">{loc.name}</h4>
                  <p className="text-[10px] text-muted-foreground truncate">{loc.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 text-accent fill-accent" />
                    <span className="text-[11px] font-medium">{loc.rating}</span>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 rounded-xl"
                    onClick={() => toggleFavorite(loc.id)}
                  >
                    <Heart className={`w-4 h-4 transition-colors ${favorites.includes(loc.id) ? "fill-destructive text-destructive" : ""}`} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
