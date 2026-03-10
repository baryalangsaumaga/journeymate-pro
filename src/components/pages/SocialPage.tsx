import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Send, MapPin, Image, Users, Phone, Video,
  Circle, CheckCheck, Navigation, Share2,
  UserPlus, Crown, Eye
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
import { mockMessages, collaborators, currentUser } from "@/data/mockData";

const createUserIcon = (name: string, online: boolean) => L.divIcon({
  className: "",
  html: `<div style="width:32px;height:32px;background:${online ? 'hsl(162,72%,40%)' : '#94a3b8'};border-radius:10px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:11px;font-family:Inter">${name.split(" ").map(n => n[0]).join("")}</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function TrackingMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const allUsers = [currentUser, ...collaborators.filter(c => c.lastLocation)];

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [14.58, 121.0],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png").addTo(map);

    allUsers.forEach(u => {
      if (!u.lastLocation) return;
      L.marker([u.lastLocation.lat, u.lastLocation.lng], {
        icon: createUserIcon(u.name, u.isOnline),
      })
        .bindPopup(`<strong>${u.name}</strong><br/><span style="color:${u.isOnline ? '#22c55e' : '#94a3b8'}">${u.isOnline ? "Online" : "Offline"}</span><br/><small>${u.role}</small>`)
        .addTo(map);
    });

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  return <div ref={mapRef} className="h-full w-full" />;
}

export default function SocialPage() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(mockMessages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [shareLocation, setShareLocation] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

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
    toast({ title: type === "audio" ? "📞 Calling..." : "📹 Video Calling...", description: `Starting ${type} call with Manila Heritage Walk group.` });
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
  const allUsers = [currentUser, ...collaborators.filter(c => c.lastLocation)];

  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)]">
      <Tabs defaultValue="chat" className="flex flex-col flex-1 min-h-0">
        <div className="px-4 pt-4">
          <TabsList className="w-full h-10 p-1 rounded-xl bg-muted">
            <TabsTrigger value="chat" className="flex-1 text-xs rounded-lg font-semibold data-[state=active]:shadow-sm">Chat</TabsTrigger>
            <TabsTrigger value="members" className="flex-1 text-xs rounded-lg font-semibold data-[state=active]:shadow-sm">Members</TabsTrigger>
            <TabsTrigger value="tracking" className="flex-1 text-xs rounded-lg font-semibold data-[state=active]:shadow-sm">Live Track</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 m-0">
          <div className="px-4 py-2.5 flex items-center justify-between border-b border-border/30">
            <div className="flex items-center gap-2.5">
              <div className="flex -space-x-1.5">
                {collaborators.slice(0, 3).map((u, i) => (
                  <img key={i} src={u.avatar} className="w-7 h-7 rounded-lg border-2 border-card" />
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold">Manila Heritage Walk</p>
                <p className="text-[10px] text-muted-foreground">{collaborators.filter(c => c.isOnline).length} online</p>
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
            <h3 className="section-header">Trip Members</h3>
            <Button size="sm" className="h-8 text-xs gap-1.5 rounded-xl font-semibold" onClick={() => setInviteOpen(true)}>
              <UserPlus className="w-3.5 h-3.5" /> Invite
            </Button>
          </div>
          <div className="space-y-2">
            {[currentUser, ...collaborators].map(user => {
              const RoleIcon = roleIcons[user.role] || Eye;
              return (
                <Card key={user.id} className="border-0 card-interactive">
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className="relative">
                      <img src={user.avatar} className="w-11 h-11 rounded-xl" />
                      {user.isOnline && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success ring-2 ring-card" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold">{user.name} {user.id === currentUser.id ? "(You)" : ""}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <RoleIcon className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground capitalize font-medium">{user.role}</span>
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

        <TabsContent value="tracking" className="flex-1 m-0 relative">
          <div className="absolute inset-0 z-0">
            <TrackingMap />
          </div>
          <div className="absolute bottom-4 left-4 right-4 z-[400]">
            <Card className="border-0 card-elevated">
              <CardContent className="p-3.5">
                <p className="text-xs font-semibold mb-2.5">Live Tracking · {collaborators.filter(c => c.isOnline).length} sharing</p>
                <div className="flex gap-2 overflow-x-auto">
                  {allUsers.filter(u => u.isOnline).map(u => (
                    <div key={u.id} className="flex items-center gap-1.5 bg-muted rounded-xl px-2.5 py-1.5 flex-shrink-0">
                      <img src={u.avatar} className="w-5 h-5 rounded-lg" />
                      <span className="text-[10px] font-semibold">{u.name.split(" ")[0]}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
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
    </div>
  );
}
