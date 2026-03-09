import { useState } from "react";
import { motion } from "framer-motion";
import {
  Globe, Palette, UserCircle, Shield, Bell, Download,
  LogOut, ChevronRight, Moon, Sun, Sunset, Waves, Mountain,
  Smartphone, Eye, EyeOff, Check, Languages, UserPlus
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { languages } from "@/data/mockData";

const themes = [
  { id: "light", label: "Light", icon: Sun, colors: ["#f8f9fa", "#10b981", "#f59e0b"] },
  { id: "dark", label: "Dark", icon: Moon, colors: ["#0f172a", "#34d399", "#f59e0b"] },
  { id: "adventure", label: "Adventure", icon: Mountain, colors: ["#1a1a2e", "#e94560", "#0f3460"] },
  { id: "ocean", label: "Ocean", icon: Waves, colors: ["#0a192f", "#64ffda", "#8892b0"] },
  { id: "sunset", label: "Sunset", icon: Sunset, colors: ["#2d1b69", "#ff6b6b", "#ffd93d"] },
];

const socialProviders = [
  { id: "google", label: "Google", icon: "🔵", connected: true },
  { id: "apple", label: "Apple", icon: "🍎", connected: false },
  { id: "facebook", label: "Facebook", icon: "📘", connected: false },
  { id: "twitter", label: "X (Twitter)", icon: "🐦", connected: false },
];

export default function SettingsPage() {
  const [selectedTheme, setSelectedTheme] = useState("light");
  const [selectedLang, setSelectedLang] = useState("en");
  const [guestMode, setGuestMode] = useState(false);
  const [offlineMode, setOfflineMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);

  return (
    <div className="px-4 py-4 pb-6 space-y-4">
      <div>
        <h2 className="font-display font-bold text-xl">Settings</h2>
        <p className="text-xs text-muted-foreground">Customize your TrailSync experience</p>
      </div>

      {/* Profile */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <UserCircle className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-semibold text-base">Alex Rivera</h3>
              <p className="text-xs text-muted-foreground">alex.rivera@email.com</p>
              <Badge className="text-[9px] h-4 mt-1 bg-accent text-accent-foreground">Explorer Level 12</Badge>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs">Edit</Button>
          </div>
        </CardContent>
      </Card>

      {/* Guest Mode */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-info/10 flex items-center justify-center">
                <Eye className="w-4 h-4 text-info" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Guest Mode</h4>
                <p className="text-[10px] text-muted-foreground">Browse without an account (limited features)</p>
              </div>
            </div>
            <Switch checked={guestMode} onCheckedChange={setGuestMode} />
          </div>
          {guestMode && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 p-2 bg-info/5 rounded-lg">
              <p className="text-[10px] text-info">Guest mode active — Some features like reviews and real-time tracking are disabled.</p>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Themes */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-sm">Theme</h4>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {themes.map(theme => {
              const Icon = theme.icon;
              return (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                    selectedTheme === theme.id ? "bg-brand-muted ring-2 ring-primary" : "bg-muted"
                  }`}
                >
                  <div className="flex gap-0.5">
                    {theme.colors.map((c, i) => (
                      <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-medium">{theme.label}</span>
                  {selectedTheme === theme.id && <Check className="w-3 h-3 text-primary" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Languages className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-sm">Language</h4>
            <Badge variant="outline" className="text-[9px] h-4 ml-auto">{languages.length} available</Badge>
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
            {languages.map(lang => (
              <button
                key={lang.code}
                onClick={() => setSelectedLang(lang.code)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                  selectedLang === lang.code ? "bg-brand-muted text-primary ring-1 ring-primary/30" : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                <span className="text-sm">{lang.flag}</span>
                <span className="font-medium">{lang.name}</span>
                {selectedLang === lang.code && <Check className="w-3 h-3 ml-auto" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Social Registration */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-sm">Connected Accounts</h4>
          </div>
          <div className="space-y-2">
            {socialProviders.map(provider => (
              <div key={provider.id} className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{provider.icon}</span>
                  <span className="text-xs font-medium">{provider.label}</span>
                </div>
                {provider.connected ? (
                  <Badge className="text-[9px] h-5 bg-success text-success-foreground">Connected</Badge>
                ) : (
                  <Button variant="outline" size="sm" className="h-6 text-[10px]">Connect</Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Toggles */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4 space-y-4">
          {[
            { icon: Download, label: "Offline Mode", desc: "Cache maps & itineraries for offline use", state: offlineMode, setter: setOfflineMode },
            { icon: Bell, label: "Push Notifications", desc: "Trip updates, reminders & social alerts", state: notifications, setter: setNotifications },
            { icon: Shield, label: "Location Sharing", desc: "Share live location with trip members", state: locationSharing, setter: setLocationSharing },
          ].map(({ icon: Icon, label, desc, state, setter }) => (
            <div key={label} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-[10px] text-muted-foreground">{desc}</p>
                </div>
              </div>
              <Switch checked={state} onCheckedChange={setter} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Logout */}
      <Button variant="outline" className="w-full h-10 text-destructive border-destructive/20 gap-2">
        <LogOut className="w-4 h-4" /> Sign Out
      </Button>

      <p className="text-center text-[10px] text-muted-foreground">TrailSync v2.0.0 · Made with ❤️</p>
    </div>
  );
}
