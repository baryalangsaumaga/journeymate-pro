import { motion } from "framer-motion";
import {
  MapPin, Cloud, Sun, Navigation, Users, CalendarDays,
  ArrowRight, Clock, Zap, TrendingUp, Globe, Shield, Wifi, DollarSign
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { mockTrips, currentUser, collaborators, mockBudget } from "@/data/mockData";

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

interface Props { onNavigate: (tab: string) => void; }

export default function DashboardPage({ onNavigate }: Props) {
  const activeTrip = mockTrips[0];
  const completedStops = activeTrip.stops.filter(s => s.isCompleted).length;
  const progress = (completedStops / activeTrip.stops.length) * 100;
  const totalSpent = mockBudget.categories.reduce((s, c) => s + c.spent, 0);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="px-4 py-4 pb-6 space-y-4">
      {/* Greeting */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-muted-foreground font-medium">Good morning 👋</p>
          <h2 className="font-display font-bold text-xl tracking-tight">Alex Rivera</h2>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-travel">
          <span className="text-primary-foreground font-display font-bold text-sm">AR</span>
        </div>
      </motion.div>

      {/* Active Trip Hero */}
      <motion.div variants={item}>
        <Card className="overflow-hidden border-0 card-elevated relative">
          <div className="absolute inset-0">
            <img src={activeTrip.coverImage} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/40 to-foreground/10" />
          </div>
          <CardContent className="p-4 relative z-10">
            <Badge className="bg-success/90 text-success-foreground text-[9px] h-5 mb-2 font-semibold backdrop-blur-sm">
              <Zap className="w-3 h-3 mr-0.5" /> Active Trip
            </Badge>
            <h3 className="font-display font-bold text-lg text-white leading-tight">{activeTrip.title}</h3>
            <p className="text-[11px] text-white/70 mt-0.5">{activeTrip.description}</p>

            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/60">Progress</span>
                <span className="text-white font-semibold">{completedStops}/{activeTrip.stops.length} stops</span>
              </div>
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
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
              <Button size="sm" className="h-8 text-xs gap-1.5 rounded-xl font-semibold bg-white text-foreground hover:bg-white/90" onClick={() => onNavigate("itinerary")}>
                Continue <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={item} className="grid grid-cols-4 gap-2">
        {[
          { icon: MapPin, label: "Places", value: "12", bg: "bg-primary/8" },
          { icon: Navigation, label: "Distance", value: "64km", bg: "bg-info/8" },
          { icon: DollarSign, label: "Spent", value: `₱${(totalSpent/1000).toFixed(1)}k`, bg: "bg-accent/8" },
          { icon: TrendingUp, label: "Level", value: "12", bg: "bg-success/8" },
        ].map(({ icon: Icon, label, value, bg }) => (
          <Card key={label} className="border-0 card-interactive">
            <CardContent className={`p-3 text-center ${bg} rounded-lg`}>
              <Icon className="w-4 h-4 mx-auto mb-1 text-foreground/70" />
              <p className="font-display font-bold text-[15px] leading-none">{value}</p>
              <p className="text-[9px] text-muted-foreground font-medium mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Weather */}
      <motion.div variants={item}>
        <Card className="border-0 card-elevated">
          <CardContent className="p-3.5">
            <div className="flex items-center gap-2 mb-2.5">
              <Cloud className="w-4 h-4 text-info" />
              <span className="text-xs font-semibold">Weather Along Route</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {[
                { time: "Now", temp: "32°", icon: "☀️" },
                { time: "12PM", temp: "34°", icon: "🌤️" },
                { time: "3PM", temp: "31°", icon: "⛅" },
                { time: "6PM", temp: "28°", icon: "🌅" },
                { time: "9PM", temp: "26°", icon: "🌙" },
              ].map(w => (
                <div key={w.time} className="flex flex-col items-center min-w-[48px] p-1.5 rounded-xl hover:bg-muted transition-colors">
                  <span className="text-[10px] text-muted-foreground font-medium">{w.time}</span>
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
            { icon: Navigation, label: "Start Navigation", desc: "Real-time routing", action: "navigate", gradient: "from-primary/10 to-info/5" },
            { icon: Users, label: "Group Chat", desc: "4 online now", action: "social", gradient: "from-accent/10 to-warning/5" },
            { icon: Globe, label: "Explore Nearby", desc: "12 places found", action: "explore", gradient: "from-success/10 to-primary/5" },
            { icon: DollarSign, label: "Expenses", desc: `₱${(totalSpent/1000).toFixed(1)}k spent`, action: "expenses", gradient: "from-info/10 to-accent/5" },
          ].map(({ icon: Icon, label, desc, action, gradient }) => (
            <Card
              key={label}
              className="border-0 card-interactive cursor-pointer"
              onClick={() => onNavigate(action)}
            >
              <CardContent className={`p-3.5 bg-gradient-to-br ${gradient} rounded-xl`}>
                <Icon className="w-5 h-5 text-foreground/70 mb-2" />
                <p className="font-semibold text-[13px]">{label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
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
                <div key={c.id} className="flex flex-col items-center">
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
    </motion.div>
  );
}
