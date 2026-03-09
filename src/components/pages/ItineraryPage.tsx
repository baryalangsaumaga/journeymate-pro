import { useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Clock, CheckCircle2, Circle, Plus, Download, Share2,
  Car, Bus, Train, Plane, Ship, Bike, Footprints, CalendarDays,
  Users, MoreVertical, ChevronLeft
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { mockTrips } from "@/data/mockData";
import type { TransitType, WeatherCondition, Trip } from "@/types/travel";

const transitIcons: Record<TransitType, typeof Car> = { car: Car, bus: Bus, train: Train, plane: Plane, ferry: Ship, bike: Bike, walk: Footprints };
const weatherIcons: Record<WeatherCondition, string> = { sunny: "☀️", cloudy: "⛅", rainy: "🌧️", stormy: "⛈️", snowy: "❄️", foggy: "🌫️", windy: "💨" };

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };

export default function ItineraryPage() {
  const [selectedTrip, setSelectedTrip] = useState<Trip>(mockTrips[0]);
  const [view, setView] = useState<"list" | "detail">("list");

  const completedStops = selectedTrip.stops.filter(s => s.isCompleted).length;
  const progress = (completedStops / selectedTrip.stops.length) * 100;

  return (
    <div className="px-4 py-4 pb-6 space-y-4">
      {view === "list" ? (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
          <motion.div variants={item} className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-xl tracking-tight">My Trips</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">{mockTrips.length} trips planned</p>
            </div>
            <Button size="sm" className="h-8 gap-1.5 rounded-xl shadow-travel text-xs font-semibold">
              <Plus className="w-3.5 h-3.5" /> New Trip
            </Button>
          </motion.div>

          {mockTrips.map(trip => {
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
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">{done}/{trip.stops.length} completed</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
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
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl"><Share2 className="w-3.5 h-3.5" /></Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl"><Download className="w-3.5 h-3.5" /></Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl"><MoreVertical className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2.5">
                  <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-primary">{Math.round(progress)}%</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Timeline */}
          <motion.div variants={item}>
            <h3 className="section-header mb-3">Itinerary</h3>
            <div className="space-y-0">
              {selectedTrip.stops.map((stop, idx) => {
                const TransitIcon = transitIcons[stop.transitType];
                return (
                  <div key={stop.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        stop.isCompleted ? "bg-success text-success-foreground shadow-sm" : "bg-muted text-muted-foreground"
                      }`}>
                        {stop.isCompleted ? <CheckCircle2 className="w-4.5 h-4.5" /> : <Circle className="w-4.5 h-4.5" />}
                      </div>
                      {idx < selectedTrip.stops.length - 1 && (
                        <div className={`w-0.5 h-16 my-0.5 rounded-full ${stop.isCompleted ? "bg-success" : "bg-border"}`} />
                      )}
                    </div>
                    <Card className="flex-1 border-0 card-interactive mb-3">
                      <CardContent className="p-3.5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-[13px]">{stop.location.name}</h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{stop.notes}</p>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            {stop.weather && <span className="text-sm">{weatherIcons[stop.weather]}</span>}
                            {stop.temperature && <span className="text-xs font-semibold">{stop.temperature}°</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2.5">
                          <Badge variant="outline" className="text-[9px] h-5 gap-1 font-medium">
                            <Clock className="w-2.5 h-2.5" />
                            {stop.arrivalTime} - {stop.departureTime}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] h-5 gap-1 font-medium capitalize">
                            <TransitIcon className="w-2.5 h-2.5" />
                            {stop.transitType}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Collaborators */}
          <motion.div variants={item}>
            <Card className="border-0 card-elevated">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Travelers
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 text-[11px] text-primary font-semibold rounded-lg">
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
        </motion.div>
      )}
    </div>
  );
}
