import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Conversation, Message } from '../types';

/** Conversations the current user is a member of. */
export function useMyConversations(profileId: string | null | undefined) {
  return useQuery({
    queryKey: ['conversations', profileId],
    queryFn: async (): Promise<(Conversation & { last_message?: string })[]> => {
      if (!profileId) return [];
      // Get conversation IDs the user is a member of
      const { data: memberships, error: memErr } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('profile_id', profileId);
      if (memErr) throw memErr;
      if (!memberships?.length) return [];

      const ids = memberships.map((m: any) => m.conversation_id);
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .in('id', ids)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Conversation[];
    },
    enabled: !!profileId,
  });
}

/** Messages in a conversation. */
export function useMessages(conversationId: string | null | undefined, limit = 50) {
  return useQuery({
    queryKey: ['messages', conversationId, limit],
    queryFn: async (): Promise<Message[]> => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as Message[]).reverse();
    },
    enabled: !!conversationId,
  });
}

/** Send a message. */
export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, senderId, body }: { conversationId: string; senderId: string; body: string }) => {
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: senderId,
        body,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['messages', v.conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
