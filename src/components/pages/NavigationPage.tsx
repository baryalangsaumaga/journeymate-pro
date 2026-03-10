import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Navigation, MapPin, Car, Bus, Footprints, Train, Bike,
  Fuel, Eye, AlertTriangle, Clock, ArrowRight, ChevronUp, ChevronDown,
  Gauge, Route, Layers, Locate, Volume2, VolumeX,
  Search, Star, CircleDot, X
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { mockRouteInfo, mockLocations } from "@/data/mockData";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const createIcon = (color: string, size: number = 12) => L.divIcon({
  className: "",
  html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
  iconSize: [size, size],
  iconAnchor: [size/2, size/2],
});

const routeCoords: [number, number][] = [
  [14.5895, 120.9740], [14.5833, 120.9667], [14.5647, 121.0300],
  [14.5547, 121.0509], [14.4200, 121.0400], [14.1153, 120.9621],
];

const transitModes = [
  { id: "car", icon: Car, label: "Drive", eta: "1h 45m" },
  { id: "transit", icon: Bus, label: "Transit", eta: "2h 30m" },
  { id: "walk", icon: Footprints, label: "Walk", eta: "12h" },
  { id: "bike", icon: Bike, label: "Bike", eta: "4h 15m" },
];

export default function NavigationPage() {
  const [selectedMode, setSelectedMode] = useState("car");
  const [isNavigating, setIsNavigating] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapStyle, setMapStyle] = useState<"voyager" | "dark" | "light">("voyager");
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);

  const center: [number, number] = [14.45, 120.98];

  const tileUrls: Record<string, string> = {
    voyager: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  };

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, {
      center, zoom: 11, zoomControl: false, attributionControl: false,
    });
    tileRef.current = L.tileLayer(tileUrls[mapStyle]).addTo(map);
    polylineRef.current = L.polyline(routeCoords, {
      color: "hsl(162, 72%, 40%)", weight: 4, opacity: 0.9, dashArray: "8 6",
    }).addTo(map);
    L.marker(routeCoords[0], { icon: createIcon("#22c55e", 16) }).bindPopup("<strong>Start:</strong> Intramuros, Manila").addTo(map);
    L.marker(routeCoords[routeCoords.length - 1], { icon: createIcon("#ef4444", 16) }).bindPopup("<strong>Destination:</strong> Tagaytay Ridge").addTo(map);
    mockLocations.filter(l => l.type === "gas-station").forEach(loc => {
      L.marker([loc.lat, loc.lng], { icon: createIcon("#0ea5e9", 10) }).bindPopup(`<strong>⛽ ${loc.name}</strong><br/>${loc.description}`).addTo(map);
    });
    mockLocations.filter(l => l.type === "viewpoint").forEach(loc => {
      L.marker([loc.lat, loc.lng], { icon: createIcon("#f59e0b", 10) }).bindPopup(`<strong>👁️ ${loc.name}</strong><br/>${loc.description}<br/>⭐ ${loc.rating}`).addTo(map);
    });
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !tileRef.current) return;
    tileRef.current.setUrl(tileUrls[mapStyle]);
  }, [mapStyle]);

  useEffect(() => {
    if (!mapInstance.current) return;
    if (polylineRef.current) polylineRef.current.setStyle({ dashArray: isNavigating ? undefined : "8 6" });
    if (isNavigating) {
      if (!circleRef.current) {
        circleRef.current = L.circle(routeCoords[1], {
          radius: 200, color: "hsl(162, 72%, 40%)", fillColor: "hsl(162, 72%, 40%)", fillOpacity: 0.2, weight: 2,
        }).addTo(mapInstance.current);
      }
    } else {
      if (circleRef.current) { circleRef.current.remove(); circleRef.current = null; }
    }
  }, [isNavigating]);

  const handleLocate = () => {
    if (mapInstance.current) {
      mapInstance.current.setView(routeCoords[1], 15, { animate: true });
      toast({ title: "📍 Centered on Your Location" });
    }
  };

  const handleLayerSwitch = () => {
    const styles: ("voyager" | "dark" | "light")[] = ["voyager", "dark", "light"];
    const next = styles[(styles.indexOf(mapStyle) + 1) % styles.length];
    setMapStyle(next);
    toast({ title: `🗺️ Map Style: ${next.charAt(0).toUpperCase() + next.slice(1)}` });
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    toast({ title: isMuted ? "🔊 Voice Guidance On" : "🔇 Voice Guidance Off" });
  };

  const handleStartNav = () => {
    setIsNavigating(!isNavigating);
    if (!isNavigating) {
      toast({ title: "🧭 Navigation Started!", description: "Follow the route on the map." });
      setSheetExpanded(false);
    } else {
      toast({ title: "⏹️ Navigation Stopped" });
      setSheetExpanded(true);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      toast({ title: "🔍 Searching...", description: `Looking for "${searchQuery}" nearby.` });
    }
  };

  return (
    <div className="relative h-[calc(100dvh-7rem)]">
      <div className="absolute inset-0 z-0" ref={mapRef} />

      <div className="absolute top-4 right-4 flex flex-col gap-2 z-[400]">
        <Button variant="outline" size="icon" className="h-9 w-9 bg-card/95 backdrop-blur-sm shadow-card-hover rounded-xl border-border/50" onClick={handleLayerSwitch}><Layers className="w-4 h-4" /></Button>
        <Button variant="outline" size="icon" className="h-9 w-9 bg-card/95 backdrop-blur-sm shadow-card-hover rounded-xl border-border/50" onClick={handleLocate}><Locate className="w-4 h-4" /></Button>
        <Button variant="outline" size="icon" className={`h-9 w-9 bg-card/95 backdrop-blur-sm shadow-card-hover rounded-xl border-border/50 ${isMuted ? "text-muted-foreground" : ""}`} onClick={handleMuteToggle}>
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
      </div>

      <div className="absolute top-4 left-4 right-16 z-[400]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Search destination..."
            className="pl-9 h-10 bg-card/95 backdrop-blur-sm shadow-card-hover border-border/50 text-sm rounded-xl"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>
      </div>

      <AnimatePresence>
        {isNavigating && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="absolute top-16 left-4 right-4 z-[400]"
          >
            <Card className="border-0 shadow-travel-lg bg-primary text-primary-foreground overflow-hidden">
              <CardContent className="p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary-foreground/15 flex items-center justify-center">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-display font-bold text-xl leading-none">500m</p>
                    <p className="text-xs opacity-80 mt-0.5">Turn right onto SLEX</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-lg leading-none">1:45</p>
                    <p className="text-[10px] opacity-70 mt-0.5">ETA 11:45 AM</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-primary-foreground/15">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">72 km/h</span>
                  </div>
                  <Badge className="bg-warning text-warning-foreground text-[9px] h-5 font-semibold">
                    <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> Limit: 80
                  </Badge>
                  <div className="flex-1" />
                  <span className="text-[10px] opacity-70">Toll: ₱385</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="absolute bottom-0 left-0 right-0 glass-ultra rounded-t-3xl z-[400] border-t border-border/30"
        animate={{ height: sheetExpanded ? "auto" : 52 }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
      >
        <button className="flex justify-center w-full py-2" onClick={() => setSheetExpanded(!sheetExpanded)}>
          <div className="w-9 h-1 rounded-full bg-border" />
        </button>

        <AnimatePresence>
          {sheetExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 pb-4 space-y-3"
            >
              <div className="flex gap-2">
                {transitModes.map(({ id, icon: Icon, label, eta }) => (
                  <button
                    key={id}
                    onClick={() => { setSelectedMode(id); toast({ title: `🚗 Mode: ${label}`, description: `ETA: ${eta}` }); }}
                    className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all tap-highlight ${
                      selectedMode === id ? "bg-primary text-primary-foreground shadow-travel" : "bg-muted"
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                    <span className="text-[10px] font-semibold">{label}</span>
                    <span className={`text-[9px] ${selectedMode === id ? "opacity-70" : "text-muted-foreground"}`}>{eta}</span>
                  </button>
                ))}
              </div>

              <Card className="border-0 card-elevated">
                <CardContent className="p-3.5">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <Route className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold">Suggested Route</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] h-5 font-semibold border-primary/20 text-primary">Fastest</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Distance", value: mockRouteInfo.distance },
                      { label: "Duration", value: mockRouteInfo.duration },
                      { label: "Toll Fee", value: mockRouteInfo.tollFee },
                    ].map(info => (
                      <div key={info.label} className="text-center p-2 rounded-lg bg-muted">
                        <p className="font-display font-bold text-sm">{info.value}</p>
                        <p className="text-[9px] text-muted-foreground font-medium mt-0.5">{info.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Card className="flex-1 border-0 card-interactive">
                  <CardContent className="p-2.5 flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full border-2 border-destructive flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-bold">100</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold">Speed Limit</p>
                      <p className="text-[9px] text-muted-foreground">{mockRouteInfo.speedLimit}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="flex-1 border-0 card-interactive">
                  <CardContent className="p-2.5 flex items-center gap-2.5">
                    <Fuel className="w-6 h-6 text-info flex-shrink-0" />
                    <div>
                      <p className="text-[11px] font-semibold">Gas Stations</p>
                      <p className="text-[9px] text-muted-foreground">{mockRouteInfo.fuelStops.length} along route</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Button
                className={`w-full h-12 rounded-2xl font-display font-bold shadow-travel text-sm gap-2 ${
                  isNavigating ? "bg-destructive hover:bg-destructive/90" : "glow-primary"
                }`}
                onClick={handleStartNav}
              >
                <Navigation className={`w-4.5 h-4.5 ${isNavigating ? "" : "animate-pulse"}`} />
                {isNavigating ? "Stop Navigation" : "Start Navigation"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
