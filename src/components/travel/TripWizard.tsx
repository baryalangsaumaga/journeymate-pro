// Multi-step "Create Trip" wizard. Lives inside ItineraryPage's Dialog.
// Steps: Basics → Destinations → Transit → Review.
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Check, X, Car, Bus, Train, Bike, Footprints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PlaceSearchInput } from "@/components/travel/PlaceSearchInput";
import type { Location, TransitType, Trip } from "@/types/travel";

const MODES: { id: TransitType; icon: typeof Car; label: string }[] = [
  { id: "car", icon: Car, label: "Drive" },
  { id: "bus", icon: Bus, label: "Bus" },
  { id: "train", icon: Train, label: "Train" },
  { id: "bike", icon: Bike, label: "Bike" },
  { id: "walk", icon: Footprints, label: "Walk" },
];

interface Props {
  onComplete: (trip: Partial<Trip> & { destinations: Location[]; transitType: TransitType }) => void;
  onCancel: () => void;
}

export function TripWizard({ onComplete, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [destinations, setDestinations] = useState<Location[]>([]);
  const [mode, setMode] = useState<TransitType>("car");

  const steps = ["Basics", "Destinations", "Transit", "Review"];
  const canNext =
    (step === 0 && title.trim() && startDate && endDate) ||
    (step === 1 && destinations.length > 0) ||
    (step === 2) ||
    (step === 3);

  const finish = () => onComplete({
    title, description: desc, startDate, endDate,
    destinations, transitType: mode,
  });

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <div className="flex items-center justify-between">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`flex items-center gap-1.5 ${i === step ? "text-primary" : i < step ? "text-success" : "text-muted-foreground"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                i === step ? "bg-primary text-primary-foreground"
                  : i < step ? "bg-success text-success-foreground"
                  : "bg-muted"
              }`}>
                {i < step ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className="text-[10px] font-semibold hidden sm:inline">{s}</span>
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-1 rounded ${i < step ? "bg-success" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18 }}
          className="space-y-3 min-h-[200px]"
        >
          {step === 0 && (
            <>
              <Field label="Trip Name">
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Bali Beach Getaway" className="h-10 rounded-xl" />
              </Field>
              <Field label="Description">
                <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="A brief description…" className="h-10 rounded-xl" />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Start"><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-10 rounded-xl" /></Field>
                <Field label="End"><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-10 rounded-xl" /></Field>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Add destinations">
                <PlaceSearchInput
                  exclude={destinations.map(d => d.id)}
                  onPick={d => setDestinations(prev => [...prev, d])}
                />
              </Field>
              <div className="space-y-1.5">
                {destinations.length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-3">Search and tap places to add them.</p>
                )}
                {destinations.map((d, i) => (
                  <div key={d.id} className="flex items-center gap-2 p-2 rounded-xl bg-muted">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="flex-1 text-xs font-semibold truncate">{d.name}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDestinations(prev => prev.filter(x => x.id !== d.id))}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Primary transit mode">
                <div className="grid grid-cols-5 gap-2">
                  {MODES.map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      onClick={() => setMode(id)}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all ${
                        mode === id ? "bg-primary text-primary-foreground shadow-travel" : "bg-muted"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[9px] font-semibold">{label}</span>
                    </button>
                  ))}
                </div>
              </Field>
              <p className="text-[10px] text-muted-foreground">You can change transit per-stop later in the planner.</p>
            </>
          )}

          {step === 3 && (
            <div className="space-y-2 text-xs">
              <Row k="Title" v={title} />
              <Row k="Dates" v={`${startDate} → ${endDate}`} />
              <Row k="Stops" v={`${destinations.length} destinations`} />
              <Row k="Mode" v={mode} />
              <div className="flex flex-wrap gap-1 pt-1">
                {destinations.map(d => <Badge key={d.id} variant="outline" className="text-[10px]">{d.name}</Badge>)}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-2 pt-1">
        {step > 0 ? (
          <Button variant="outline" className="flex-1 h-10 rounded-xl gap-1" onClick={() => setStep(s => s - 1)}>
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
        ) : (
          <Button variant="outline" className="flex-1 h-10 rounded-xl" onClick={onCancel}>Cancel</Button>
        )}
        {step < steps.length - 1 ? (
          <Button className="flex-1 h-10 rounded-xl gap-1 shadow-travel" disabled={!canNext} onClick={() => setStep(s => s + 1)}>
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button className="flex-1 h-10 rounded-xl gap-1 shadow-travel" onClick={finish}>
            <Check className="w-4 h-4" /> Create Trip
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-semibold capitalize">{v || "—"}</span>
    </div>
  );
}
