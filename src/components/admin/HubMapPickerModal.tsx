import { useState, useRef, useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { placesApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface HubMapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLat?: number;
  initialLng?: number;
  initialName?: string;
  onConfirmPin: (data: { lat: number; lng: number; address: string }) => void;
}

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="
    width: 34px;
    height: 34px;
    background: #059669;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0 4px 14px rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div>
  </div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

export default function HubMapPickerModal({
  isOpen,
  onClose,
  initialLat = 15.71,
  initialLng = 120.35,
  initialName = "",
  onConfirmPin,
}: HubMapPickerModalProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [pinLat, setPinLat] = useState<number>(initialLat);
  const [pinLng, setPinLng] = useState<number>(initialLng);
  const [address, setAddress] = useState<string>(initialName);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Reverse geocode lat/lng to get address string
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.display_name) {
          const shortName = data.name || data.display_name.split(",").slice(0, 3).join(",");
          setAddress(shortName);
        }
      }
    } catch {
      // Ignore reverse geocode network error
    }
  };

  useEffect(() => {
    if (!isOpen) {
      if (mapInstance.current) {
        try { mapInstance.current.remove(); } catch {}
        mapInstance.current = null;
        markerRef.current = null;
      }
      return;
    }

    // Reset coordinates if initial values change
    setPinLat(initialLat);
    setPinLng(initialLng);
    if (initialName) setAddress(initialName);

    // Initialize map after modal mounts & animation settles
    const timer = setTimeout(() => {
      if (!mapRef.current) return;

      // Ensure any existing map attached to old DOM node is removed
      if (mapInstance.current) {
        try { mapInstance.current.remove(); } catch {}
        mapInstance.current = null;
      }

      const map = L.map(mapRef.current, {
        center: [initialLat, initialLng],
        zoom: 14,
        zoomControl: true,
      });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);

      mapInstance.current = map;

      // Add draggable pin marker
      const marker = L.marker([initialLat, initialLng], {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);

      markerRef.current = marker;

      // Trigger invalidateSize after container renders
      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch {}
      }, 100);

      marker.on("dragend", (e: any) => {
        const { lat, lng } = e.target.getLatLng();
        setPinLat(lat);
        setPinLng(lng);
        reverseGeocode(lat, lng);
      });

      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setPinLat(lat);
        setPinLng(lng);
        marker.setLatLng([lat, lng]);
        reverseGeocode(lat, lng);
      });
    }, 250);

    return () => {
      clearTimeout(timer);
      if (mapInstance.current) {
        try { mapInstance.current.remove(); } catch {}
        mapInstance.current = null;
        markerRef.current = null;
      }
    };
  }, [isOpen, initialLat, initialLng, initialName]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await placesApi.autocomplete({ query: searchQuery, lat: pinLat, lng: pinLng });
      setSearchResults(res.data?.results || res.data || []);
    } catch {
      toast({ title: "Search failed", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (place: any) => {
    const lat = Number(place.lat);
    const lng = Number(place.lng);
    if (!lat || !lng || !mapInstance.current || !markerRef.current) return;

    setPinLat(lat);
    setPinLng(lng);
    setAddress(place.name || place.formatted_address);

    mapInstance.current.setView([lat, lng], 16);
    markerRef.current.setLatLng([lat, lng]);

    setSearchResults([]);
    setSearchQuery("");
  };

  const handleConfirm = () => {
    onConfirmPin({
      lat: Number(pinLat.toFixed(6)),
      lng: Number(pinLng.toFixed(6)),
      address: address.trim() || `Hub (${pinLat.toFixed(4)}, ${pinLng.toFixed(4)})`,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-3xl w-[95vw] rounded-2xl p-0 overflow-hidden z-[5100]">
        <DialogHeader className="p-4 pb-2 border-b border-border/50 bg-muted/30">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <span>Pin Transit Hub Location on Map</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Search or click directly on the interactive map to select exact GPS coordinates for this transit hub.
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-[320px] sm:h-[420px] w-full bg-muted/20">
          {/* Map Search Bar */}
          <div className="absolute top-3 left-3 right-3 z-[100] flex items-center gap-2 bg-card/95 backdrop-blur-md p-1.5 rounded-xl border border-border/50 shadow-md">
            <Search className="w-4 h-4 text-muted-foreground ml-2 shrink-0" />
            <Input
              placeholder="Search terminal, barangay, or landmark..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="h-8 border-0 shadow-none focus-visible:ring-0 text-xs flex-1 min-w-0"
            />
            <Button size="sm" onClick={handleSearch} disabled={isSearching} className="h-8 text-xs font-semibold px-2.5 shrink-0">
              {isSearching ? "..." : "Find"}
            </Button>
          </div>

          {/* Search Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-14 left-3 right-3 z-[110] bg-card/95 backdrop-blur-md rounded-xl border border-border p-2 shadow-xl space-y-1 max-h-48 overflow-y-auto">
              {searchResults.map((res: any, i: number) => (
                <button
                  key={i}
                  onClick={() => handleSelectResult(res)}
                  className="w-full p-2 rounded-lg text-left text-xs hover:bg-muted transition-colors flex flex-col"
                >
                  <span className="font-semibold">{res.name || res.formatted_address}</span>
                  <span className="text-[10px] text-muted-foreground">{res.lat}, {res.lng}</span>
                </button>
              ))}
            </div>
          )}

          {/* Leaflet Map Canvas */}
          <div ref={mapRef} className="w-full h-full relative z-0" />

          {/* Bottom Info Floating Card */}
          <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 z-[100] bg-card/95 backdrop-blur-md p-2.5 sm:p-3 rounded-xl border border-border/50 shadow-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
            <div>
              <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">Selected Coordinates</p>
              <p className="font-mono font-bold text-emerald-600 text-xs sm:text-sm">
                {pinLat.toFixed(6)}, {pinLng.toFixed(6)}
              </p>
            </div>
            <div className="flex-1 max-w-sm">
              <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">Landmark / Address</p>
              <Input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Hub address or landmark name..."
                className="h-7 text-xs rounded-lg mt-0.5"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="p-3 border-t border-border/50 bg-muted/20 flex flex-row justify-between items-center gap-2">
          <Button variant="ghost" onClick={onClose} className="rounded-xl text-xs h-9">
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 h-9">
            <Check className="w-4 h-4" /> Confirm Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
