import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Navigation, Car, Bus, Footprints, Bike,
  Fuel, AlertTriangle, ArrowRight, ArrowLeft, ArrowUp, CornerUpRight, CornerUpLeft, Flag,
  Gauge, Route, Layers, Locate, Volume2, VolumeX,
  Search, Loader2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { mockLocations } from "@/data/mockData";
import { fetchRoute, formatDistance, formatDuration, RouteResult, RouteStep } from "@/lib/routing";

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

const carIcon = () => L.divIcon({
  className: "",
  html: `<div style="width:22px;height:22px;background:hsl(162,72%,40%);border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px hsl(162,72%,40%,.25),0 2px 8px rgba(0,0,0,0.4)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const START: [number, number] = [14.5895, 120.9740]; // Intramuros
const END: [number, number] = [14.1153, 120.9621];   // Tagaytay

const transitModes = [
  { id: "car" as const, icon: Car, label: "Drive" },
  { id: "transit" as const, icon: Bus, label: "Transit" },
  { id: "walk" as const, icon: Footprints, label: "Walk" },
  { id: "bike" as const, icon: Bike, label: "Bike" },
];

const maneuverIcon = (m?: string, mod?: string) => {
  if (m === "arrive") return Flag;
  if (mod?.includes("left")) return m === "turn" ? CornerUpLeft : ArrowLeft;
  if (mod?.includes("right")) return m === "turn" ? CornerUpRight : ArrowRight;
  return ArrowUp;
};

export default function NavigationPage() {
  const [selectedMode, setSelectedMode] = useState<"car" | "transit" | "walk" | "bike">("car");
  const [isNavigating, setIsNavigating] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapStyle, setMapStyle] = useState<"voyager" | "dark" | "light">("voyager");
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [progressIdx, setProgressIdx] = useState(0); // index into coords
  const [speed, setSpeed] = useState(0);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const traveledRef = useRef<L.Polyline | null>(null);
  const carMarkerRef = useRef<L.Marker | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const stepMarkersRef = useRef<L.Marker[]>([]);

  const tileUrls: Record<string, string> = {
    voyager: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  };

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, {
      center: [14.45, 120.98], zoom: 11, zoomControl: false, attributionControl: false,
    });
    tileRef.current = L.tileLayer(tileUrls[mapStyle]).addTo(map);
    L.marker(START, { icon: createIcon("#22c55e", 16) }).bindPopup("<strong>Start:</strong> Intramuros, Manila").addTo(map);
    L.marker(END, { icon: createIcon("#ef4444", 16) }).bindPopup("<strong>Destination:</strong> Tagaytay Ridge").addTo(map);
    mockLocations.filter(l => l.type === "gas-station").forEach(loc => {
      L.marker([loc.lat, loc.lng], { icon: createIcon("#0ea5e9", 10) }).bindPopup(`<strong>⛽ ${loc.name}</strong>`).addTo(map);
    });
    mockLocations.filter(l => l.type === "viewpoint").forEach(loc => {
      L.marker([loc.lat, loc.lng], { icon: createIcon("#f59e0b", 10) }).bindPopup(`<strong>👁️ ${loc.name}</strong>`).addTo(map);
    });
    mapInstance.current = map;
    setTimeout(() => map.invalidateSize(), 100);
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  // Fetch real route whenever mode changes
  useEffect(() => {
    let cancelled = false;
    setLoadingRoute(true);
    fetchRoute(START, END, selectedMode).then(r => {
      if (cancelled) return;
      setRoute(r);
      setStepIdx(0);
      setProgressIdx(0);
      setLoadingRoute(false);
    });
    return () => { cancelled = true; };
  }, [selectedMode]);

  // Draw the route polyline + step markers
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !route) return;

    polylineRef.current?.remove();
    traveledRef.current?.remove();
    stepMarkersRef.current.forEach(m => m.remove());
    stepMarkersRef.current = [];

    polylineRef.current = L.polyline(route.coordinates, {
      color: "hsl(162, 72%, 40%)", weight: 5, opacity: 0.85,
    }).addTo(map);

    traveledRef.current = L.polyline([], {
      color: "hsl(162, 72%, 25%)", weight: 6, opacity: 1,
    }).addTo(map);

    // step markers (small dots at maneuver points)
    route.steps.slice(1, -1).forEach(s => {
      const mk = L.circleMarker(s.location, {
        radius: 4, color: "white", weight: 2, fillColor: "hsl(162,72%,40%)", fillOpacity: 1,
      }).bindPopup(`<strong>${s.instruction}</strong><br/>${formatDistance(s.distance)}`).addTo(map);
      stepMarkersRef.current.push(mk as unknown as L.Marker);
    });

    if (route.coordinates.length > 1 && !isNavigating) {
      map.fitBounds(L.latLngBounds(route.coordinates), { padding: [40, 40] });
    }
  }, [route]);

  // Switch tiles
  useEffect(() => {
    if (tileRef.current) tileRef.current.setUrl(tileUrls[mapStyle]);
  }, [mapStyle]);

  // Navigation simulation loop — advances along route coordinates
  useEffect(() => {
    if (!isNavigating || !route || route.coordinates.length < 2) return;
    const map = mapInstance.current;
    if (!map) return;

    // Spawn car marker at current progress
    const pos = route.coordinates[progressIdx];
    if (!carMarkerRef.current) {
      carMarkerRef.current = L.marker(pos, { icon: carIcon(), zIndexOffset: 1000 }).addTo(map);
    } else {
      carMarkerRef.current.setLatLng(pos);
    }
    map.setView(pos, 15, { animate: true });

    const baseSpeed = selectedMode === "walk" ? 1 : selectedMode === "bike" ? 2 : 4;
    const interval = setInterval(() => {
      setProgressIdx(prev => {
        const next = Math.min(prev + baseSpeed, route.coordinates.length - 1);
        const nextPos = route.coordinates[next];
        carMarkerRef.current?.setLatLng(nextPos);
        traveledRef.current?.setLatLngs(route.coordinates.slice(0, next + 1));
        map.panTo(nextPos, { animate: true, duration: 0.4 } as any);

        // randomize speed display
        setSpeed(50 + Math.round(Math.random() * 40));

        // advance step when we pass its location
        setStepIdx(si => {
          const step = route.steps[si + 1];
          if (!step) return si;
          const [slat, slng] = step.location;
          const d = Math.hypot(nextPos[0] - slat, nextPos[1] - slng);
          if (d < 0.005) {
            if (!isMuted) toast({ title: "🔊 " + step.instruction });
            return si + 1;
          }
          return si;
        });

        if (next >= route.coordinates.length - 1) {
          clearInterval(interval);
          toast({ title: "🏁 You have arrived!", description: "Welcome to Tagaytay Ridge." });
          setIsNavigating(false);
        }
        return next;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isNavigating, route]);

  // Remove car marker when stopping
  useEffect(() => {
    if (!isNavigating && carMarkerRef.current) {
      carMarkerRef.current.remove();
      carMarkerRef.current = null;
      traveledRef.current?.setLatLngs([]);
    }
  }, [isNavigating]);

  const handleLocate = () => {
    if (!mapInstance.current || !route) return;
    mapInstance.current.setView(route.coordinates[progressIdx] ?? START, 15, { animate: true });
    toast({ title: "📍 Centered on Your Location" });
  };

  const handleLayerSwitch = () => {
    const styles: ("voyager" | "dark" | "light")[] = ["voyager", "dark", "light"];
    const next = styles[(styles.indexOf(mapStyle) + 1) % styles.length];
    setMapStyle(next);
    toast({ title: `🗺️ Map Style: ${next}` });
  };

  const handleStartNav = () => {
    if (!route) return;
    setIsNavigating(v => !v);
    if (!isNavigating) {
      toast({ title: "🧭 Navigation Started", description: route.steps[0]?.instruction });
      setSheetExpanded(false);
    } else {
      toast({ title: "⏹️ Navigation Stopped" });
      setSheetExpanded(true);
    }
  };

  const currentStep: RouteStep | undefined = route?.steps[stepIdx];
  const nextStep: RouteStep | undefined = route?.steps[stepIdx + 1];
  const ManeuverIcon = maneuverIcon(nextStep?.maneuver ?? currentStep?.maneuver, nextStep?.modifier ?? currentStep?.modifier);

  return (
    <div className="relative h-[calc(100dvh-7rem)]">
      <div className="absolute inset-0 z-0" ref={mapRef} />

      <div className="absolute top-4 right-4 flex flex-col gap-2 z-[400]">
        <Button variant="outline" size="icon" className="h-9 w-9 bg-card/95 backdrop-blur-sm shadow-card-hover rounded-xl border-border/50" onClick={handleLayerSwitch}><Layers className="w-4 h-4" /></Button>
        <Button variant="outline" size="icon" className="h-9 w-9 bg-card/95 backdrop-blur-sm shadow-card-hover rounded-xl border-border/50" onClick={handleLocate}><Locate className="w-4 h-4" /></Button>
        <Button variant="outline" size="icon" className={`h-9 w-9 bg-card/95 backdrop-blur-sm shadow-card-hover rounded-xl border-border/50 ${isMuted ? "text-muted-foreground" : ""}`} onClick={() => { setIsMuted(!isMuted); toast({ title: isMuted ? "🔊 Voice On" : "🔇 Voice Off" }); }}>
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
      </div>

      <div className="absolute top-4 left-4 right-16 z-[400]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search destination..."
            className="pl-9 h-10 bg-card/95 backdrop-blur-sm shadow-card-hover border-border/50 text-sm rounded-xl"
          />
        </div>
      </div>

      <AnimatePresence>
        {isNavigating && nextStep && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="absolute top-16 left-4 right-4 z-[400]"
          >
            <Card className="border-0 shadow-travel-lg bg-primary text-primary-foreground overflow-hidden">
              <CardContent className="p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary-foreground/15 flex items-center justify-center flex-shrink-0">
                    <ManeuverIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-base leading-tight truncate">{nextStep.instruction}</p>
                    <p className="text-xs opacity-80 mt-0.5">in {formatDistance(nextStep.distance)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-display font-bold text-lg leading-none">{formatDuration((route?.duration ?? 0) * (1 - progressIdx / (route?.coordinates.length ?? 1)))}</p>
                    <p className="text-[10px] opacity-70 mt-0.5">remaining</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-primary-foreground/15">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">{speed} km/h</span>
                  </div>
                  <Badge className="bg-warning text-warning-foreground text-[9px] h-5 font-semibold">
                    <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> Limit: 80
                  </Badge>
                  <div className="flex-1" />
                  <span className="text-[10px] opacity-70">Step {stepIdx + 1} / {route?.steps.length}</span>
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
                {transitModes.map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setSelectedMode(id)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all tap-highlight ${
                      selectedMode === id ? "bg-primary text-primary-foreground shadow-travel" : "bg-muted"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] font-semibold">{label}</span>
                    <span className={`text-[9px] ${selectedMode === id ? "opacity-70" : "text-muted-foreground"}`}>
                      {loadingRoute ? "…" : route ? formatDuration(route.duration) : ""}
                    </span>
                  </button>
                ))}
              </div>

              <Card className="border-0 card-elevated">
                <CardContent className="p-3.5">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <Route className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold">Live Route (OSRM)</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] h-5 font-semibold border-primary/20 text-primary">
                      {loadingRoute ? "Loading…" : `${route?.steps.length ?? 0} steps`}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2 rounded-lg bg-muted">
                      <p className="font-display font-bold text-sm">{route ? formatDistance(route.distance) : "—"}</p>
                      <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Distance</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted">
                      <p className="font-display font-bold text-sm">{route ? formatDuration(route.duration) : "—"}</p>
                      <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Duration</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted">
                      <p className="font-display font-bold text-sm">₱385</p>
                      <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Toll Fee</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming turn-by-turn preview */}
              {route && !isNavigating && (
                <Card className="border-0 card-elevated">
                  <CardContent className="p-3 space-y-1.5 max-h-32 overflow-y-auto">
                    {route.steps.slice(0, 4).map((s, i) => {
                      const Icon = maneuverIcon(s.maneuver, s.modifier);
                      return (
                        <div key={i} className="flex items-center gap-2.5">
                          <Icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span className="text-[11px] flex-1 truncate">{s.instruction}</span>
                          <span className="text-[9px] text-muted-foreground">{formatDistance(s.distance)}</span>
                        </div>
                      );
                    })}
                    {route.steps.length > 4 && (
                      <p className="text-[9px] text-muted-foreground text-center pt-1">+ {route.steps.length - 4} more steps</p>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2">
                <Card className="flex-1 border-0 card-interactive">
                  <CardContent className="p-2.5 flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full border-2 border-destructive flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-bold">80</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold">Speed Limit</p>
                      <p className="text-[9px] text-muted-foreground">Expressway</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="flex-1 border-0 card-interactive">
                  <CardContent className="p-2.5 flex items-center gap-2.5">
                    <Fuel className="w-6 h-6 text-info flex-shrink-0" />
                    <div>
                      <p className="text-[11px] font-semibold">Gas Stations</p>
                      <p className="text-[9px] text-muted-foreground">3 along route</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Button
                disabled={!route || loadingRoute}
                className={`w-full h-12 rounded-2xl font-display font-bold shadow-travel text-sm gap-2 ${
                  isNavigating ? "bg-destructive hover:bg-destructive/90" : "glow-primary"
                }`}
                onClick={handleStartNav}
              >
                {loadingRoute ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className={`w-4 h-4 ${isNavigating ? "" : "animate-pulse"}`} />}
                {isNavigating ? "Stop Navigation" : "Start Turn-by-Turn"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
