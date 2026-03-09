import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Clock, Cloud, Sun, CloudRain, CloudSnow, CloudFog,
  Wind, ChevronRight, Plus, Download, Share2, CheckCircle2, Circle,
  Car, Bus, Train, Plane, Ship, Bike, Footprints, Edit3, Trash2,
  CalendarDays, Users, MoreVertical, WifiOff, Wifi
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { mockTrips } from "@/data/mockData";
import type { TransitType, WeatherCondition, Trip } from "@/types/travel";

const transitIcons: Record<TransitType, typeof Car> = { car: Car, bus: Bus, train: Train, plane: Plane, ferry: Ship, bike: Bike, walk: Footprints };
const weatherIcons: Record<WeatherCondition, string> = { sunny: "☀️", cloudy: "⛅", rainy: "🌧️", stormy: "⛈️", snowy: "❄️", foggy: "🌫️", windy: "💨" };

export default function ItineraryPage() {
  const [selectedTrip, setSelectedTrip] = useState<Trip>(mockTrips[0]);
  const [view, setView] = useState<"list" | "detail">("list");

  const completedStops = selectedTrip.stops.filter(s => s.isCompleted).length;
  const progress = (completedStops / selectedTrip.stops.length) * 100;

  return (
    <div className="px-4 py-4 pb-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl">My Trips</h2>
          <p className="text-xs text-muted-foreground">{mockTrips.length} trips planned</p>
        </div>
        <Button size="sm" className="h-8 gap-1 rounded-full shadow-travel">
          <Plus className="w-3.5 h-3.5" /> New Trip
        </Button>
      </div>

      {view === "list" ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {mockTrips.map(trip => {
            const done = trip.stops.filter(s => s.isCompleted).length;
            const pct = (done / trip.stops.length) * 100;
            return (
              <Card
                key={trip.id}
                className="border-0 shadow-card overflow-hidden cursor-pointer hover:shadow-card-hover transition-all"
                onClick={() => { setSelectedTrip(trip); setView("detail"); }}
              >
                <div className="h-28 relative overflow-hidden">
                  <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3">
                    <h3 className="font-display font-bold text-sm text-card">{trip.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-card/80">{trip.startDate}</span>
                      <Badge className={`text-[9px] h-4 ${trip.status === "active" ? "bg-success" : "bg-secondary text-secondary-foreground"}`}>
                        {trip.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    {trip.isOfflineAvailable && (
                      <Badge variant="outline" className="text-[9px] h-4 bg-card/80 border-0">
                        <Download className="w-2.5 h-2.5 mr-0.5" /> Offline
                      </Badge>
                    )}
                  </div>
                </div>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {trip.collaborators.slice(0, 3).map((u, i) => (
                          <img key={i} src={u.avatar} className="w-5 h-5 rounded-full border border-card" />
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{trip.collaborators.length} travelers</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{trip.stops.length} stops</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground mt-1">{done}/{trip.stops.length} completed</p>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          {/* Trip Detail Header */}
          <Card className="border-0 shadow-card overflow-hidden">
            <div className="h-36 relative">
              <img src={selectedTrip.coverImage} alt={selectedTrip.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent" />
              <Button
                variant="ghost" size="sm"
                className="absolute top-2 left-2 text-card bg-foreground/20 h-7 text-xs"
                onClick={() => setView("list")}
              >
                ← Back
              </Button>
              <div className="absolute bottom-3 left-3 right-3">
                <h2 className="font-display font-bold text-lg text-card">{selectedTrip.title}</h2>
                <p className="text-xs text-card/80 mt-0.5">{selectedTrip.description}</p>
              </div>
            </div>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs">
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                    {selectedTrip.startDate}
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    {selectedTrip.stops.length} stops
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7"><Share2 className="w-3.5 h-3.5" /></Button>
                  <Button variant="outline" size="icon" className="h-7 w-7"><Download className="w-3.5 h-3.5" /></Button>
                  <Button variant="outline" size="icon" className="h-7 w-7"><MoreVertical className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Progress value={progress} className="h-2 flex-1" />
                <span className="text-xs font-medium">{Math.round(progress)}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Itinerary Timeline */}
          <div>
            <h3 className="font-display font-semibold text-sm mb-3">Itinerary</h3>
            <div className="space-y-0">
              {selectedTrip.stops.map((stop, idx) => {
                const TransitIcon = transitIcons[stop.transitType];
                return (
                  <div key={stop.id} className="flex gap-3">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        stop.isCompleted ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {stop.isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                      </div>
                      {idx < selectedTrip.stops.length - 1 && (
                        <div className={`w-0.5 h-16 ${stop.isCompleted ? "bg-success" : "bg-border"}`} />
                      )}
                    </div>

                    {/* Stop Card */}
                    <Card className="flex-1 border-0 shadow-card mb-3">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{stop.location.name}</h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{stop.notes}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {stop.weather && <span className="text-sm">{weatherIcons[stop.weather]}</span>}
                            {stop.temperature && <span className="text-xs font-medium">{stop.temperature}°</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="outline" className="text-[10px] h-5 gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {stop.arrivalTime} - {stop.departureTime}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] h-5 gap-1">
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
          </div>

          {/* Collaborators */}
          <Card className="border-0 shadow-card">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Travelers
                </span>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-primary">
                  <Plus className="w-3 h-3 mr-0.5" /> Invite
                </Button>
              </div>
              <div className="space-y-2">
                {selectedTrip.collaborators.map(u => (
                  <div key={u.id} className="flex items-center gap-2">
                    <div className="relative">
                      <img src={u.avatar} className="w-8 h-8 rounded-full" />
                      {u.isOnline && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-card" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium">{u.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{u.role}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] h-4">
                      {u.isOnline ? "Online" : "Offline"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
