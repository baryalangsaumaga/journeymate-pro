import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map, Compass, Users, MessageSquare, Star, FileText,
  Settings, Home, Navigation, Search, Bell, User,
  Menu, X, Wifi, WifiOff, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardPage from "@/components/pages/DashboardPage";
import ItineraryPage from "@/components/pages/ItineraryPage";
import NavigationPage from "@/components/pages/NavigationPage";
import SocialPage from "@/components/pages/SocialPage";
import ExplorePage from "@/components/pages/ExplorePage";
import ReviewsPage from "@/components/pages/ReviewsPage";
import ReportsPage from "@/components/pages/ReportsPage";
import SettingsPage from "@/components/pages/SettingsPage";

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "itinerary", label: "Trips", icon: Compass },
  { id: "navigate", label: "Navigate", icon: Navigation },
  { id: "social", label: "Social", icon: Users },
  { id: "explore", label: "Explore", icon: Search },
] as const;

const menuItems = [
  { id: "reviews", label: "Reviews & Heatmap", icon: Star },
  { id: "reports", label: "Reports & Backup", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

type TabId = typeof tabs[number]["id"] | "reviews" | "reports" | "settings";

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOffline] = useState(false);
  const [notifications] = useState(3);

  const renderPage = () => {
    switch (activeTab) {
      case "home": return <DashboardPage onNavigate={setActiveTab} />;
      case "itinerary": return <ItineraryPage />;
      case "navigate": return <NavigationPage />;
      case "social": return <SocialPage />;
      case "explore": return <ExplorePage />;
      case "reviews": return <ReviewsPage />;
      case "reports": return <ReportsPage />;
      case "settings": return <SettingsPage />;
      default: return <DashboardPage onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Status Bar */}
      <div className="safe-top flex items-center justify-between px-4 py-2 glass-strong border-b border-border/50 z-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Map className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="font-display font-bold text-base text-foreground tracking-tight">TrailSync</h1>
        </div>
        <div className="flex items-center gap-1">
          {isOffline ? (
            <Badge variant="outline" className="text-[10px] h-5 gap-1 border-warning text-warning">
              <WifiOff className="w-3 h-3" /> Offline
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] h-5 gap-1 border-success text-success">
              <Wifi className="w-3 h-3" /> Live
            </Badge>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 relative" onClick={() => {}}>
            <Bell className="w-4 h-4" />
            {notifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-bold">
                {notifications}
              </span>
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMenuOpen(true)}>
            <Menu className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="min-h-full"
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <div className="safe-bottom glass-strong border-t border-border/50 z-50">
        <nav className="flex items-center justify-around px-2 py-1.5">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute inset-0 bg-brand-muted rounded-xl"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className={`w-5 h-5 relative z-10 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-[10px] font-medium relative z-10 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Side Menu Overlay */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[60]"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="fixed right-0 top-0 bottom-0 w-72 glass-strong z-[70] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <span className="font-display font-semibold">Menu</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMenuOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {/* User Profile */}
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Alex Rivera</p>
                    <p className="text-xs text-muted-foreground">Explorer Level 12</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 py-2">
                {menuItems.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => { setActiveTab(id as TabId); setMenuOpen(false); }}
                    className={`flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors hover:bg-muted ${
                      activeTab === id ? "text-primary bg-brand-muted" : "text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
              <div className="p-4 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Download className="w-3 h-3" />
                  <span>Offline data: 24MB cached</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
