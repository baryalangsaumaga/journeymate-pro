import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map, Compass, Users, Star, FileText, Settings, Home, Navigation,
  Search, Bell, User, Menu, X, Wifi, WifiOff, Download, DollarSign,
  Sparkles, Heart, Database
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
import AdminPage from "@/components/pages/AdminPage";
import NotificationDrawer from "@/components/NotificationDrawer";
import { useNotifications } from "@/hooks/useNotifications";
import PullToRefresh from "@/components/PullToRefresh";
import {
  DashboardSkeleton, ItinerarySkeleton, ExploreSkeleton,
  ExpensesSkeleton, SocialSkeleton, ReviewsSkeleton,
  MapSkeleton, SettingsSkeleton, ReportsSkeleton
} from "@/components/SkeletonLoaders";
import { useT } from "@/i18n/I18nProvider";
import { useAuth } from "@/auth/AuthProvider";
import { useTracking } from "@/hooks/useTracking";

type TabId = "home" | "itinerary" | "navigate" | "social" | "explore" | "reviews" | "reports" | "settings" | "expenses" | "admin";

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
  admin: SettingsSkeleton,
};

export default function AppShell() {
  useTracking();
  const { t } = useT();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [isOffline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const tabs = [
    { id: "home" as const, label: t("nav.home"), icon: Home },
    { id: "itinerary" as const, label: t("nav.trips"), icon: Compass },
    { id: "navigate" as const, label: t("nav.map"), icon: Navigation },
    { id: "social" as const, label: t("nav.social"), icon: Users },
    { id: "explore" as const, label: t("nav.explore"), icon: Search },
  ];

  const menuItems = [
    { id: "expenses", label: t("menu.expenses"), icon: DollarSign, badge: "New" },
    { id: "reviews", label: t("menu.reviews"), icon: Star },
    { id: "reports", label: t("menu.reports"), icon: FileText },
    { id: "admin", label: t("menu.admin"), icon: Database },
    { id: "settings", label: t("menu.settings"), icon: Settings },
  ];

  const { unreadCount } = useNotifications();

  const navigate = useCallback((tab: string) => {
    setIsLoading(true);
    setActiveTab(tab as TabId);
    setTimeout(() => setIsLoading(false), 600);
  }, []);

  // Cross-page navigation bus (used by Itinerary "Start Trip" and Explore "Get Directions").
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent<string>).detail;
      if (tab) navigate(tab);
    };
    window.addEventListener("app:navigate", handler as EventListener);
    return () => window.removeEventListener("app:navigate", handler as EventListener);
  }, [navigate]);

  const handleRefresh = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 1200));
  }, []);

  const renderPage = () => {
    if (isLoading) {
      const Skeleton = skeletonMap[activeTab] || DashboardSkeleton;
      return <Skeleton />;
    }
    if (user?.guest && (activeTab === "admin" || activeTab === "reports")) {
      return (
        <div className="px-4 py-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3">
            <User className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-display font-bold text-base">Sign in required</h3>
          <p className="text-[11px] text-muted-foreground mt-1 mb-4">Guest mode can't access this section.</p>
          <Button onClick={() => signOut()} className="rounded-xl">Create account</Button>
        </div>
      );
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
      case "admin": return <AdminPage />;
      default: return <DashboardPage onNavigate={navigate} />;
    }
  };

  // Map page doesn't use pull-to-refresh (it has its own gestures)
  const usePullToRefresh = activeTab !== "navigate" && activeTab !== "social";

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* Status Bar */}
      <header className="safe-top flex items-center justify-between px-4 py-2.5 glass-ultra border-b border-border/30 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-travel">
            <Map className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-[15px] text-foreground tracking-tight leading-none">Intellitravel</h1>
            <p className="text-[9px] text-muted-foreground leading-none mt-0.5">{t("app.tagline")}</p>
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
                className="flex-1 flex flex-col min-h-full"
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
              className="h-full flex flex-col"
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
              className="fixed inset-0 bg-foreground/30 backdrop-blur-md z-[500]"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="fixed right-0 top-0 bottom-0 w-[280px] glass-ultra z-[510] flex flex-col border-l border-border/30"
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
                    <p className="font-semibold text-sm">{user?.name || "Guest"}</p>
                    <p className="text-[10px] text-muted-foreground">{user?.guest ? "Guest mode" : `Explorer · ${user?.provider ?? "email"}`}</p>
                  </div>
                </div>
                {/* XP Progress */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-muted-foreground font-medium">Next: Level {(user?.stats?.level || 1) + 1}</span>
                    <span className="font-semibold text-primary">
                      {Intl.NumberFormat("en-US").format(user?.stats?.current_xp || 0)} / {Intl.NumberFormat("en-US").format(user?.stats?.next_level_xp || 1000)} XP
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.max(0, ((user?.stats?.current_xp || 0) / (user?.stats?.next_level_xp || 1000)) * 100))}%` }}
                      transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="mx-4 mb-4 grid grid-cols-3 gap-2">
                {[
                  { label: "Trips", value: user?.stats?.trips || 0, icon: Compass },
                  { label: "Reviews", value: user?.stats?.reviews || 0, icon: Star },
                  { label: "Saved", value: user?.stats?.saved || 0, icon: Heart },
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
                    className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium transition-all tap-highlight ${activeTab === id ? "text-primary bg-primary/8" : "text-foreground hover:bg-muted"
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
                  onClick={() => { setMenuOpen(false); signOut(); toast({ title: "👋 Signed out" }); }}
                  className="w-full p-3 rounded-2xl bg-destructive/5 border border-destructive/10 text-left tap-highlight hover:bg-destructive/10 transition-colors"
                >
                  <div className="flex items-center gap-2 text-[11px] text-destructive font-semibold">
                    <X className="w-3.5 h-3.5" />
                    <span>Sign out</span>
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
