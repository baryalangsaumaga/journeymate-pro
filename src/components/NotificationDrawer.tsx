import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Bell, Check, CheckCheck, MapPin, DollarSign, Users,
  Navigation, Star, AlertTriangle, Clock, Trash2, Settings,
  MessageSquare, Route, Zap, Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface Notification {
  id: string;
  type: "trip" | "expense" | "social" | "system";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  icon: "map" | "dollar" | "users" | "star" | "alert" | "message" | "route" | "zap" | "gift";
  actionLabel?: string;
  actionId?: string;
  avatar?: string;
}

const iconMap = {
  map: MapPin,
  dollar: DollarSign,
  users: Users,
  star: Star,
  alert: AlertTriangle,
  message: MessageSquare,
  route: Route,
  zap: Zap,
  gift: Gift,
};

const iconColorMap = {
  map: "text-primary bg-primary/10",
  dollar: "text-accent bg-accent/10",
  users: "text-info bg-info/10",
  star: "text-warning bg-warning/10",
  alert: "text-destructive bg-destructive/10",
  message: "text-primary bg-primary/10",
  route: "text-success bg-success/10",
  zap: "text-chart-4 bg-chart-4/10",
  gift: "text-chart-5 bg-chart-5/10",
};

export const mockNotifications: Notification[] = [
  {
    id: "n1", type: "social", title: "Maya sent a message",
    message: "\"Found this amazing hidden cafe near Intramuros! 🏰☕\"",
    timestamp: "2026-03-09T08:30:00Z", read: false, icon: "message",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maya",
  },
  {
    id: "n2", type: "expense", title: "Expense added",
    message: "Luna added ₱4,200 for Dinner at Poblacion rooftop — split 3 ways",
    timestamp: "2026-03-09T07:45:00Z", read: false, icon: "dollar",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
  },
  {
    id: "n3", type: "trip", title: "Itinerary updated",
    message: "Stop \"Cafe de Letran\" was added to Manila Heritage Walk by Luna",
    timestamp: "2026-03-09T07:00:00Z", read: false, icon: "route",
  },
  {
    id: "n4", type: "system", title: "Weather alert ⛈️",
    message: "Rain expected in Tagaytay tomorrow 3-6 PM. Consider adjusting plans.",
    timestamp: "2026-03-09T06:30:00Z", read: true, icon: "alert",
  },
  {
    id: "n5", type: "social", title: "Kai is running late",
    message: "\"I'll be 10 mins late, traffic on EDSA 🚗💨\"",
    timestamp: "2026-03-09T06:00:00Z", read: true, icon: "message",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kai",
  },
  {
    id: "n6", type: "expense", title: "Settlement reminder",
    message: "Luna owes you ₱1,580. Send a gentle reminder?",
    timestamp: "2026-03-08T22:00:00Z", read: true, icon: "dollar",
    actionLabel: "Remind",
  },
  {
    id: "n7", type: "trip", title: "Trip milestone 🎉",
    message: "You've completed 50% of Manila Heritage Walk! Keep exploring!",
    timestamp: "2026-03-08T18:00:00Z", read: true, icon: "zap",
  },
  {
    id: "n8", type: "system", title: "Backup complete ✅",
    message: "Automatic backup saved 2.4 MB of travel data successfully.",
    timestamp: "2026-03-08T10:30:00Z", read: true, icon: "zap",
  },
  {
    id: "n9", type: "social", title: "New review posted",
    message: "Maya rated Tagaytay Ridge ⭐⭐⭐⭐⭐ — \"The view is breathtaking!\"",
    timestamp: "2026-03-08T08:00:00Z", read: true, icon: "star",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maya",
  },
  {
    id: "n10", type: "trip", title: "Zara joined your trip",
    message: "Zara Ahmed accepted your invite to Antipolo Sunset Chase",
    timestamp: "2026-03-07T14:00:00Z", read: true, icon: "users",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zara",
  },
];

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NotificationDrawer({ open, onClose }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [activeTab, setActiveTab] = useState("all");

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const filtered = notifications.filter(n => {
    if (activeTab === "all") return true;
    return n.type === activeTab;
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-foreground/30 backdrop-blur-md z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-[360px] glass-ultra z-[70] flex flex-col border-l border-border/30"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top,0px)+16px)] border-b border-border/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bell className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base">Notifications</h2>
                  {unreadCount > 0 && (
                    <p className="text-[10px] text-muted-foreground">{unreadCount} unread</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-8 text-[11px] rounded-xl font-semibold text-primary gap-1" onClick={markAllRead}>
                    <CheckCheck className="w-3.5 h-3.5" /> Read all
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-4 pt-3">
              <div className="flex gap-1.5 overflow-x-auto pb-2">
                {[
                  { id: "all", label: "All", count: notifications.length },
                  { id: "trip", label: "Trips", count: notifications.filter(n => n.type === "trip").length },
                  { id: "expense", label: "Expenses", count: notifications.filter(n => n.type === "expense").length },
                  { id: "social", label: "Social", count: notifications.filter(n => n.type === "social").length },
                  { id: "system", label: "System", count: notifications.filter(n => n.type === "system").length },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all tap-highlight ${
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground shadow-travel"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        activeTab === tab.id ? "bg-primary-foreground/20" : "bg-foreground/10"
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
              <AnimatePresence mode="popLayout">
                {filtered.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-16 text-center"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                      <Bell className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground">All caught up!</p>
                    <p className="text-[11px] text-muted-foreground mt-1">No notifications in this category</p>
                  </motion.div>
                ) : (
                  filtered.map((notification, i) => {
                    const Icon = iconMap[notification.icon];
                    const colorClass = iconColorMap[notification.icon];
                    return (
                      <motion.div
                        key={notification.id}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <div
                          className={`flex gap-3 p-3 rounded-xl transition-all cursor-pointer tap-highlight ${
                            notification.read ? "opacity-70" : "bg-primary/3"
                          }`}
                          onClick={() => markRead(notification.id)}
                        >
                          <div className="relative flex-shrink-0">
                            {notification.avatar ? (
                              <img src={notification.avatar} className="w-10 h-10 rounded-xl" />
                            ) : (
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
                                <Icon className="w-4.5 h-4.5" />
                              </div>
                            )}
                            {!notification.read && (
                              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-card" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-[12px] leading-tight ${notification.read ? "font-medium" : "font-bold"}`}>
                                {notification.title}
                              </p>
                              <span className="text-[9px] text-muted-foreground whitespace-nowrap flex-shrink-0 mt-0.5">
                                {timeAgo(notification.timestamp)}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                              {notification.message}
                            </p>
                            {notification.actionLabel && (
                              <Button
                                size="sm"
                                className="h-6 text-[10px] mt-2 rounded-lg font-semibold px-3 gap-1"
                                onClick={(e) => { e.stopPropagation(); }}
                              >
                                {notification.actionLabel}
                              </Button>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg flex-shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                          >
                            <Trash2 className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border/30">
              <Button variant="outline" className="w-full h-10 text-xs gap-2 rounded-xl font-semibold">
                <Settings className="w-3.5 h-3.5" /> Notification Settings
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
