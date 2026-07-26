import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { placesApi } from "@/lib/api";
import type { Location } from "@/types/travel";

// Round to 3 decimals (~111 m) so micro-drift doesn't create a new cache key.
const snap = (v: number) => Math.round(v * 1000) / 1000;

export function usePlaces(params: { lat: number; lng: number; category?: string; query?: string }) {
  const stableKey = { lat: snap(params.lat), lng: snap(params.lng), category: params.category, query: params.query };
  const { data: places = [], isLoading, isFetching } = useQuery({
    queryKey: ['places', stableKey],
    queryFn: async () => {
      const response = await placesApi.search(params);
      return response.data as Location[];
    },
    enabled: !!params.lat && !!params.lng,
    placeholderData: keepPreviousData,
    staleTime: 300_000, // don't refetch within 5 mins
  });

  return { places, isLoading, isFetching };
}

export function usePopularPlaces(params: { lat: number; lng: number }) {
  const stableKey = { lat: snap(params.lat), lng: snap(params.lng) };
  const { data: popularPlaces = [], isLoading } = useQuery({
    queryKey: ['places', 'popular', stableKey],
    queryFn: async () => {
      const response = await placesApi.popular(params);
      return response.data as Location[];
    },
    enabled: !!params.lat && !!params.lng,
    placeholderData: keepPreviousData,
    staleTime: 300_000,
  });

  return { popularPlaces, isLoading };
}
