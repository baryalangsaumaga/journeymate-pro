import { useMemo, useState, useEffect } from "react";
import { Search, MapPin, Loader2, Frown, Navigation } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { placesApi } from "@/lib/api";
import type { Location } from "@/types/travel";
import { useGeolocation } from "@/hooks/useGeolocation";
import { calculateDistanceBetween } from "@/lib/routing";

interface Props {
  placeholder?: string;
  onPick: (place: Location) => void;
  exclude?: string[];
  className?: string;
  userLocation?: { lat: number; lng: number } | [number, number];
}

export function PlaceSearchInput({ placeholder = "Search places…", onPick, exclude = [], className = "", userLocation }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState("");

  const { fix } = useGeolocation();

  const activeLat = useMemo(() => {
    if (userLocation) return Array.isArray(userLocation) ? userLocation[0] : userLocation.lat;
    return fix?.lat ?? 15.4802;
  }, [userLocation, fix?.lat]);

  const activeLng = useMemo(() => {
    if (userLocation) return Array.isArray(userLocation) ? userLocation[1] : userLocation.lng;
    return fix?.lng ?? 120.5979;
  }, [userLocation, fix?.lng]);

  const { data: searchResults = [], refetch, isFetching } = useQuery({
    queryKey: ['placesSearch', q, activeLat, activeLng],
    queryFn: async () => {
      if (!q.trim()) return [];
      const res = await placesApi.autocomplete({ query: q.trim(), lat: activeLat, lng: activeLng });
      setSearchedQuery(q.trim());
      return (res.data || []).map((item: any) => ({
        id: item.id || item.place_id || Math.random().toString(),
        name: item.name || item.description || "Unknown Place",
        description: item.address || item.formatted_address || "",
        lat: Number(item.lat) || activeLat,
        lng: Number(item.lng) || activeLng,
        type: item.type || "place",
      })) as Location[];
    },
    enabled: false,
  });

  const results = useMemo(() => {
    return searchResults
      .filter(l => !exclude.includes(l.id))
      .slice(0, 8);
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={q}
            onChange={e => { 
              setQ(e.target.value); 
              if (!e.target.value.trim()) setOpen(false);
            }}
            onFocus={() => { if (results.length > 0 && q.trim() === searchedQuery) setOpen(true); }}
            onBlur={() => setTimeout(() => setOpen(false), 250)}
            placeholder={placeholder}
            className="pl-9 pr-8 h-10 rounded-xl border-slate-700 bg-slate-900/95 text-slate-100 placeholder:text-slate-400 text-xs shadow-inner"
          />
          {isFetching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 animate-spin" />
          )}
        </div>
        <Button type="submit" className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md px-4 text-xs font-bold shrink-0" disabled={isFetching || !q.trim()}>
          Search
        </Button>
      </form>

      {open && (
        <div className="absolute top-12 left-0 right-0 z-50 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-md overflow-hidden max-h-72 overflow-y-auto">
          {isFetching ? (
            <div className="p-4 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              Searching locations…
            </div>
          ) : results.length > 0 ? (
            results.map(r => {
              const distStr = (activeLat && activeLng && r.lat && r.lng)
                ? calculateDistanceBetween([activeLat, activeLng], [r.lat, r.lng])
                : "";

              return (
                <button
                  key={r.id}
                  onMouseDown={() => { 
                    onPick(r); 
                    setQ(""); 
                    setOpen(false); 
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left hover:bg-slate-800/90 transition-colors border-b border-slate-800/80 last:border-0"
                >
                  <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-100 truncate">{r.name}</p>
                    {r.description && <p className="text-[10px] text-slate-400 truncate mt-0.5">{r.description}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {distStr && (
                      <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-500/15 text-emerald-300 border-emerald-500/30 flex items-center gap-0.5">
                        <Navigation className="w-2.5 h-2.5" />
                        {distStr}
                      </Badge>
                    )}
                    <span className="text-[9px] text-slate-300 capitalize bg-slate-800 px-1.5 py-0.5 rounded font-medium">{r.type}</span>
                  </div>
                </button>
              );
            })
          ) : searchedQuery ? (
            <div className="p-4 text-center">
              <Frown className="w-5 h-5 mx-auto text-slate-400 mb-1" />
              <p className="text-xs font-bold text-slate-200">No places found</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Could not find "{searchedQuery}". Try adding town or province name.</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
