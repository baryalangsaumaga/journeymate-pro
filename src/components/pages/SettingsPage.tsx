import { useState } from "react";
import { motion } from "framer-motion";
import {
  Globe, Palette, UserCircle, Shield, Bell, Download,
  LogOut, Moon, Sun, Sunset, Waves, Mountain,
  Eye, Check, Languages, UserPlus
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { languages } from "@/data/mockData";

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };

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
    <motion.div variants={container} initial="hidden" animate="show" className="px-4 py-4 pb-6 space-y-4">
      <motion.div variants={item}>
        <h2 className="font-display font-bold text-xl tracking-tight">Settings</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Customize your TrailSync experience</p>
      </motion.div>

      {/* Profile */}
      <motion.div variants={item}>
        <Card className="border-0 card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-travel">
                <UserCircle className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-bold text-base">Alex Rivera</h3>
                <p className="text-[11px] text-muted-foreground">alex.rivera@email.com</p>
                <Badge className="text-[9px] h-[18px] mt-1 bg-accent/10 text-accent font-semibold border-0">Explorer Level 12</Badge>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl font-semibold">Edit</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Guest Mode */}
      <motion.div variants={item}>
        <Card className="border-0 card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-info/8 flex items-center justify-center">
                  <Eye className="w-4.5 h-4.5 text-info" />
                </div>
                <div>
                  <h4 className="font-semibold text-[13px]">Guest Mode</h4>
                  <p className="text-[10px] text-muted-foreground">Browse without account (limited)</p>
                </div>
              </div>
              <Switch checked={guestMode} onCheckedChange={setGuestMode} />
            </div>
            {guestMode && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 p-2.5 bg-info/5 rounded-xl">
                <p className="text-[10px] text-info font-medium">Guest mode active — Some features like reviews and tracking are disabled.</p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Themes */}
      <motion.div variants={item}>
        <Card className="border-0 card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-[13px]">Theme</h4>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {themes.map(theme => {
                const Icon = theme.icon;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all tap-highlight ${
                      selectedTheme === theme.id ? "bg-primary/8 ring-2 ring-primary" : "bg-muted"
                    }`}
                  >
                    <div className="flex gap-0.5">
                      {theme.colors.map((c, i) => (
                        <div key={i} className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-semibold">{theme.label}</span>
                    {selectedTheme === theme.id && <Check className="w-3 h-3 text-primary" />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Language */}
      <motion.div variants={item}>
        <Card className="border-0 card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Languages className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-[13px]">Language</h4>
              <Badge variant="outline" className="text-[9px] h-[18px] ml-auto font-semibold">{languages.length}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLang(lang.code)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-all tap-highlight ${
                    selectedLang === lang.code ? "bg-primary/8 text-primary ring-1 ring-primary/20 font-semibold" : "bg-muted text-foreground hover:bg-muted/80 font-medium"
                  }`}
                >
                  <span className="text-sm">{lang.flag}</span>
                  <span>{lang.name}</span>
                  {selectedLang === lang.code && <Check className="w-3 h-3 ml-auto" />}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Social */}
      <motion.div variants={item}>
        <Card className="border-0 card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-[13px]">Connected Accounts</h4>
            </div>
            <div className="space-y-1.5">
              {socialProviders.map(provider => (
                <div key={provider.id} className="flex items-center justify-between p-3 bg-muted rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{provider.icon}</span>
                    <span className="text-xs font-semibold">{provider.label}</span>
                  </div>
                  {provider.connected ? (
                    <Badge className="text-[9px] h-5 bg-success/10 text-success font-semibold border-0">Connected</Badge>
                  ) : (
                    <Button variant="outline" size="sm" className="h-7 text-[10px] rounded-lg font-semibold">Connect</Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Toggles */}
      <motion.div variants={item}>
        <Card className="border-0 card-elevated">
          <CardContent className="p-4 space-y-4">
            {[
              { icon: Download, label: "Offline Mode", desc: "Cache maps & itineraries", state: offlineMode, setter: setOfflineMode },
              { icon: Bell, label: "Push Notifications", desc: "Trip updates & social alerts", state: notifications, setter: setNotifications },
              { icon: Shield, label: "Location Sharing", desc: "Share with trip members", state: locationSharing, setter: setLocationSharing },
            ].map(({ icon: Icon, label, desc, state, setter }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </div>
                </div>
                <Switch checked={state} onCheckedChange={setter} />
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Logout */}
      <motion.div variants={item}>
        <Button variant="outline" className="w-full h-11 text-destructive border-destructive/15 gap-2 rounded-xl font-semibold">
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </motion.div>

      <p className="text-center text-[10px] text-muted-foreground font-medium">TrailSync v2.0.0 · Made with ❤️</p>
    </motion.div>
  );
}
