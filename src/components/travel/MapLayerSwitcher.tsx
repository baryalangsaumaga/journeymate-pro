// Tiny segmented control for switching basemap styles. Used in the map page.
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MapStyle = "voyager" | "dark" | "light";

interface Props {
  value: MapStyle;
  onChange: (s: MapStyle) => void;
  className?: string;
}

const STYLES: { id: MapStyle; label: string }[] = [
  { id: "voyager", label: "Std" },
  { id: "light", label: "Lite" },
  { id: "dark", label: "Dark" },
];

export function MapLayerSwitcher({ value, onChange, className = "" }: Props) {
  return (
    <div className={`inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-card/95 backdrop-blur-sm border border-border/50 shadow-card-hover ${className}`}>
      <Layers className="w-3.5 h-3.5 text-muted-foreground ml-1.5" />
      {STYLES.map(s => (
        <Button
          key={s.id}
          variant="ghost"
          size="sm"
          className={`h-7 px-2 text-[10px] font-semibold rounded-lg ${value === s.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          onClick={() => onChange(s.id)}
        >
          {s.label}
        </Button>
      ))}
    </div>
  );
}
