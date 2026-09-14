import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database, MapPin, Bus, Plus, Trash2, Save, Settings2, Map, Route,
  RefreshCw, Menu, X, DollarSign, AlertTriangle, Clock, Layers, Navigation,
  Check, CheckSquare, Square, Sliders, Shield, Tag, Calendar, Compass, LogOut
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/auth/AuthProvider";
import AdminTransitPlotter from "@/components/admin/AdminTransitPlotter";
import HubMapPickerModal from "@/components/admin/HubMapPickerModal";
import RoutePreviewModal from "@/components/admin/RoutePreviewModal";

type ViewMode = "plotter" | "routes" | "fares" | "hubs" | "advisories";

interface FareConfig {
  id: string;
  category: string;
  scope: string; // "San Clemente" | "Camiling" | "Paniqui" | "Tarlac City" | "All Municipalities"
  pricing_model: "matrix" | "negotiated" | "flat";
  icon: string;
  base_fare: number;
  rate_per_km: number;
  min_fare?: number;
  max_fare?: number;
  flat_fare?: number;
  avg_speed_kmh: number;
  operating_hours: string;
  allowed_vehicles: string[];
}

interface TransitHub {
  id: string;
  name: string;
  type: string; // "Central Terminal" | "Junction Stop" | "TODA Stand" | "Train Station" | "Bus Stop"
  lat: number;
  lng: number;
  address?: string;
  vehicles: string[];
  facilities: string[];
  hours: string;
}

interface CommuteAdvisory {
  id: string;
  title: string;
  severity: "info" | "warning" | "closure";
  scope_area: string;
  corridor: string;
  affected_vehicles: string[];
  duration_preset: "permanent" | "today" | "3days" | "week";
  details: string;
  active: boolean;
}

const VEHICLE_OPTIONS = [
  { id: "jeepney", label: "Jeepney", icon: "🚍" },
  { id: "bus", label: "Bus", icon: "🚌" },
  { id: "tricycle", label: "Tricycle (TODA)", icon: "🛺" },
  { id: "uv", label: "UV Express", icon: "🚐" },
  { id: "train", label: "Train / MRT", icon: "🚆" },
  { id: "walk", label: "Walking", icon: "🚶" },
];

const EMOJI_ICON_LIST = [
  { emoji: "🚍", label: "Jeepney" },
  { emoji: "🚌", label: "Bus" },
  { emoji: "🛺", label: "Tricycle (TODA)" },
  { emoji: "🚐", label: "UV Express" },
  { emoji: "🚆", label: "Train / MRT" },
  { emoji: "🚶", label: "Walking" },
  { emoji: "⛴️", label: "Ferry / Boat" },
  { emoji: "🚗", label: "Car / Taxi" },
  { emoji: "🚲", label: "Bicycle" },
  { emoji: "🛵", label: "Motorcycle" },
];

const MUNICIPALITIES = [
  "San Clemente",
  "Camiling",
  "Paniqui",
  "Tarlac City",
  "Moncada",
  "All Municipalities",
];

const HUB_TYPES = [
  { id: "Central Terminal", label: "Central Terminal", icon: "🏬" },
  { id: "TODA Stand", label: "TODA Tricycle Stand", icon: "🛺" },
  { id: "Junction Stop", label: "Highway Junction", icon: "🔀" },
  { id: "Bus Station", label: "Bus Station / Stop", icon: "🚌" },
  { id: "Train Station", label: "Train / Railway Station", icon: "🚆" },
];

const HUB_FACILITIES = [
  "Waiting Lounge",
  "Restrooms",
  "Ticketing Booth",
  "Food Stalls",
  "24/7 Security",
  "Parking Area",
];

const HOUR_PRESETS = [
  "24/7 (Always Open)",
  "4:00 AM - 10:00 PM",
  "5:00 AM - 9:00 PM",
  "6:00 AM - 8:00 PM",
];

interface AdminPageProps {
  drawerOpen?: boolean;
  setDrawerOpen?: (open: boolean) => void;
}

export default function AdminPage({ drawerOpen: externalDrawerOpen, setDrawerOpen: externalSetDrawerOpen }: AdminPageProps = {}) {
  const { user, signOut } = useAuth();
  const [internalDrawerOpen, setInternalDrawerOpen] = useState(false);
  const drawerOpen = externalDrawerOpen !== undefined ? externalDrawerOpen : internalDrawerOpen;
  const setDrawerOpen = externalSetDrawerOpen || setInternalDrawerOpen;
  const [currentView, setCurrentView] = useState<ViewMode>("plotter");
  const [dbRoutes, setDbRoutes] = useState<any[]>([]);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [selectedPlotterRoute, setSelectedPlotterRoute] = useState<any | null>(null);
  const [previewModalRoute, setPreviewModalRoute] = useState<any | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // System Fare Configurations with Location Scope & Pricing Models
  const [fareConfigs, setFareConfigs] = useState<FareConfig[]>(() => {
    const saved = localStorage.getItem("cms:fare_configs_v2");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        id: "jeepney-all",
        category: "Traditional Jeepney Matrix",
        scope: "All Municipalities",
        pricing_model: "matrix",
        icon: "🚍",
        base_fare: 13.0,
        rate_per_km: 1.80,
        avg_speed_kmh: 22,
        operating_hours: "5:00 AM - 9:00 PM",
        allowed_vehicles: ["jeepney"],
      },
      {
        id: "bus-provincial",
        category: "Provincial / Aircon Bus",
        scope: "All Municipalities",
        pricing_model: "matrix",
        icon: "🚌",
        base_fare: 15.0,
        rate_per_km: 2.20,
        avg_speed_kmh: 45,
        operating_hours: "4:00 AM - 11:00 PM",
        allowed_vehicles: ["bus"],
      },
      {
        id: "trike-san-clemente",
        category: "San Clemente TODA Special Trip",
        scope: "San Clemente",
        pricing_model: "negotiated",
        icon: "🛺",
        base_fare: 30.0,
        rate_per_km: 0,
        min_fare: 30,
        max_fare: 100,
        avg_speed_kmh: 18,
        operating_hours: "24/7 (Always Open)",
        allowed_vehicles: ["tricycle"],
      },
      {
        id: "trike-camiling-flat",
        category: "Camiling Town Plaza Flat Loop",
        scope: "Camiling",
        pricing_model: "flat",
        icon: "🛺",
        base_fare: 15.0,
        rate_per_km: 0,
        flat_fare: 15,
        avg_speed_kmh: 20,
        operating_hours: "5:00 AM - 9:00 PM",
        allowed_vehicles: ["tricycle"],
      },
    ];
  });

  // Transit Hubs Directory
  const [hubs, setHubs] = useState<TransitHub[]>(() => {
    const saved = localStorage.getItem("cms:transit_hubs_v2");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        id: "hub-1",
        name: "San Clemente Highway Junction",
        type: "Junction Stop",
        lat: 15.71246,
        lng: 120.35925,
        address: "McArthur Highway, San Clemente, Tarlac",
        vehicles: ["jeepney", "bus", "tricycle"],
        facilities: ["Waiting Lounge", "Food Stalls"],
        hours: "24/7 (Always Open)",
      },
      {
        id: "hub-2",
        name: "Paniqui Bus & Jeepney Terminal",
        type: "Central Terminal",
        lat: 15.66499,
        lng: 120.51161,
        address: "Poblacion Sur, Paniqui, Tarlac",
        vehicles: ["bus", "jeepney", "uv"],
        facilities: ["Waiting Lounge", "Restrooms", "Ticketing Booth", "24/7 Security"],
        hours: "4:00 AM - 10:00 PM",
      },
    ];
  });

  // Commute Advisories
  const [advisories, setAdvisories] = useState<CommuteAdvisory[]>(() => {
    const saved = localStorage.getItem("cms:commute_advisories_v2");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        id: "adv-1",
        title: "Road Repair on Camiling-Paniqui Highway",
        severity: "warning",
        scope_area: "Camiling",
        corridor: "Camiling - Paniqui Highway",
        affected_vehicles: ["jeepney", "bus"],
        duration_preset: "3days",
        details: "Single lane open near Km 142. Expect 10-15 mins delay.",
        active: true,
      },
    ];
  });

  const [modalType, setModalType] = useState<null | "fare" | "hub" | "adv">(null);
  const [modalDraft, setModalDraft] = useState<any>({});

  useEffect(() => {
    localStorage.setItem("cms:fare_configs_v2", JSON.stringify(fareConfigs));
  }, [fareConfigs]);

  useEffect(() => {
    localStorage.setItem("cms:transit_hubs_v2", JSON.stringify(hubs));
  }, [hubs]);

  useEffect(() => {
    localStorage.setItem("cms:commute_advisories_v2", JSON.stringify(advisories));
  }, [advisories]);

  const fetchDbRoutes = async () => {
    setIsLoadingRoutes(true);
    try {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/admin/transit-routes", { headers });
      if (res.ok) {
        const data = await res.json();
        setDbRoutes(data);
      }
    } catch {
      // Ignore API fetch error
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  useEffect(() => {
    fetchDbRoutes();
  }, []);

  const deleteDbRoute = async (id: number) => {
    try {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/admin/transit-routes/${id}`, {
        method: "DELETE",
        headers,
      });

      if (res.ok) {
        toast({ title: "🗑️ Admin route deleted" });
        fetchDbRoutes();
      }
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const saveFareModal = () => {
    if (!modalDraft.category) return toast({ title: "Category title required" });
    const exists = fareConfigs.find(f => f.id === modalDraft.id);
    const next = exists
      ? fareConfigs.map(f => f.id === modalDraft.id ? { ...modalDraft } : f)
      : [...fareConfigs, { ...modalDraft, id: `fare-${Date.now()}` }];
    setFareConfigs(next);
    toast({ title: "✅ Transit fare matrix saved!" });
    setModalType(null);
  };

  const saveHubModal = () => {
    if (!modalDraft.name) return toast({ title: "Hub name required" });
    const exists = hubs.find(h => h.id === modalDraft.id);
    const next = exists
      ? hubs.map(h => h.id === modalDraft.id ? { ...modalDraft } : h)
      : [...hubs, { ...modalDraft, id: `hub-${Date.now()}` }];
    setHubs(next);
    toast({ title: "✅ Transit hub saved with pinned coordinates!" });
    setModalType(null);
  };

  const saveAdvModal = () => {
    if (!modalDraft.title) return toast({ title: "Title required" });
    const exists = advisories.find(a => a.id === modalDraft.id);
    const next = exists
      ? advisories.map(a => a.id === modalDraft.id ? { ...modalDraft } : a)
      : [...advisories, { ...modalDraft, id: `adv-${Date.now()}`, active: true }];
    setAdvisories(next);
    toast({ title: "✅ Advisory published to rider navigation!" });
    setModalType(null);
  };

  const toggleArrayItem = (currentArray: string[] = [], item: string) => {
    if (currentArray.includes(item)) {
      return currentArray.filter(x => x !== item);
    }
    return [...currentArray, item];
  };

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden bg-background">
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-[300px] p-4 flex flex-col justify-between z-[6000]">
          <div className="space-y-4">
            <SheetHeader className="pb-2 border-b border-border/40">
              <SheetTitle className="font-display font-bold text-base flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" /> Admin CMS Navigation
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Manage transit plotter, routes, fares, hubs, and commute advisories
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-1">
              <button
                onClick={() => { setCurrentView("plotter"); setDrawerOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  currentView === "plotter" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"
                }`}
              >
                <Map className="w-4 h-4" /> Interactive Transit Plotter
              </button>

              <button
                onClick={() => { setCurrentView("routes"); setDrawerOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  currentView === "routes" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"
                }`}
              >
                <Route className="w-4 h-4" /> Saved Routes ({dbRoutes.length})
              </button>

              <button
                onClick={() => { setCurrentView("fares"); setDrawerOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  currentView === "fares" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"
                }`}
              >
                <DollarSign className="w-4 h-4" /> Vehicle Fare & Speed Matrix
              </button>

              <button
                onClick={() => { setCurrentView("hubs"); setDrawerOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  currentView === "hubs" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"
                }`}
              >
                <MapPin className="w-4 h-4" /> Transit Hubs Directory
              </button>

              <button
                onClick={() => { setCurrentView("advisories"); setDrawerOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  currentView === "advisories" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"
                }`}
              >
                <AlertTriangle className="w-4 h-4" /> Commute Advisories
              </button>
            </div>
          </div>

          {/* Bottom Profile & Sign Out Button inside Sidebar */}
          <div className="pt-4 border-t border-border/40 space-y-3 mt-6">
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-muted/40">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                {user?.name?.[0]?.toUpperCase() || "A"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs truncate">{user?.name || "Administrator"}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email || "admin@intellitravel.com"}</p>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full h-10 rounded-xl text-xs font-bold gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive justify-start"
              onClick={() => {
                setDrawerOpen(false);
                signOut();
                toast({ title: "👋 Signed out of Admin Portal" });
              }}
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Workspace Render */}
      <div className="flex-1 overflow-y-auto lg:overflow-hidden p-2">
        {currentView === "plotter" && (
          <AdminTransitPlotter
            initialRoute={selectedPlotterRoute}
            onSaveSuccess={() => {
              fetchDbRoutes();
              setSelectedPlotterRoute(null);
            }}
          />
        )}

        {/* Saved Routes View */}
        {currentView === "routes" && (
          <div className="h-full overflow-y-auto space-y-3 max-w-4xl mx-auto p-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">Saved Admin Transit Routes</h3>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1 rounded-xl" onClick={fetchDbRoutes}>
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRoutes ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>

            {dbRoutes.length === 0 && (
              <Card className="border-0 card-elevated p-8 text-center text-xs text-muted-foreground">
                No routes saved yet. Click <b>Admin Tools ➔ Interactive Transit Plotter</b> to map your first route!
              </Card>
            )}

            {dbRoutes.map((r: any) => (
              <Card
                key={r.id}
                className="border-0 card-interactive cursor-pointer hover:border-primary/50 transition-all"
                onClick={() => {
                  setPreviewModalRoute(r);
                  setIsPreviewModalOpen(true);
                }}
              >
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                        <span>{r.title}</span>
                        <Badge variant="outline" className="text-[9px] font-bold text-primary bg-primary/10 border-0">
                          Click for Modal Map Preview
                        </Badge>
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-1 font-medium flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-foreground">{r.origin_name}</span>
                        <span className="text-muted-foreground font-bold">➔</span>
                        <span className="font-semibold text-foreground">{r.dest_name}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-xl text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                        onClick={() => {
                          setPreviewModalRoute(r);
                          setIsPreviewModalOpen(true);
                        }}
                      >
                        <Map className="w-3.5 h-3.5" /> Preview Route
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 rounded-xl text-xs font-semibold gap-1.5"
                        onClick={() => {
                          setSelectedPlotterRoute(r);
                          setCurrentView("plotter");
                          toast({
                            title: "✏️ Opening Route Editor",
                            description: `Editing "${r.title}" in interactive transit plotter.`,
                          });
                        }}
                      >
                        <Settings2 className="w-3.5 h-3.5" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10"
                        onClick={() => deleteDbRoute(r.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-border/40">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px] font-bold">
                        ₱{Number(r.total_fare).toFixed(2)}
                      </Badge>
                      <span className="text-muted-foreground font-medium flex items-center gap-1 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-blue-500" /> {r.total_duration_minutes} mins
                      </span>
                      <span className="text-muted-foreground font-medium flex items-center gap-1 text-[11px]">
                        <Route className="w-3.5 h-3.5 text-purple-500" /> {r.legs?.length || 0} legs
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {r.legs?.map((leg: any, idx: number) => {
                        const modeObj = VEHICLE_OPTIONS.find(m => m.id === leg.mode);
                        return (
                          <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0.5 gap-1 font-semibold">
                            <span>{modeObj?.icon || "🚍"}</span>
                            <span className="capitalize">{leg.mode}</span>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Vehicle Fare & Speed Matrix View */}
        {currentView === "fares" && (
          <div className="h-full overflow-y-auto space-y-3 max-w-4xl mx-auto p-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Vehicle Fare & Speed Matrix</h3>
                <p className="text-[11px] text-muted-foreground">Location-based fare pricing models (Matrix, Negotiated Range, Flat Rate)</p>
              </div>
              <Button
                size="sm"
                className="h-8 text-xs gap-1 rounded-xl font-bold bg-primary"
                onClick={() => {
                  setModalDraft({
                    category: "New Transit Matrix",
                    scope: "San Clemente",
                    pricing_model: "matrix",
                    icon: "🚍",
                    base_fare: 15,
                    rate_per_km: 2,
                    min_fare: 25,
                    max_fare: 80,
                    flat_fare: 20,
                    avg_speed_kmh: 25,
                    operating_hours: "5:00 AM - 9:00 PM",
                    allowed_vehicles: ["jeepney"],
                  });
                  setModalType("fare");
                }}
              >
                <Plus className="w-3.5 h-3.5" /> Add Fare Matrix Rule
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fareConfigs.map(fc => (
                <Card key={fc.id} className="border-0 card-interactive">
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{fc.icon}</span>
                        <div>
                          <h4 className="font-bold text-sm">{fc.category}</h4>
                          <Badge variant="outline" className="text-[9px] font-semibold bg-muted">
                            📍 {fc.scope}
                          </Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => { setModalDraft(fc); setModalType("fare"); }}>
                        <Settings2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-border/40 text-center">
                      {fc.pricing_model === "matrix" && (
                        <>
                          <div className="p-2 rounded-xl bg-muted/60">
                            <p className="text-[9px] text-muted-foreground font-medium">Base Fare</p>
                            <p className="font-bold text-emerald-600">₱{fc.base_fare?.toFixed(2)}</p>
                          </div>
                          <div className="p-2 rounded-xl bg-muted/60">
                            <p className="text-[9px] text-muted-foreground font-medium">Rate / KM</p>
                            <p className="font-bold text-blue-600">₱{fc.rate_per_km?.toFixed(2)}</p>
                          </div>
                        </>
                      )}

                      {fc.pricing_model === "negotiated" && (
                        <div className="col-span-2 p-2 rounded-xl bg-amber-500/10 text-amber-600">
                          <p className="text-[9px] font-medium">Negotiated Range</p>
                          <p className="font-bold">₱{fc.min_fare} - ₱{fc.max_fare} (Special)</p>
                        </div>
                      )}

                      {fc.pricing_model === "flat" && (
                        <div className="col-span-2 p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                          <p className="text-[9px] font-medium">Flat Rate Fare</p>
                          <p className="font-bold">₱{fc.flat_fare?.toFixed(2)} Flat Fee</p>
                        </div>
                      )}

                      <div className="p-2 rounded-xl bg-muted/60">
                        <p className="text-[9px] text-muted-foreground font-medium">Avg Speed</p>
                        <p className="font-bold text-foreground">{fc.avg_speed_kmh} km/h</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                      <span>Operating: <b>{fc.operating_hours}</b></span>
                      <span className="uppercase font-bold text-primary">{fc.pricing_model} Model</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Transit Hubs Directory View */}
        {currentView === "hubs" && (
          <div className="h-full overflow-y-auto space-y-3 max-w-4xl mx-auto p-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Transit Hubs & Stations Directory</h3>
                <p className="text-[11px] text-muted-foreground">Interactive terminal directory with single-pin map location picker</p>
              </div>
              <Button
                size="sm"
                className="h-8 text-xs gap-1 rounded-xl font-bold bg-primary"
                onClick={() => {
                  setModalDraft({
                    name: "New Transit Hub",
                    type: "Central Terminal",
                    lat: 15.71,
                    lng: 120.35,
                    address: "San Clemente, Tarlac",
                    vehicles: ["jeepney", "bus"],
                    facilities: ["Waiting Lounge"],
                    hours: "24/7 (Always Open)",
                  });
                  setModalType("hub");
                }}
              >
                <Plus className="w-3.5 h-3.5" /> Add Transit Hub
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {hubs.map(h => (
                <Card key={h.id} className="border-0 card-interactive">
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">{h.name}</h4>
                          <Badge variant="outline" className="text-[9px] font-semibold bg-muted">{h.type}</Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => { setModalDraft(h); setModalType("hub"); }}>
                        <Settings2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="text-xs space-y-1.5 pt-2 border-t border-border/40 text-muted-foreground">
                      <p className="flex items-center gap-1.5 font-medium text-foreground">
                        <Compass className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{h.address || `${h.lat.toFixed(5)}, ${h.lng.toFixed(5)}`}</span>
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {h.vehicles.map(v => (
                          <Badge key={v} variant="secondary" className="text-[9px] capitalize px-1.5 py-0.5">
                            {v}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground">Operating: {h.hours}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Commute Advisories View */}
        {currentView === "advisories" && (
          <div className="h-full overflow-y-auto space-y-3 max-w-4xl mx-auto p-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Commute Advisories & Road Notices</h3>
                <p className="text-[11px] text-muted-foreground">Publish road warnings and route alerts to rider navigation screen</p>
              </div>
              <Button
                size="sm"
                className="h-8 text-xs gap-1 rounded-xl font-bold bg-primary"
                onClick={() => {
                  setModalDraft({
                    title: "Road Construction Alert",
                    severity: "warning",
                    scope_area: "Camiling",
                    corridor: "Paniqui Highway",
                    affected_vehicles: ["jeepney", "bus"],
                    duration_preset: "3days",
                    details: "Expect delays due to road widening work.",
                  });
                  setModalType("adv");
                }}
              >
                <Plus className="w-3.5 h-3.5" /> Publish Advisory
              </Button>
            </div>

            <div className="space-y-2">
              {advisories.map(a => (
                <Card key={a.id} className="border-0 card-interactive">
                  <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${
                        a.severity === "closure" ? "bg-destructive" : a.severity === "warning" ? "bg-amber-500" : "bg-blue-500"
                      }`}>
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm">{a.title}</h4>
                          <Badge variant="outline" className="text-[9px] uppercase font-bold">
                            {a.severity}
                          </Badge>
                        </div>
                        <p className="text-[11px] font-semibold text-primary">Corridor: {a.corridor} ({a.scope_area})</p>
                        <p className="text-[11px] text-muted-foreground">{a.details}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive rounded-xl" onClick={() => setAdvisories(advisories.filter(x => x.id !== a.id))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Editor Modal for Fare / Hub / Advisory with Checkboxes & Visual Buttons */}
      <Dialog open={!!modalType} onOpenChange={(o) => !o && setModalType(null)}>
        <DialogContent className="max-w-[460px] rounded-2xl p-5 z-[5000] overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold flex items-center gap-2">
              {modalType === "fare" && "🚍 Vehicle Fare & Speed Matrix Rule"}
              {modalType === "hub" && "📍 Transit Hub Details & Location Pin"}
              {modalType === "adv" && "📢 Publish Commute Advisory"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {modalType === "fare" && "Configure vehicle pricing models, base fares, and speed rules for admin transit plotting."}
              {modalType === "hub" && "Define location pin, facilities, and available transport options for this transit hub."}
              {modalType === "adv" && "Post real-time commute advisories for passenger routes and municipal transit."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* FARE MATRIX MODAL */}
            {modalType === "fare" && (
              <>
                {/* Title & Icon Selection Dropdown */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground text-[10px] uppercase">Rule Title & Vehicle Icon</label>
                  <div className="flex gap-2 items-center">
                    {/* Icon Dropdown Selector */}
                    <Select
                      value={modalDraft.icon || "🚍"}
                      onValueChange={val => setModalDraft({ ...modalDraft, icon: val })}
                    >
                      <SelectTrigger className="w-28 h-9 rounded-xl font-bold text-base flex items-center justify-between">
                        <SelectValue placeholder="🚍" />
                      </SelectTrigger>
                      <SelectContent side="bottom" className="z-[6000]">
                        {EMOJI_ICON_LIST.map(item => (
                          <SelectItem key={item.emoji} value={item.emoji} className="text-xs font-semibold">
                            <span className="mr-2 text-base">{item.emoji}</span>
                            <span>{item.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      placeholder="Category Title (e.g. Traditional Jeepney)"
                      value={modalDraft.category || ""}
                      onChange={e => setModalDraft({ ...modalDraft, category: e.target.value })}
                      className="flex-1 h-9 rounded-xl font-semibold text-xs"
                    />
                  </div>
                </div>

                {/* Scope Municipality Selector */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground text-[10px] uppercase">Location / Municipality Scope</label>
                  <div className="flex flex-wrap gap-1.5">
                    {MUNICIPALITIES.map(muni => (
                      <button
                        key={muni}
                        type="button"
                        onClick={() => setModalDraft({ ...modalDraft, scope: muni })}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all ${
                          modalDraft.scope === muni
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border/60 hover:bg-muted"
                        }`}
                      >
                        {muni}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pricing Model Segmented Cards */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground text-[10px] uppercase">Pricing Fare Structure</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    {[
                      { id: "matrix", label: "Distance Matrix", desc: "Base + Rate/km" },
                      { id: "negotiated", label: "Negotiated TODA", desc: "Min - Max Range" },
                      { id: "flat", label: "Flat Fee", desc: "Fixed Fare" },
                    ].map(pm => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setModalDraft({ ...modalDraft, pricing_model: pm.id })}
                        className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          modalDraft.pricing_model === pm.id
                            ? "bg-primary/10 border-primary text-primary font-bold"
                            : "border-border/60 hover:bg-muted"
                        }`}
                      >
                        <span className="text-[11px]">{pm.label}</span>
                        <span className="text-[9px] text-muted-foreground font-normal">{pm.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pricing Fields depending on Model */}
                {modalDraft.pricing_model === "matrix" && (
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/40 border border-border/50">
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Base Fare (₱)</label>
                      <Input
                        type="number"
                        value={modalDraft.base_fare || 15}
                        onChange={e => setModalDraft({ ...modalDraft, base_fare: +e.target.value })}
                        className="h-8 text-xs rounded-lg font-bold text-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Rate / KM (₱)</label>
                      <Input
                        type="number"
                        value={modalDraft.rate_per_km || 2}
                        onChange={e => setModalDraft({ ...modalDraft, rate_per_km: +e.target.value })}
                        className="h-8 text-xs rounded-lg font-bold text-blue-600"
                      />
                    </div>
                  </div>
                )}

                {modalDraft.pricing_model === "negotiated" && (
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <div>
                      <label className="text-[10px] font-semibold text-amber-700 block mb-1">Min Special Fare (₱)</label>
                      <Input
                        type="number"
                        value={modalDraft.min_fare || 30}
                        onChange={e => setModalDraft({ ...modalDraft, min_fare: +e.target.value })}
                        className="h-8 text-xs rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-amber-700 block mb-1">Max Special Fare (₱)</label>
                      <Input
                        type="number"
                        value={modalDraft.max_fare || 100}
                        onChange={e => setModalDraft({ ...modalDraft, max_fare: +e.target.value })}
                        className="h-8 text-xs rounded-lg font-bold"
                      />
                    </div>
                  </div>
                )}

                {modalDraft.pricing_model === "flat" && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <label className="text-[10px] font-semibold text-emerald-700 block mb-1">Fixed Flat Rate (₱)</label>
                    <Input
                      type="number"
                      value={modalDraft.flat_fare || 15}
                      onChange={e => setModalDraft({ ...modalDraft, flat_fare: +e.target.value })}
                      className="h-8 text-xs rounded-lg font-bold text-emerald-600"
                    />
                  </div>
                )}

                {/* Vehicle Type Checkboxes */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground text-[10px] uppercase">Applicable Vehicle Types</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {VEHICLE_OPTIONS.map(v => {
                      const isChecked = modalDraft.allowed_vehicles?.includes(v.id);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            const next = toggleArrayItem(modalDraft.allowed_vehicles, v.id);
                            setModalDraft({ ...modalDraft, allowed_vehicles: next });
                          }}
                          className={`p-2 rounded-xl border flex items-center gap-1.5 text-[11px] font-medium transition-all ${
                            isChecked ? "bg-primary text-primary-foreground border-primary" : "border-border/60 hover:bg-muted"
                          }`}
                        >
                          <span>{v.icon}</span>
                          <span className="truncate">{v.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Operating Hours Preset Buttons */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground text-[10px] uppercase">Operating Hours</label>
                  <div className="flex flex-wrap gap-1.5">
                    {HOUR_PRESETS.map(hp => (
                      <button
                        key={hp}
                        type="button"
                        onClick={() => setModalDraft({ ...modalDraft, operating_hours: hp })}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold border transition-all ${
                          modalDraft.operating_hours === hp
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border/60 hover:bg-muted"
                        }`}
                      >
                        {hp}
                      </button>
                    ))}
                  </div>
                </div>

                <Button className="w-full h-11 rounded-2xl font-bold shadow-travel text-xs mt-2" onClick={saveFareModal}>
                  Save Fare Matrix Rule
                </Button>
              </>
            )}

            {/* TRANSIT HUB MODAL WITH MAP PICKER */}
            {modalType === "hub" && (
              <>
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground text-[10px] uppercase">Transit Hub Name</label>
                  <Input
                    placeholder="e.g. San Clemente Public Market TODA"
                    value={modalDraft.name || ""}
                    onChange={e => setModalDraft({ ...modalDraft, name: e.target.value })}
                    className="h-9 rounded-xl font-bold text-xs"
                  />
                </div>

                {/* Map Pin Selection Button */}
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-emerald-800 uppercase">Exact Map Location Pin</p>
                      <p className="text-[11px] font-mono text-emerald-700 font-bold">
                        {modalDraft.lat ? `${modalDraft.lat}, ${modalDraft.lng}` : "No pin selected yet"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setIsMapPickerOpen(true)}
                      className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1"
                    >
                      <MapPin className="w-4 h-4" /> Single-Pin on Map
                    </Button>
                  </div>
                  {modalDraft.address && (
                    <p className="text-[10px] text-emerald-900 truncate">📍 {modalDraft.address}</p>
                  )}
                </div>

                {/* Hub Type Segmented Buttons */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground text-[10px] uppercase">Hub Classification</label>
                  <div className="flex flex-wrap gap-1.5">
                    {HUB_TYPES.map(ht => (
                      <button
                        key={ht.id}
                        type="button"
                        onClick={() => setModalDraft({ ...modalDraft, type: ht.id })}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border flex items-center gap-1 transition-all ${
                          modalDraft.type === ht.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border/60 hover:bg-muted"
                        }`}
                      >
                        <span>{ht.icon}</span>
                        <span>{ht.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vehicle Availability Checkboxes */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground text-[10px] uppercase">Available Transport Rides</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {VEHICLE_OPTIONS.map(v => {
                      const isChecked = modalDraft.vehicles?.includes(v.id);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            const next = toggleArrayItem(modalDraft.vehicles, v.id);
                            setModalDraft({ ...modalDraft, vehicles: next });
                          }}
                          className={`p-2 rounded-xl border flex items-center gap-1 text-[10px] font-medium transition-all ${
                            isChecked ? "bg-primary text-primary-foreground border-primary" : "border-border/60 hover:bg-muted"
                          }`}
                        >
                          <span>{v.icon}</span>
                          <span className="truncate">{v.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Facilities Checkboxes */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground text-[10px] uppercase">Hub Amenities & Facilities</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {HUB_FACILITIES.map(fac => {
                      const isChecked = modalDraft.facilities?.includes(fac);
                      return (
                        <button
                          key={fac}
                          type="button"
                          onClick={() => {
                            const next = toggleArrayItem(modalDraft.facilities, fac);
                            setModalDraft({ ...modalDraft, facilities: next });
                          }}
                          className={`p-2 rounded-xl border text-left text-[10px] font-medium flex items-center justify-between transition-all ${
                            isChecked ? "bg-primary/10 border-primary text-primary font-bold" : "border-border/60 hover:bg-muted"
                          }`}
                        >
                          <span>{fac}</span>
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button className="w-full h-11 rounded-2xl font-bold shadow-travel text-xs mt-2" onClick={saveHubModal}>
                  Save Transit Hub
                </Button>
              </>
            )}

            {/* ADVISORIES MODAL */}
            {modalType === "adv" && (
              <>
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground text-[10px] uppercase">Advisory Title</label>
                  <Input
                    placeholder="e.g. Single Lane Road Widening"
                    value={modalDraft.title || ""}
                    onChange={e => setModalDraft({ ...modalDraft, title: e.target.value })}
                    className="h-9 rounded-xl font-bold text-xs"
                  />
                </div>

                {/* Severity Radio Cards */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground text-[10px] uppercase">Severity Level</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "info", label: "Info / Notice", color: "bg-blue-500 text-white" },
                      { id: "warning", label: "Warning / Delay", color: "bg-amber-500 text-white" },
                      { id: "closure", label: "Road Closure", color: "bg-destructive text-white" },
                    ].map(sev => (
                      <button
                        key={sev.id}
                        type="button"
                        onClick={() => setModalDraft({ ...modalDraft, severity: sev.id })}
                        className={`p-2 rounded-xl border text-center font-bold text-[10px] transition-all ${
                          modalDraft.severity === sev.id ? `${sev.color} border-transparent shadow-md` : "border-border/60 hover:bg-muted"
                        }`}
                      >
                        {sev.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground text-[10px] uppercase">Corridor / Road Name</label>
                  <Input
                    placeholder="e.g. Camiling - Paniqui Highway"
                    value={modalDraft.corridor || ""}
                    onChange={e => setModalDraft({ ...modalDraft, corridor: e.target.value })}
                    className="h-9 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground text-[10px] uppercase">Detailed Rider Notice</label>
                  <Input
                    placeholder="e.g. Single lane open near Km 142. Expect 15 mins delay."
                    value={modalDraft.details || ""}
                    onChange={e => setModalDraft({ ...modalDraft, details: e.target.value })}
                    className="h-9 rounded-xl text-xs"
                  />
                </div>

                <Button className="w-full h-11 rounded-2xl font-bold shadow-travel text-xs mt-2" onClick={saveAdvModal}>
                  Publish Advisory
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Interactive Leaflet Map Picker Modal for Hubs */}
      <HubMapPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        initialLat={modalDraft.lat || 15.71}
        initialLng={modalDraft.lng || 120.35}
        initialName={modalDraft.address || modalDraft.name || ""}
        onConfirmPin={({ lat, lng, address }) => {
          setModalDraft(prev => ({
            ...prev,
            lat,
            lng,
            address,
            name: prev.name && prev.name !== "New Transit Hub" ? prev.name : address.split(",")[0],
          }));
        }}
      />
      {/* Route Preview Modal */}
      <RoutePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        route={previewModalRoute}
        onEditRoute={(r) => {
          setSelectedPlotterRoute(r);
          setCurrentView("plotter");
          toast({
            title: "✏️ Editing Route in Plotter",
            description: `Loaded "${r.title}" into transit plotter.`,
          });
        }}
      />
    </div>
  );
}
