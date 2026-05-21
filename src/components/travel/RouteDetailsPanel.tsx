// Expandable Route Details: speed limit, restrictions, fuel stops, viewpoints.
// Driven by route distance + the mockLocations dataset.
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gauge, Fuel, Eye, AlertTriangle, ChevronDown, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockLocations } from "@/data/mockData";
import { formatDistance } from "@/lib/routing";

interface Props {
  routeCoords?: [number, number][];
  mode: "car" | "transit" | "walk" | "bike";
}

const SPEED_LIMIT_BY_MODE: Record<string, { kmh: number; zone: string }> = {
  car: { kmh: 80, zone: "Expressway" },
  transit: { kmh: 60, zone: "Urban" },
  walk: { kmh: 6, zone: "Pedestrian" },
  bike: { kmh: 25, zone: "Mixed" },
};

const RESTRICTIONS_BY_MODE: Record<string, string[]> = {
  car: ["No trucks 6am-10am", "Toll required SLEX"],
  transit: ["Limited late-night service"],
  walk: ["Sidewalk closure on Roxas Blvd"],
  bike: ["No bikes on expressway"],
};

export function RouteDetailsPanel({ routeCoords, mode }: Props) {
  const [open, setOpen] = useState(false);

  const { fuelStops, viewpoints } = useMemo(() => {
    if (!routeCoords?.length) return { fuelStops: [], viewpoints: [] };
    const near = (lat: number, lng: number) =>
      routeCoords.some(([rlat, rlng]) => Math.hypot(rlat - lat, rlng - lng) < 0.15);
    return {
      fuelStops: mockLocations.filter(l => l.type === "gas-station" && near(l.lat, l.lng)),
      viewpoints: mockLocations.filter(l => l.type === "viewpoint" && near(l.lat, l.lng)),
    };
  }, [routeCoords]);

  const limit = SPEED_LIMIT_BY_MODE[mode];
  const restrictions = RESTRICTIONS_BY_MODE[mode] ?? [];

  return (
    <Card className="border-0 card-elevated">
      <CardContent className="p-0">
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between p-3 tap-highlight"
        >
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold">Route Details</span>
            <Badge variant="outline" className="text-[9px] h-5 font-semibold border-primary/20 text-primary">
              {fuelStops.length} gas · {viewpoints.length} views
            </Badge>
          </div>
          <motion.div animate={{ rotate: open ? 180 : 0 }}>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-3 pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted">
                    <div className="w-9 h-9 rounded-full border-2 border-destructive flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold">{limit.kmh}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold flex items-center gap-1"><Gauge className="w-3 h-3" /> Limit</p>
                      <p className="text-[9px] text-muted-foreground truncate">{limit.zone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted">
                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold">Restrictions</p>
                      <p className="text-[9px] text-muted-foreground truncate">{restrictions.length} active</p>
                    </div>
                  </div>
                </div>

                {restrictions.length > 0 && (
                  <ul className="space-y-1">
                    {restrictions.map((r, i) => (
                      <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                        <span className="text-warning mt-0.5">•</span> {r}
                      </li>
                    ))}
                  </ul>
                )}

                {fuelStops.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Fuel className="w-3 h-3" /> Gas Stops Along Route
                    </p>
                    <div className="space-y-1">
                      {fuelStops.map(f => (
                        <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <span className="text-[11px] font-semibold truncate">{f.name}</span>
                          <span className="text-[9px] text-muted-foreground">★ {f.rating}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {viewpoints.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Scenic Viewpoints
                    </p>
                    <div className="space-y-1">
                      {viewpoints.map(v => (
                        <div key={v.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <span className="text-[11px] font-semibold truncate">{v.name}</span>
                          <span className="text-[9px] text-muted-foreground">★ {v.rating}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {routeCoords && (
                  <p className="text-[9px] text-muted-foreground text-center pt-1">
                    Total path: {formatDistance(routeCoords.length * 50)} of geometry sampled
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
