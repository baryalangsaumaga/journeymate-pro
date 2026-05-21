// Search input with inline autocomplete over the mock locations dataset.
import { useMemo, useState } from "react";
import { Search, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { mockLocations } from "@/data/mockData";
import type { Location } from "@/types/travel";

interface Props {
  placeholder?: string;
  onPick: (place: Location) => void;
  exclude?: string[];
  className?: string;
}

export function PlaceSearchInput({ placeholder = "Search places…", onPick, exclude = [], className = "" }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const needle = q.toLowerCase();
    return mockLocations
      .filter(l => !exclude.includes(l.id))
      .filter(l => l.name.toLowerCase().includes(needle) || l.description?.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [q, exclude]);

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="pl-9 h-10 rounded-xl border-border bg-muted/50"
      />
      {open && results.length > 0 && (
        <div className="absolute top-12 left-0 right-0 z-50 rounded-2xl bg-card border border-border shadow-card-hover overflow-hidden">
          {results.map(r => (
            <button
              key={r.id}
              onMouseDown={() => { onPick(r); setQ(""); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-muted transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{r.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{r.description}</p>
              </div>
              <span className="text-[9px] text-muted-foreground capitalize">{r.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
