import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Plus, Download, Share2, CalendarDays,
  Users, ChevronLeft, Edit3, Copy, Trash2,
  AlertCircle, Navigation, ListChecks, Route as RouteIcon, Sparkles, Play,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { mockTrips } from "@/data/mockData";
import type { Trip, Location, ItineraryStop } from "@/types/travel";
import { generatePDF, downloadJSON } from "@/lib/pdf";
import { repo } from "@/lib/storage";
import { ItineraryTimeline } from "@/components/travel/ItineraryTimeline";
import { TripWizard } from "@/components/travel/TripWizard";
import { RoutePlannerPanel } from "@/components/travel/RoutePlannerPanel";
import { AutoItineraryPanel } from "@/components/travel/AutoItineraryPanel";
import { WeatherWidget } from "@/components/travel/WeatherWidget";
import { PlaceSearchInput } from "@/components/travel/PlaceSearchInput";
import { PlaceDetailsSheet } from "@/components/travel/PlaceDetailsSheet";
import { tripSession, appNavigate } from "@/lib/tripSession";
import { useGeolocation } from "@/hooks/useGeolocation";

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };

type DetailTab = "timeline" | "plan" | "auto";

export default function ItineraryPage() {
  const [trips, setTrips] = useState<Trip[]>(mockTrips);
  const [selectedTrip, setSelectedTrip] = useState<Trip>(trips[0]);
  const [view, setView] = useState<"list" | "detail">("list");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "planning" | "completed">("all");
  const [newTripOpen, setNewTripOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>("timeline");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [detailPlace, setDetailPlace] = useState<Location | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { fix } = useGeolocation();

  const completedStops = selectedTrip.stops.filter(s => s.isCompleted).length;
  const progress = (completedStops / selectedTrip.stops.length) * 100;

  const filteredTrips = trips.filter(t => activeFilter === "all" || t.status === activeFilter);


  const handleDeleteTrip = () => {
    setTrips(prev => prev.filter(t => t.id !== selectedTrip.id));
    toast({ title: "🗑️ Trip Deleted", description: `"${selectedTrip.title}" has been removed.`, variant: "destructive" });
    setDeleteOpen(false);
    setView("list");
    if (trips.length > 1) setSelectedTrip(trips.find(t => t.id !== selectedTrip.id)!);
  };

  const handleDuplicate = () => {
    toast({ title: "📋 Trip Duplicated!", description: `A copy of "${selectedTrip.title}" has been created.` });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: selectedTrip.title, text: selectedTrip.description }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`Check out my trip: ${selectedTrip.title}`);
      toast({ title: "🔗 Link Copied!", description: "Trip link copied to clipboard." });
    }
  };

  const buildItineraryPDF = () => generatePDF({
    title: selectedTrip.title,
    subtitle: `${selectedTrip.startDate} → ${selectedTrip.endDate} · ${selectedTrip.stops.length} stops`,
    sections: [
      {
        title: "Overview",
        rows: [
          ["Status", selectedTrip.status],
          ["Description", selectedTrip.description || "—"],
          ["Collaborators", selectedTrip.collaborators.map(c => c.name).join(", ") || "Solo"],
        ],
      },
      {
        title: "Route Summary",
        rows: [
          ["Total stops", String(selectedTrip.stops.length)],
          ["Transit modes", Array.from(new Set(selectedTrip.stops.map(s => s.transitType))).join(", ") || "—"],
          ["First stop", selectedTrip.stops[0]?.location.name ?? "—"],
          ["Final stop", selectedTrip.stops[selectedTrip.stops.length - 1]?.location.name ?? "—"],
        ],
      },
      {
        title: "Itinerary",
        rows: selectedTrip.stops.map((s, i) => [
          `Stop ${i + 1} · ${s.transitType}`,
          `${s.location.name} — ${s.arrivalTime} → ${s.departureTime}${s.notes ? ` · ${s.notes}` : ""}`,
        ]),
      },
    ],
    footer: `TrailSync · ${selectedTrip.title}`,
  });

  // One-tap: just save the printable itinerary PDF.
  const handleExportPDF = () => {
    const doc = buildItineraryPDF();
    doc.save(`${selectedTrip.title.replace(/\s+/g, "_")}_itinerary.pdf`);
    toast({ title: "📄 Itinerary Exported", description: "PDF ready to print or share." });
  };

  // Full "save offline" — PDF + JSON + cache locations for offline reuse.
  const handleDownload = () => {
    const doc = buildItineraryPDF();
    doc.save(`${selectedTrip.title.replace(/\s+/g, "_")}_itinerary.pdf`);

    repo.offlineTrips.add(selectedTrip.id);
    repo.cms.locations.save([
      ...repo.cms.locations.list(),
      ...selectedTrip.stops.map(s => ({
        id: `${selectedTrip.id}:${s.id}`,
        name: s.location.name,
        type: s.location.type,
        lat: s.location.lat,
        lng: s.location.lng,
        description: s.notes,
      })),
    ]);
    downloadJSON(`${selectedTrip.title.replace(/\s+/g, "_")}_offline.json`, selectedTrip);

    setTrips(prev => prev.map(t => t.id === selectedTrip.id ? { ...t, isOfflineAvailable: true } : t));
    setSelectedTrip(prev => ({ ...prev, isOfflineAvailable: true }));

    toast({ title: "📥 Saved Offline", description: "PDF downloaded · trip cached for offline use." });
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    toast({ title: "📧 Invite Sent!", description: `Invitation sent to ${inviteEmail}.` });
    setInviteEmail("");
    setInviteOpen(false);
  };

  const handleEditTrip = () => {
    toast({ title: "✏️ Trip Updated!", description: "Changes saved successfully." });
    setEditOpen(false);
  };

  const handleToggleStop = (stopId: string) => {
    setSelectedTrip(prev => ({
      ...prev,
      stops: prev.stops.map(s => s.id === stopId ? { ...s, isCompleted: !s.isCompleted } : s)
    }));
    toast({ title: "✅ Stop Updated" });
  };

  const handlePickStop = (stop: ItineraryStop) => {
    setDetailPlace(stop.location);
    setDetailOpen(true);
  };

  const handleAddStop = (place: Location) => {
    const newStop: ItineraryStop = {
      id: `s-${Date.now()}`,
      location: place,
      arrivalTime: "—:—",
      departureTime: "—:—",
      notes: "Added from search",
      transitType: "car",
      isCompleted: false,
    };
    setSelectedTrip(prev => ({ ...prev, stops: [...prev.stops, newStop] }));
    toast({ title: "📍 Stop Added", description: place.name });
  };

  const handleStartTrip = (stops?: ItineraryStop[]) => {
    const useStops = stops ?? selectedTrip.stops;
    if (useStops.length === 0) {
      toast({ title: "Add at least one stop first" });
      return;
    }
    tripSession.setTrip({
      title: selectedTrip.title,
      stops: useStops,
      strategy: "time",
      pace: "balanced",
      startFrom: fix ? { lat: fix.lat, lng: fix.lng } : undefined,
    });
    appNavigate("navigate");
    toast({ title: "🚀 Trip Started", description: "Your tour guide is plotting the route…" });
  };

  return (
    <div className="px-4 py-4 pb-6 space-y-4">
      <AnimatePresence mode="wait">
        {view === "list" ? (
          <motion.div
            key="list"
            variants={container}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <motion.div variants={item} className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-xl tracking-tight">My Trips</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">{trips.length} trips planned</p>
              </div>
              <Button size="sm" className="h-8 gap-1.5 rounded-xl shadow-travel text-xs font-semibold" onClick={() => setNewTripOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> New Trip
              </Button>
            </motion.div>

            {/* Filters */}
            <motion.div variants={item} className="flex gap-2">
              {(["all", "active", "planning", "completed"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all tap-highlight ${
                    activeFilter === f ? "bg-primary text-primary-foreground shadow-travel" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </motion.div>

            {filteredTrips.length === 0 && (
              <motion.div variants={item} className="flex flex-col items-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Navigation className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground">No {activeFilter} trips</p>
                <p className="text-[11px] text-muted-foreground mt-1">Create a new trip to get started!</p>
                <Button size="sm" className="mt-3 h-8 rounded-xl text-xs font-semibold" onClick={() => setNewTripOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Create Trip
                </Button>
              </motion.div>
            )}

            {filteredTrips.map(trip => {
              const done = trip.stops.filter(s => s.isCompleted).length;
              const pct = (done / trip.stops.length) * 100;
              return (
                <motion.div key={trip.id} variants={item}>
                  <Card
                    className="border-0 card-interactive overflow-hidden cursor-pointer"
                    onClick={() => { setSelectedTrip(trip); setView("detail"); }}
                  >
                    <div className="h-32 relative overflow-hidden">
                      <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute bottom-3 left-3.5 right-3.5">
                        <h3 className="font-display font-bold text-[15px] text-white leading-tight">{trip.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-white/70">{trip.startDate}</span>
                          <Badge className={`text-[9px] h-[18px] font-semibold ${
                            trip.status === "active" ? "bg-success/90" : "bg-white/20 text-white backdrop-blur-sm"
                          }`}>
                            {trip.status}
                          </Badge>
                        </div>
                      </div>
                      {trip.isOfflineAvailable && (
                        <Badge variant="outline" className="absolute top-2.5 right-2.5 text-[9px] h-[18px] bg-black/30 backdrop-blur-sm border-white/20 text-white">
                          <Download className="w-2.5 h-2.5 mr-0.5" /> Offline
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1.5">
                            {trip.collaborators.slice(0, 3).map((u, i) => (
                              <img key={i} src={u.avatar} className="w-6 h-6 rounded-lg border-2 border-card" />
                            ))}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-medium">{trip.collaborators.length} travelers</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium">{trip.stops.length} stops</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.3, duration: 0.6 }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">{done}/{trip.stops.length} completed</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="detail"
            variants={container}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Detail Header */}
            <motion.div variants={item}>
              <Card className="border-0 card-elevated overflow-hidden">
                <div className="h-40 relative">
                  <img src={selectedTrip.coverImage} alt={selectedTrip.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <Button
                    variant="ghost" size="icon"
                    className="absolute top-3 left-3 text-white bg-black/20 backdrop-blur-sm h-8 w-8 rounded-xl"
                    onClick={() => setView("list")}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <div className="absolute top-3 right-3 flex gap-1">
                    <Button variant="ghost" size="icon" className="text-white bg-black/20 backdrop-blur-sm h-8 w-8 rounded-xl" onClick={() => { setEditTitle(selectedTrip.title); setEditDesc(selectedTrip.description); setEditOpen(true); }}>
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-white bg-black/20 backdrop-blur-sm h-8 w-8 rounded-xl" onClick={handleShare}>
                      <Share2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="absolute bottom-3.5 left-3.5 right-3.5">
                    <h2 className="font-display font-bold text-lg text-white leading-tight">{selectedTrip.title}</h2>
                    <p className="text-[11px] text-white/70 mt-0.5">{selectedTrip.description}</p>
                  </div>
                </div>
                <CardContent className="p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                        {selectedTrip.startDate}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        {selectedTrip.stops.length} stops
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" onClick={handleShare}><Share2 className="w-3.5 h-3.5" /></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" onClick={handleDownload}><Download className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2.5">
                    <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-primary">{Math.round(progress)}%</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Trip Stats */}
            <motion.div variants={item} className="grid grid-cols-3 gap-2">
              {[
                { label: "Budget", value: "₱30k", subtext: "₱20.9k spent" },
                { label: "Distance", value: "64km", subtext: "4 modes" },
                { label: "Duration", value: "4 days", subtext: "2 remaining" },
              ].map(stat => (
                <Card key={stat.label} className="border-0 card-interactive">
                  <CardContent className="p-3 text-center">
                    <p className="font-display font-bold text-sm">{stat.value}</p>
                    <p className="text-[9px] text-muted-foreground font-medium mt-0.5">{stat.label}</p>
                    <p className="text-[8px] text-primary font-semibold mt-1">{stat.subtext}</p>
                  </CardContent>
                </Card>
              ))}
            </motion.div>

            {/* Weather at first stop */}
            {selectedTrip.stops[0] && (
              <motion.div variants={item}>
                <WeatherWidget
                  lat={selectedTrip.stops[0].location.lat}
                  lng={selectedTrip.stops[0].location.lng}
                  variant="full"
                />
              </motion.div>
            )}

            {/* Tab Switcher: Timeline / Plan / Auto */}
            <motion.div variants={item} className="flex gap-1 p-1 rounded-2xl bg-muted">
              {([
                { id: "timeline" as const, label: "Timeline", icon: ListChecks },
                { id: "plan" as const, label: "Planner", icon: RouteIcon },
                { id: "auto" as const, label: "Auto", icon: Sparkles },
              ]).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setDetailTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold transition-all ${
                    detailTab === id ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </motion.div>

            <motion.div variants={item}>
              <AnimatePresence mode="wait">
                {detailTab === "timeline" && (
                  <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ItineraryTimeline stops={selectedTrip.stops} onToggle={handleToggleStop} onPick={handlePickStop} />
                  </motion.div>
                )}
                {detailTab === "plan" && (
                  <motion.div key="plan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <RoutePlannerPanel
                      initial={selectedTrip.stops.map(s => ({
                        id: s.id, location: s.location, transitType: s.transitType, notes: s.notes,
                      }))}
                    />
                  </motion.div>
                )}
                {detailTab === "auto" && (
                  <motion.div key="auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <AutoItineraryPanel
                      centerLat={fix?.lat ?? selectedTrip.stops[0]?.location.lat}
                      centerLng={fix?.lng ?? selectedTrip.stops[0]?.location.lng}
                      onUseAsTrip={(stops) => handleStartTrip(stops)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Add Stop — search input directly inside Timeline (non-disruptive autocomplete). */}
            {detailTab === "timeline" && (
              <motion.div variants={item} className="space-y-2">
                <PlaceSearchInput
                  placeholder="Add a stop…"
                  exclude={selectedTrip.stops.map(s => s.location.id)}
                  onPick={handleAddStop}
                />
              </motion.div>
            )}

            {/* Start Trip — hand off to NavigationPage as personal tour guide. */}
            <motion.div variants={item}>
              <Button
                className="w-full h-12 rounded-2xl font-display font-bold shadow-travel text-sm gap-2 glow-primary"
                onClick={() => handleStartTrip()}
              >
                <Play className="w-4 h-4 fill-current" /> Start the Trip
              </Button>
            </motion.div>

            {/* Collaborators */}
            <motion.div variants={item}>
              <Card className="border-0 card-elevated">
                <CardContent className="p-3.5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Travelers
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 text-[11px] text-primary font-semibold rounded-lg" onClick={() => setInviteOpen(true)}>
                      <Plus className="w-3 h-3 mr-0.5" /> Invite
                    </Button>
                  </div>
                  <div className="space-y-2.5">
                    {selectedTrip.collaborators.map(u => (
                      <div key={u.id} className="flex items-center gap-2.5">
                        <div className="relative">
                          <img src={u.avatar} className="w-9 h-9 rounded-xl" />
                          {u.isOnline && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success ring-2 ring-card" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-[13px] font-semibold">{u.name}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{u.role}</p>
                        </div>
                        <Badge variant="outline" className={`text-[9px] h-[18px] font-semibold ${u.isOnline ? "text-success border-success/20" : ""}`}>
                          {u.isOnline ? "Online" : "Offline"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Danger Zone */}
            <motion.div variants={item}>
              <Card className="border-0 card-interactive border border-destructive/10">
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    <span className="text-xs font-semibold text-destructive">Danger Zone</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-[10px] rounded-lg gap-1 font-semibold" onClick={handleDuplicate}>
                      <Copy className="w-3 h-3" /> Duplicate
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-[10px] rounded-lg gap-1 text-destructive border-destructive/20 font-semibold" onClick={() => setDeleteOpen(true)}>
                      <Trash2 className="w-3 h-3" /> Delete Trip
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Trip Dialog */}
      <Dialog open={newTripOpen} onOpenChange={setNewTripOpen}>
        <DialogContent className="max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Create New Trip</DialogTitle>
            <DialogDescription>4-step wizard · plan your next adventure</DialogDescription>
          </DialogHeader>
          <TripWizard
            onCancel={() => setNewTripOpen(false)}
            onComplete={(t) => {
              toast({ title: "✈️ Trip Created!", description: `"${t.title}" added with ${t.destinations.length} stops.` });
              setNewTripOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Invite Traveler</DialogTitle>
            <DialogDescription>Send an invite to join this trip</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Email Address</label>
            <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="friend@email.com" className="mt-1.5 h-10 rounded-xl border-border" type="email" />
          </div>
          <Button className="w-full h-10 rounded-xl shadow-travel font-semibold" onClick={handleInvite} disabled={!inviteEmail.trim()}>
            Send Invite
          </Button>
        </DialogContent>
      </Dialog>

      {/* Edit Trip Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Trip Name</label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="mt-1.5 h-10 rounded-xl border-border" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
              <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} className="mt-1.5 h-10 rounded-xl border-border" />
            </div>
          </div>
          <Button className="w-full h-10 rounded-xl shadow-travel font-semibold" onClick={handleEditTrip}>
            Save Changes
          </Button>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="max-w-[320px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete Trip?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedTrip.title}" and all its data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl" onClick={handleDeleteTrip}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Place details — no Get Directions inside Trips (per spec). */}
      <PlaceDetailsSheet
        place={detailPlace}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        showDirections={false}
      />
    </div>
  );
}
