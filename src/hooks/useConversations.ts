import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
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
      if (!me?.id) return [];
      // Clients cannot start direct chats and should not see any contacts
      if (me.role === 'client') return [];

      const isAdmin = ['owner', 'project_manager', 'hr', 'accounts'].includes(me.role);
      let query = supabase
        .from('profiles')
        .select('*')
        .neq('id', me.id)
        .eq('status', 'active');
        
      if (!isAdmin) {
        query = query.neq('role', 'client'); // Exclude client users for non-admins
      }

      const { data, error } = await query.order('full_name');
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
 * Returns the conversation id.
 */
export function useStartDirectConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ otherProfileId }: { otherProfileId: string }): Promise<string> => {
      const me = useAuthStore.getState().profile;
      if (!me) throw new Error('Not authenticated');

      // 1. Look for an existing direct conversation with exactly the two of us
      const { data: myMemberships, error: memErr } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('profile_id', me.id);
      if (memErr) throw memErr;
      const myConvIds = (myMemberships || []).map((m: any) => m.conversation_id);

      if (myConvIds.length) {
        const { data: directConvs } = await supabase
          .from('conversations')
          .select('id')
          .eq('type', 'direct')
          .in('id', myConvIds);
        const directIds = (directConvs || []).map((c: any) => c.id);
        if (directIds.length) {
          const { data: allMembers } = await supabase
            .from('conversation_members')
            .select('conversation_id, profile_id')
            .in('conversation_id', directIds);
          const byConv: Record<string, string[]> = {};
          for (const m of allMembers || []) {
            (byConv[(m as any).conversation_id] ||= []).push((m as any).profile_id);
          }
          for (const [convId, members] of Object.entries(byConv)) {
            if (members.length === 2 && members.includes(otherProfileId)) return convId;
          }
        }
      }

      // 2. Create a new direct conversation
      const convId = Crypto.randomUUID();
      const { error: convErr } = await supabase
        .from('conversations')
        .insert({ id: convId, company_id: me.company_id, type: 'direct' });
      if (convErr) throw convErr;

      // Insert current user first to establish membership (satisfying RLS policies)
      const { error: addMeErr } = await supabase
        .from('conversation_members')
        .insert({ conversation_id: convId, profile_id: me.id });
      if (addMeErr) throw addMeErr;

      // Now insert the other member (allowed because the current user is a verified member of this conversation)
      const { error: addOtherErr } = await supabase
        .from('conversation_members')
        .insert({ conversation_id: convId, profile_id: otherProfileId });
      if (addOtherErr) throw addOtherErr;

      return convId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

/** Create (or return existing) project conversation and join it. */
export function useJoinProjectConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId }: { projectId: string }): Promise<string> => {
      const me = useAuthStore.getState().profile;
      if (!me) throw new Error('Not authenticated');
      // Existing project conversation I'm a member of?
      const { data: myMemberships } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('profile_id', me.id);
      const ids = (myMemberships || []).map((m: any) => m.conversation_id);
      if (ids.length) {
        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .eq('type', 'project')
          .eq('project_id', projectId)
          .in('id', ids)
          .limit(1);
        if (existing?.length) return existing[0].id;
      }
      const convId = Crypto.randomUUID();
      const { error } = await supabase
        .from('conversations')
        .insert({ id: convId, company_id: me.company_id, type: 'project', project_id: projectId });
      if (error) throw error;
      const { error: addErr } = await supabase
        .from('conversation_members')
        .insert({ conversation_id: convId, profile_id: me.id });
      if (addErr) throw addErr;
      return convId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}
export function useStartGroupConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, participantIds }: { title: string; participantIds: string[] }): Promise<string> => {
      const me = useAuthStore.getState().profile;
      if (!me) throw new Error('Not authenticated');
      if (participantIds.length === 0) throw new Error('No participants selected');

      const convId = Crypto.randomUUID();
      const { error: convErr } = await supabase
        .from('conversations')
        .insert({ id: convId, company_id: me.company_id, type: 'group', title, created_by: me.id });
      if (convErr) throw convErr;

      // 1. Insert current user first to establish membership (satisfying RLS policies)
      const { error: addMeErr } = await supabase
        .from('conversation_members')
        .insert({ conversation_id: convId, profile_id: me.id });
      if (addMeErr) throw addMeErr;

      // 2. Insert remaining participants now that current user is verified member
      const otherIds = participantIds.filter((pid) => pid !== me.id);
      if (otherIds.length > 0) {
        const memberInserts = otherIds.map((pid) => ({
          conversation_id: convId,
          profile_id: pid,
        }));
        const { error: addOthersErr } = await supabase
          .from('conversation_members')
          .insert(memberInserts);
        if (addOthersErr) throw addOthersErr;
      }

      return convId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}
