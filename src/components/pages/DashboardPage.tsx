import { useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Cloud, Sun, Navigation, Users, CalendarDays,
  ArrowRight, Clock, Zap, TrendingUp, Globe, Shield, Wifi, DollarSign,
  Flame, Camera, Compass, Gift, ChevronRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { mockTrips, currentUser, collaborators, mockBudget, mockReviews } from "@/data/mockData";

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

interface Props { onNavigate: (tab: string) => void; }

export default function DashboardPage({ onNavigate }: Props) {
  const activeTrip = mockTrips[0];
  const completedStops = activeTrip.stops.filter(s => s.isCompleted).length;
  const progress = (completedStops / activeTrip.stops.length) * 100;
  const totalSpent = mockBudget.categories.reduce((s, c) => s + c.spent, 0);
  const [proOpen, setProOpen] = useState(false);
  const [greeting] = useState(() => {
    const h = new Date().getHours();
    if (h < 12) return { text: "Good morning", emoji: "☀️" };
    if (h < 17) return { text: "Good afternoon", emoji: "🌤️" };
    return { text: "Good evening", emoji: "🌙" };
  });

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="px-4 py-4 pb-6 space-y-4">
      {/* Greeting */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-muted-foreground font-medium">{greeting.text} {greeting.emoji}</p>
          <h2 className="font-display font-bold text-xl tracking-tight">{currentUser.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="h-6 text-[9px] font-semibold bg-accent/10 text-accent border-0 gap-1">
            <Flame className="w-3 h-3" /> 7 day streak
          </Badge>
          <div
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-travel cursor-pointer"
            onClick={() => onNavigate("settings")}
          >
            <span className="text-primary-foreground font-display font-bold text-sm">AR</span>
          </div>
        </div>
      </motion.div>

      {/* Active Trip Hero */}
      <motion.div variants={item}>
        <Card className="overflow-hidden border-0 card-elevated relative cursor-pointer" onClick={() => onNavigate("itinerary")}>
          <div className="absolute inset-0">
            <img src={activeTrip.coverImage} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/40 to-foreground/10" />
          </div>
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-success/90 text-success-foreground text-[9px] h-5 font-semibold backdrop-blur-sm">
                <Zap className="w-3 h-3 mr-0.5" /> Active Trip
              </Badge>
              <Badge className="bg-white/15 text-white text-[9px] h-5 font-semibold backdrop-blur-sm border-0">
                Day 2 of 4
              </Badge>
            </div>
            <h3 className="font-display font-bold text-lg text-white leading-tight">{activeTrip.title}</h3>
            <p className="text-[11px] text-white/70 mt-0.5">{activeTrip.description}</p>

            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/60">Progress</span>
                <span className="text-white font-semibold">{completedStops}/{activeTrip.stops.length} stops</span>
              </div>
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <div className="flex -space-x-2">
                {activeTrip.collaborators.slice(0, 3).map((u, i) => (
                  <img key={i} src={u.avatar} alt={u.name} className="w-7 h-7 rounded-xl border-2 border-white/20" />
                ))}
              </div>
              <span className="text-[10px] text-white/60">{activeTrip.collaborators.length} travelers</span>
              <div className="flex-1" />
              <Button size="sm" className="h-8 text-xs gap-1.5 rounded-xl font-semibold bg-white text-foreground hover:bg-white/90 shadow-travel" onClick={(e) => { e.stopPropagation(); onNavigate("itinerary"); }}>
                Continue <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={item} className="grid grid-cols-4 gap-2">
        {[
          { icon: MapPin, label: "Places", value: "12", color: "text-primary", action: "explore" },
          { icon: Navigation, label: "Distance", value: "64km", color: "text-info", action: "navigate" },
          { icon: DollarSign, label: "Spent", value: `₱${(totalSpent/1000).toFixed(1)}k`, color: "text-accent", action: "expenses" },
          { icon: Camera, label: "Photos", value: "128", color: "text-chart-4", action: "reviews" },
        ].map(({ icon: Icon, label, value, color, action }) => (
          <Card key={label} className="border-0 card-interactive cursor-pointer" onClick={() => onNavigate(action)}>
            <CardContent className="p-3 text-center">
              <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
              <p className="font-display font-bold text-[15px] leading-none">{value}</p>
              <p className="text-[9px] text-muted-foreground font-medium mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Next Stop */}
      <motion.div variants={item}>
        <Card className="border-0 card-elevated bg-gradient-to-r from-primary/5 to-transparent cursor-pointer" onClick={() => onNavigate("navigate")}>
          <CardContent className="p-3.5">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] font-semibold text-primary">Next Stop</span>
              <span className="text-[10px] text-muted-foreground ml-auto">ETA 25min</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[13px]">{activeTrip.stops[2].location.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{activeTrip.stops[2].notes}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="outline" className="text-[9px] h-[18px] gap-1 font-medium">
                    <Clock className="w-2.5 h-2.5" /> {activeTrip.stops[2].arrivalTime}
                  </Badge>
                  <span className="text-sm">{activeTrip.stops[2].weather === "cloudy" ? "⛅" : "☀️"}</span>
                  <span className="text-[10px] font-semibold">{activeTrip.stops[2].temperature}°</span>
                </div>
              </div>
              <Button size="icon" className="h-9 w-9 rounded-xl shadow-travel" onClick={(e) => { e.stopPropagation(); onNavigate("navigate"); }}>
                <Navigation className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Weather */}
      <motion.div variants={item}>
        <Card className="border-0 card-elevated">
          <CardContent className="p-3.5">
            <div className="flex items-center gap-2 mb-2.5">
              <Cloud className="w-4 h-4 text-info" />
              <span className="text-xs font-semibold">Weather Along Route</span>
              <span className="text-[10px] text-muted-foreground ml-auto">Manila → Tagaytay</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {[
                { time: "Now", temp: "32°", icon: "☀️", active: true },
                { time: "12PM", temp: "34°", icon: "🌤️" },
                { time: "3PM", temp: "31°", icon: "⛅" },
                { time: "6PM", temp: "28°", icon: "🌅" },
                { time: "9PM", temp: "26°", icon: "🌙" },
              ].map(w => (
                <div key={w.time} className={`flex flex-col items-center min-w-[48px] p-1.5 rounded-xl transition-colors ${
                  w.active ? "bg-primary/8 ring-1 ring-primary/20" : "hover:bg-muted"
                }`}>
                  <span className={`text-[10px] font-medium ${w.active ? "text-primary" : "text-muted-foreground"}`}>{w.time}</span>
                  <span className="text-lg my-0.5">{w.icon}</span>
                  <span className="text-xs font-semibold">{w.temp}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={item}>
        <h3 className="section-header mb-2.5">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { icon: Navigation, label: "Start Navigation", desc: "Real-time routing", action: "navigate", gradient: "from-primary/10 to-info/5", iconColor: "text-primary" },
            { icon: Users, label: "Group Chat", desc: `${collaborators.filter(c => c.isOnline).length} online now`, action: "social", gradient: "from-accent/10 to-warning/5", iconColor: "text-accent" },
            { icon: Globe, label: "Explore Nearby", desc: "12 places found", action: "explore", gradient: "from-success/10 to-primary/5", iconColor: "text-success" },
            { icon: DollarSign, label: "Expenses", desc: `₱${(totalSpent/1000).toFixed(1)}k of ₱30k`, action: "expenses", gradient: "from-info/10 to-accent/5", iconColor: "text-info" },
          ].map(({ icon: Icon, label, desc, action, gradient, iconColor }) => (
            <Card
              key={label}
              className="border-0 card-interactive cursor-pointer"
              onClick={() => onNavigate(action)}
            >
              <CardContent className={`p-3.5 bg-gradient-to-br ${gradient} rounded-xl`}>
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <p className="font-semibold text-[13px]">{label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity Feed */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="section-header">Recent Activity</h3>
        </div>
        <div className="space-y-2">
          {[
            { avatar: collaborators[0].avatar, name: "Maya", action: "rated", target: "Tagaytay Ridge ⭐⭐⭐⭐⭐", time: "2h ago", tab: "reviews" },
            { avatar: collaborators[2].avatar, name: "Luna", action: "added expense", target: "₱4,200 dinner", time: "5h ago", tab: "expenses" },
            { avatar: currentUser.avatar, name: "You", action: "completed", target: "Rizal Park stop", time: "8h ago", tab: "itinerary" },
          ].map((activity, i) => (
            <Card key={i} className="border-0 card-interactive cursor-pointer" onClick={() => onNavigate(activity.tab)}>
              <CardContent className="p-3 flex items-center gap-2.5">
                <img src={activity.avatar} className="w-8 h-8 rounded-xl flex-shrink-0" />
                <p className="text-[12px] flex-1">
                  <span className="font-semibold">{activity.name}</span>{" "}
                  <span className="text-muted-foreground">{activity.action}</span>{" "}
                  <span className="font-medium">{activity.target}</span>
                </p>
                <span className="text-[9px] text-muted-foreground flex-shrink-0">{activity.time}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Upcoming */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="section-header">Upcoming Trips</h3>
          <Button variant="ghost" size="sm" className="h-7 text-[11px] text-primary font-semibold rounded-lg" onClick={() => onNavigate("itinerary")}>
            View All
          </Button>
        </div>
        <div className="space-y-2">
          {mockTrips.slice(1).map(trip => (
            <Card key={trip.id} className="border-0 card-interactive cursor-pointer" onClick={() => onNavigate("itinerary")}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13px] truncate">{trip.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{trip.startDate} · {trip.stops.length} stops</p>
                </div>
                <Badge variant="outline" className="text-[9px] h-5 font-semibold capitalize">{trip.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Online Friends */}
      <motion.div variants={item}>
        <Card className="border-0 card-elevated">
          <CardContent className="p-3.5">
            <div className="flex items-center gap-2 mb-3">
              <Wifi className="w-4 h-4 text-success" />
              <span className="text-xs font-semibold">Friends Online</span>
              <Badge variant="outline" className="text-[9px] h-[18px] ml-auto font-semibold">{collaborators.filter(c => c.isOnline).length}</Badge>
            </div>
            <div className="flex gap-4">
              {collaborators.filter(c => c.isOnline).map(c => (
                <div key={c.id} className="flex flex-col items-center cursor-pointer" onClick={() => onNavigate("social")}>
                  <div className="relative">
                    <img src={c.avatar} alt={c.name} className="w-11 h-11 rounded-2xl border-2 border-card" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success ring-2 ring-card" />
                  </div>
                  <span className="text-[10px] mt-1.5 text-muted-foreground font-medium">{c.name.split(" ")[0]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Promo Card */}
      <motion.div variants={item}>
        <Card className="border-0 overflow-hidden relative cursor-pointer" onClick={() => setProOpen(true)}>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/5 to-chart-4/10" />
          <CardContent className="p-4 relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-travel flex-shrink-0">
              <Gift className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-bold">Unlock TrailSync Pro</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">AI trip planning, offline maps, unlimited collabs</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </CardContent>
        </Card>
      </motion.div>

      {/* System */}
      <motion.div variants={item}>
        <Card className="border-0 card-interactive bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-3.5 flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-[11px] font-semibold">All systems operational</p>
              <p className="text-[9px] text-muted-foreground">Last backup: 2 hours ago · Offline data synced</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Version */}
      <motion.div variants={item}>
        <p className="text-center text-[10px] text-muted-foreground font-medium pb-2">TrailSync v2.1.0 · Made with ❤️ in Manila</p>
      </motion.div>

      {/* Pro Upgrade Dialog */}
      <Dialog open={proOpen} onOpenChange={setProOpen}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Gift className="w-5 h-5 text-accent" /> TrailSync Pro
            </DialogTitle>
            <DialogDescription>Unlock the full travel experience</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {[
              { feature: "AI Trip Planning", desc: "Generate itineraries with AI" },
              { feature: "Offline Maps", desc: "Download maps for offline use" },
              { feature: "Unlimited Collaborators", desc: "Invite unlimited travelers" },
              { feature: "Priority Support", desc: "24/7 dedicated support" },
              { feature: "Advanced Analytics", desc: "Detailed travel insights" },
            ].map(f => (
              <div key={f.feature} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap className="w-3 h-3 text-primary" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold">{f.feature}</p>
                  <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Button className="w-full h-11 rounded-xl shadow-travel font-semibold gap-2" onClick={() => { setProOpen(false); toast({ title: "🎉 Welcome to Pro!", description: "Your 14-day free trial has started." }); }}>
              Start Free Trial · ₱499/mo
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">14-day free trial · Cancel anytime</p>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
