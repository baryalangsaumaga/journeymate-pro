import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { budgetApi } from "@/lib/api";

export interface Budget {
  total_budget: number;
  currency: string;
  categories: { name: string; allocated: number; spent: number }[];
}

export function useBudget(tripId: string) {
  const queryClient = useQueryClient();

  const { data: budget, isLoading } = useQuery({
    queryKey: ['budget', tripId],
    queryFn: async () => {
      if (!tripId) return null;
      const response = await budgetApi.getByTrip(tripId);
      return response.data as Budget;
    },
    enabled: !!tripId,
    placeholderData: keepPreviousData,
  });

  const { mutateAsync: updateBudget } = useMutation({
    mutationFn: async (newBudget: Budget) => {
      const response = await budgetApi.update(tripId, newBudget);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', tripId] });
    }
  });

  return { budget, updateBudget, isLoading };
}
