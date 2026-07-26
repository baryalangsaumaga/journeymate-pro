// Popover layer switcher — Standard / Light / Dark / Satellite with icons.
import { Layers, Map as MapIcon, Sun, Moon, Satellite, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type MapStyle = "voyager" | "light" | "dark" | "satellite";

interface Props {
  value: MapStyle;
  onChange: (s: MapStyle) => void;
  className?: string;
}

const STYLES: { id: MapStyle; label: string; Icon: typeof MapIcon }[] = [
  { id: "voyager", label: "Standard", Icon: MapIcon },
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "satellite", label: "Satellite", Icon: Satellite },
];

export function MapLayerSwitcher({ value, onChange, className = "" }: Props) {
  const active = STYLES.find(s => s.id === value) ?? STYLES[0];
  const ActiveIcon = active.Icon;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className={`h-11 w-11 bg-card/95 backdrop-blur-sm shadow-card-hover rounded-full border-border/50 ${className}`}
          aria-label="Change map style"
        >
          <Layers className="w-5 h-5 text-primary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1.5">
        <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Map Style</p>
        {STYLES.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
              value === id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">{label}</span>
            {value === id && <Check className="w-3 h-3" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
