import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { expensesApi } from "@/lib/api";

export interface Expense {
  id: string;
  trip_id: string;
  user_id: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  split_among?: any;
  receipt?: string;
}

export function useExpenses(tripId: string) {
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const response = await expensesApi.getByTrip(tripId);
      return response.data as Expense[];
    },
    enabled: !!tripId,
    placeholderData: keepPreviousData,
  });

  const { mutateAsync: addExpense } = useMutation({
    mutationFn: async (expense: Omit<Expense, 'id'|'trip_id'>) => {
      const response = await expensesApi.create(tripId, expense);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
    }
  });

  const { mutateAsync: deleteExpense } = useMutation({
    mutationFn: async (id: string) => {
      await expensesApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
    }
  });

  return { expenses, addExpense, deleteExpense, isLoading };
}
