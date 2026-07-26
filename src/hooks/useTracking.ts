import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trackingApi } from "@/lib/api";
import { useEffect } from "react";
import { useAuth } from "@/auth/AuthProvider";

export function useTracking() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Push user's location to the server periodically
  useEffect(() => {
    if (!user) return;
    
    const updateLoc = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          trackingApi.updateLocation(pos.coords.latitude, pos.coords.longitude).catch(console.error);
        }, (err) => {
          console.warn("Geolocation not available/allowed, skipping location update.", err);
        });
      }
    };

    updateLoc();
    const interval = setInterval(updateLoc, 30000); // every 30s
    return () => clearInterval(interval);
  }, [user]);

  // Fetch heatmap data
  const { data: heatmapData = [] } = useQuery({
    queryKey: ['heatmap'],
    queryFn: async () => {
      const response = await trackingApi.getHeatmap();
      return response.data as [number, number, number][]; // [lat, lng, intensity][]
    },
    refetchInterval: 60000 // Refresh heatmap every 60s
  });

  return { heatmapData };
}
