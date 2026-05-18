import { useState } from "react";
import { motion } from "framer-motion";
import { Database, MapPin, Bus, Plus, Trash2, Save, Settings2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { repo } from "@/lib/storage";

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };

type Transit = { id: string; name: string; icon: string; speed: number };
type Loc = { id: string; name: string; type: string; lat: number; lng: number; description: string };
type Info = { id: string; route: string; provider: string; fare: string; schedule: string };

export default function AdminPage() {
  const [transit, setTransit] = useState<Transit[]>(() => repo.cms.transitTypes.list());
  const [locations, setLocations] = useState<Loc[]>(() => repo.cms.locations.list());
  const [info, setInfo] = useState<Info[]>(() => repo.cms.transitInfo.list());

  const [dialog, setDialog] = useState<null | "transit" | "loc" | "info">(null);
  const [draft, setDraft] = useState<any>({});

  const open = (kind: "transit" | "loc" | "info", initial: any = {}) => { setDraft(initial); setDialog(kind); };

  const saveTransit = () => {
    if (!draft.name) return toast({ title: "Name required" });
    const exists = transit.find(t => t.id === draft.id);
    const next = exists
      ? transit.map(t => t.id === draft.id ? { ...draft } : t)
      : [...transit, { ...draft, id: draft.name.toLowerCase().replace(/\s+/g, "-") }];
    setTransit(next); repo.cms.transitTypes.save(next);
    toast({ title: "✅ Saved" }); setDialog(null);
  };
  const saveLoc = () => {
    if (!draft.name) return toast({ title: "Name required" });
    const exists = locations.find(l => l.id === draft.id);
    const next = exists
      ? locations.map(l => l.id === draft.id ? { ...draft, lat: +draft.lat, lng: +draft.lng } : l)
      : [...locations, { ...draft, id: `loc-${Date.now()}`, lat: +draft.lat || 0, lng: +draft.lng || 0 }];
    setLocations(next); repo.cms.locations.save(next);
    toast({ title: "✅ Location saved" }); setDialog(null);
  };
  const saveInfo = () => {
    if (!draft.route) return toast({ title: "Route required" });
    const exists = info.find(i => i.id === draft.id);
    const next = exists
      ? info.map(i => i.id === draft.id ? { ...draft } : i)
      : [...info, { ...draft, id: `info-${Date.now()}` }];
    setInfo(next); repo.cms.transitInfo.save(next);
    toast({ title: "✅ Transit info saved" }); setDialog(null);
  };

  const del = (kind: "transit" | "loc" | "info", id: string) => {
    if (kind === "transit") { const n = transit.filter(t => t.id !== id); setTransit(n); repo.cms.transitTypes.save(n); }
    if (kind === "loc") { const n = locations.filter(l => l.id !== id); setLocations(n); repo.cms.locations.save(n); }
    if (kind === "info") { const n = info.filter(i => i.id !== id); setInfo(n); repo.cms.transitInfo.save(n); }
    toast({ title: "🗑️ Deleted" });
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="px-4 py-4 pb-6 space-y-4">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl tracking-tight">Content Management</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Manage transit, locations, and info</p>
        </div>
        <Badge className="bg-accent/10 text-accent border-0 text-[10px] font-semibold">Admin</Badge>
      </motion.div>

      <Tabs defaultValue="transit">
        <TabsList className="w-full h-10 p-1 rounded-xl bg-muted">
          <TabsTrigger value="transit" className="flex-1 text-xs rounded-lg font-semibold">Transit</TabsTrigger>
          <TabsTrigger value="locations" className="flex-1 text-xs rounded-lg font-semibold">Locations</TabsTrigger>
          <TabsTrigger value="info" className="flex-1 text-xs rounded-lg font-semibold">Info</TabsTrigger>
        </TabsList>

        <TabsContent value="transit" className="mt-3 space-y-2">
          <Button className="w-full h-10 rounded-xl gap-2 font-semibold" onClick={() => open("transit", { name: "", icon: "🚗", speed: 60 })}>
            <Plus className="w-4 h-4" /> Add Transit Type
          </Button>
          {transit.map(t => (
            <Card key={t.id} className="border-0 card-interactive">
              <CardContent className="p-3.5 flex items-center gap-3">
                <span className="text-2xl">{t.icon}</span>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">Avg speed: {t.speed} km/h</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => open("transit", t)}><Settings2 className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive" onClick={() => del("transit", t.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="locations" className="mt-3 space-y-2">
          <Button className="w-full h-10 rounded-xl gap-2 font-semibold" onClick={() => open("loc", { name: "", type: "landmark", lat: 14.58, lng: 121, description: "" })}>
            <Plus className="w-4 h-4" /> Add Location
          </Button>
          {locations.length === 0 && (
            <Card className="border-0 card-elevated">
              <CardContent className="p-6 text-center text-[11px] text-muted-foreground">
                <MapPin className="w-6 h-6 mx-auto mb-2 opacity-40" />
                No custom locations yet. Add one above.
              </CardContent>
            </Card>
          )}
          {locations.map(l => (
            <Card key={l.id} className="border-0 card-interactive">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate">{l.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{l.type} · {l.lat.toFixed(3)}, {l.lng.toFixed(3)}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => open("loc", l)}><Settings2 className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive" onClick={() => del("loc", l.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="info" className="mt-3 space-y-2">
          <Button className="w-full h-10 rounded-xl gap-2 font-semibold" onClick={() => open("info", { route: "", provider: "", fare: "", schedule: "" })}>
            <Plus className="w-4 h-4" /> Add Transit Info
          </Button>
          {info.length === 0 && (
            <Card className="border-0 card-elevated">
              <CardContent className="p-6 text-center text-[11px] text-muted-foreground">
                <Bus className="w-6 h-6 mx-auto mb-2 opacity-40" />
                No transit information added yet.
              </CardContent>
            </Card>
          )}
          {info.map(i => (
            <Card key={i.id} className="border-0 card-interactive">
              <CardContent className="p-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center flex-shrink-0">
                    <Bus className="w-4 h-4 text-info" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold">{i.route}</p>
                    <p className="text-[10px] text-muted-foreground">{i.provider} · {i.fare} · {i.schedule}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => open("info", i)}><Settings2 className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive" onClick={() => del("info", i.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display capitalize">{dialog === "transit" ? "Transit Type" : dialog === "loc" ? "Location" : "Transit Info"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2.5 py-2">
            {dialog === "transit" && (<>
              <Input placeholder="Name" value={draft.name || ""} onChange={e => setDraft({ ...draft, name: e.target.value })} className="h-10 rounded-xl" />
              <Input placeholder="Icon (emoji)" value={draft.icon || ""} onChange={e => setDraft({ ...draft, icon: e.target.value })} className="h-10 rounded-xl" />
              <Input placeholder="Avg speed km/h" type="number" value={draft.speed || ""} onChange={e => setDraft({ ...draft, speed: +e.target.value })} className="h-10 rounded-xl" />
              <Button className="w-full h-10 rounded-xl shadow-travel gap-2 font-semibold" onClick={saveTransit}><Save className="w-4 h-4" /> Save</Button>
            </>)}
            {dialog === "loc" && (<>
              <Input placeholder="Place name" value={draft.name || ""} onChange={e => setDraft({ ...draft, name: e.target.value })} className="h-10 rounded-xl" />
              <Input placeholder="Type (landmark, hotel, etc)" value={draft.type || ""} onChange={e => setDraft({ ...draft, type: e.target.value })} className="h-10 rounded-xl" />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Latitude" type="number" value={draft.lat || ""} onChange={e => setDraft({ ...draft, lat: e.target.value })} className="h-10 rounded-xl" />
                <Input placeholder="Longitude" type="number" value={draft.lng || ""} onChange={e => setDraft({ ...draft, lng: e.target.value })} className="h-10 rounded-xl" />
              </div>
              <Input placeholder="Description" value={draft.description || ""} onChange={e => setDraft({ ...draft, description: e.target.value })} className="h-10 rounded-xl" />
              <Button className="w-full h-10 rounded-xl shadow-travel gap-2 font-semibold" onClick={saveLoc}><Save className="w-4 h-4" /> Save</Button>
            </>)}
            {dialog === "info" && (<>
              <Input placeholder="Route (e.g. Manila → Tagaytay)" value={draft.route || ""} onChange={e => setDraft({ ...draft, route: e.target.value })} className="h-10 rounded-xl" />
              <Input placeholder="Provider" value={draft.provider || ""} onChange={e => setDraft({ ...draft, provider: e.target.value })} className="h-10 rounded-xl" />
              <Input placeholder="Fare" value={draft.fare || ""} onChange={e => setDraft({ ...draft, fare: e.target.value })} className="h-10 rounded-xl" />
              <Input placeholder="Schedule" value={draft.schedule || ""} onChange={e => setDraft({ ...draft, schedule: e.target.value })} className="h-10 rounded-xl" />
              <Button className="w-full h-10 rounded-xl shadow-travel gap-2 font-semibold" onClick={saveInfo}><Save className="w-4 h-4" /> Save</Button>
            </>)}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
