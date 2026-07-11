import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import {
  useMyConversations,
  useMessages,
  useSendMessage,
} from '../../src/hooks/useConversations';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import type { Message } from '../../src/types';

// ── Message bubble ────────────────────────────────────────────────────

function MessageBubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  return (
    <View style={[styles.bubbleWrap, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
      <View style={[styles.bubble, isMine ? styles.bubbleBgMine : styles.bubbleBgTheirs]}>
        {msg.body ? (
          <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
            {msg.body}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.bubbleTime, isMine ? { textAlign: 'right' } : {}]}>
        {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

// ── Empty state ───────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={56} color={colors.neutral[300]} />
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptyText}>
        Your project team will set up a chat. Check back soon or send the first message.
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────

export default function ClientChatScreen() {
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const { data: projects } = useProjects();
  const project = (projects || [])[0];

  const { data: conversations, refetch: refetchConversations } = useMyConversations(profile?.id);

  // Find the project conversation for client's project
  const projectConv = (conversations || []).find(
    (c) => c.type === 'project' && c.project_id === project?.id
  ) ?? (conversations || []).find((c) => c.type === 'project') ?? null;

  const conversationId = projectConv?.id ?? null;

  const {
    data: messages,
    refetch: refetchMessages,
    isRefetching,
  } = useMessages(conversationId);

  const { mutateAsync: sendMessage, isPending: isSending } = useSendMessage();
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<Message>>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages?.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages?.length]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:conv:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          refetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, refetchMessages]);

  const handleSend = useCallback(async () => {
    const body = draft.trim();
    if (!body || !conversationId || !profile?.id) return;
    setDraft('');
    try {
      await sendMessage({ conversationId, senderId: profile.id, body });
    } catch (e: any) {
      // Restore draft on failure
      setDraft(body);
    }
  }, [draft, conversationId, profile?.id, sendMessage]);

  if (!conversationId) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.screenTitle}>Project Chat</Text>
        {project && <Text style={styles.projectName}>{project.name}</Text>}
        <EmptyState />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="business" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{project?.name ?? 'Project Chat'}</Text>
            <Text style={styles.headerSub}>Project Team</Text>
          </View>
        </View>

        {/* Message list */}
        <FlatList
          ref={listRef}
          data={messages ?? []}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetchMessages} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <MessageBubble msg={item} isMine={item.sender_id === profile?.id} />
          )}
          ListEmptyComponent={
            <View style={styles.listEmpty}>
              <Text style={styles.listEmptyText}>No messages yet. Say hello! 👋</Text>
            </View>
          }
        />

        {/* Composer */}
        <View
          style={[
            styles.composer,
            { paddingBottom: insets.bottom + spacing.sm },
          ]}
        >
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message…"
            placeholderTextColor={colors.neutral[400]}
            multiline
            returnKeyType="default"
            maxLength={2000}
            accessible
            accessibilityLabel="Message input"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!draft.trim() || isSending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!draft.trim() || isSending}
            accessibilityLabel="Send message"
          >
            {isSending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="send" size={18} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  screenTitle: {
    ...typography.h3,
    color: colors.ink,
    paddingHorizontal: spacing.lg,
  },
  projectName: {
    ...typography.bodyMedium,
    color: colors.neutral[500],
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...typography.h6, color: colors.ink },
  headerSub: { ...typography.caption, color: colors.neutral[500], marginTop: 1 },

  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexGrow: 1,
  },
  listEmpty: { flex: 1, alignItems: 'center', paddingTop: spacing['4xl'] },
  listEmptyText: { ...typography.bodySmall, color: colors.neutral[400] },

  bubbleWrap: { marginBottom: spacing.sm, maxWidth: '80%' },
  bubbleMine: { alignSelf: 'flex-end' },
  bubbleTheirs: { alignSelf: 'flex-start' },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  bubbleBgMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.xs,
  },
  bubbleBgTheirs: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  bubbleText: { ...typography.bodyMedium },
  bubbleTextMine: { color: colors.white },
  bubbleTextTheirs: { color: colors.ink },
  bubbleTime: { ...typography.caption, color: colors.neutral[400], marginTop: 2, paddingHorizontal: 4 },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.ink,
    backgroundColor: colors.neutral[100],
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 120,
    minHeight: 44,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.neutral[300] },

  emptyState: { alignItems: 'center', paddingTop: spacing['5xl'], gap: spacing.sm, paddingHorizontal: spacing.lg },
  emptyTitle: { ...typography.h5, color: colors.neutral[400] },
  emptyText: { ...typography.bodySmall, color: colors.neutral[400], textAlign: 'center' },
});
