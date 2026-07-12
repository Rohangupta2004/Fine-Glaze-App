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

// ═══════════════════════════════════════════════════════════════════════
// Round 4 — start conversations (direct chats for every role)
// ═══════════════════════════════════════════════════════════════════════

import { useAuthStore } from '../stores/authStore';
import type { Profile } from '../types';

/** Everyone in my company I can start a chat with (excludes myself). */
export function useChatContacts() {
  const me = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['chat_contacts', me?.id],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', me!.id)
        .eq('status', 'active')
        .order('full_name');
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!me?.id,
  });
}

/** Members (profiles) per conversation id — for naming direct chats. */
export function useConversationMembers(conversationIds: string[]) {
  return useQuery({
    queryKey: ['conversation_members', conversationIds],
    queryFn: async (): Promise<Record<string, Profile[]>> => {
      if (!conversationIds.length) return {};
      const { data: members, error } = await supabase
        .from('conversation_members')
        .select('conversation_id, profile_id')
        .in('conversation_id', conversationIds);
      if (error) throw error;
      const profileIds = [...new Set((members || []).map((m: any) => m.profile_id))];
      if (!profileIds.length) return {};
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .in('id', profileIds);
      if (pErr) throw pErr;
      const byId = new Map((profiles || []).map((p: any) => [p.id, p as Profile]));
      const result: Record<string, Profile[]> = {};
      for (const m of members || []) {
        const prof = byId.get((m as any).profile_id);
        if (!prof) continue;
        (result[(m as any).conversation_id] ||= []).push(prof);
      }
      return result;
    },
    enabled: conversationIds.length > 0,
  });
}

/**
 * Find or create a direct conversation with another person.
 * Uses SECURITY DEFINER RPC to avoid RLS race condition.
 * Returns the conversation id.
 */
export function useStartDirectConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ otherProfileId }: { otherProfileId: string }): Promise<string> => {
      const { data, error } = await supabase.rpc('start_direct_chat', {
        other_profile_id: otherProfileId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

/** Create (or return existing) project conversation and join it.
 * Uses SECURITY DEFINER RPC to avoid RLS race condition. */
export function useJoinProjectConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId }: { projectId: string }): Promise<string> => {
      const { data, error } = await supabase.rpc('join_project_chat', {
        p_project_id: projectId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}
