import { motion } from "framer-motion";
import {
  MapPin, Cloud, Sun, Thermometer, Navigation, Users, CalendarDays,
  ArrowRight, Clock, Zap, TrendingUp, Globe, Shield, Wifi
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { mockTrips, currentUser, collaborators } from "@/data/mockData";

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

interface Props {
  onNavigate: (tab: string) => void;
}

export default function DashboardPage({ onNavigate }: Props) {
  const activeTrip = mockTrips[0];
  const completedStops = activeTrip.stops.filter(s => s.isCompleted).length;
  const progress = (completedStops / activeTrip.stops.length) * 100;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="px-4 py-4 pb-6 space-y-4">
      {/* Hero - Active Trip */}
      <motion.div variants={item}>
        <Card className="overflow-hidden border-0 shadow-card relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between mb-3">
              <div>
                <Badge className="bg-success text-success-foreground text-[10px] h-5 mb-2">
                  <Zap className="w-3 h-3 mr-0.5" /> Active Trip
                </Badge>
                <h2 className="font-display font-bold text-lg leading-tight">{activeTrip.title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{activeTrip.description}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-accent">
                  <Sun className="w-4 h-4" />
                  <span className="font-display font-bold text-lg">32°</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Manila, PH</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Trip Progress</span>
                <span className="font-medium">{completedStops}/{activeTrip.stops.length} stops</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="flex items-center gap-2 mt-3">
              <div className="flex -space-x-2">
                {activeTrip.collaborators.slice(0, 3).map((u, i) => (
                  <img key={i} src={u.avatar} alt={u.name} className="w-6 h-6 rounded-full border-2 border-card" />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{activeTrip.collaborators.length} travelers</span>
              <div className="flex-1" />
              <Button size="sm" className="h-7 text-xs gap-1 rounded-full shadow-travel" onClick={() => onNavigate("itinerary")}>
                Continue <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={item} className="grid grid-cols-4 gap-2">
        {[
          { icon: MapPin, label: "Places", value: "12", color: "text-primary" },
          { icon: Navigation, label: "Distance", value: "64km", color: "text-info" },
          { icon: Clock, label: "Travel", value: "4h", color: "text-accent" },
          { icon: TrendingUp, label: "Level", value: "12", color: "text-success" },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="border-0 shadow-card">
            <CardContent className="p-3 text-center">
              <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
              <p className="font-display font-bold text-sm">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Weather Strip */}
      <motion.div variants={item}>
        <Card className="border-0 shadow-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Cloud className="w-4 h-4 text-info" />
              <span className="text-xs font-medium">Weather Along Route</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {[
                { time: "Now", temp: "32°", icon: "☀️" },
                { time: "12PM", temp: "34°", icon: "🌤️" },
                { time: "3PM", temp: "31°", icon: "⛅" },
                { time: "6PM", temp: "28°", icon: "🌅" },
                { time: "9PM", temp: "26°", icon: "🌙" },
              ].map(w => (
                <div key={w.time} className="flex flex-col items-center min-w-[48px]">
                  <span className="text-[10px] text-muted-foreground">{w.time}</span>
                  <span className="text-lg my-0.5">{w.icon}</span>
                  <span className="text-xs font-medium">{w.temp}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={item}>
        <h3 className="font-display font-semibold text-sm mb-2">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Navigation, label: "Start Navigation", desc: "Real-time routing", action: "navigate", gradient: "from-primary/10 to-info/10" },
            { icon: Users, label: "Group Chat", desc: "4 online now", action: "social", gradient: "from-accent/10 to-warning/10" },
            { icon: Globe, label: "Explore Nearby", desc: "12 places found", action: "explore", gradient: "from-success/10 to-primary/10" },
            { icon: CalendarDays, label: "Plan Next Trip", desc: "3 drafts saved", action: "itinerary", gradient: "from-info/10 to-accent/10" },
          ].map(({ icon: Icon, label, desc, action, gradient }) => (
            <Card
              key={label}
              className="border-0 shadow-card cursor-pointer hover:shadow-card-hover transition-shadow"
              onClick={() => onNavigate(action)}
            >
              <CardContent className={`p-3 bg-gradient-to-br ${gradient} rounded-lg`}>
                <Icon className="w-5 h-5 text-primary mb-2" />
                <p className="font-medium text-sm">{label}</p>
                <p className="text-[10px] text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Upcoming Trips */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display font-semibold text-sm">Upcoming Trips</h3>
          <Button variant="ghost" size="sm" className="h-6 text-xs text-primary" onClick={() => onNavigate("itinerary")}>
            View All
          </Button>
        </div>
        <div className="space-y-2">
          {mockTrips.slice(1).map(trip => (
            <Card key={trip.id} className="border-0 shadow-card cursor-pointer hover:shadow-card-hover transition-shadow">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{trip.title}</p>
                  <p className="text-[10px] text-muted-foreground">{trip.startDate} · {trip.stops.length} stops</p>
                </div>
                <Badge variant="outline" className="text-[10px] h-5 flex-shrink-0">
                  {trip.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Live Collaborators */}
      <motion.div variants={item}>
        <Card className="border-0 shadow-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <Wifi className="w-4 h-4 text-success" />
              <span className="text-xs font-medium">Friends Online</span>
              <Badge variant="outline" className="text-[10px] h-4 ml-auto">{collaborators.filter(c => c.isOnline).length} online</Badge>
            </div>
            <div className="flex gap-3">
              {collaborators.filter(c => c.isOnline).map(c => (
                <div key={c.id} className="flex flex-col items-center">
                  <div className="relative">
                    <img src={c.avatar} alt={c.name} className="w-10 h-10 rounded-full border-2 border-card" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-card" />
                  </div>
                  <span className="text-[10px] mt-1 text-muted-foreground">{c.name.split(" ")[0]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* System Status */}
      <motion.div variants={item}>
        <Card className="border-0 shadow-card bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-3 flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-xs font-medium">All systems operational</p>
              <p className="text-[10px] text-muted-foreground">Last backup: 2 hours ago · Offline data synced</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
