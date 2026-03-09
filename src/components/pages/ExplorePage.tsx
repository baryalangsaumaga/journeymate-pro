import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search, MapPin, Star, Hotel, UtensilsCrossed, Mountain,
  Fuel, Eye, Landmark, Filter, SlidersHorizontal, Heart,
  Navigation, Clock, TrendingUp, Compass
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { mockLocations } from "@/data/mockData";

const categories = [
  { id: "all", label: "All", icon: Compass },
  { id: "hotel", label: "Hotels", icon: Hotel },
  { id: "restaurant", label: "Food", icon: UtensilsCrossed },
  { id: "landmark", label: "Landmarks", icon: Landmark },
  { id: "viewpoint", label: "Views", icon: Eye },
  { id: "gas-station", label: "Gas", icon: Fuel },
];

const hotelRecommendations = [
  { name: "The Manila Hotel", type: "Luxury", price: "₱8,500/night", rating: 4.8, distance: "1.2 km", image: "🏨" },
  { name: "Red Planet BGC", type: "Budget", price: "₱2,100/night", rating: 4.3, distance: "3.5 km", image: "🏢" },
  { name: "Solaire Resort", type: "5-Star", price: "₱15,000/night", rating: 4.9, distance: "5.1 km", image: "🌟" },
];

const foodRecommendations = [
  { name: "Poblacion Rooftop", cuisine: "Filipino Fusion", price: "₱₱₱", rating: 4.7, distance: "2.1 km", image: "🍽️" },
  { name: "Toyo Eatery", cuisine: "Modern Filipino", price: "₱₱₱₱", rating: 4.9, distance: "4.2 km", image: "🥘" },
  { name: "Jollibee Taft", cuisine: "Fast Food", price: "₱", rating: 4.2, distance: "0.3 km", image: "🐝" },
  { name: "Ramen Nagi", cuisine: "Japanese", price: "₱₱", rating: 4.5, distance: "1.8 km", image: "🍜" },
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
    <div className="px-4 py-4 pb-6 space-y-4">
      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-xl">Explore</h2>
        <p className="text-xs text-muted-foreground">Discover nearby places & recommendations</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search places, hotels, restaurants..."
          className="pl-9 h-10 border-0 bg-muted text-sm"
        />
        <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
          <SlidersHorizontal className="w-4 h-4" />
        </Button>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {categories.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveCategory(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeCategory === id ? "bg-primary text-primary-foreground shadow-travel" : "bg-muted text-muted-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Hotel Recommendations */}
      {(activeCategory === "all" || activeCategory === "hotel") && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-semibold text-sm flex items-center gap-1">
              <Hotel className="w-4 h-4 text-primary" /> Hotel Recommendations
            </h3>
            <Badge variant="outline" className="text-[10px] h-5">Near you</Badge>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
            {hotelRecommendations.map((hotel, i) => (
              <Card key={i} className="border-0 shadow-card min-w-[180px] flex-shrink-0">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <span className="text-2xl">{hotel.image}</span>
                    <Badge className="text-[9px] h-4 bg-accent text-accent-foreground">{hotel.type}</Badge>
                  </div>
                  <h4 className="font-medium text-sm mt-2">{hotel.name}</h4>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3 h-3 text-accent fill-accent" />
                    <span className="text-xs">{hotel.rating}</span>
                    <span className="text-[10px] text-muted-foreground ml-1">{hotel.distance}</span>
                  </div>
                  <p className="text-xs font-semibold text-primary mt-1">{hotel.price}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Food Recommendations */}
      {(activeCategory === "all" || activeCategory === "restaurant") && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-semibold text-sm flex items-center gap-1">
              <UtensilsCrossed className="w-4 h-4 text-accent" /> Food & Dining
            </h3>
            <Badge variant="outline" className="text-[10px] h-5">
              <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> Trending
            </Badge>
          </div>
          <div className="space-y-2">
            {foodRecommendations.map((food, i) => (
              <Card key={i} className="border-0 shadow-card">
                <CardContent className="p-3 flex items-center gap-3">
                  <span className="text-2xl">{food.image}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{food.name}</h4>
                    <p className="text-[10px] text-muted-foreground">{food.cuisine} · {food.price}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-accent fill-accent" />
                      <span className="text-xs font-medium">{food.rating}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{food.distance}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Nearby Locations */}
      <div>
        <h3 className="font-display font-semibold text-sm mb-2">
          {activeCategory === "all" ? "All Nearby" : categories.find(c => c.id === activeCategory)?.label}
        </h3>
        <div className="space-y-2">
          {filteredLocations.map(loc => (
            <Card key={loc.id} className="border-0 shadow-card">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-muted flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{loc.name}</h4>
                  <p className="text-[10px] text-muted-foreground truncate">{loc.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 text-accent fill-accent" />
                    <span className="text-xs">{loc.rating}</span>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => toggleFavorite(loc.id)}
                  >
                    <Heart className={`w-3.5 h-3.5 ${favorites.includes(loc.id) ? "fill-destructive text-destructive" : ""}`} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
