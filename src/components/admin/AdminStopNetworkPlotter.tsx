import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Plus, Trash2, Save, Move, Bus, Car, Footprints,
  Search, ZoomIn, ZoomOut, RotateCcw, AlertCircle, CheckCircle2,
  DollarSign, Clock, Layers, Route, Edit3, Sparkles, Navigation, Link2, Download, ArrowRightLeft
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { transitStopsApi, placesApi } from "@/lib/api";
import { PlaceSearchInput } from "@/components/travel/PlaceSearchInput";

export type StopType = "terminal" | "toda" | "bus_stop" | "jeepney_stop" | "tricycle_stand" | "train_station" | "ferry_terminal";
export type VehicleMode = "jeepney" | "big_bus" | "mini_bus" | "bus" | "tricycle" | "uv" | "train" | "ferry" | "walk";

export interface TransitStopItem {
  id: string;
  name: string;
  type: StopType;
  latitude: number;
  longitude: number;
  city?: string;
  province?: string;
  address?: string;
  is_active: boolean;
}

export interface TransitConnectionItem {
  id: string;
  from_stop_id: string;
  to_stop_id: string;
  mode: VehicleMode;
  route_name?: string;
  fare: number;
  duration_minutes?: number;
  distance_meters?: number;
  is_bidirectional: boolean;
  is_active: boolean;
  from_stop?: TransitStopItem;
  to_stop?: TransitStopItem;
  path_coordinates?: [number, number][];
}

const STOP_TYPES: { id: StopType; label: string; icon: string; color: string }[] = [
  { id: "terminal", label: "Central Terminal", icon: "🏬", color: "#8B5CF6" },
  { id: "toda", label: "TODA (Tricycle)", icon: "🛺", color: "#F59E0B" },
  { id: "bus_stop", label: "Bus Terminal / Stop", icon: "🚌", color: "#3B82F6" },
  { id: "jeepney_stop", label: "Jeepney Stop", icon: "🚍", color: "#10B981" },
  { id: "tricycle_stand", label: "Tricycle Stand", icon: "🛺", color: "#EC4899" },
  { id: "train_station", label: "Train / MRT Station", icon: "🚆", color: "#EF4444" },
  { id: "ferry_terminal", label: "Ferry Terminal", icon: "⛴️", color: "#06B6D4" },
];

const VEHICLE_MODES: { id: VehicleMode; label: string; icon: string }[] = [
  { id: "jeepney", label: "Jeepney", icon: "🚍" },
  { id: "mini_bus", label: "Mini Bus", icon: "🚐" },
  { id: "big_bus", label: "Big Bus", icon: "🚌" },
  { id: "tricycle", label: "Tricycle", icon: "🛺" },
  { id: "uv", label: "UV Express", icon: "🚐" },
  { id: "bus", label: "Bus", icon: "🚌" },
  { id: "train", label: "Train", icon: "🚆" },
  { id: "walk", label: "Walk", icon: "🚶" },
  { id: "ferry", label: "Ferry", icon: "⛴️" },
];

const createStopMarkerIcon = (type: StopType, name: string, isPreview = false, isSelected = false) => {
  const typeObj = STOP_TYPES.find(t => t.id === type) || STOP_TYPES[0];
  const displayName = isPreview 
    ? `📍 ${name || 'New Stop'}` 
    : isSelected 
      ? `✏️ ${name}` 
      : name;

  const tagBg = isPreview ? '#FFFBEB' : isSelected ? '#EFF6FF' : '#FFFFFF';
  const tagColor = isPreview ? '#B45309' : isSelected ? '#1D4ED8' : '#0F172A';
  const tagBorder = isPreview 
    ? '2px dashed #F59E0B' 
    : isSelected 
      ? '2px solid #3B82F6' 
      : `1.5px solid ${typeObj.color}`;

  const pinBorder = isSelected ? '3px solid #3B82F6' : isPreview ? '2.5px dashed #F59E0B' : '2.5px solid #FFFFFF';
  const pinShadow = isSelected 
    ? '0 0 14px rgba(59, 130, 246, 0.7), 0 4px 10px rgba(0,0,0,0.3)' 
    : isPreview 
      ? '0 0 14px rgba(245, 158, 11, 0.7), 0 4px 10px rgba(0,0,0,0.3)' 
      : '0 4px 10px rgba(0,0,0,0.3)';

  return L.divIcon({
    className: "google-maps-stop-pin",
    html: `
      <div style="
        width: 170px;
        height: 74px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        pointer-events: none;
      ">
        <!-- Google Maps Name Label Tag (ABOVE PIN) -->
        <div style="
          background: ${tagBg};
          color: ${tagColor};
          padding: 3px 9px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 11px;
          line-height: 1.2;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          border: ${tagBorder};
          white-space: nowrap;
          margin-bottom: 4px;
          pointer-events: auto;
        ">
          ${displayName} ${isPreview ? '<span style="font-size: 9px; opacity: 0.85;">(Draft Pin)</span>' : isSelected ? '<span style="font-size: 9px; opacity: 0.85;">(Editing)</span>' : ''}
        </div>

        <!-- Google Maps Teardrop Pin (Pointing down) -->
        <div style="
          position: relative;
          width: 32px;
          height: 32px;
          background: ${typeObj.color};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: ${pinBorder};
          box-shadow: ${pinShadow};
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
          flex-shrink: 0;
          pointer-events: auto;
        ">
          <!-- Counter-rotate inner mode icon -->
          <span style="
            transform: rotate(45deg);
            font-size: 15px;
            line-height: 1;
            display: flex;
            align-items: center;
            justify-content: center;
          ">${typeObj.icon}</span>
        </div>
      </div>
    `,
    iconSize: [170, 74],
    iconAnchor: [85, 72],
  });
};

export default function AdminStopNetworkPlotter() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const tempMarkerRef = useRef<L.Marker | null>(null);
  const polylineGroupRef = useRef<L.LayerGroup | null>(null);

  const [stops, setStops] = useState<TransitStopItem[]>([]);
  const [connections, setConnections] = useState<TransitConnectionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Stop Form State
  const [selectedStop, setSelectedStop] = useState<TransitStopItem | null>(null);
  const [stopName, setStopName] = useState("");
  const [stopType, setStopType] = useState<StopType>("toda");
  const [stopCity, setStopCity] = useState("Tarlac City");
  const [stopLat, setStopLat] = useState<number | null>(null);
  const [stopLng, setStopLng] = useState<number | null>(null);

  // Connection Form State
  const [connectFromId, setConnectFromId] = useState<string>("");
  const [connectToId, setConnectToId] = useState<string>("");
  const [connectMode, setConnectMode] = useState<VehicleMode>("jeepney");
  const [connectRouteName, setConnectRouteName] = useState("");
  const [connectFare, setConnectFare] = useState<number>(15);
  const [connectDuration, setConnectDuration] = useState<number>(10);
  const [connectBidirectional, setConnectBidirectional] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<"stops" | "connections">("stops");
  const [stopFilter, setStopFilter] = useState("");

  const filteredStops = useMemo(() => {
    if (!stopFilter.trim()) return stops;
    const q = stopFilter.toLowerCase();
    return stops.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.city && s.city.toLowerCase().includes(q)) ||
      s.type.toLowerCase().includes(q)
    );
  }, [stops, stopFilter]);

  // Load stops and connections from backend
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [stopsRes, connRes] = await Promise.all([
        transitStopsApi.getAllStops(),
        transitStopsApi.getAllConnections(),
      ]);
      setStops(stopsRes.data || []);
      setConnections(connRes.data || []);
    } catch (err: any) {
      toast({
        title: "Error loading transit network",
        description: err.message || "Failed to fetch stops and connections.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([15.4802, 120.5979], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    polylineGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Handle map clicks to set stop position
    map.on("click", (e: L.LeafletMouseEvent) => {
      setStopLat(e.latlng.lat);
      setStopLng(e.latlng.lng);
      setSelectedStop(null);
      setStopName(`Plotted Stop (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Render & sync temporary draft marker (shown initially on map click before saving)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (stopLat !== null && stopLng !== null && !selectedStop) {
      const icon = createStopMarkerIcon(stopType, stopName || "New Pinned Stop", true, false);

      if (tempMarkerRef.current) {
        tempMarkerRef.current.setLatLng([stopLat, stopLng]);
        tempMarkerRef.current.setIcon(icon);
      } else {
        const tempMarker = L.marker([stopLat, stopLng], {
          icon,
          draggable: true,
          zIndexOffset: 1000,
        }).addTo(map);

        tempMarker.on("dragend", (e: any) => {
          const newLat = e.target.getLatLng().lat;
          const newLng = e.target.getLatLng().lng;
          setStopLat(newLat);
          setStopLng(newLng);
        });

        tempMarkerRef.current = tempMarker;
      }
    } else {
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }
    }
  }, [stopLat, stopLng, selectedStop, stopType, stopName]);

  // Update map markers when stops change (only selected/edited pins are draggable)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    stops.forEach(stop => {
      const isSelected = selectedStop?.id === stop.id;
      const icon = createStopMarkerIcon(stop.type, stop.name, false, isSelected);
      const marker = L.marker([stop.latitude, stop.longitude], {
        icon,
        draggable: isSelected, // Only draggable when currently selected/edited!
      }).addTo(map);

      marker.on("click", () => {
        setSelectedStop(stop);
        setStopName(stop.name);
        setStopType(stop.type);
        setStopCity(stop.city || "");
        setStopLat(stop.latitude);
        setStopLng(stop.longitude);
      });

      marker.on("dragend", async (e: any) => {
        const newLat = e.target.getLatLng().lat;
        const newLng = e.target.getLatLng().lng;
        setStopLat(newLat);
        setStopLng(newLng);
        try {
          await transitStopsApi.updateStop(stop.id, {
            ...stop,
            lat: newLat,
            lng: newLng,
            latitude: newLat,
            longitude: newLng,
          });
          toast({ title: "Stop repositioned!", description: `${stop.name} updated.` });
          fetchData();
        } catch (err: any) {
          toast({ title: "Error moving stop", variant: "destructive" });
        }
      });

      markersRef.current[stop.id] = marker;
    });
  }, [stops, selectedStop, fetchData]);

  // Update polylines when connections change
  useEffect(() => {
    const map = mapRef.current;
    const group = polylineGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const stopsMap = new Map(stops.map(s => [s.id, s]));

    connections.forEach(async conn => {
      const from = stopsMap.get(conn.from_stop_id);
      const to = stopsMap.get(conn.to_stop_id);
      if (!from || !to) return;

      let latlngs: [number, number][] = [];

      const rawPath = conn.path_coordinates || (conn as any).polyline_geometry;
      if (rawPath) {
        const parsed = typeof rawPath === "string" ? JSON.parse(rawPath) : rawPath;
        if (Array.isArray(parsed) && parsed.length > 1) {
          latlngs = parsed.map((pt: any) => {
            const p0 = Number(pt[0]);
            const p1 = Number(pt[1]);
            // Leaflet requires [lat, lng]. If p0 is longitude (~120), swap to [p1, p0]
            if (Math.abs(p0) > 90) return [p1, p0];
            return [p0, p1];
          });
        }
      }

      // If no pre-calculated road points, fetch OSRM road route or fallback
      if (latlngs.length < 2) {
        try {
          const profile = conn.mode === "walk" ? "foot" : "driving";
          const url = `https://router.project-osrm.org/route/v1/${profile}/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.code === "Ok" && data.routes?.[0]?.geometry?.coordinates) {
            latlngs = data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
          }
        } catch (e) {
          latlngs = [
            [from.latitude, from.longitude],
            [to.latitude, to.longitude],
          ];
        }
      }

      const polyline = L.polyline(latlngs, {
        color: conn.mode === "walk" ? "#9CA3AF" : "#3B82F6",
        weight: 5,
        dashArray: conn.mode === "walk" ? "6, 6" : undefined,
        opacity: 0.85,
      });

      polyline.bindTooltip(
        `${conn.mode.toUpperCase()} ${conn.route_name ? `- ${conn.route_name}` : ""}<br>Fare: ₱${conn.fare} | ${conn.duration_minutes ?? '?'} mins`,
        { permanent: false, direction: "center" }
      );

      polyline.addTo(group);
    });
  }, [stops, connections]);

  const handleCancelStopForm = () => {
    if (tempMarkerRef.current) {
      tempMarkerRef.current.remove();
      tempMarkerRef.current = null;
    }
    setSelectedStop(null);
    setStopName("");
    setStopLat(null);
    setStopLng(null);
  };

  // Handle Save Stop
  const handleSaveStop = async () => {
    if (!stopName || stopLat === null || stopLng === null) {
      toast({ title: "Please select a location on the map", variant: "destructive" });
      return;
    }

    try {
      if (selectedStop) {
        await transitStopsApi.updateStop(selectedStop.id, {
          name: stopName,
          type: stopType,
          lat: stopLat,
          lng: stopLng,
          latitude: stopLat,
          longitude: stopLng,
          city: stopCity,
        });
        toast({ title: "Stop updated successfully!" });
      } else {
        await transitStopsApi.createStop({
          name: stopName,
          type: stopType,
          lat: stopLat,
          lng: stopLng,
          latitude: stopLat,
          longitude: stopLng,
          city: stopCity,
        });
        toast({ title: "New stop added to transit network!" });
      }
      handleCancelStopForm();
      fetchData();
    } catch (err: any) {
      toast({ title: "Failed to save stop", description: err.message, variant: "destructive" });
    }
  };

  // Handle Delete Stop
  const handleDeleteStop = async (id: string) => {
    if (!confirm("Are you sure you want to delete this stop?")) return;
    try {
      await transitStopsApi.deleteStop(id);
      toast({ title: "Stop deleted" });
      if (selectedStop?.id === id) {
        setSelectedStop(null);
        setStopName("");
      }
      fetchData();
    } catch (err: any) {
      toast({ title: "Failed to delete stop", variant: "destructive" });
    }
  };

  // Handle Create Connection
  const handleCreateConnection = async () => {
    if (!connectFromId || !connectToId) {
      toast({ title: "Select both origin and destination stops", variant: "destructive" });
      return;
    }
    if (connectFromId === connectToId) {
      toast({ title: "Origin and Destination cannot be the same stop", variant: "destructive" });
      return;
    }

    const fromStop = stops.find(s => String(s.id) === String(connectFromId));
    const toStop = stops.find(s => String(s.id) === String(connectToId));

    let pathCoords: [number, number][] = [];
    if (fromStop && toStop) {
      try {
        const osrmProfile = connectMode === "walk" ? "foot" : "driving";
        const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${fromStop.longitude},${fromStop.latitude};${toStop.longitude},${toStop.latitude}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.code === "Ok" && data.routes?.[0]?.geometry?.coordinates) {
          pathCoords = data.routes[0].geometry.coordinates; // [lng, lat] GeoJSON format
        }
      } catch (e) {
        console.warn("OSRM road snap failed during connection creation", e);
      }
    }

    try {
      await transitStopsApi.createConnection({
        from_stop_id: connectFromId,
        to_stop_id: connectToId,
        mode: connectMode,
        route_name: connectRouteName,
        fare: connectFare,
        duration_minutes: connectDuration,
        is_bidirectional: connectBidirectional,
        path_coordinates: pathCoords.length > 0 ? pathCoords : undefined,
      });
      toast({ title: "Transit Connection Created with Street Geometry!" });
      setConnectFromId("");
      setConnectToId("");
      setConnectRouteName("");
      fetchData();
    } catch (err: any) {
      toast({ title: "Failed to create connection", description: err.message, variant: "destructive" });
    }
  };

  // Handle Delete Connection
  const handleDeleteConnection = async (id: string) => {
    try {
      await transitStopsApi.deleteConnection(id);
      toast({ title: "Connection removed" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Failed to delete connection", variant: "destructive" });
    }
  };

  // Handle Auto-Import from localStorage
  const handleImportLocalStorage = async () => {
    try {
      const raw = localStorage.getItem("journeymate_transit_hubs");
      if (!raw) {
        toast({ title: "No localStorage transit hubs found", description: "All clear!" });
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        toast({ title: "No valid hubs found in localStorage" });
        return;
      }

      const res = await transitStopsApi.importLocalStorageHubs(parsed);
      toast({
        title: "LocalStorage Hubs Imported!",
        description: `Imported ${res.data.count} hubs to backend DB.`,
      });
      fetchData();
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      {/* Map Column */}
      <div className="lg:col-span-2 relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-xl flex flex-col">
        <div ref={mapContainerRef} className="w-full h-full min-h-[450px] z-10" />

        {/* Floating Map Instructions & Place Search Bar */}
        <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2 items-center">
          <Badge className="bg-slate-900/90 text-slate-200 border-slate-700 backdrop-blur-md px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Click map to add a TODA / Terminal / Stop
          </Badge>

          <Button
            size="sm"
            variant="outline"
            onClick={handleImportLocalStorage}
            className="bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800 shadow-lg text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-emerald-400" />
            Import LocalStorage Hubs
          </Button>
        </div>

        {/* Floating Search Bar to locate any landmark/place */}
        <div className="absolute top-4 right-4 z-20 w-72 max-w-[calc(100%-16px)]">
          <PlaceSearchInput
            placeholder="Search place to locate & pin…"
            onPick={(place) => {
              if (mapRef.current) {
                mapRef.current.flyTo([place.lat, place.lng], 16, { duration: 1.2 });
              }
              setStopLat(place.lat);
              setStopLng(place.lng);
              setSelectedStop(null);
              setStopName(place.name);
              toast({
                title: "📍 Map Centered",
                description: `Focused on ${place.name}. Drag pin to fine-tune position.`,
              });
            }}
            userLocation={mapRef.current ? { lat: mapRef.current.getCenter().lat, lng: mapRef.current.getCenter().lng } : undefined}
            className="bg-slate-900/95 border-slate-700 text-white rounded-xl shadow-2xl backdrop-blur-md"
          />
        </div>
      </div>

      {/* Control Panel Column */}
      <div className="flex flex-col gap-4 overflow-y-auto pr-1">
        {/* Tab Selection */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("stops")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === "stops" ? "bg-amber-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <MapPin className="w-4 h-4" />
            Plotted Stops ({stops.length})
          </button>
          <button
            onClick={() => setActiveTab("connections")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === "connections" ? "bg-amber-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <Link2 className="w-4 h-4" />
            Route Edges ({connections.length})
          </button>
        </div>

        {activeTab === "stops" ? (
          /* Stops Form & List */
          <div className="space-y-4">
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-400" />
                  {selectedStop ? "Edit Pinned Stop" : "Pin New Stop / TODA"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Stop / Terminal Name</label>
                  <Input
                    value={stopName}
                    onChange={e => setStopName(e.target.value)}
                    placeholder="e.g. Capas Central TODA"
                    className="bg-slate-950 border-slate-800 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Type</label>
                    <select
                      value={stopType}
                      onChange={e => setStopType(e.target.value as StopType)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-sm text-white focus:outline-none"
                    >
                      {STOP_TYPES.map(t => (
                        <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">City / Town</label>
                    <Input
                      value={stopCity}
                      onChange={e => setStopCity(e.target.value)}
                      placeholder="e.g. Capas"
                      className="bg-slate-950 border-slate-800 text-white"
                    />
                  </div>
                </div>

                {stopLat !== null && stopLng !== null && (
                  <div className="text-xs text-slate-400 space-y-1">
                    <p>
                      Location: <span className="text-amber-400 font-mono">{stopLat.toFixed(5)}, {stopLng.toFixed(5)}</span>
                    </p>
                    {selectedStop ? (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] flex items-center gap-1 w-fit">
                        ✏️ Edit Mode: Pin is unlocked & draggable on map
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] flex items-center gap-1 w-fit">
                        📍 Draft Pin Active: Pin is visible on map & draggable
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleSaveStop}
                    className="flex-1 bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
                  >
                    <Save className="w-4 h-4 mr-1.5" />
                    {selectedStop ? "Update Stop" : "Pin Stop"}
                  </Button>
                  {(selectedStop || stopLat !== null) && (
                    <Button
                      variant="outline"
                      onClick={handleCancelStopForm}
                      className="border-slate-800 text-slate-300 hover:bg-slate-800"
                    >
                      Clear
                    </Button>
                  )}
                  {selectedStop && (
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteStop(selectedStop.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* List of Pinned Stops */}
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader className="pb-2 space-y-2">
                <CardTitle className="text-xs uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>All Pinned Stops ({filteredStops.length})</span>
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    value={stopFilter}
                    onChange={e => setStopFilter(e.target.value)}
                    placeholder="Filter pinned stops by name/city..."
                    className="pl-8 h-8 text-xs bg-slate-950 border-slate-800 text-white"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                {filteredStops.length === 0 ? (
                  <p className="text-sm text-slate-500 italic py-4 text-center">
                    {stops.length === 0 ? "No transit stops pinned yet. Click on the map to add one." : "No stops match your search filter."}
                  </p>
                ) : (
                  filteredStops.map(s => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedStop(s);
                        setStopName(s.name);
                        setStopType(s.type);
                        setStopLat(s.latitude);
                        setStopLng(s.longitude);
                        if (mapRef.current) {
                          mapRef.current.flyTo([s.latitude, s.longitude], 16, { duration: 1 });
                        }
                      }}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                        selectedStop?.id === s.id ? "bg-amber-500/10 border-amber-500/50" : "bg-slate-950 border-slate-800/80 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{STOP_TYPES.find(t => t.id === s.type)?.icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{s.name}</p>
                          <p className="text-xs text-slate-500">{s.city} • {s.type.replace('_', ' ')}</p>
                        </div>
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-500 hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStop(s.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Connections Form & List */
          <div className="space-y-4">
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-amber-400" />
                  Connect Two Transit Stops
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">From Stop (Origin)</label>
                  <select
                    value={connectFromId}
                    onChange={e => setConnectFromId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-sm text-white focus:outline-none"
                  >
                    <option value="">-- Select Origin Stop --</option>
                    {stops.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">To Stop (Destination)</label>
                  <select
                    value={connectToId}
                    onChange={e => setConnectToId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-sm text-white focus:outline-none"
                  >
                    <option value="">-- Select Destination Stop --</option>
                    {stops.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Vehicle Mode</label>
                    <select
                      value={connectMode}
                      onChange={e => setConnectMode(e.target.value as VehicleMode)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-sm text-white focus:outline-none"
                    >
                      {VEHICLE_MODES.map(m => (
                        <option key={m.id} value={m.id}>{m.icon} {m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Fare (₱ PHP)</label>
                    <Input
                      type="number"
                      value={connectFare}
                      onChange={e => setConnectFare(Number(e.target.value))}
                      className="bg-slate-950 border-slate-800 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Est. Minutes</label>
                    <Input
                      type="number"
                      value={connectDuration}
                      onChange={e => setConnectDuration(Number(e.target.value))}
                      className="bg-slate-950 border-slate-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Route / Line Name</label>
                    <Input
                      value={connectRouteName}
                      onChange={e => setConnectRouteName(e.target.value)}
                      placeholder="e.g. Capas - Panqui Line"
                      className="bg-slate-950 border-slate-800 text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="bidirectional"
                    checked={connectBidirectional}
                    onChange={e => setConnectBidirectional(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <label htmlFor="bidirectional" className="text-xs text-slate-300 flex items-center gap-1 cursor-pointer">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                    Bidirectional (Passengers can travel both ways)
                  </label>
                </div>

                <Button
                  onClick={handleCreateConnection}
                  className="w-full bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 mt-2"
                >
                  <Link2 className="w-4 h-4 mr-1.5" />
                  Save Route Connection
                </Button>
              </CardContent>
            </Card>

            {/* List of Connections */}
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-slate-400">
                  Existing Network Connections ({connections.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                {connections.length === 0 ? (
                  <p className="text-sm text-slate-500 italic py-4 text-center">No route connections created yet.</p>
                ) : (
                  connections.map(c => {
                    const fromName = c.from_stop?.name || "Stop " + c.from_stop_id;
                    const toName = c.to_stop?.name || "Stop " + c.to_stop_id;
                    return (
                      <div key={c.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                              {c.mode.toUpperCase()}
                            </Badge>
                            {c.route_name && <span className="text-xs text-slate-400">{c.route_name}</span>}
                          </div>
                          <p className="text-xs font-semibold text-slate-200 mt-1">
                            {fromName} ➔ {toName}
                          </p>
                          <p className="text-[11px] text-slate-500">₱{c.fare} • {c.duration_minutes} mins {c.is_bidirectional ? "• Bidirectional" : ""}</p>
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-slate-500 hover:text-red-400"
                          onClick={() => handleDeleteConnection(c.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
