import { useState, useRef, useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Route, Clock, DollarSign, Edit3, X, Check, Bus, Sparkles, Navigation, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface RoutePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  route: any | null;
  onEditRoute?: (route: any) => void;
}

const VEHICLE_ICONS: Record<string, string> = {
  jeepney: "🚍",
  mini_bus: "🚐",
  big_bus: "🚌",
  bus: "🚌",
  tricycle: "🛺",
  uv: "🚐",
  train: "🚆",
  walk: "🚶",
  ferry: "⛴️",
  car: "🚗",
  bike: "🚲",
};

const dotIcon = (color: string, numberStr?: string) => L.divIcon({
  className: "",
  html: `<div style="
    width: 28px;
    height: 28px;
    background: ${color};
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 11px;
    font-family: sans-serif;
  ">${numberStr ?? ""}</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const resolveStopName = (
  rawName: string,
  type: "pickup" | "dropoff",
  leg: any,
  legIdx: number,
  totalLegs: number,
  routeOrigin?: string,
  routeDest?: string,
  asyncCache?: Record<string, string>
): string => {
  const cacheKey = `${legIdx}-${type}`;
  if (asyncCache && asyncCache[cacheKey]) {
    return asyncCache[cacheKey];
  }

  const isGeneric =
    !rawName ||
    rawName.trim() === "" ||
    rawName.startsWith("Stop ") ||
    rawName === "Point A" ||
    rawName === "Point B" ||
    rawName === "Pickup" ||
    rawName === "Drop-off";

  if (!isGeneric) {
    return rawName.trim();
  }

  // Check route origin/dest if first pickup or last dropoff
  if (type === "pickup" && legIdx === 0 && routeOrigin && !routeOrigin.startsWith("Stop ") && routeOrigin !== "Origin") {
    return routeOrigin.trim();
  }
  if (type === "dropoff" && legIdx === totalLegs - 1 && routeDest && !routeDest.startsWith("Stop ") && routeDest !== "Destination") {
    return routeDest.trim();
  }

  // Parse from route_name if available (e.g., "San Clemente Plaza - Camiling Junction (Jeepney)")
  if (leg.route_name && leg.route_name.includes(" - ")) {
    const parts = leg.route_name.split(" - ");
    if (type === "pickup" && parts[0] && !parts[0].startsWith("Leg ") && !parts[0].startsWith("Stop ")) {
      return parts[0].replace(/\(.*?\)/g, "").trim();
    }
    if (type === "dropoff" && parts[1] && !parts[1].startsWith("Leg ") && !parts[1].startsWith("Stop ")) {
      return parts[1].replace(/\(.*?\)/g, "").trim();
    }
  }

  // Parse from instructions if available (e.g. "Take Jeepney at San Clemente Plaza, alight at Camiling Junction")
  const inst = leg.instructions || "";
  if (type === "pickup") {
    const match = inst.match(/(?:at|from|board)\s+([^,.\(\)]+?)(?:,|$|alight|to|\.)/i);
    if (match && match[1] && match[1].trim().length > 2 && !match[1].toLowerCase().includes("stop")) {
      return match[1].trim();
    }
  } else {
    const match = inst.match(/(?:alight at|to|drop-off at|get off at)\s+([^,.\(\)]+?)(?:,|$|\.|\()/i);
    if (match && match[1] && match[1].trim().length > 2 && !match[1].toLowerCase().includes("stop")) {
      return match[1].trim();
    }
  }

  // Coordinates fallback
  const lat = type === "pickup" ? leg.start_lat : leg.end_lat;
  const lng = type === "pickup" ? leg.start_lng : leg.end_lng;
  if (lat && lng && Number(lat) !== 0) {
    return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
  }

  return type === "pickup" ? `Pickup Point #${legIdx + 1}` : `Drop-off Point #${legIdx + 1}`;
};

export default function RoutePreviewModal({
  isOpen,
  onClose,
  route,
  onEditRoute,
}: RoutePreviewModalProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const legPolylinesRef = useRef<L.Polyline[]>([]);
  const legMarkersRef = useRef<L.Marker[]>([]);
  const [geoCache, setGeoCache] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen || !route?.legs) return;
    const legs = route.legs;

    legs.forEach(async (leg: any, idx: number) => {
      // Reverse geocode start_lat/lng if start_name is generic
      if ((!leg.start_name || leg.start_name.startsWith("Stop ")) && leg.start_lat && leg.start_lng && Number(leg.start_lat) !== 0) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${leg.start_lat}&lon=${leg.start_lng}`);
          const data = await res.json();
          if (data?.address) {
            const addr = data.address;
            const mainName = addr.amenity || addr.shop || addr.building || addr.tourism || addr.historic || addr.suburb || addr.village || addr.neighbourhood || addr.town || addr.city || data.display_name?.split(",")?.[0];
            if (mainName) {
              setGeoCache(prev => ({ ...prev, [`${idx}-pickup`]: mainName.trim() }));
            }
          }
        } catch {}
      }

      // Reverse geocode end_lat/lng if end_name is generic
      if ((!leg.end_name || leg.end_name.startsWith("Stop ")) && leg.end_lat && leg.end_lng && Number(leg.end_lat) !== 0) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${leg.end_lat}&lon=${leg.end_lng}`);
          const data = await res.json();
          if (data?.address) {
            const addr = data.address;
            const mainName = addr.amenity || addr.shop || addr.building || addr.tourism || addr.historic || addr.suburb || addr.village || addr.neighbourhood || addr.town || addr.city || data.display_name?.split(",")?.[0];
            if (mainName) {
              setGeoCache(prev => ({ ...prev, [`${idx}-dropoff`]: mainName.trim() }));
            }
          }
        } catch {}
      }
    });
  }, [isOpen, route]);

  useEffect(() => {
    if (!isOpen || !route) {
      if (mapInstance.current) {
        try { mapInstance.current.remove(); } catch {}
        mapInstance.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      if (!mapRef.current) return;

      if (mapInstance.current) {
        try { mapInstance.current.remove(); } catch {}
        mapInstance.current = null;
      }

      const map = L.map(mapRef.current, {
        center: [15.70, 120.40],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);

      mapInstance.current = map;

      const bounds = L.latLngBounds([]);
      const legs = route.legs || [];

      legPolylinesRef.current.forEach(p => p.remove());
      legPolylinesRef.current = [];
      legMarkersRef.current.forEach(m => m.remove());
      legMarkersRef.current = [];

      const renderLegs = async () => {
        for (let idx = 0; idx < legs.length; idx++) {
          const leg = legs[idx];
          const modeStr = leg.mode || "jeepney";
          const modesList = leg.modes && leg.modes.length > 0 ? leg.modes : [modeStr];

          const startName = resolveStopName(leg.start_name, "pickup", leg, idx, legs.length, route.origin_name, route.dest_name, geoCache);
          const endName = resolveStopName(leg.end_name, "dropoff", leg, idx, legs.length, route.origin_name, route.dest_name, geoCache);

          // Pickup marker
          if (leg.start_lat && leg.start_lng) {
            const pos: [number, number] = [Number(leg.start_lat), Number(leg.start_lng)];
            bounds.extend(pos);
            const m = L.marker(pos, {
              icon: dotIcon("#10b981", `${idx + 1}A`),
            })
              .bindPopup(`<b>Leg ${idx + 1} Pickup: ${startName}</b><br/>Modes: ${modesList.join(", ").toUpperCase()}`)
              .addTo(map);
            legMarkersRef.current.push(m);
          }

          // Dropoff marker
          if (leg.end_lat && leg.end_lng) {
            const pos: [number, number] = [Number(leg.end_lat), Number(leg.end_lng)];
            bounds.extend(pos);
            const m = L.marker(pos, {
              icon: dotIcon("#ef4444", `${idx + 1}B`),
            })
              .bindPopup(`<b>Leg ${idx + 1} Drop-off: ${endName}</b><br/>Fare: ₱${leg.fare}`)
              .addTo(map);
            legMarkersRef.current.push(m);
          }

          // Extract or fetch path_coordinates
          let coords: [number, number][] = [];
          if (Array.isArray(leg.path_coordinates) && leg.path_coordinates.length > 1) {
            coords = leg.path_coordinates.map((pt: any) =>
              Array.isArray(pt) ? [Number(pt[0]), Number(pt[1])] as [number, number] : [Number(pt.lat), Number(pt.lng)] as [number, number]
            );
          } else if (typeof leg.path_coordinates === "string") {
            try {
              const parsed = JSON.parse(leg.path_coordinates);
              if (Array.isArray(parsed) && parsed.length > 1) {
                coords = parsed.map((pt: any) =>
                  Array.isArray(pt) ? [Number(pt[0]), Number(pt[1])] as [number, number] : [Number(pt.lat), Number(pt.lng)] as [number, number]
                );
              }
            } catch {}
          }

          // If path_coordinates missing, query OSRM router or use fallback
          if ((!coords || coords.length < 2) && leg.start_lat && leg.start_lng && leg.end_lat && leg.end_lng) {
            try {
              const profile = leg.mode === "walk" ? "foot" : leg.mode === "bike" ? "cycling" : "driving";
              const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${leg.start_lng},${leg.start_lat};${leg.end_lng},${leg.end_lat}?overview=full&geometries=geojson`;
              const res = await fetch(osrmUrl);
              const data = await res.json();
              if (data.code === "Ok" && data.routes?.[0]?.geometry?.coordinates) {
                coords = data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
              }
            } catch {}

            // Fallback straight line
            if (!coords || coords.length < 2) {
              coords = [
                [Number(leg.start_lat), Number(leg.start_lng)],
                [Number(leg.end_lat), Number(leg.end_lng)],
              ];
            }
          }

          // Render Polyline on Leaflet Map
          if (coords && coords.length > 1) {
            coords.forEach(pt => bounds.extend(pt));

            const polyline = L.polyline(coords, {
              color: idx % 2 === 0 ? "#3b82f6" : "#8b5cf6",
              weight: 6,
              opacity: 0.9,
              dashArray: leg.mode === "walk" ? "6, 8" : undefined,
            }).addTo(map);

            polyline.bindPopup(`<b>Leg ${idx + 1}: ${leg.route_name || `Leg ${idx + 1}`}</b><br/>Fare: ₱${leg.fare} • ${leg.duration_minutes} mins`);
            legPolylinesRef.current.push(polyline);
          }
        }

        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      };

      renderLegs();

      setTimeout(() => {
        try { map.invalidateSize(); } catch {}
      }, 150);
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapInstance.current) {
        try { mapInstance.current.remove(); } catch {}
        mapInstance.current = null;
      }
    };
  }, [isOpen, route]);

  if (!route) return null;

  const legs = route.legs || [];
  const totalFare = Number(route.total_fare || legs.reduce((s: number, l: any) => s + (Number(l.fare) || 0), 0));
  const totalDuration = Number(route.total_duration_minutes || legs.reduce((s: number, l: any) => s + (Number(l.duration_minutes) || 0), 0));

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[96vw] max-h-[92vh] rounded-2xl p-0 overflow-hidden flex flex-col z-[5100]">
        {/* Modal Header */}
        <DialogHeader className="p-4 pb-3 border-b border-border/50 bg-gradient-to-r from-card via-muted/30 to-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-base font-extrabold flex items-center gap-2 text-foreground">
                <Navigation className="w-5 h-5 text-primary" />
                <span>{route.title || "Transit Route Preview"}</span>
                <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-bold uppercase">
                  Rider Preview
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-foreground">{route.origin_name || legs[0]?.start_name || "Origin"}</span>
                <span className="font-bold text-primary">➔</span>
                <span className="text-foreground">{route.dest_name || legs[legs.length - 1]?.end_name || "Destination"}</span>
              </DialogDescription>
            </div>

            {/* Quick Stats Badges */}
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs px-2.5 py-1 font-bold">
                ₱{totalFare.toFixed(2)} Total Fare
              </Badge>
              <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-xs px-2.5 py-1 font-bold">
                <Clock className="w-3.5 h-3.5 mr-1" /> {totalDuration} mins
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body: Map + Itinerary Split */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[420px]">
          {/* Map Preview Canvas */}
          <div className="flex-1 relative bg-muted/20 min-h-[250px] md:min-h-full border-b md:border-b-0 md:border-r border-border/40">
            <div ref={mapRef} className="w-full h-full relative z-0" />
            <div className="absolute top-3 left-3 z-[10] bg-card/90 backdrop-blur-md p-2 rounded-xl border border-border/50 shadow-md text-[11px] font-semibold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span>Interactive Map View ({legs.length} Leg Polylines)</span>
            </div>
          </div>

          {/* Rider Itinerary Breakdown Timeline */}
          <div className="w-full md:w-[380px] flex flex-col p-4 overflow-y-auto bg-muted/10 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Route className="w-4 h-4 text-primary" /> Commute Itinerary Timeline
              </h4>
              <Badge variant="outline" className="text-[10px] font-bold">
                {legs.length} {legs.length === 1 ? "Leg" : "Legs"}
              </Badge>
            </div>

            {legs.length === 0 ? (
              <Card className="p-6 text-center text-xs text-muted-foreground border-dashed">
                No commute leg breakdown available for this route.
              </Card>
            ) : (
              <div className="space-y-3">
                {legs.map((leg: any, idx: number) => {
                  const modeStr = leg.mode || "jeepney";
                  const modesList: string[] = leg.modes && leg.modes.length > 0
                    ? leg.modes
                    : (modeStr ? modeStr.split("/").map((m: string) => m.trim()) : ["jeepney"]);
                  
                  const modeIconsStr = modesList.map(m => VEHICLE_ICONS[m] || "🚍").join(" ");
                  const modeLabelsStr = modesList.map(m => m.replace("_", " ").toUpperCase()).join(" / ");

                  return (
                    <Card key={idx} className="border border-border/60 shadow-xs rounded-2xl overflow-hidden bg-card">
                      <CardContent className="p-3.5 space-y-2">
                        {/* Leg Header */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-6 h-6 rounded-lg bg-primary text-primary-foreground font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-xs text-foreground truncate">
                              {leg.route_name || `Leg ${idx + 1}`}
                            </span>
                          </div>
                          <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-extrabold px-2 py-0.5 shrink-0">
                            <span>{modeIconsStr}</span>
                            <span className="ml-1">{modeLabelsStr}</span>
                          </Badge>
                        </div>

                        {/* Pickup & Dropoff Stops Timeline */}
                        <div className="space-y-1.5 p-2.5 rounded-xl bg-muted/40 border border-border/40 text-[11px]">
                          <div className="flex items-start gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-[9px] uppercase font-bold text-emerald-600 block">Pickup</span>
                              <span className="font-semibold text-foreground truncate block">
                                {resolveStopName(leg.start_name, "pickup", leg, idx, legs.length, route.origin_name, route.dest_name, geoCache)}
                              </span>
                            </div>
                          </div>
                          <div className="w-0.5 h-3 bg-border/60 ml-1" />
                          <div className="flex items-start gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-[9px] uppercase font-bold text-rose-600 block">Drop-off</span>
                              <span className="font-semibold text-foreground truncate block">
                                {resolveStopName(leg.end_name, "dropoff", leg, idx, legs.length, route.origin_name, route.dest_name, geoCache)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Leg Stats */}
                        <div className="flex items-center justify-between text-[11px] font-semibold px-1 text-muted-foreground">
                          <span>Fare: <b className="text-emerald-600 font-bold text-xs">₱{leg.fare}</b></span>
                          <span>Est. Duration: <b className="text-blue-600 font-bold text-xs">{leg.duration_minutes} mins</b></span>
                        </div>

                        {/* Rider Instruction */}
                        {leg.instructions && (
                          <div className="text-[11px] bg-primary/5 p-2 rounded-xl text-foreground font-medium border border-primary/10 flex items-start gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                            <span>{leg.instructions}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-3 border-t border-border/50 bg-muted/20 flex flex-row justify-between items-center gap-2">
          <Button variant="ghost" onClick={onClose} className="rounded-xl text-xs h-9 font-semibold">
            Close Preview
          </Button>
          {onEditRoute && (
            <Button
              onClick={() => {
                onClose();
                onEditRoute(route);
              }}
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 h-9 shadow-travel"
            >
              <Edit3 className="w-4 h-4" /> Edit Route in Plotter
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
