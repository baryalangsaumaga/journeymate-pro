import { useMemo, useState } from "react";
import { Search, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { placesApi } from "@/lib/api";
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

  const { data: searchResults = [], refetch, isFetching } = useQuery({
    queryKey: ['placesSearch', q],
    queryFn: async () => {
      if (!q.trim()) return [];
      // Use the actual places API
      const res = await placesApi.autocomplete({ query: q, lat: 14.5995, lng: 120.9842 });
      return (res.data || []).map((item: any) => ({
        id: item.place_id || item.id || Math.random().toString(),
        name: item.description || item.name || "Unknown Place",
        description: item.formatted_address || item.address || "",
        lat: item.lat || 14.5995,
        lng: item.lng || 120.9842,
        type: item.type || "place",
      })) as Location[];
    },
    enabled: false,
  });

  const results = useMemo(() => {
    return searchResults
      .filter(l => !exclude.includes(l.id))
      .slice(0, 6);
  }, [searchResults, exclude]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (q.trim()) {
      refetch().then(() => setOpen(true));
    }
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={e => { setQ(e.target.value); }}
            onFocus={() => { if (results.length > 0) setOpen(true); }}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            placeholder={placeholder}
            className="pl-9 h-10 rounded-xl border-border bg-muted/50"
          />
        </div>
        <Button type="submit" className="h-10 rounded-xl shadow-travel px-4 font-semibold shrink-0" disabled={isFetching || !q.trim()}>
          Search
        </Button>
      </form>
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
