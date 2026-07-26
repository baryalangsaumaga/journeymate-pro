import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { chatApi } from '@/lib/api';

export function useChat(tripId?: string) {
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ['chat', tripId],
    queryFn: async () => {
      if (!tripId || tripId.startsWith('t')) return [];
      const response = await chatApi.getMessages(tripId);
      return response.data.data || response.data || [];
    },
    enabled: !!tripId && !tripId.startsWith('t'),
    // Poll every 1 second for messaging updates
    refetchInterval: 1000,
    refetchIntervalInBackground: true,
    placeholderData: keepPreviousData,
  });

  const sendMessage = useMutation({
    mutationFn: async (data: { content: string; type?: string; user?: { id: string; username: string; profile_pic?: string } }) => {
      if (!tripId || tripId.startsWith('t')) throw new Error("Cannot send messages in a mock trip");
      const { user, ...payload } = data;
      const response = await chatApi.sendMessage(tripId, payload);
      return response.data;
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['chat', tripId] });
      const previousMessages = queryClient.getQueryData<any[]>(['chat', tripId]) || [];

      const optimisticMsg = {
        id: `temp-${Date.now()}`,
        user_id: newData.user?.id || '',
        content: newData.content,
        type: newData.type || 'text',
        created_at: new Date().toISOString(),
        user: {
          id: newData.user?.id || '',
          username: newData.user?.username || 'You',
          profile_pic: newData.user?.profile_pic
        }
      };

      queryClient.setQueryData(['chat', tripId], [...previousMessages, optimisticMsg]);
      return { previousMessages };
    },
    onError: (err, newData, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['chat', tripId], context.previousMessages);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', tripId] });
    },
  });

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    error: messagesQuery.error,
    sendMessage,
  };
}
