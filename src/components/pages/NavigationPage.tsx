import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, Bus, Footprints, Bike, ArrowRight, ArrowLeft, ArrowUp,
  CornerUpRight, CornerUpLeft, Flag, Gauge, Route, Locate,
  UtensilsCrossed, CloudSun, Navigation as NavIcon, Loader2, Lock, Unlock, Box, Signal, RotateCcw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { mockLocations } from "@/data/mockData";
import { fetchRoute, formatDistance, formatDuration, RouteResult, RouteStep } from "@/lib/routing";
import { RouteDetailsPanel } from "@/components/travel/RouteDetailsPanel";
import { MapLayerSwitcher, type MapStyle } from "@/components/travel/MapLayerSwitcher";
import { PlaceSearchInput } from "@/components/travel/PlaceSearchInput";
import { useGeolocation, distanceMeters } from "@/hooks/useGeolocation";
import { useVoiceGuide, loadVoicePrefs, saveVoicePrefs, type VoicePrefs } from "@/hooks/useVoiceGuide";
import { VoiceSettingsPopover } from "@/components/travel/VoiceSettingsPopover";
import { useWeather } from "@/hooks/useWeather";
import { tripSession } from "@/lib/tripSession";
import { saveOfflineRoute, loadOfflineRoute } from "@/lib/offlineRoute";
import type { Location } from "@/types/travel";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const dot = (color: string, size = 12) => L.divIcon({
  className: "",
  html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
  iconSize: [size, size], iconAnchor: [size/2, size/2],
});
const carIcon = (heading: number | null) => L.divIcon({
  className: "",
  html: `
    <div style="position:relative;width:32px;height:32px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:hsl(162,72%,40%);border:3px solid white;box-shadow:0 0 0 5px hsla(162,72%,40%,.25),0 2px 8px rgba(0,0,0,.4);"></div>
      <div style="position:absolute;left:50%;top:-10px;transform:translateX(-50%) rotate(${heading ?? 0}deg);transform-origin:50% 26px;">
        <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:14px solid hsl(162,72%,30%);filter:drop-shadow(0 1px 2px rgba(0,0,0,.5));"></div>
      </div>
    </div>`,
  iconSize: [32, 32], iconAnchor: [16, 16],
});

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

// Whether a route segment passes a toll-ish corridor (very rough heuristic on mock data).
function routeHasToll(coords: [number, number][] | undefined, mode: string) {
  if (mode !== "car" || !coords?.length) return false;
  // Tag any leg that crosses south of 14.45 (SLEX-ish) as toll for the mock.
  return coords.some(([lat]) => lat < 14.45);
}

export default function NavigationPage() {
  const [selectedMode, setSelectedMode] = useState<"car" | "transit" | "walk" | "bike">("car");
  const [isNavigating, setIsNavigating] = useState(false);
  const [voicePrefs, setVoicePrefs] = useState<VoicePrefs>(() => loadVoicePrefs());
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const [mapStyle, setMapStyle] = useState<MapStyle>("voyager");
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [destination, setDestination] = useState<Location | null>(null);
  const [tripStops, setTripStops] = useState<Location[]>([]); // multi-leg from "Start the Trip"
  const [legIdx, setLegIdx] = useState(0);
  const [searchHidden, setSearchHidden] = useState(false);
  const [tripMode, setTripMode] = useState(false); // hides search/style/locate when launched from a trip
  const [isOnline, setIsOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [tiltLocked, setTiltLocked] = useState(false); // when true, tilt stays flat during navigation
  const [followMode, setFollowMode] = useState(true); // auto-recenter on user as they move
  const [keepTiltOnRecenter, setKeepTiltOnRecenter] = useState(true); // preserve 3D tilt when pressing recenter
  const [keepTiltAfterStop, setKeepTiltAfterStop] = useState(false); // preserve tilt even after navigation stops
  const [manualTilt, setManualTilt] = useState(false); // user-forced tilt when not navigating
  const [accuracyThreshold, setAccuracyThreshold] = useState<number>(() => {
    if (typeof window === "undefined") return 40;
    const raw = window.localStorage.getItem("nav.accuracyThreshold");
    return raw ? Number(raw) : 40;
  });
  useEffect(() => { try { window.localStorage.setItem("nav.accuracyThreshold", String(accuracyThreshold)); } catch {} }, [accuracyThreshold]);

  // Persist voice prefs
  useEffect(() => { saveVoicePrefs(voicePrefs); }, [voicePrefs]);
  useEffect(() => {
    const on = () => setIsOnline(true); const off = () => setIsOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Real GPS
  const { fix } = useGeolocation();
  const userPos = useMemo<[number, number] | null>(
    () => fix ? [fix.lat, fix.lng] : null,
    [fix?.lat, fix?.lng],
  );
  const startPoint: [number, number] = userPos ?? [14.5895, 120.9740];
  const { speak, cancel: cancelVoice } = useVoiceGuide(voicePrefs);

  // Weather along route (sampled at midpoint of current leg).
  const midCoord = route?.coordinates?.[Math.floor(route.coordinates.length / 2)];
  const { data: areaWeather } = useWeather(midCoord?.[0], midCoord?.[1]);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const traveledRef = useRef<L.Polyline | null>(null);
  const carMarkerRef = useRef<L.Marker | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const eateryMarkersRef = useRef<L.Marker[]>([]);
  const accuracyRingRef = useRef<L.Circle | null>(null);
  const headingConeRef = useRef<L.Polygon | null>(null);

  const tileUrls: Record<string, string> = {
    voyager: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  };

  // Hand-off from Itinerary "Start the Trip"
  useEffect(() => {
    const trip = tripSession.takeTrip();
    if (trip && trip.stops.length > 0) {
      setTripStops(trip.stops.map(s => s.location));
      setDestination(trip.stops[0].location);
      setSearchHidden(true);
      setTripMode(true);
      toast({ title: "🧭 Trip Loaded", description: `${trip.stops.length} stops · ${trip.pace} pace` });
      return;
    }
    const dest = tripSession.takeDestination();
    if (dest) {
      setDestination(dest.location);
      setSearchHidden(true);
      setTripMode(false);
      return;
    }
    // No hand-off → if offline, restore the last cached route so navigation still works.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const cached = loadOfflineRoute();
      if (cached?.destination && cached.route) {
        setDestination(cached.destination);
        setRoute(cached.route);
        setSearchHidden(true);
        toast({ title: "📴 Offline Route Loaded", description: cached.destination.name });
      }
    }
  }, []);

  // Cache route + nearby places for offline use whenever a new route is computed.
  useEffect(() => {
    if (!route || !destination) return;
    const nearby = mockLocations.filter(l =>
      route.coordinates.some(([rlat, rlng]) => Math.hypot(rlat - l.lat, rlng - l.lng) < 0.05),
    );
    saveOfflineRoute({ destination, route, nearby, mode: selectedMode });
  }, [route, destination, selectedMode]);


  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, {
      center: startPoint, zoom: 13, zoomControl: false, attributionControl: false,
    });
    tileRef.current = L.tileLayer(tileUrls[mapStyle]).addTo(map);
    mapInstance.current = map;
    // User-initiated drag disables follow-mode so the map doesn't fight them
    map.on("dragstart", () => setFollowMode(false));
    setTimeout(() => map.invalidateSize(), 100);
    return () => { map.remove(); mapInstance.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch tiles
  useEffect(() => { tileRef.current?.setUrl(tileUrls[mapStyle]); }, [mapStyle]);

  // When tilt mode flips, give Leaflet a beat to recompute its viewport.
  useEffect(() => {
    const t = setTimeout(() => mapInstance.current?.invalidateSize(), 750);
    return () => clearTimeout(t);
  }, [isNavigating]);

  // Reliability tier from current GPS accuracy vs user-set threshold
  const reliability = useMemo(() => {
    const a = fix?.accuracy ?? 9999;
    if (a <= accuracyThreshold * 0.5) return { label: "Good", color: "hsl(162,72%,40%)", text: "white" };
    if (a <= accuracyThreshold) return { label: "Fair", color: "hsl(38,92%,50%)", text: "white" };
    return { label: "Poor", color: "hsl(0,75%,55%)", text: "white" };
  }, [fix?.accuracy, accuracyThreshold]);

  // Update start marker as GPS arrives
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !userPos) return;
    const labelHtml = `
      <div style="position:relative;width:18px;height:18px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:${reliability.color};border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>
        <div style="position:absolute;top:20px;left:50%;transform:translateX(-50%);background:${reliability.color};color:${reliability.text};font:600 9px Inter,sans-serif;padding:1px 6px;border-radius:999px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.3);letter-spacing:.02em;">GPS · ${reliability.label}</div>
      </div>`;
    const icon = L.divIcon({ className: "", html: labelHtml, iconSize: [18, 18], iconAnchor: [9, 9] });
    if (!startMarkerRef.current) {
      startMarkerRef.current = L.marker(userPos, { icon }).bindPopup(`📍 You are here · ${reliability.label} GPS`).addTo(map);
    } else {
      startMarkerRef.current.setLatLng(userPos);
      startMarkerRef.current.setIcon(icon);
    }
    // GPS accuracy ring — radius from real accuracy, color from reliability tier
    const acc = Math.min(fix?.accuracy ?? 50, 250);
    if (!accuracyRingRef.current) {
      accuracyRingRef.current = L.circle(userPos, {
        radius: acc, color: reliability.color, weight: 1,
        fillColor: reliability.color, fillOpacity: 0.12,
      }).addTo(map);
    } else {
      accuracyRingRef.current.setLatLng(userPos);
      accuracyRingRef.current.setRadius(acc);
      accuracyRingRef.current.setStyle({ color: reliability.color, fillColor: reliability.color });
    }
  }, [userPos?.[0], userPos?.[1], fix?.accuracy, reliability.label]);

  // Update destination marker
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    destMarkerRef.current?.remove();
    if (destination) {
      destMarkerRef.current = L.marker([destination.lat, destination.lng], { icon: dot("#ef4444", 16) })
        .bindPopup(`🏁 ${destination.name}`).addTo(map);
    }
  }, [destination?.id]);

  // Fetch route when destination/mode/userPos changes
  useEffect(() => {
    if (!destination) { setRoute(null); return; }
    let cancelled = false;
    setLoadingRoute(true);
    fetchRoute(startPoint, [destination.lat, destination.lng], selectedMode).then(r => {
      if (cancelled) return;
      setRoute(r);
      setStepIdx(0);
      setLoadingRoute(false);
    });
    return () => { cancelled = true; };
  }, [destination?.id, selectedMode, startPoint[0], startPoint[1]]);

  // Draw the route polyline + place "eateries along the way" markers
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    polylineRef.current?.remove();
    traveledRef.current?.remove();
    eateryMarkersRef.current.forEach(m => m.remove());
    eateryMarkersRef.current = [];
    if (!route) return;

    polylineRef.current = L.polyline(route.coordinates, {
      color: "hsl(162, 72%, 40%)", weight: 5, opacity: 0.85,
    }).addTo(map);
    traveledRef.current = L.polyline([], {
      color: "hsl(162, 72%, 25%)", weight: 6, opacity: 1,
    }).addTo(map);

    // Eateries near the route
    const eateries = mockLocations.filter(l =>
      (l.type === "restaurant" || l.type === "poi") &&
      route.coordinates.some(([rlat, rlng]) => Math.hypot(rlat - l.lat, rlng - l.lng) < 0.05),
    );
    eateries.forEach(e => {
      const mk = L.marker([e.lat, e.lng], { icon: dot("#f59e0b", 10) })
        .bindPopup(`<strong>🍽️ ${e.name}</strong><br/><small>${e.rating ?? ""}★ along your route</small>`).addTo(map);
      eateryMarkersRef.current.push(mk);
    });

    if (!isNavigating && route.coordinates.length > 1) {
      map.fitBounds(L.latLngBounds(route.coordinates), { padding: [40, 40] });
    }
  }, [route]);

  // Live GPS follow: snap user position to the route, advance steps, voice prompts
  useEffect(() => {
    if (!isNavigating || !route || !userPos) return;
    const map = mapInstance.current;
    if (!map) return;

    // Update car marker = user position (with heading-aware arrow)
    if (!carMarkerRef.current) {
      carMarkerRef.current = L.marker(userPos, { icon: carIcon(fix?.heading ?? null), zIndexOffset: 1000 }).addTo(map);
    } else {
      carMarkerRef.current.setLatLng(userPos);
      carMarkerRef.current.setIcon(carIcon(fix?.heading ?? null));
    }
    if (followMode) map.setView(userPos, 16, { animate: true });

    // Find nearest coordinate on route -> draw traveled polyline up to that index
    let minIdx = 0, minD = Infinity;
    route.coordinates.forEach((c, i) => {
      const d = Math.hypot(c[0] - userPos[0], c[1] - userPos[1]);
      if (d < minD) { minD = d; minIdx = i; }
    });
    traveledRef.current?.setLatLngs(route.coordinates.slice(0, minIdx + 1));

    // Advance step when within ~50m of next step's maneuver point
    const next = route.steps[stepIdx + 1];
    if (next) {
      const dToNext = distanceMeters({ lat: userPos[0], lng: userPos[1] }, { lat: next.location[0], lng: next.location[1] });
      if (dToNext < 50) {
        setStepIdx(s => s + 1);
        speak(next.instruction);
      }
    }

    // Arrived?
    const dest = route.coordinates[route.coordinates.length - 1];
    if (distanceMeters({ lat: userPos[0], lng: userPos[1] }, { lat: dest[0], lng: dest[1] }) < 30) {
      speak("You have arrived at your destination.");
      toast({ title: "🏁 You have arrived!", description: destination?.name ?? "" });
      // multi-leg: advance to next stop
      if (tripStops.length && legIdx < tripStops.length - 1) {
        const nextLeg = tripStops[legIdx + 1];
        setLegIdx(i => i + 1);
        setDestination(nextLeg);
        setStepIdx(0);
        toast({ title: "➡️ Next Stop", description: nextLeg.name });
      } else {
        setIsNavigating(false);
      }
    }
  }, [userPos?.[0], userPos?.[1], isNavigating, route, stepIdx]);

  // Stop -> clean car marker + voice
  useEffect(() => {
    if (!isNavigating) {
      carMarkerRef.current?.remove();
      carMarkerRef.current = null;
      traveledRef.current?.setLatLngs([]);
      cancelVoice();
    }
  }, [isNavigating, cancelVoice]);

  // Periodically suggest a nearby eatery while navigating
  useEffect(() => {
    if (!isNavigating || !route) return;
    const id = setInterval(() => {
      const eateries = mockLocations.filter(l =>
        (l.type === "restaurant" || l.type === "poi") &&
        route.coordinates.some(([rlat, rlng]) => Math.hypot(rlat - l.lat, rlng - l.lng) < 0.05),
      );
      if (!eateries.length) return;
      const pick = eateries[Math.floor(Math.random() * eateries.length)];
      toast({ title: "🍽️ Eatery Ahead", description: `${pick.name} · ${pick.rating ?? ""}★` });
    }, 45000);
    return () => clearInterval(id);
  }, [isNavigating, route]);

  // Weather monitor along the way
  useEffect(() => {
    if (!isNavigating || !areaWeather) return;
    toast({ title: `${weatherEmoji(areaWeather.condition)} ${areaWeather.tempC}°C ahead`, description: areaWeather.summary });
  }, [isNavigating, areaWeather?.condition]);

  const handleLocate = () => {
    if (!mapInstance.current || !userPos) return;
    mapInstance.current.setView(userPos, 16, { animate: true });
    setFollowMode(true); // re-engage follow on recenter
    // Tilt is preserved unless the user explicitly disabled keepTiltOnRecenter
    if (!keepTiltOnRecenter && isNavigating) setTiltLocked(true);
    toast({
      title: "📍 Centered on Your Location",
      description: keepTiltOnRecenter ? "Follow-mode on · 3D tilt preserved" : "Follow-mode on",
    });
  };

  const handleStartNav = () => {
    if (!route) return;
    setIsNavigating(v => !v);
    if (!isNavigating) {
      const first = route.steps[0]?.instruction ?? "Starting navigation";
      toast({ title: "🧭 Navigation Started", description: first });
      speak(first);
      setSheetExpanded(false);
      setFollowMode(true); // always follow when starting
    } else {
      toast({ title: "⏹️ Navigation Stopped", description: keepTiltAfterStop ? "3D tilt kept (Keep tilt ON)" : "View reset to top-down" });
      setSheetExpanded(true);
      // Auto-reset 3D unless the user has Keep tilt enabled
      if (!keepTiltAfterStop) {
        setManualTilt(false);
        setTiltLocked(false);
      }
    }
  };

  const handleResetTilt = () => {
    setManualTilt(false);
    setTiltLocked(false);
    setIsNavigating(false);
    toast({ title: "🗺️ View Reset", description: "Back to top-down" });
  };

  const handlePickDestination = (place: Location) => {
    setDestination(place);
    setSearchHidden(true); // hide search so it doesn't disrupt
    toast({ title: "📍 Destination Set", description: place.name });
  };

  const currentStep: RouteStep | undefined = route?.steps[stepIdx];
  const nextStep: RouteStep | undefined = route?.steps[stepIdx + 1];
  const ManeuverIcon = maneuverIcon(nextStep?.maneuver ?? currentStep?.maneuver, nextStep?.modifier ?? currentStep?.modifier);
  const showToll = routeHasToll(route?.coordinates, selectedMode);

  // Tilt is on during navigation (unless locked flat) OR when user kept tilt after stop
  const tilt3D = ((isNavigating || (manualTilt && keepTiltAfterStop)) && !tiltLocked);

  return (
    <div className="relative h-[calc(100dvh-7rem)] overflow-hidden">
      {/* Map layer — isolated 3D context so siblings aren't pushed behind in stacking */}
      <div className="absolute inset-0 z-0 overflow-hidden" style={{ perspective: "1400px", perspectiveOrigin: "50% 85%" }}>
        <div
          className="absolute inset-0 transition-transform duration-700 ease-out will-change-transform"
          ref={mapRef}
          style={{
            transform: tilt3D
              ? "translateY(12%) scale(1.7) rotateX(55deg)"
              : "translateY(0) scale(1) rotateX(0deg)",
            transformOrigin: "50% 75%",
          }}
        />
      </div>

      {/* Controls layer — flat, never affected by 3D, never clipped */}
      <div className="pointer-events-none absolute inset-0 z-30">
        <div className="pointer-events-auto absolute top-3 right-3 flex flex-col items-end gap-2 max-w-[calc(100%-1.5rem)]">
          {!tripMode && <MapLayerSwitcher value={mapStyle} onChange={setMapStyle} />}
          {!isOnline && (
            <Badge className="bg-amber-500 text-white text-[9px] h-5">Offline mode</Badge>
          )}
          <div className="flex flex-col gap-2 items-end">
            <Button
              variant="default"
              size="icon"
              className={`h-11 w-11 rounded-full shadow-travel ${followMode ? "glow-primary" : "bg-card text-foreground hover:bg-card/90"}`}
              onClick={handleLocate}
              aria-label="Recenter on my location"
              title={followMode ? "Following — tap to recenter" : "Recenter & resume follow"}
            >
              <Locate className={`w-5 h-5 ${followMode ? "" : "opacity-70"}`} />
            </Button>
            {isNavigating && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className={`h-10 w-10 rounded-full backdrop-blur-sm shadow-card-hover border-border/50 ${tiltLocked ? "bg-card/95" : "bg-primary text-primary-foreground"}`}
                  onClick={() => setTiltLocked(v => !v)}
                  aria-label={tiltLocked ? "Unlock 3D tilt" : "Lock view flat"}
                  title={tiltLocked ? "Unlock 3D tilt" : "Lock view flat"}
                >
                  {tiltLocked ? <Lock className="w-4 h-4" /> : <Box className="w-4 h-4" />}
                </Button>
              </>
            )}
            {/* Reset 3D — visible whenever tilt is currently applied */}
            {tilt3D && !isNavigating && (
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full bg-card/95 backdrop-blur-sm shadow-card-hover border-border/50"
                onClick={handleResetTilt}
                aria-label="Reset 3D tilt"
                title="Reset to top-down"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
            {/* GPS reliability + threshold setting */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-card/95 backdrop-blur-sm shadow-card-hover border border-border/50 text-[10px] font-semibold"
                  title="GPS reliability & threshold"
                  style={{ color: reliability.color }}
                >
                  <Signal className="w-3.5 h-3.5" />
                  <span>{reliability.label}</span>
                  <span className="text-muted-foreground font-normal">· ≤{accuracyThreshold}m</span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-3 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold mb-1">GPS Accuracy Threshold</p>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    Fix within <span className="font-semibold">{accuracyThreshold}m</span> is considered reliable. Half of that is "Good".
                  </p>
                  <Slider value={[accuracyThreshold]} min={10} max={120} step={5} onValueChange={([v]) => setAccuracyThreshold(v)} />
                  <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                    <span>Strict 10m</span><span>Loose 120m</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div>
                    <p className="text-[11px] font-semibold">Keep tilt after stop</p>
                    <p className="text-[9px] text-muted-foreground">Stay in 3D when navigation ends</p>
                  </div>
                  <Switch checked={keepTiltAfterStop} onCheckedChange={setKeepTiltAfterStop} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold">Keep tilt on recenter</p>
                    <p className="text-[9px] text-muted-foreground">Preserve 3D when pressing GPS</p>
                  </div>
                  <Switch checked={keepTiltOnRecenter} onCheckedChange={setKeepTiltOnRecenter} />
                </div>
                <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                  Current: <span className="font-semibold" style={{ color: reliability.color }}>{reliability.label}</span>
                  {" · "}{Math.round(fix?.accuracy ?? 0)}m fix
                </div>
              </PopoverContent>
            </Popover>
            <VoiceSettingsPopover value={voicePrefs} onChange={setVoicePrefs} />
          </div>
        </div>
      </div>



      {/* Destination search — hidden in trip mode and after a pick to avoid disruption. */}
      <AnimatePresence>
        {!searchHidden && !tripMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="absolute top-4 left-4 right-16 z-30"
          >
            <PlaceSearchInput
              placeholder="Search destination…"
              onPick={handlePickDestination}
              className="bg-card/95 backdrop-blur-sm rounded-xl shadow-card-hover"
            />
          </motion.div>
        )}
        {searchHidden && destination && (
          <motion.div
            key="dest-pill"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="absolute top-4 left-4 right-16 z-30"
          >
            <button
              onClick={() => setSearchHidden(false)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-card/95 backdrop-blur-sm shadow-card-hover border border-border/50 text-left"
            >
              <NavIcon className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground">Destination</p>
                <p className="text-xs font-semibold truncate">{destination.name}</p>
              </div>
              {tripStops.length > 0 && (
                <Badge variant="outline" className="text-[9px] h-5">{legIdx + 1}/{tripStops.length}</Badge>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isNavigating && nextStep && (
          <motion.div
            initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
            className="absolute top-16 left-4 right-4 z-30"
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
                    <p className="font-display font-bold text-lg leading-none">{formatDuration((route?.duration ?? 0) * (1 - stepIdx / Math.max(1, route?.steps.length ?? 1)))}</p>
                    <p className="text-[10px] opacity-70 mt-0.5">remaining</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-primary-foreground/15">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">{Math.round((fix?.speed ?? 0) * 3.6)} km/h</span>
                  </div>
                  {areaWeather && (
                    <Badge className="bg-primary-foreground/20 text-primary-foreground text-[9px] h-5 font-semibold gap-1">
                      <CloudSun className="w-2.5 h-2.5" /> {areaWeather.tempC}°C
                    </Badge>
                  )}
                  <div className="flex-1" />
                  <span className="text-[10px] opacity-70">Step {stepIdx + 1} / {route?.steps.length}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="absolute bottom-0 left-0 right-0 glass-ultra rounded-t-3xl z-30 border-t border-border/30"
        animate={{ height: sheetExpanded ? "auto" : 28 }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
      >
        <button className="flex justify-center w-full py-1.5" onClick={() => setSheetExpanded(!sheetExpanded)} aria-label="Toggle panel">
          <div className="w-9 h-1 rounded-full bg-border" />
        </button>


        <AnimatePresence>
          {sheetExpanded && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="px-4 pb-4 space-y-3"
            >
              {!destination && (
                <Card className="border-0 card-interactive">
                  <CardContent className="p-3 text-center text-xs text-muted-foreground">
                    Search a destination above to plan a route.
                  </CardContent>
                </Card>
              )}

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
                      {loadingRoute ? "…" : route ? formatDuration(route.duration) : "—"}
                    </span>
                  </button>
                ))}
              </div>

              {route && (
                <Card className="border-0 card-elevated">
                  <CardContent className="p-3.5">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <Route className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold">Live Route</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] h-5 font-semibold border-primary/20 text-primary">
                        {loadingRoute ? "Loading…" : `${route.steps.length} steps`}
                      </Badge>
                    </div>
                    <div className={`grid ${showToll ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
                      <div className="text-center p-2 rounded-lg bg-muted">
                        <p className="font-display font-bold text-sm">{formatDistance(route.distance)}</p>
                        <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Distance</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted">
                        <p className="font-display font-bold text-sm">{formatDuration(route.duration)}</p>
                        <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Duration</p>
                      </div>
                      {showToll && (
                        <div className="text-center p-2 rounded-lg bg-muted">
                          <p className="font-display font-bold text-sm">₱385</p>
                          <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Toll Fee</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Route Details now contains speed limit + gas stations (merged). */}
              {route && <RouteDetailsPanel routeCoords={route.coordinates} mode={selectedMode} />}

              {/* Eateries along the way (visible during planning too). */}
              {route && (
                <Card className="border-0 card-elevated">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold flex items-center gap-1.5">
                        <UtensilsCrossed className="w-3.5 h-3.5 text-accent" /> Eateries Along the Way
                      </span>
                    </div>
                    <div className="space-y-1">
                      {mockLocations
                        .filter(l => (l.type === "restaurant" || l.type === "poi") &&
                          route.coordinates.some(([rlat, rlng]) => Math.hypot(rlat - l.lat, rlng - l.lng) < 0.05))
                        .slice(0, 4)
                        .map(e => (
                          <div key={e.id} className="flex items-center justify-between text-[11px] p-1.5 rounded bg-muted/40">
                            <span className="font-semibold truncate">{e.name}</span>
                            <span className="text-muted-foreground">★ {e.rating}</span>
                          </div>
                        ))}
                      {!mockLocations.some(l => (l.type === "restaurant" || l.type === "poi") &&
                        route.coordinates.some(([rlat, rlng]) => Math.hypot(rlat - l.lat, rlng - l.lng) < 0.05)) && (
                        <p className="text-[10px] text-muted-foreground text-center py-1">No eateries detected near route.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                disabled={!route || loadingRoute}
                className={`w-full h-12 rounded-2xl font-display font-bold shadow-travel text-sm gap-2 ${
                  isNavigating ? "bg-destructive hover:bg-destructive/90" : "glow-primary"
                }`}
                onClick={handleStartNav}
              >
                {loadingRoute ? <Loader2 className="w-4 h-4 animate-spin" /> : <NavIcon className={`w-4 h-4 ${isNavigating ? "" : "animate-pulse"}`} />}
                {isNavigating ? "Stop Navigation" : "Start Turn-by-Turn"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function weatherEmoji(c?: string) {
  switch (c) {
    case "sunny": return "☀️";
    case "cloudy": return "⛅";
    case "rainy": return "🌧️";
    case "stormy": return "⛈️";
    case "snowy": return "❄️";
    case "foggy": return "🌫️";
    case "windy": return "💨";
    default: return "🌤️";
  }
}
