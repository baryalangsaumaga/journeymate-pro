import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Send, MapPin, Image, Smile, Users, Phone, Video,
  MoreVertical, Circle, CheckCheck, Navigation, Share2,
  UserPlus, Crown, Eye
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockMessages, collaborators, currentUser } from "@/data/mockData";

export default function SocialPage() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(mockMessages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [shareLocation, setShareLocation] = useState(true);

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

  const roleIcons: Record<string, typeof Crown> = { owner: Crown, editor: Navigation, viewer: Eye };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <Tabs defaultValue="chat" className="flex flex-col flex-1 min-h-0">
        <div className="px-4 pt-4">
          <TabsList className="w-full">
            <TabsTrigger value="chat" className="flex-1 text-xs">Group Chat</TabsTrigger>
            <TabsTrigger value="members" className="flex-1 text-xs">Members</TabsTrigger>
            <TabsTrigger value="tracking" className="flex-1 text-xs">Live Track</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 m-0">
          {/* Chat Header */}
          <div className="px-4 py-2 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {collaborators.slice(0, 3).map((u, i) => (
                  <img key={i} src={u.avatar} className="w-6 h-6 rounded-full border border-card" />
                ))}
              </div>
              <div>
                <p className="text-xs font-medium">Manila Heritage Walk</p>
                <p className="text-[10px] text-muted-foreground">{collaborators.filter(c => c.isOnline).length} online</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7"><Phone className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7"><Video className="w-3.5 h-3.5" /></Button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map(msg => {
              const isMe = msg.userId === currentUser.id;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
                >
                  {!isMe && <img src={msg.userAvatar} className="w-7 h-7 rounded-full flex-shrink-0 mt-1" />}
                  <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                    {!isMe && <p className="text-[10px] text-muted-foreground mb-0.5 px-1">{msg.userName}</p>}
                    <div className={`px-3 py-2 rounded-2xl text-sm ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-md"
                        : msg.type === "location"
                          ? "bg-info/10 border border-info/20 rounded-tl-md"
                          : msg.type === "itinerary-update"
                            ? "bg-accent/10 border border-accent/20 rounded-tl-md"
                            : "bg-muted rounded-tl-md"
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

          {/* Input */}
          <div className="px-4 py-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"><Image className="w-4 h-4" /></Button>
              <Button
                variant="ghost" size="icon"
                className={`h-8 w-8 flex-shrink-0 ${shareLocation ? "text-primary" : ""}`}
                onClick={() => setShareLocation(!shareLocation)}
              >
                <MapPin className="w-4 h-4" />
              </Button>
              <Input
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                className="h-9 text-sm border-0 bg-muted"
              />
              <Button size="icon" className="h-8 w-8 flex-shrink-0 rounded-full" onClick={sendMessage} disabled={!message.trim()}>
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
            {shareLocation && (
              <p className="text-[9px] text-success mt-1 flex items-center gap-1 px-1">
                <Circle className="w-2 h-2 fill-success" /> Sharing live location
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="members" className="flex-1 overflow-y-auto m-0 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-sm">Trip Members</h3>
            <Button size="sm" className="h-7 text-xs gap-1 rounded-full">
              <UserPlus className="w-3 h-3" /> Invite
            </Button>
          </div>
          <div className="space-y-2">
            {[currentUser, ...collaborators].map(user => {
              const RoleIcon = roleIcons[user.role] || Eye;
              return (
                <Card key={user.id} className="border-0 shadow-card">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="relative">
                      <img src={user.avatar} className="w-10 h-10 rounded-full" />
                      {user.isOnline && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-card" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{user.name} {user.id === currentUser.id ? "(You)" : ""}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <RoleIcon className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground capitalize">{user.role}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Share2 className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-3 h-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="tracking" className="flex-1 m-0 relative">
          {/* Mini map for tracking */}
          <div className="absolute inset-0 bg-muted map-grid">
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 400 500">
                {[currentUser, ...collaborators.filter(c => c.lastLocation)].map((u, i) => {
                  const x = 100 + (i * 60) % 250;
                  const y = 100 + (i * 80) % 300;
                  return (
                    <g key={u.id}>
                      <circle cx={x} cy={y} r="16" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" />
                      <text x={x} y={y + 4} textAnchor="middle" fontSize="8" fill="hsl(var(--foreground))">{u.name.split(" ")[0][0]}{u.name.split(" ")[1]?.[0]}</text>
                      {u.isOnline && <circle cx={x + 12} cy={y - 12} r="4" fill="hsl(var(--success))" />}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
          {/* Tracking info overlay */}
          <div className="absolute bottom-4 left-4 right-4">
            <Card className="border-0 shadow-card">
              <CardContent className="p-3">
                <p className="text-xs font-medium mb-2">Live Tracking • {collaborators.filter(c => c.isOnline).length} sharing</p>
                <div className="flex gap-2 overflow-x-auto">
                  {[currentUser, ...collaborators.filter(c => c.isOnline)].map(u => (
                    <div key={u.id} className="flex items-center gap-1.5 bg-muted rounded-full px-2 py-1 flex-shrink-0">
                      <img src={u.avatar} className="w-5 h-5 rounded-full" />
                      <span className="text-[10px] font-medium">{u.name.split(" ")[0]}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
