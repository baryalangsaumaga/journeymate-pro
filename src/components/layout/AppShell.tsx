import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map, Compass, Users, Star, FileText, Settings, Home, Navigation,
  Search, Bell, User, Menu, X, Wifi, WifiOff, Download, DollarSign,
  Sparkles, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import DashboardPage from "@/components/pages/DashboardPage";
import ItineraryPage from "@/components/pages/ItineraryPage";
import NavigationPage from "@/components/pages/NavigationPage";
import SocialPage from "@/components/pages/SocialPage";
import ExplorePage from "@/components/pages/ExplorePage";
import ReviewsPage from "@/components/pages/ReviewsPage";
import ReportsPage from "@/components/pages/ReportsPage";
import SettingsPage from "@/components/pages/SettingsPage";
import ExpensesPage from "@/components/pages/ExpensesPage";
import NotificationDrawer, { mockNotifications } from "@/components/NotificationDrawer";
import PullToRefresh from "@/components/PullToRefresh";
import {
  DashboardSkeleton, ItinerarySkeleton, ExploreSkeleton,
  ExpensesSkeleton, SocialSkeleton, ReviewsSkeleton,
  MapSkeleton, SettingsSkeleton, ReportsSkeleton
} from "@/components/SkeletonLoaders";

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "itinerary", label: "Trips", icon: Compass },
  { id: "navigate", label: "Map", icon: Navigation },
  { id: "social", label: "Social", icon: Users },
  { id: "explore", label: "Explore", icon: Search },
] as const;

const menuItems = [
  { id: "expenses", label: "Expenses", icon: DollarSign, badge: "New" },
  { id: "reviews", label: "Reviews & Heatmap", icon: Star },
  { id: "reports", label: "Reports & Backup", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

type TabId = typeof tabs[number]["id"] | "reviews" | "reports" | "settings" | "expenses";

const skeletonMap: Record<string, React.FC> = {
  home: DashboardSkeleton,
  itinerary: ItinerarySkeleton,
  navigate: MapSkeleton,
  social: SocialSkeleton,
  explore: ExploreSkeleton,
  expenses: ExpensesSkeleton,
  reviews: ReviewsSkeleton,
  reports: ReportsSkeleton,
  settings: SettingsSkeleton,
};

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [isOffline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const unreadCount = mockNotifications.filter(n => !n.read).length;

  const navigate = useCallback((tab: string) => {
    setIsLoading(true);
    setActiveTab(tab as TabId);
    // Simulate loading for native feel
    setTimeout(() => setIsLoading(false), 600);
  }, []);

  const handleRefresh = useCallback(async () => {
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1200));
  }, []);

  const renderPage = () => {
    if (isLoading) {
      const Skeleton = skeletonMap[activeTab] || DashboardSkeleton;
      return <Skeleton />;
    }
    switch (activeTab) {
      case "home": return <DashboardPage onNavigate={navigate} />;
      case "itinerary": return <ItineraryPage />;
      case "navigate": return <NavigationPage />;
      case "social": return <SocialPage />;
      case "explore": return <ExplorePage />;
      case "expenses": return <ExpensesPage />;
      case "reviews": return <ReviewsPage />;
      case "reports": return <ReportsPage />;
      case "settings": return <SettingsPage />;
      default: return <DashboardPage onNavigate={navigate} />;
    }
  };

  // Map page doesn't use pull-to-refresh (it has its own gestures)
  const usePullToRefresh = activeTab !== "navigate";

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* Status Bar */}
      <header className="safe-top flex items-center justify-between px-4 py-2.5 glass-ultra border-b border-border/30 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-travel">
            <Map className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-[15px] text-foreground tracking-tight leading-none">TrailSync</h1>
            <p className="text-[9px] text-muted-foreground leading-none mt-0.5">Travel Companion</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <Badge 
            variant="outline" 
            className={`text-[9px] h-[22px] gap-1 border-0 ${isOffline ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}
          >
            {isOffline ? <WifiOff className="w-2.5 h-2.5" /> : <Wifi className="w-2.5 h-2.5" />}
            {isOffline ? "Offline" : "Live"}
          </Badge>
          <Button variant="ghost" size="icon" className="h-9 w-9 relative rounded-xl" onClick={() => setNotifOpen(true)}>
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-bold ring-2 ring-card"
              >
                {unreadCount}
              </motion.span>
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setMenuOpen(true)}>
            <Menu className="w-[18px] h-[18px]" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {usePullToRefresh ? (
          <PullToRefresh onRefresh={handleRefresh} className="h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab + (isLoading ? "-loading" : "")}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                className="min-h-full"
              >
                {renderPage()}
              </motion.div>
            </AnimatePresence>
          </PullToRefresh>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (isLoading ? "-loading" : "")}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="h-full"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="safe-bottom glass-ultra border-t border-border/30 z-50">
        <div className="flex items-center justify-around px-1 pt-1.5 pb-1">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => navigate(id)}
                className="flex flex-col items-center gap-0.5 py-1 px-3.5 rounded-2xl transition-all relative tap-highlight min-w-[56px]"
              >
                {isActive && (
                  <motion.div
                    layoutId="tab-bg"
                    className="absolute inset-0 bg-primary/10 rounded-2xl"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon className={`w-[22px] h-[22px] relative z-10 transition-colors duration-150 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-[10px] font-semibold relative z-10 transition-colors duration-150 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Side Menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-foreground/30 backdrop-blur-md z-[60]"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="fixed right-0 top-0 bottom-0 w-[280px] glass-ultra z-[70] flex flex-col border-l border-border/30"
            >
              <div className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top,0px)+16px)]">
                <span className="font-display font-bold text-base">Menu</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setMenuOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {/* Profile Card */}
              <div className="mx-4 mb-4 p-3.5 rounded-2xl bg-gradient-to-br from-primary/8 to-accent/5 border border-primary/10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-travel">
                    <User className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Alex Rivera</p>
                    <p className="text-[10px] text-muted-foreground">Explorer Level 12 ✨</p>
                  </div>
                </div>
                {/* XP Progress */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-muted-foreground font-medium">Next: Level 13</span>
                    <span className="font-semibold text-primary">2,450 / 3,000 XP</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: "82%" }}
                      transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="mx-4 mb-4 grid grid-cols-3 gap-2">
                {[
                  { label: "Trips", value: "7", icon: Compass },
                  { label: "Reviews", value: "4", icon: Star },
                  { label: "Saved", value: "12", icon: Heart },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="text-center p-2.5 rounded-xl bg-muted">
                    <Icon className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                    <p className="font-display font-bold text-sm leading-none">{value}</p>
                    <p className="text-[8px] text-muted-foreground font-medium mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex-1 px-2 space-y-0.5">
                {menuItems.map(({ id, label, icon: Icon, badge }) => (
                  <button
                    key={id}
                    onClick={() => { navigate(id); setMenuOpen(false); }}
                    className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium transition-all tap-highlight ${
                      activeTab === id ? "text-primary bg-primary/8" : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    <span className="flex-1 text-left">{label}</span>
                    {badge && (
                      <Badge className="text-[9px] h-[18px] bg-primary text-primary-foreground">{badge}</Badge>
                    )}
                  </button>
                ))}
              </div>
              <div className="p-4 space-y-2">
                <button
                  onClick={() => toast({ title: "📦 Offline Data", description: "24MB cached. Tap Settings → Storage to manage." })}
                  className="w-full p-3 rounded-2xl bg-muted/50 text-left tap-highlight hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Download className="w-3.5 h-3.5" />
                    <span>Offline data: 24MB cached</span>
                  </div>
                </button>
                <button
                  onClick={() => { setMenuOpen(false); toast({ title: "✨ TrailSync Pro", description: "Unlock unlimited trips, offline maps, and AI planning." }); }}
                  className="w-full p-3 rounded-2xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10 text-left tap-highlight hover:from-primary/10 hover:to-accent/10 transition-colors"
                >
                  <div className="flex items-center gap-2 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="font-medium">TrailSync Pro — Upgrade</span>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Notification Drawer */}
      <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}
