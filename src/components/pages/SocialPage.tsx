import { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Send, MapPin, Image, Users, Phone, Video,
  Circle, CheckCheck, Navigation, Share2,
  UserPlus, Crown, Eye, Radio, ChevronDown, ChevronUp
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { mockMessages, collaborators, currentUser, heatmapData, mockTrips } from "@/data/mockData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ChatMessage, TravelUser } from "@/types/travel";
import { VideoCallOverlay, VoiceCallOverlay, AnimatePresence } from "@/components/travel/CallOverlay";

const createUserIcon = (name: string, online: boolean) => L.divIcon({
  className: "",
  html: `<div style="width:32px;height:32px;background:${online ? 'hsl(162,72%,40%)' : '#94a3b8'};border-radius:10px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:11px;font-family:Inter">${name.split(" ").map(n => n[0]).join("")}</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function TrackingMap({ showHeatmap, members }: { showHeatmap: boolean; members: TravelUser[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const trailsRef = useRef<Record<string, L.Polyline>>({});
  const positionsRef = useRef<Record<string, [number, number][]>>({});
  const heatLayersRef = useRef<L.Circle[]>([]);
  const allUsers = members.filter(u => u.lastLocation);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const points = allUsers
      .filter(u => u.lastLocation)
      .map(u => [u.lastLocation!.lat, u.lastLocation!.lng] as [number, number]);

    const map = L.map(mapRef.current, {
      center: points[0] ?? [14.58, 121.0],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    allUsers.forEach(u => {
      if (!u.lastLocation) return;
      const start: [number, number] = [u.lastLocation.lat, u.lastLocation.lng];
      positionsRef.current[u.id] = [start];
      const marker = L.marker(start, { icon: createUserIcon(u.name, u.isOnline) })
        .bindPopup(`<strong>${u.name}</strong><br/><span style="color:${u.isOnline ? '#22c55e' : '#94a3b8'}">${u.isOnline ? "Online" : "Offline"}</span><br/><small>${u.role}</small>`)
        .addTo(map);
      markersRef.current[u.id] = marker;

      if (u.isOnline) {
        const trail = L.polyline([start], {
          color: "hsl(162,72%,40%)", weight: 3, opacity: 0.5, dashArray: "4 4",
        }).addTo(map);
        trailsRef.current[u.id] = trail;
      }
    });

    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [60, 60] });
    }

    mapInstance.current = map;

    // Simulate real-time movement for online users
    const moveInterval = setInterval(() => {
      allUsers.forEach(u => {
        if (!u.isOnline) return;
        const marker = markersRef.current[u.id];
        if (!marker) return;
        const current = marker.getLatLng();
        // Small random walk (~30-50m per tick)
        const next: [number, number] = [
          current.lat + (Math.random() - 0.5) * 0.0008,
          current.lng + (Math.random() - 0.5) * 0.0008,
        ];
        marker.setLatLng(next);
        const trail = trailsRef.current[u.id];
        if (trail) {
          const pts = positionsRef.current[u.id];
          pts.push(next);
          if (pts.length > 30) pts.shift();
          trail.setLatLngs(pts);
        }
      });
    }, 1500);

    const invalidate = () => map.invalidateSize();
    const t1 = setTimeout(invalidate, 50);
    const t2 = setTimeout(invalidate, 250);
    const t3 = setTimeout(invalidate, 600);
    window.addEventListener("resize", invalidate);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && mapRef.current) {
      ro = new ResizeObserver(invalidate);
      ro.observe(mapRef.current);
    }

    return () => {
      clearInterval(moveInterval);
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      window.removeEventListener("resize", invalidate);
      ro?.disconnect();
      map.remove();
      mapInstance.current = null;
      markersRef.current = {};
      trailsRef.current = {};
      positionsRef.current = {};
    };
  }, []);

  // Heatmap overlay (circle-based, no extra dep)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    heatLayersRef.current.forEach(c => c.remove());
    heatLayersRef.current = [];
    if (!showHeatmap) return;
    heatmapData.forEach(p => {
      const c = L.circle([p.lat, p.lng], {
        radius: 3000 + p.intensity * 6000,
        color: "transparent",
        fillColor: `hsl(${(1 - p.intensity) * 220}, 90%, 50%)`,
        fillOpacity: 0.25 + p.intensity * 0.3,
      }).addTo(map);
      heatLayersRef.current.push(c);
    });
  }, [showHeatmap]);

  return <div ref={mapRef} className="absolute inset-0 bg-muted" />;
}

export default function SocialPage() {
  // Multi-trip group chats: each trip has its own conversation, members, and message history.
  const [activeTripId, setActiveTripId] = useState<string>(mockTrips[0].id);
  const activeTrip = mockTrips.find(t => t.id === activeTripId) ?? mockTrips[0];
  const tripMembers: TravelUser[] = activeTrip.collaborators ?? [currentUser];
  const conversationId = `trip-${activeTrip.id}`;

  // Seed messages: t1 gets the mock thread, other trips start empty.
  const [messagesByTrip, setMessagesByTrip] = useState<Record<string, ChatMessage[]>>(() => {
    const seed: Record<string, ChatMessage[]> = { t1: mockMessages };
    mockTrips.forEach(t => { if (!seed[t.id]) seed[t.id] = []; });
    return seed;
  });
  const messages = messagesByTrip[activeTrip.id] ?? [];
  const setMessages = (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setMessagesByTrip(prev => ({
      ...prev,
      [activeTrip.id]: typeof updater === "function" ? (updater as any)(prev[activeTrip.id] ?? []) : updater,
    }));
  };

  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [shareLocation, setShareLocation] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [activeCall, setActiveCall] = useState<null | "audio" | "video">(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [trackOverlayOpen, setTrackOverlayOpen] = useState(true);

  // Per-trip presence: which user IDs are actively sharing live location in each trip.
  // Seeded from each trip's online collaborators so trips don't share/mix presence.
  const [trackingByTrip, setTrackingByTrip] = useState<Record<string, string[]>>(() => {
    const seed: Record<string, string[]> = {};
    mockTrips.forEach(t => {
      seed[t.id] = (t.collaborators ?? [])
        .filter(c => c.isOnline && c.lastLocation)
        .map(c => c.id);
    });
    return seed;
  });
  const trackingIds = trackingByTrip[activeTrip.id] ?? [];
  // Reflect the local user's own toggle in the active trip's tracking set
  useEffect(() => {
    setTrackingByTrip(prev => {
      const set = new Set(prev[activeTrip.id] ?? []);
      if (shareLocation) set.add(currentUser.id); else set.delete(currentUser.id);
      return { ...prev, [activeTrip.id]: Array.from(set) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareLocation, activeTrip.id]);
  const isTracking = (id: string) => trackingIds.includes(id);

  // 1:1 call against the first online collaborator of the active trip.
  const callPeer = tripMembers.find(c => c.id !== currentUser.id && c.isOnline)
    ?? tripMembers.find(c => c.id !== currentUser.id)
    ?? collaborators[0];


  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!message.trim()) return;
    setMessages([...messages, {
      id: `m${messages.length + 1}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      type: "text",
    }]);
    setMessage("");
  };

  const sendLocationMsg = () => {
    setMessages([...messages, {
      id: `m${messages.length + 1}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      message: "📍 Shared live location — Makati City, Philippines",
      timestamp: new Date().toISOString(),
      type: "location",
    }]);
    toast({ title: "📍 Location Shared", description: "Your live location was sent to the group." });
  };

  const sendImageMsg = () => {
    setMessages([...messages, {
      id: `m${messages.length + 1}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      message: "📸 Shared a photo from Tagaytay",
      timestamp: new Date().toISOString(),
      type: "text",
    }]);
    toast({ title: "📸 Photo Shared", description: "Image sent to the group chat." });
  };

  const handleCall = (type: "audio" | "video") => {
    if (!callPeer) {
      toast({ title: "No one to call", description: "No members available right now.", variant: "destructive" });
      return;
    }
    setActiveCall(type);
    toast({
      title: type === "audio" ? "📞 Calling…" : "📹 Video Calling…",
      description: `Open this app in a second browser tab to answer as ${callPeer.name}.`,
    });
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    toast({ title: "📧 Invite Sent!", description: `Invitation sent to ${inviteEmail}.` });
    setInviteEmail("");
    setInviteOpen(false);
  };

  const handleShareProfile = (name: string) => {
    navigator.clipboard.writeText(`Check out ${name}'s TrailSync profile!`);
    toast({ title: "🔗 Profile Link Copied!", description: `${name}'s profile link copied to clipboard.` });
  };

  const roleIcons: Record<string, typeof Crown> = { owner: Crown, editor: Navigation, viewer: Eye };
  const allUsers = tripMembers.filter(u => u.lastLocation);

  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)]">
      {/* Trip switcher — keeps each group chat isolated so multiple trips don't collide */}
      <div className="px-4 pt-4 pb-2">
        <Select value={activeTripId} onValueChange={setActiveTripId}>
          <SelectTrigger className="h-10 rounded-xl bg-card border-border/50 text-xs font-semibold">
            <div className="flex items-center gap-2 min-w-0">
              <Users className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {mockTrips.map(t => (
              <SelectItem key={t.id} value={t.id} className="text-xs">
                {t.title} · {(t.collaborators?.length ?? 1)} members
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="chat" className="flex flex-col flex-1 min-h-0">
        <div className="px-4 pt-1">
          <TabsList className="w-full h-10 p-1 rounded-xl bg-muted">
            <TabsTrigger value="chat" className="flex-1 text-xs rounded-lg font-semibold data-[state=active]:shadow-sm">Chat</TabsTrigger>
            <TabsTrigger value="members" className="flex-1 text-xs rounded-lg font-semibold data-[state=active]:shadow-sm">Members</TabsTrigger>
            <TabsTrigger value="tracking" className="flex-1 text-xs rounded-lg font-semibold data-[state=active]:shadow-sm">Live Track</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 hidden data-[state=active]:flex flex-col min-h-0 m-0">
          <div className="px-4 py-2.5 flex items-center justify-between border-b border-border/30">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex -space-x-1.5">
                {tripMembers.filter(u => u.id !== currentUser.id).slice(0, 3).map((u, i) => (
                  <img key={i} src={u.avatar} className="w-7 h-7 rounded-lg border-2 border-card" />
                ))}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{activeTrip.title}</p>
                <p className="text-[10px] text-muted-foreground">{tripMembers.filter(c => c.isOnline).length} online · {tripMembers.length} members</p>
              </div>
            </div>
            <div className="flex gap-0.5">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => handleCall("audio")}><Phone className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => handleCall("video")}><Video className="w-4 h-4" /></Button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map(msg => {
              const isMe = msg.userId === currentUser.id;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
                >
                  {!isMe && <img src={msg.userAvatar} className="w-7 h-7 rounded-lg flex-shrink-0 mt-1" />}
                  <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                    {!isMe && <p className="text-[10px] text-muted-foreground mb-0.5 px-1 font-medium">{msg.userName}</p>}
                    <div className={`px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-md"
                        : msg.type === "location"
                          ? "bg-info/10 border border-info/15 rounded-2xl rounded-tl-md"
                          : msg.type === "itinerary-update"
                            ? "bg-accent/10 border border-accent/15 rounded-2xl rounded-tl-md"
                            : "bg-muted rounded-2xl rounded-tl-md"
                    }`}>
                      {msg.type === "location" && <MapPin className="w-3.5 h-3.5 text-info inline mr-1" />}
                      {msg.type === "itinerary-update" && <Navigation className="w-3.5 h-3.5 text-accent inline mr-1" />}
                      {msg.message}
                    </div>
                    <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMe ? "justify-end" : ""}`}>
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {isMe && <CheckCheck className="w-3 h-3 text-info" />}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="px-4 py-2.5 border-t border-border/30">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 rounded-xl" onClick={sendImageMsg}><Image className="w-4 h-4" /></Button>
              <Button
                variant="ghost" size="icon"
                className={`h-9 w-9 flex-shrink-0 rounded-xl ${shareLocation ? "text-primary bg-primary/8" : ""}`}
                onClick={sendLocationMsg}
              >
                <MapPin className="w-4 h-4" />
              </Button>
              <Input
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                className="h-10 text-sm border-0 bg-muted rounded-xl"
              />
              <Button size="icon" className="h-9 w-9 flex-shrink-0 rounded-xl" onClick={sendMessage} disabled={!message.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
            {shareLocation && (
              <p className="text-[9px] text-success mt-1.5 flex items-center gap-1 px-1 font-medium">
                <Circle className="w-2 h-2 fill-success" /> Sharing live location
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="members" className="flex-1 overflow-y-auto m-0 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-header">{activeTrip.title} · Members</h3>
            <Button size="sm" className="h-8 text-xs gap-1.5 rounded-xl font-semibold" onClick={() => setInviteOpen(true)}>
              <UserPlus className="w-3.5 h-3.5" /> Invite
            </Button>
          </div>
          <div className="flex items-center gap-2 mb-2 text-[10px] text-muted-foreground font-medium">
            <Radio className="w-3 h-3 text-primary" />
            <span><span className="font-semibold text-primary">{trackingIds.length}</span> tracking now in this trip</span>
          </div>
          <div className="space-y-2">
            {tripMembers.map(user => {
              const RoleIcon = roleIcons[user.role] || Eye;
              const tracking = isTracking(user.id);
              return (
                <Card key={user.id} className="border-0 card-interactive">
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className="relative">
                      <img src={user.avatar} className="w-11 h-11 rounded-xl" />
                      {user.isOnline && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success ring-2 ring-card" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate">{user.name} {user.id === currentUser.id ? "(You)" : ""}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <RoleIcon className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground capitalize font-medium">{user.role}</span>
                        {tracking && (
                          <Badge className="bg-primary/15 text-primary border-0 text-[9px] h-4 px-1.5 gap-1 font-semibold">
                            <Radio className="w-2.5 h-2.5" /> Tracking
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => handleShareProfile(user.name)}><Share2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="tracking" className="flex-1 m-0 flex flex-col min-h-0 overflow-hidden">
          {/* Split layout: map occupies the upper portion, details panel sits below it
              so they never overlap (fixes the map covering the tracker details). */}
          <section
            className={`relative ${trackOverlayOpen ? "flex-1" : "flex-1"} min-h-0 overflow-hidden`}
            role="region"
            aria-label={`Live tracking map for ${activeTrip.title}`}
          >
            {/* Remount the map per trip so markers/trails reset cleanly */}
            <TrackingMap key={activeTrip.id} showHeatmap={showHeatmap} members={tripMembers} />
            <div className="absolute top-3 right-3 z-30 flex flex-col gap-2 items-end max-w-[calc(100%-1.5rem)]">
              <Button
                type="button"
                size="sm"
                variant={showHeatmap ? "default" : "secondary"}
                onClick={() => setShowHeatmap(v => !v)}
                aria-pressed={showHeatmap}
                aria-label={showHeatmap ? "Hide activity heatmap" : "Show activity heatmap"}
                className="min-h-11 px-3 rounded-xl text-[11px] font-semibold shadow-card-hover backdrop-blur-sm border border-border/50 bg-card/95"
              >
                {showHeatmap ? "Hide" : "Show"} Heatmap
              </Button>
              <Badge
                className="bg-card/95 text-foreground border border-border/50 text-[10px] h-6 font-semibold gap-1 shadow-card-hover"
                aria-live="polite"
                aria-label={`${trackingIds.length} members currently tracking in this trip`}
              >
                <Radio className="w-2.5 h-2.5 text-primary" aria-hidden="true" /> {trackingIds.length} tracking
              </Badge>
            </div>
          </section>

          {/* Details panel — sibling, not overlay, so the map can never cover it.
              Stays above the global bottom nav via safe-area padding. */}
          <Card
            className="border-0 border-t border-border/40 rounded-none bg-card/98 backdrop-blur-md overflow-hidden flex-shrink-0"
            style={{ paddingBottom: `env(safe-area-inset-bottom, 0px)` }}
            role="region"
            aria-label="Live tracking details"
          >
            <button
              type="button"
              onClick={() => setTrackOverlayOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 min-h-11 py-2 hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
              aria-expanded={trackOverlayOpen}
              aria-controls="live-track-details"
              aria-label={trackOverlayOpen ? "Collapse live tracking details" : "Expand live tracking details"}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Radio className="w-3.5 h-3.5 text-primary flex-shrink-0" aria-hidden="true" />
                <p className="text-xs font-semibold truncate">Live · {activeTrip.title}</p>
                <Badge variant="outline" className="text-[10px] h-5 font-semibold flex-shrink-0">
                  {trackingIds.length} tracking
                </Badge>
              </div>
              {trackOverlayOpen
                ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                : <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />}
            </button>
            {trackOverlayOpen && (
              <CardContent id="live-track-details" className="px-3 pb-3 pt-0">
                <ul className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-0.5 list-none" aria-label="Members currently tracking">
                  {trackingIds.length === 0 && (
                    <li className="text-[11px] text-muted-foreground py-1">No one is tracking in this trip right now.</li>
                  )}
                  {tripMembers.filter(u => isTracking(u.id)).map(u => (
                    <li
                      key={u.id}
                      className="flex items-center gap-1.5 bg-muted rounded-xl px-2.5 py-1.5 flex-shrink-0"
                      aria-label={`${u.name}${u.id === currentUser.id ? " (you)" : ""} is sharing live location`}
                    >
                      <img src={u.avatar} alt="" className="w-5 h-5 rounded-lg" />
                      <span className="text-[11px] font-semibold">{u.name.split(" ")[0]}{u.id === currentUser.id ? " (You)" : ""}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" aria-hidden="true" />
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>


      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Invite Member</DialogTitle>
            <DialogDescription>Add someone to the trip group</DialogDescription>
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

      <AnimatePresence>
        {activeCall === "video" && callPeer && (
          <VideoCallOverlay
            key="video-call"
            conversationId={conversationId}
            localUserId={currentUser.id}
            remoteUserId={callPeer.id}
            remoteName={callPeer.name}
            remoteAvatar={callPeer.avatar}
            autoStart
            onClose={() => setActiveCall(null)}
          />
        )}
        {activeCall === "audio" && callPeer && (
          <VoiceCallOverlay
            key="voice-call"
            conversationId={conversationId}
            localUserId={currentUser.id}
            remoteUserId={callPeer.id}
            remoteName={callPeer.name}
            remoteAvatar={callPeer.avatar}
            autoStart
            onClose={() => setActiveCall(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

