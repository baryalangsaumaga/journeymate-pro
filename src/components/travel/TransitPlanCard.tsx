// Renders a multi-leg transit plan with per-leg mode, transfer hints, fare, and total time.
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, Clock, Wallet, Repeat } from "lucide-react";
import { transitModeIcon, type TransitPlan } from "@/lib/transitPlanner";

interface Props {
  plan: TransitPlan;
  active?: boolean;
  onSelect?: () => void;
}

export function TransitPlanCard({ plan, active, onSelect }: Props) {
  return (
    <motion.button
      onClick={onSelect}
      whileTap={{ scale: 0.98 }}
      className={`w-full text-left rounded-2xl transition-all ${
        active ? "ring-2 ring-primary" : ""
      }`}
    >
      <Card className={`border-0 ${active ? "card-elevated" : "card-interactive"}`}>
        <CardContent className="p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="font-display font-bold text-xs">{plan.label}</p>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[9px] h-5 gap-1 font-semibold">
                <Clock className="w-2.5 h-2.5" /> {plan.totalMin} min
              </Badge>
              <Badge variant="outline" className="text-[9px] h-5 gap-1 font-semibold text-primary border-primary/30">
                <Wallet className="w-2.5 h-2.5" /> ₱{plan.totalFare}
              </Badge>
              {plan.transfers > 0 && (
                <Badge variant="outline" className="text-[9px] h-5 gap-1 font-semibold">
                  <Repeat className="w-2.5 h-2.5" /> {plan.transfers}
                </Badge>
              )}
            </div>
          </div>

          <ol className="space-y-1">
            {plan.legs.map((leg, i) => (
              <li key={i}>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/60">
                  <span className="text-base leading-none mt-0.5" aria-hidden>
                    {transitModeIcon[leg.mode]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold leading-tight truncate">
                      {leg.line}
                      <span className="text-muted-foreground font-normal"> · {leg.durationMin} min{leg.fare ? ` · ₱${leg.fare}` : ""}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-tight truncate">
                      {leg.from} → {leg.to}
                    </p>
                    {leg.note && (
                      <p className="text-[9px] text-warning font-medium mt-0.5">↔ {leg.note}</p>
                    )}
                  </div>
                </div>
                {i < plan.legs.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <ArrowDown className="w-3 h-3 text-muted-foreground/60" />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </motion.button>
  );
}
