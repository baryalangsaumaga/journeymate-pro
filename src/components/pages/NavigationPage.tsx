import { useState } from "react";
import { motion } from "framer-motion";
import {
  Navigation, MapPin, Car, Bus, Footprints, Train, Bike,
  Fuel, Eye, AlertTriangle, Clock, ArrowRight, ChevronUp,
  Gauge, Route, Layers, Locate, Volume2, VolumeX,
  Search, Star, CircleDot
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { mockRouteInfo, mockLocations } from "@/data/mockData";

const transitModes = [
  { id: "car", icon: Car, label: "Car", eta: "1h 45m" },
  { id: "transit", icon: Bus, label: "Transit", eta: "2h 30m" },
  { id: "walk", icon: Footprints, label: "Walk", eta: "12h" },
  { id: "bike", icon: Bike, label: "Bike", eta: "4h 15m" },
];

export default function NavigationPage() {
  const [selectedMode, setSelectedMode] = useState("car");
  const [isNavigating, setIsNavigating] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(true);

  return (
    <div className="relative h-[calc(100vh-7rem)]">
      {/* Map Area */}
      <div className="absolute inset-0 bg-muted map-grid">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80" />

        {/* Map Mock Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full h-full">
            {/* Route line */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 600">
              <path
                d="M 200 150 C 200 200, 250 250, 220 320 C 190 390, 280 420, 250 500"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="4"
                strokeDasharray={isNavigating ? "0" : "8 4"}
                strokeLinecap="round"
                className={isNavigating ? "animate-pulse" : ""}
              />
              {/* Start marker */}
              <circle cx="200" cy="150" r="8" fill="hsl(var(--success))" />
              <circle cx="200" cy="150" r="4" fill="white" />
              {/* End marker */}
              <circle cx="250" cy="500" r="8" fill="hsl(var(--destructive))" />
              <circle cx="250" cy="500" r="4" fill="white" />
              {/* Waypoints */}
              <circle cx="220" cy="320" r="6" fill="hsl(var(--accent))" />
              {/* Gas station */}
              <circle cx="280" cy="380" r="5" fill="hsl(var(--info))" />
              {/* Viewpoint */}
              <circle cx="180" cy="260" r="5" fill="hsl(var(--warning))" />
            </svg>

            {/* Current location pulse */}
            {isNavigating && (
              <div className="absolute top-[24%] left-[48%]">
                <div className="w-4 h-4 rounded-full bg-primary pulse-dot" />
                <div className="w-8 h-8 rounded-full bg-primary/20 absolute -top-2 -left-2 animate-ping" />
              </div>
            )}

            {/* POI Labels */}
            <div className="absolute top-[20%] left-[55%]">
              <Badge className="text-[9px] h-4 bg-success/90 shadow-sm">Start: Manila</Badge>
            </div>
            <div className="absolute top-[78%] left-[60%]">
              <Badge className="text-[9px] h-4 bg-destructive/90 shadow-sm">End: Tagaytay</Badge>
            </div>
            <div className="absolute top-[40%] left-[65%]">
              <Badge variant="outline" className="text-[9px] h-4 bg-card/90 gap-0.5">
                <Fuel className="w-2.5 h-2.5" /> Shell SLEX
              </Badge>
            </div>
            <div className="absolute top-[35%] left-[30%]">
              <Badge variant="outline" className="text-[9px] h-4 bg-card/90 gap-0.5">
                <Eye className="w-2.5 h-2.5" /> Viewpoint
              </Badge>
            </div>
          </div>
        </div>

        {/* Map Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9 bg-card shadow-card"><Layers className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" className="h-9 w-9 bg-card shadow-card"><Locate className="w-4 h-4" /></Button>
          <Button
            variant="outline" size="icon"
            className="h-9 w-9 bg-card shadow-card"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>

        {/* Search Bar */}
        <div className="absolute top-4 left-4 right-16">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search destination..."
              className="pl-9 h-9 bg-card shadow-card border-0 text-sm"
            />
          </div>
        </div>

        {/* Navigation HUD */}
        {isNavigating && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute top-16 left-4 right-4"
          >
            <Card className="border-0 shadow-card bg-primary text-primary-foreground">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-display font-bold text-lg">500m</p>
                    <p className="text-xs opacity-80">Turn right onto SLEX</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold">1:45</p>
                    <p className="text-[10px] opacity-80">ETA 11:45 AM</p>
                  </div>
                </div>
                {/* Speed & Limits */}
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-primary-foreground/20">
                  <div className="flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">72 km/h</span>
                  </div>
                  <Badge className="bg-warning text-warning-foreground text-[9px] h-4">
                    <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> Limit: 80 km/h
                  </Badge>
                  <div className="flex-1" />
                  <span className="text-[10px] opacity-80">Toll: ₱385</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Bottom Sheet */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 glass-strong rounded-t-2xl shadow-travel-lg z-10"
        animate={{ height: sheetOpen ? "auto" : 48 }}
      >
        <div className="flex justify-center py-1.5 cursor-pointer" onClick={() => setSheetOpen(!sheetOpen)}>
          <div className="w-8 h-1 rounded-full bg-border" />
        </div>

        {sheetOpen && (
          <div className="px-4 pb-4 space-y-3">
            {/* Transit Mode Selector */}
            <div className="flex gap-2">
              {transitModes.map(({ id, icon: Icon, label, eta }) => (
                <button
                  key={id}
                  onClick={() => setSelectedMode(id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all ${
                    selectedMode === id ? "bg-primary text-primary-foreground shadow-travel" : "bg-muted"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] font-medium">{label}</span>
                  <span className={`text-[9px] ${selectedMode === id ? "opacity-80" : "text-muted-foreground"}`}>{eta}</span>
                </button>
              ))}
            </div>

            {/* Route Info */}
            <Card className="border-0 shadow-card">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Route className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium">Suggested Route</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] h-5">Fastest</Badge>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="font-display font-bold text-sm">{mockRouteInfo.distance}</p>
                    <p className="text-[10px] text-muted-foreground">Distance</p>
                  </div>
                  <div className="text-center">
                    <p className="font-display font-bold text-sm">{mockRouteInfo.duration}</p>
                    <p className="text-[10px] text-muted-foreground">Duration</p>
                  </div>
                  <div className="text-center">
                    <p className="font-display font-bold text-sm">{mockRouteInfo.tollFee}</p>
                    <p className="text-[10px] text-muted-foreground">Toll Fee</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Speed Limits & Restrictions */}
            <div className="flex gap-2">
              <Card className="flex-1 border-0 shadow-card">
                <CardContent className="p-2 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full border-2 border-destructive flex items-center justify-center">
                    <span className="text-xs font-bold">{mockRouteInfo.speedLimit?.split("-")[1]}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium">Speed Limit</p>
                    <p className="text-[9px] text-muted-foreground">{mockRouteInfo.speedLimit}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="flex-1 border-0 shadow-card">
                <CardContent className="p-2 flex items-center gap-2">
                  <Fuel className="w-6 h-6 text-info" />
                  <div>
                    <p className="text-[10px] font-medium">Gas Stations</p>
                    <p className="text-[9px] text-muted-foreground">{mockRouteInfo.fuelStops.length} along route</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Restrictions */}
            {mockRouteInfo.restrictions && (
              <div className="flex flex-wrap gap-1">
                {mockRouteInfo.restrictions.map((r, i) => (
                  <Badge key={i} variant="outline" className="text-[9px] h-5 gap-0.5">
                    <AlertTriangle className="w-2.5 h-2.5 text-warning" /> {r}
                  </Badge>
                ))}
              </div>
            )}

            {/* Nearby POIs */}
            <div>
              <p className="text-xs font-medium mb-2">Points of Interest</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {mockLocations.filter(l => ["gas-station", "viewpoint"].includes(l.type)).map(loc => (
                  <Card key={loc.id} className="border-0 shadow-card min-w-[140px] flex-shrink-0">
                    <CardContent className="p-2">
                      <div className="flex items-center gap-1.5">
                        {loc.type === "gas-station" ? <Fuel className="w-3.5 h-3.5 text-info" /> : <Eye className="w-3.5 h-3.5 text-warning" />}
                        <span className="text-xs font-medium truncate">{loc.name}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-2.5 h-2.5 text-accent fill-accent" />
                        <span className="text-[10px]">{loc.rating}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Start Navigation Button */}
            <Button
              className={`w-full h-11 rounded-xl font-display font-bold shadow-travel text-sm gap-2 ${
                isNavigating ? "bg-destructive hover:bg-destructive/90" : ""
              }`}
              onClick={() => setIsNavigating(!isNavigating)}
            >
              <Navigation className={`w-4 h-4 ${isNavigating ? "" : "animate-pulse"}`} />
              {isNavigating ? "Stop Navigation" : "Start Navigation"}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
