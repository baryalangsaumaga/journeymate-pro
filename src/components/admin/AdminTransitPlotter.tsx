import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Plus, Trash2, Save, Move, Bus, Car, Footprints, Bike,
  Search, ZoomIn, ZoomOut, Maximize2, RotateCcw, AlertCircle, CheckCircle2,
  DollarSign, Clock, Layers, Route, Edit3, ChevronDown, ChevronUp, Sparkles, Navigation
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchRoutePlan } from "@/lib/routing";
import { placesApi } from "@/lib/api";
import RoutePreviewModal from "@/components/admin/RoutePreviewModal";

type VehicleMode = "jeepney" | "big_bus" | "mini_bus" | "bus" | "tricycle" | "uv" | "train" | "ferry" | "walk" | "car" | "bike";

export interface RouteOption {
  id: string;
  name: string;
  coordinates: [number, number][];
  distance_km: number;
  duration_minutes: number;
  summary?: string;
}

interface LegDraft {
  id: string;
  sequence: number;
  mode: VehicleMode;
  modes: VehicleMode[]; // Multi-mode support (e.g., Jeepney + Mini Bus + Trike)
  route_name: string;
  provider: string;
  fare: number;
  duration_minutes: number;
  instructions: string;
  start_name: string;
  start_lat: number;
  start_lng: number;
  end_name: string;
  end_lat: number;
  end_lng: number;
  path_coordinates: [number, number][]; // Primary active path
  available_routes?: RouteOption[]; // Alternative route choices from OSRM
  selected_route_index?: number; // Active selected route option index
}

interface AdminTransitPlotterProps {
  onSaveSuccess?: () => void;
  initialRoute?: any;
}

const VEHICLE_MODES: { id: VehicleMode; label: string; icon: string; description?: string }[] = [
  { id: "jeepney", label: "Jeepney", icon: "🚍" },
  { id: "mini_bus", label: "Mini Bus (Provincial)", icon: "🚐", description: "Local Provincial Route Bus" },
  { id: "big_bus", label: "Big Bus (Commercial)", icon: "🚌", description: "Express / Highway Commercial Bus" },
  { id: "tricycle", label: "Tricycle", icon: "🛺" },
  { id: "uv", label: "UV Express", icon: "🚐" },
  { id: "bus", label: "General Bus", icon: "🚌" },
  { id: "train", label: "Train / MRT", icon: "🚆" },
  { id: "walk", label: "Walk", icon: "🚶" },
  { id: "ferry", label: "Ferry", icon: "⛴️" },
  { id: "car", label: "Car", icon: "🚗" },
];

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
    font-size: 12px;
    font-family: sans-serif;
  ">${numberStr ?? ""}</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Helper: Reverse-geocode coordinates to actual landmark/barangay/town name
const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    if (data?.address) {
      const addr = data.address;
      const mainName =
        addr.amenity ||
        addr.shop ||
        addr.building ||
        addr.tourism ||
        addr.historic ||
        addr.suburb ||
        addr.village ||
        addr.neighbourhood ||
        addr.town ||
        addr.city ||
        data.display_name?.split(",")?.[0];
      if (mainName) return mainName.trim();
    }
  } catch {}
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
};

// Helper: Auto-deduce route name and instructions from pickup & drop-off names
const deduceLegDetails = (leg: LegDraft): { route_name: string; instructions: string } => {
  const modesList = (leg.modes && leg.modes.length > 0) ? leg.modes : [leg.mode || "jeepney"];
  const modeLabels = modesList
    .map(mId => VEHICLE_MODES.find(m => m.id === mId)?.label || mId)
    .join(" / ");

  let routeName = leg.route_name;
  let instructions = leg.instructions;

  const isDefaultRouteName =
    !routeName ||
    routeName.startsWith("Leg") ||
    routeName.startsWith("Transit Leg") ||
    routeName === "Camiling - Paniqui Route" ||
    routeName.includes("Jeepney") ||
    routeName.includes("Bus");

  const isDefaultInstructions =
    !instructions ||
    instructions.startsWith("Board vehicle") ||
    instructions.startsWith("Transfer") ||
    instructions.startsWith("Board jeepney") ||
    instructions.startsWith("Board") ||
    instructions.startsWith("Take");

  if (leg.start_name && leg.end_name && (isDefaultRouteName || routeName.trim() === "")) {
    routeName = `${leg.start_name} - ${leg.end_name} (${modeLabels})`;
  }

  if (leg.start_name && leg.end_name && (isDefaultInstructions || instructions.trim() === "")) {
    instructions = `Take ${modeLabels} at ${leg.start_name}, alight at ${leg.end_name}`;
  }

  return { route_name: routeName, instructions };
};

export default function AdminTransitPlotter({ onSaveSuccess, initialRoute }: AdminTransitPlotterProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  const [isEditingMeta, setIsEditingMeta] = useState<boolean>(false);
  const [title, setTitle] = useState(initialRoute?.title || "");
  const [description, setDescription] = useState(initialRoute?.description || "");
  const [originName, setOriginName] = useState(initialRoute?.origin_name || "");
  const [destName, setDestName] = useState(initialRoute?.dest_name || "");

  const [legs, setLegs] = useState<LegDraft[]>(() => {
    if (initialRoute?.legs && initialRoute.legs.length > 0) {
      return initialRoute.legs.map((l: any, i: number) => ({
        id: `leg-${i}-${Date.now()}`,
        sequence: i + 1,
        mode: l.mode || "jeepney",
        modes: l.modes && l.modes.length > 0
          ? l.modes
          : (l.mode ? l.mode.split("/").map((m: string) => m.trim()) : ["jeepney"]),
        route_name: l.route_name || `Leg ${i + 1}`,
        provider: l.provider || "",
        fare: Number(l.fare) || 0,
        duration_minutes: Number(l.duration_minutes) || 10,
        instructions: l.instructions || "",
        start_name: l.start_name || `Stop ${i + 1}`,
        start_lat: Number(l.start_lat) || 15.71,
        start_lng: Number(l.start_lng) || 120.35,
        end_name: l.end_name || `Stop ${i + 2}`,
        end_lat: Number(l.end_lat) || 15.72,
        end_lng: Number(l.end_lng) || 120.36,
        path_coordinates: l.path_coordinates || [],
      }));
    }
    return [];
  });

  const [activeLegIdx, setActiveLegIdx] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeClickTarget, setActiveClickTarget] = useState<"start" | "end">("start");
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Update state when initialRoute prop changes (e.g., clicking a saved route)
  useEffect(() => {
    if (initialRoute) {
      setTitle(initialRoute.title || "");
      setDescription(initialRoute.description || "");
      setOriginName(initialRoute.origin_name || "");
      setDestName(initialRoute.dest_name || "");
      setIsEditingMeta(false);
      if (initialRoute.legs && initialRoute.legs.length > 0) {
        setLegs(
          initialRoute.legs.map((l: any, i: number) => ({
            id: `leg-${i}-${Date.now()}`,
            sequence: i + 1,
            mode: l.mode || "jeepney",
            modes: l.modes && l.modes.length > 0
              ? l.modes
              : (l.mode ? l.mode.split("/").map((m: string) => m.trim()) : ["jeepney"]),
            route_name: l.route_name || `Leg ${i + 1}`,
            provider: l.provider || "",
            fare: Number(l.fare) || 0,
            duration_minutes: Number(l.duration_minutes) || 10,
            instructions: l.instructions || "",
            start_name: l.start_name || `Stop ${i + 1}`,
            start_lat: Number(l.start_lat) || 0,
            start_lng: Number(l.start_lng) || 0,
            end_name: l.end_name || `Stop ${i + 2}`,
            end_lat: Number(l.end_lat) || 0,
            end_lng: Number(l.end_lng) || 0,
            path_coordinates: l.path_coordinates || [],
            available_routes: l.available_routes || [],
            selected_route_index: l.selected_route_index ?? 0,
          }))
        );
      } else {
        setLegs([]);
      }
    } else {
      setTitle("");
      setDescription("");
      setOriginName("");
      setDestName("");
      setIsEditingMeta(true);
      setLegs([]);
    }
  }, [initialRoute]);

  const activeLegIdxRef = useRef(activeLegIdx);
  activeLegIdxRef.current = activeLegIdx;

  const activeClickTargetRef = useRef(activeClickTarget);
  activeClickTargetRef.current = activeClickTarget;

  const legPolylinesRef = useRef<L.Polyline[]>([]);
  const legMarkersRef = useRef<L.Marker[]>([]);

  // Calculate totals
  const totalFare = legs.reduce((sum, l) => sum + (Number(l.fare) || 0), 0);
  const totalDuration = legs.reduce((sum, l) => sum + (Number(l.duration_minutes) || 0), 0);

  // Init Leaflet map with STABLE click handlers (ALWAYS ACTIVE)
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [15.70, 120.40],
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: true,
      touchZoom: true,
      doubleClickZoom: true,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);

    mapInstance.current = map;

    // Map Click Listener to set leg points dynamically
    map.on("click", async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const targetIdx = activeLegIdxRef.current;
      const targetType = activeClickTargetRef.current;

      const targetLabel = targetType === "start" ? "Pickup" : "Drop-off";
      toast({
        title: `📍 Resolving ${targetLabel} location...`,
        description: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      });

      const resolvedName = await reverseGeocode(lat, lng);

      setLegs(prev => {
        let copy = [...prev];
        if (copy.length === 0) {
          const firstLeg: LegDraft = {
            id: `leg-1-${Date.now()}`,
            sequence: 1,
            mode: "jeepney",
            modes: ["jeepney"],
            route_name: "",
            provider: "Public Transport",
            fare: 15,
            duration_minutes: 10,
            instructions: "",
            start_name: resolvedName,
            start_lat: lat,
            start_lng: lng,
            end_name: "",
            end_lat: 0,
            end_lng: 0,
            path_coordinates: [],
            available_routes: [],
            selected_route_index: 0,
          };
          return [firstLeg];
        }

        const currentIdx = Math.min(targetIdx, copy.length - 1);
        if (!copy[currentIdx]) return prev;
        const current = { ...copy[currentIdx] };

        if (targetType === "start") {
          current.start_lat = lat;
          current.start_lng = lng;
          current.start_name = resolvedName;
        } else {
          current.end_lat = lat;
          current.end_lng = lng;
          current.end_name = resolvedName;
        }

        const { route_name, instructions } = deduceLegDetails(current);
        current.route_name = route_name;
        current.instructions = instructions;

        copy[currentIdx] = current;
        return copy;
      });

      toast({
        title: `📍 ${targetLabel} Set: ${resolvedName}`,
        description: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      });
    });

    return () => {
      try { map.remove(); } catch {}
      mapInstance.current = null;
    };
  }, []);

  // Auto-snap road polyline via OSRM street-level router for legs
  const snapLegPolyline = useCallback(async (legIndex: number) => {
    const leg = legs[legIndex];
    if (!leg || !leg.start_lat || !leg.start_lng || !leg.end_lat || !leg.end_lng) return;

    const coordStr = `${leg.start_lng},${leg.start_lat};${leg.end_lng},${leg.end_lat}`;
    const osrmProfile = leg.mode === "walk" ? "foot" : (leg.mode as string) === "bike" ? "cycling" : "driving";
    const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${coordStr}?overview=full&geometries=geojson&steps=true&alternatives=true`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        const routeOptions: RouteOption[] = data.routes.map((r: any, rIdx: number) => {
          const coords: [number, number][] = r.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng]
          );
          const distKm = Math.round((r.distance || 0) / 100) / 10;
          const durMin = Math.max(1, Math.round((r.duration || 60) / 60));
          const summaryStr = r.legs?.[0]?.summary || `Route ${rIdx + 1}`;
          return {
            id: `opt-${rIdx}-${Date.now()}`,
            name: rIdx === 0 ? `Primary: via ${summaryStr} (${distKm} km)` : `Alt Path ${rIdx + 1}: via ${summaryStr} (${distKm} km)`,
            coordinates: coords,
            distance_km: distKm,
            duration_minutes: durMin,
            summary: summaryStr,
          };
        });

        setLegs(prev => {
          if (!prev[legIndex]) return prev;
          const copy = [...prev];
          const curr = { ...copy[legIndex] };
          
          curr.available_routes = routeOptions;
          const selectedIdx = typeof curr.selected_route_index === "number" && curr.selected_route_index < routeOptions.length
            ? curr.selected_route_index
            : 0;
          curr.selected_route_index = selectedIdx;

          const activeOpt = routeOptions[selectedIdx] || routeOptions[0];
          curr.path_coordinates = activeOpt.coordinates;
          curr.duration_minutes = activeOpt.duration_minutes;

          copy[legIndex] = curr;
          return copy;
        });
        return;
      }
    } catch {}

    // Fallback to fetchRoutePlan
    try {
      const plan = await fetchRoutePlan(
        [leg.start_lat, leg.start_lng],
        [leg.end_lat, leg.end_lng],
        leg.mode === "walk" ? "walk" : "car",
        leg.start_name,
        leg.end_name
      );

      if (plan?.primary?.coordinates && plan.primary.coordinates.length > 1) {
        setLegs(prev => {
          if (!prev[legIndex]) return prev;
          const copy = [...prev];
          copy[legIndex] = {
            ...copy[legIndex],
            path_coordinates: plan.primary.coordinates,
          };
          return copy;
        });
      }
    } catch {}
  }, [legs]);

  // Trigger polyline snap on leg update
  useEffect(() => {
    legs.forEach((_, idx) => {
      snapLegPolyline(idx);
    });
  }, [legs.length, activeLegIdx]);

  // Render markers and road polylines on map (Dashed lines for alternative routes)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Clear previous elements
    legPolylinesRef.current.forEach(p => p.remove());
    legPolylinesRef.current = [];
    legMarkersRef.current.forEach(m => m.remove());
    legMarkersRef.current = [];

    const bounds = L.latLngBounds([]);

    legs.forEach((leg, idx) => {
      const isSelected = idx === activeLegIdx;

      // Start Marker
      if (leg.start_lat && leg.start_lng) {
        const startPos: [number, number] = [leg.start_lat, leg.start_lng];
        bounds.extend(startPos);

        const startMarker = L.marker(startPos, {
          icon: dotIcon(isSelected ? "#10b981" : "#059669", `${idx + 1}A`),
          draggable: true,
        })
          .bindPopup(`<b>Leg ${idx + 1} Pickup: ${leg.start_name}</b><br/>Modes: ${(leg.modes || [leg.mode]).join(", ").toUpperCase()}`)
          .addTo(map);

        startMarker.on("dragend", (e: any) => {
          const { lat, lng } = e.target.getLatLng();
          setLegs(prev => {
            const copy = [...prev];
            if (copy[idx]) {
              copy[idx] = { ...copy[idx], start_lat: lat, start_lng: lng };
            }
            return copy;
          });
        });
        legMarkersRef.current.push(startMarker);
      }

      // End Marker
      if (leg.end_lat && leg.end_lng) {
        const endPos: [number, number] = [leg.end_lat, leg.end_lng];
        bounds.extend(endPos);

        const endMarker = L.marker(endPos, {
          icon: dotIcon(isSelected ? "#ef4444" : "#dc2626", `${idx + 1}B`),
          draggable: true,
        })
          .bindPopup(`<b>Leg ${idx + 1} Drop-off: ${leg.end_name}</b><br/>Fare: ₱${leg.fare}`)
          .addTo(map);

        endMarker.on("dragend", (e: any) => {
          const { lat, lng } = e.target.getLatLng();
          setLegs(prev => {
            const copy = [...prev];
            if (copy[idx]) {
              copy[idx] = { ...copy[idx], end_lat: lat, end_lng: lng };
            }
            return copy;
          });
        });
        legMarkersRef.current.push(endMarker);
      }

      // Render Selected Route & Alternative Broken/Dashed Lines
      const available = leg.available_routes || [];
      const selectedIdx = leg.selected_route_index ?? 0;

      if (available.length > 0) {
        // Draw unselected alternative routes as DASHED lines first
        available.forEach((rOpt, rIdx) => {
          if (rIdx === selectedIdx) return;
          if (!rOpt.coordinates || rOpt.coordinates.length < 2) return;

          const polyline = L.polyline(rOpt.coordinates, {
            color: "#8b5cf6",
            weight: 4,
            opacity: 0.7,
            dashArray: "6, 8",
          }).addTo(map);

          polyline.bindPopup(`<b>Alt Route Path ${rIdx + 1}: ${rOpt.name}</b><br/>Est. ${rOpt.duration_minutes} mins<br/><small style="color:#8b5cf6; font-weight:bold;">Click broken line to select this route!</small>`);
          
          polyline.on("click", () => {
            setActiveLegIdx(idx);
            setLegs(prev => {
              const copy = [...prev];
              if (copy[idx]) {
                copy[idx] = {
                  ...copy[idx],
                  selected_route_index: rIdx,
                  path_coordinates: rOpt.coordinates,
                  duration_minutes: rOpt.duration_minutes,
                };
              }
              return copy;
            });
            toast({ title: `🛣️ Switched to Alternative Route: ${rOpt.name}` });
          });

          legPolylinesRef.current.push(polyline);
        });

        // Draw primary active route in SOLID BOLD line
        const primaryOpt = available[selectedIdx] || available[0];
        if (primaryOpt && primaryOpt.coordinates && primaryOpt.coordinates.length > 1) {
          const polyline = L.polyline(primaryOpt.coordinates, {
            color: isSelected ? "#3b82f6" : "#059669",
            weight: isSelected ? 6 : 4,
            opacity: 0.9,
            dashArray: leg.mode === "walk" ? "6, 8" : undefined,
          }).addTo(map);

          polyline.bindPopup(`<b>Active Route: ${primaryOpt.name}</b><br/>Est. ${primaryOpt.duration_minutes} mins`);
          polyline.on("click", () => setActiveLegIdx(idx));
          legPolylinesRef.current.push(polyline);
        }
      } else if (leg.path_coordinates && leg.path_coordinates.length > 1) {
        const polyline = L.polyline(leg.path_coordinates, {
          color: isSelected ? "#3b82f6" : "#6b7280",
          weight: isSelected ? 6 : 4,
          opacity: isSelected ? 0.9 : 0.6,
          dashArray: leg.mode === "walk" ? "6, 8" : undefined,
        }).addTo(map);

        polyline.on("click", () => setActiveLegIdx(idx));
        legPolylinesRef.current.push(polyline);
      }
    });

    if (bounds.isValid() && legs.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [legs, activeLegIdx]);

  // Handle Geocoding Search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await placesApi.autocomplete({ query: searchQuery, lat: 15.70, lng: 120.40 });
      setSearchResults(res.data?.results || res.data || []);
    } catch {
      toast({ title: "Search failed", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (place: any) => {
    const lat = Number(place.lat);
    const lng = Number(place.lng);
    if (!lat || !lng || !mapInstance.current) return;

    mapInstance.current.setView([lat, lng], 15);

    setLegs(prev => {
      if (!prev[activeLegIdx]) return prev;
      const copy = [...prev];
      if (activeClickTarget === "start") {
        copy[activeLegIdx] = { ...copy[activeLegIdx], start_lat: lat, start_lng: lng, start_name: place.name || place.formatted_address };
      } else {
        copy[activeLegIdx] = { ...copy[activeLegIdx], end_lat: lat, end_lng: lng, end_name: place.name || place.formatted_address };
      }
      return copy;
    });

    setSearchResults([]);
    setSearchQuery("");
    toast({ title: "📍 Location set from search", description: place.name || place.formatted_address });
  };

  const addLeg = () => {
    const lastLeg = legs[legs.length - 1];
    const newLeg: LegDraft = {
      id: `leg-${legs.length + 1}-${Date.now()}`,
      sequence: legs.length + 1,
      mode: "jeepney",
      modes: ["jeepney"],
      route_name: "",
      provider: "Public Transport",
      fare: 15,
      duration_minutes: 10,
      instructions: "",
      start_name: lastLeg?.end_name || "",
      start_lat: lastLeg?.end_lat || 0,
      start_lng: lastLeg?.end_lng || 0,
      end_name: "",
      end_lat: 0,
      end_lng: 0,
      path_coordinates: [],
    };

    setLegs(prev => [...prev, newLeg]);
    setActiveLegIdx(legs.length);
    setActiveClickTarget(lastLeg && lastLeg.end_lat !== 0 ? "end" : "start");
    toast({
      title: `➕ Leg #${legs.length + 1} Added`,
      description: "Click on map to set Pickup or Drop-off location",
    });
  };

  const removeLeg = (index: number) => {
    const next = legs.filter((_, i) => i !== index).map((l, i) => ({ ...l, sequence: i + 1 }));
    setLegs(next);
    setActiveLegIdx(Math.max(0, index - 1));
    toast({ title: "🗑️ Leg Removed" });
  };

  // Save to backend database via API
  const handleSaveRoute = async () => {
    const routeTitle = title.trim() || `${legs[0]?.start_name || "Origin"} to ${legs[legs.length - 1]?.end_name || "Destination"} Transit Route`;
    
    setIsSaving(true);
    try {
      const payload = {
        title: routeTitle,
        description,
        origin_name: originName || legs[0]?.start_name || "Origin",
        origin_lat: legs[0]?.start_lat || 15.70,
        origin_lng: legs[0]?.start_lng || 120.35,
        dest_name: destName || legs[legs.length - 1]?.end_name || "Destination",
        dest_lat: legs[legs.length - 1]?.end_lat || 15.75,
        dest_lng: legs[legs.length - 1]?.end_lng || 120.40,
        total_fare: totalFare,
        total_duration_minutes: totalDuration,
        notes: `${legs.length} legs plotted`,
        legs: legs.map((l, i) => ({
          sequence: i + 1,
          mode: (l.modes && l.modes.length > 0) ? l.modes.join("/") : l.mode,
          modes: l.modes && l.modes.length > 0 ? l.modes : [l.mode],
          route_name: l.route_name,
          provider: l.provider,
          fare: l.fare,
          duration_minutes: l.duration_minutes,
          instructions: l.instructions,
          start_lat: l.start_lat,
          start_lng: l.start_lng,
          end_lat: l.end_lat,
          end_lng: l.end_lng,
          path_coordinates: l.path_coordinates,
        })),
      };

      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/admin/transit-routes", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      toast({
        title: "✅ Admin Transit Route Saved!",
        description: `Successfully plotted ${routeTitle} (${legs.length} legs, ₱${totalFare})`,
      });

      if (onSaveSuccess) onSaveSuccess();
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err?.message || "Could not save transit route to database.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const activeLeg = legs[activeLegIdx];

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 overflow-y-auto lg:overflow-hidden">
      {/* Map Workspace Section */}
      <div className="flex-1 flex flex-col relative rounded-2xl overflow-hidden border border-border/50 bg-card shadow-sm min-h-[350px]">
        {/* Map Header Controls */}
        <div className="absolute top-3 left-3 right-3 z-[10] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 bg-card/95 backdrop-blur-md p-1.5 rounded-xl border border-border/50 shadow-md flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground ml-2" />
            <Input
              placeholder="Search place, barangay, or terminal..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="h-8 border-0 shadow-none focus-visible:ring-0 text-xs"
            />
            <Button size="sm" variant="ghost" onClick={handleSearch} disabled={isSearching} className="h-8 text-xs font-semibold px-3">
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>

          <div className="pointer-events-auto flex items-center gap-1.5 bg-card/95 backdrop-blur-md p-1 rounded-xl border border-border/50 shadow-md">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] rounded-lg font-bold gap-1 text-primary border-primary/30 hover:bg-primary/10"
              onClick={() => setIsPreviewModalOpen(true)}
            >
              <Navigation className="w-3 h-3" /> Rider Preview Modal
            </Button>
            {initialRoute && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[10px] rounded-lg font-bold gap-1 text-muted-foreground hover:bg-muted"
                onClick={() => {
                  if (onSaveSuccess) onSaveSuccess();
                }}
              >
                <RotateCcw className="w-3 h-3" /> New Blank Plot
              </Button>
            )}
            <Badge variant="outline" className="text-[10px] gap-1 bg-primary/10 text-primary border-0 font-bold">
              <Move className="w-3 h-3" /> Drag Markers to Move Stops
            </Badge>
          </div>
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-14 left-3 z-[20] w-[calc(100%-1.5rem)] sm:w-[340px] bg-card/95 backdrop-blur-md rounded-xl border border-border p-2 shadow-xl space-y-1 max-h-60 overflow-y-auto">
            {searchResults.map((res: any, i: number) => (
              <button
                key={i}
                onClick={() => handleSelectSearchResult(res)}
                className="w-full p-2 rounded-lg text-left text-xs hover:bg-muted transition-colors flex flex-col gap-0.5"
              >
                <span className="font-semibold">{res.name || res.formatted_address}</span>
                <span className="text-[10px] text-muted-foreground">{res.lat}, {res.lng}</span>
              </button>
            ))}
          </div>
        )}

        {/* Leaflet Map Canvas */}
        <div ref={mapRef} className="flex-1 w-full h-full z-0 min-h-[300px]" />

        {/* Map Overlay Click Target Controls */}
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-[10] bg-card/95 backdrop-blur-md p-2.5 rounded-xl border border-border/50 shadow-md text-[11px] space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-medium truncate">
              Click map sets for Leg #{activeLegIdx + 1}: <b>{activeClickTarget === "start" ? "Pickup Point (1A)" : "Drop-off Point (1B)"}</b>
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              size="sm"
              variant={activeClickTarget === "start" ? "default" : "outline"}
              className="h-7 text-[10px] rounded-lg flex-1 sm:flex-initial font-semibold"
              onClick={() => setActiveClickTarget("start")}
            >
              Set Pickup (1A)
            </Button>
            <Button
              size="sm"
              variant={activeClickTarget === "end" ? "default" : "outline"}
              className="h-7 text-[10px] rounded-lg flex-1 sm:flex-initial font-semibold"
              onClick={() => setActiveClickTarget("end")}
            >
              Set Drop-off (1B)
            </Button>
          </div>
        </div>
      </div>

      {/* Side Panel: Sticky Meta & Scrollable Leg Editor */}
      <div className="w-full lg:w-[440px] flex flex-col h-full max-h-[calc(100vh-8rem)] gap-3 min-h-0">
        {/* Route Details & Meta Card (Permanently Pinned at Top) */}
        <Card className="shrink-0 border-border/50 shadow-sm rounded-2xl overflow-hidden bg-card z-10">
          <CardHeader className="p-3 pb-1.5">
            <CardTitle className="text-xs font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-foreground">
                <Route className="w-4 h-4 text-primary" /> Route Details & Meta
              </span>
              <Badge variant="outline" className="text-[10px] font-bold text-primary bg-primary/10 border-0">
                Route Settings
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            <Input
              placeholder="Route Title (e.g. San Clemente to Camiling Commute)"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="h-8 text-xs rounded-lg font-semibold bg-background"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground font-semibold mb-0.5 block">Origin Hub</label>
                <Input
                  placeholder="e.g. San Clemente Plaza"
                  value={originName}
                  onChange={e => setOriginName(e.target.value)}
                  className="h-7 text-[11px] rounded-lg bg-background"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-semibold mb-0.5 block">Destination</label>
                <Input
                  placeholder="e.g. Camiling Market"
                  value={destName}
                  onChange={e => setDestName(e.target.value)}
                  className="h-7 text-[11px] rounded-lg bg-background"
                />
              </div>
            </div>

            {/* Total Fare & Duration Summary Badges */}
            <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-muted/40 border border-border/50 text-xs">
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[9px] text-muted-foreground block font-medium">Total Fare</span>
                  <span className="font-extrabold text-emerald-600 text-xs truncate block">₱{totalFare.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[9px] text-muted-foreground block font-medium">Total Duration</span>
                  <span className="font-extrabold text-blue-600 text-xs truncate block">{totalDuration} mins</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scrollable Commute Legs Section */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
          <div className="flex items-center justify-between px-1 sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-1">
            <h4 className="font-bold text-xs flex items-center gap-1.5 text-foreground">
              <Layers className="w-4 h-4 text-primary" /> Commute Legs ({legs.length})
            </h4>
            <Button size="sm" onClick={addLeg} className="h-7 text-xs rounded-xl gap-1 font-semibold shadow-xs">
              <Plus className="w-3.5 h-3.5" /> Add Leg
            </Button>
          </div>

          {legs.length === 0 && (
            <Card className="border-dashed border-2 border-border/80 p-6 text-center text-xs space-y-2 rounded-2xl bg-muted/20">
              <p className="font-bold text-foreground">No commute legs plotted yet</p>
              <p className="text-[11px] text-muted-foreground">Click <b>+ Add Leg</b> or click anywhere on the interactive map to plot your first leg!</p>
              <Button size="sm" onClick={addLeg} className="h-8 text-xs rounded-xl font-bold gap-1 mt-1">
                <Plus className="w-3.5 h-3.5" /> Add First Leg
              </Button>
            </Card>
          )}

          {legs.map((leg, idx) => {
            const isSelected = idx === activeLegIdx;
            const activeModesList = leg.modes && leg.modes.length > 0 ? leg.modes : [leg.mode || "jeepney"];
            const modeBadgesStr = activeModesList
              .map(mId => VEHICLE_MODES.find(m => m.id === mId)?.label || mId)
              .join(" / ");

            return (
              <Card
                key={leg.id}
                onClick={() => setActiveLegIdx(idx)}
                className={`border-0 transition-all cursor-pointer rounded-2xl ${
                  isSelected ? "ring-2 ring-primary bg-card shadow-md" : "bg-card/70 hover:bg-card hover:shadow-xs card-interactive"
                }`}
              >
                <CardContent className="p-3.5 space-y-2.5">
                  {/* Leg Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-xs text-foreground truncate max-w-[200px]">
                        {leg.route_name || `Leg ${idx + 1}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold bg-primary/10 text-primary border-0 px-2 py-0.5">
                        {modeBadgesStr}
                      </Badge>
                      {legs.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-lg text-destructive hover:bg-destructive/10"
                          onClick={(e) => { e.stopPropagation(); removeLeg(idx); }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Leg Summary Stats Bar */}
                  <div className="flex items-center justify-between text-[11px] font-semibold bg-muted/40 p-2 rounded-xl border border-border/40">
                    <div className="flex items-center gap-1 text-emerald-600">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Fare: <b>₱{leg.fare}</b></span>
                    </div>
                    <div className="flex items-center gap-1 text-blue-600">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Duration: <b>{leg.duration_minutes} mins</b></span>
                    </div>
                  </div>

                  {/* Pickup & Drop-off Stops Preview */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] p-2 rounded-xl bg-background/90 border border-border/50">
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-extrabold text-emerald-600 block">Pickup (1A)</span>
                      <span className="font-semibold text-foreground truncate block">{leg.start_name || "Click map to set pickup"}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-extrabold text-rose-600 block">Drop-off (1B)</span>
                      <span className="font-semibold text-foreground truncate block">{leg.end_name || "Click map to set drop-off"}</span>
                    </div>
                  </div>

                  {/* Instructions Preview */}
                  {leg.instructions && (
                    <div className="text-[11px] bg-primary/5 p-2 rounded-xl text-foreground font-medium border border-primary/10 flex items-start gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="truncate">{leg.instructions}</span>
                    </div>
                  )}

                  {/* Expanded Leg Editor Controls */}
                  {isSelected && (
                    <div className="space-y-3 pt-3 border-t border-border/50 text-xs" onClick={e => e.stopPropagation()}>
                      {/* Vehicle Mode Multi-Select Grid */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10px] text-muted-foreground font-bold uppercase">
                            Vehicle Modes (Multi-Select Allowed Rides)
                          </label>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-primary border-primary/40 font-bold">
                            {activeModesList.length} selected
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                          {VEHICLE_MODES.map(vm => {
                            const isChecked = activeModesList.includes(vm.id);

                            return (
                              <button
                                key={vm.id}
                                type="button"
                                onClick={() => {
                                  setLegs(prev => {
                                    const copy = [...prev];
                                    const curr = { ...copy[idx] };
                                    let updatedModes = [...(curr.modes && curr.modes.length > 0 ? curr.modes : [curr.mode || "jeepney"])];

                                    if (isChecked) {
                                      if (updatedModes.length > 1) {
                                        updatedModes = updatedModes.filter(m => m !== vm.id);
                                      }
                                    } else {
                                      updatedModes.push(vm.id);
                                    }

                                    curr.modes = updatedModes;
                                    curr.mode = updatedModes[0];

                                    const { route_name, instructions } = deduceLegDetails(curr);
                                    curr.route_name = route_name;
                                    curr.instructions = instructions;

                                    copy[idx] = curr;
                                    return copy;
                                  });
                                }}
                                className={`p-1.5 rounded-xl border text-[10px] font-semibold flex flex-col items-center gap-0.5 transition-all ${
                                  isChecked
                                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                    : "border-border/60 hover:bg-muted text-muted-foreground"
                                }`}
                                title={vm.description}
                              >
                                <span className="text-xs">{vm.icon}</span>
                                <span className="truncate w-full text-center">{vm.label}</span>
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 italic">
                          Selected Ride Modes: <b>{modeBadgesStr}</b>
                        </p>
                      </div>

                      {/* Route Path Variants Selector (Dashed lines on Leaflet Map) */}
                      {leg.available_routes && leg.available_routes.length > 1 && (
                        <div className="p-2.5 rounded-xl bg-background border border-border/60 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] text-muted-foreground font-bold uppercase">
                              Alternative Route Paths (Click dashed line on map to switch)
                            </label>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-0 font-bold">
                              {leg.available_routes.length} paths available
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            {leg.available_routes.map((rOpt, rIdx) => {
                              const isSelectedPath = (leg.selected_route_index ?? 0) === rIdx;

                              return (
                                <button
                                  key={rOpt.id || rIdx}
                                  type="button"
                                  onClick={() => {
                                    setLegs(prev => {
                                      const copy = [...prev];
                                      if (copy[idx]) {
                                        copy[idx] = {
                                          ...copy[idx],
                                          selected_route_index: rIdx,
                                          path_coordinates: rOpt.coordinates,
                                          duration_minutes: rOpt.duration_minutes,
                                        };
                                      }
                                      return copy;
                                    });
                                  }}
                                  className={`w-full p-2 rounded-xl border text-left text-[11px] flex items-center justify-between transition-all ${
                                    isSelectedPath
                                      ? "bg-primary/10 border-primary text-foreground font-semibold shadow-xs"
                                      : "border-border/60 hover:bg-muted/60 text-muted-foreground"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                                      isSelectedPath ? "bg-primary text-primary-foreground" : "bg-purple-500/20 text-purple-600"
                                    }`}>
                                      {isSelectedPath ? "★" : rIdx + 1}
                                    </span>
                                    <span className="truncate">{rOpt.name}</span>
                                  </div>
                                  <span className="text-[10px] opacity-80 shrink-0 ml-2 font-mono">
                                    {rOpt.duration_minutes}m {isSelectedPath ? "(Active)" : "(Dashed Line)"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Route Name & Provider Inputs */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground font-semibold mb-1 block">Route/Line Name</label>
                          <Input
                            value={leg.route_name}
                            onChange={e => {
                              const val = e.target.value;
                              setLegs(prev => {
                                const copy = [...prev];
                                copy[idx] = { ...copy[idx], route_name: val };
                                return copy;
                              });
                            }}
                            className="h-8 text-xs rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground font-semibold mb-1 block">Operator/Provider</label>
                          <Input
                            value={leg.provider}
                            onChange={e => {
                              const val = e.target.value;
                              setLegs(prev => {
                                const copy = [...prev];
                                copy[idx] = { ...copy[idx], provider: val };
                                return copy;
                              });
                            }}
                            className="h-8 text-xs rounded-lg"
                          />
                        </div>
                      </div>

                      {/* Fare & Duration Inputs */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground font-semibold mb-1 block">Fare (₱)</label>
                          <Input
                            type="number"
                            value={leg.fare}
                            onChange={e => {
                              const val = Number(e.target.value);
                              setLegs(prev => {
                                const copy = [...prev];
                                copy[idx] = { ...copy[idx], fare: val };
                                return copy;
                              });
                            }}
                            className="h-8 text-xs rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground font-semibold mb-1 block">Duration (mins)</label>
                          <Input
                            type="number"
                            value={leg.duration_minutes}
                            onChange={e => {
                              const val = Number(e.target.value);
                              setLegs(prev => {
                                const copy = [...prev];
                                copy[idx] = { ...copy[idx], duration_minutes: val };
                                return copy;
                              });
                            }}
                            className="h-8 text-xs rounded-lg"
                          />
                        </div>
                      </div>

                      {/* Step Instructions for Rider Input */}
                      <div>
                        <label className="text-[10px] text-muted-foreground font-semibold mb-1 block">Step Instructions for Rider</label>
                        <Input
                          placeholder="e.g. Board jeepney at plaza, alight at Paniqui crossing"
                          value={leg.instructions}
                          onChange={e => {
                            const val = e.target.value;
                            setLegs(prev => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], instructions: val };
                              return copy;
                            });
                          }}
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Save Route Action */}
        <Button
          onClick={handleSaveRoute}
          disabled={isSaving}
          className="shrink-0 w-full h-11 rounded-2xl shadow-travel font-bold gap-2 text-sm mt-1"
        >
          <Save className="w-4.5 h-4.5" />
          {isSaving ? "Saving to Database..." : "Save Admin Transit Route"}
        </Button>
      </div>

      {/* Route Preview Modal */}
      <RoutePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        route={{
          title: title || (legs[0]?.start_name ? `${legs[0]?.start_name} to ${legs[legs.length - 1]?.end_name || "Destination"}` : "Transit Route"),
          description,
          origin_name: originName || legs[0]?.start_name || "Origin",
          dest_name: destName || legs[legs.length - 1]?.end_name || "Destination",
          total_fare: totalFare,
          total_duration_minutes: totalDuration,
          legs,
        }}
      />
    </div>
  );
}
