import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { reviewsApi } from '@/lib/api';

export function useReviews(tripId?: string) {
  const queryClient = useQueryClient();

  const reviewsQuery = useQuery({
    queryKey: ['reviews', tripId],
    queryFn: async () => {
      // If tripId is a mock (starts with 't'), just fetch all reviews without filtering by trip
      const validTripId = tripId && !tripId.startsWith('t') ? tripId : undefined;
      const response = await reviewsApi.getAll(validTripId ? { trip_id: validTripId } : undefined);
      return response.data.data || response.data || [];
    },
    enabled: true, // We can fetch all reviews if tripId is not provided
    placeholderData: keepPreviousData,
    staleTime: 300_000,
  });

  const createReview = useMutation({
    mutationFn: async (data: { trip_id: string; place_name: string; rating: number; review_text?: string }) => {
      if (data.trip_id && data.trip_id.startsWith('t')) throw new Error("Cannot create a review for a mock trip");
      const response = await reviewsApi.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });

  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      await reviewsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });

  return {
    reviews: reviewsQuery.data || [],
    isLoading: reviewsQuery.isLoading,
    error: reviewsQuery.error,
    createReview,
    deleteReview,
  };
}
