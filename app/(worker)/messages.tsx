import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, Avatar } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import {
  useMyConversations,
  useMessages,
  useSendMessage,
} from '../../src/hooks/useConversations';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import type { Conversation } from '../../src/types';

type FilterKey = 'all' | 'site' | 'team' | 'admin';

const FILTER_LABELS: Record<FilterKey, string> = {
  all: 'All',
  site: 'Site',
  team: 'Team',
  admin: 'Admin',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Conversation list view */
function ConversationList({
  conversations,
  profileId,
  onSelect,
}: {
  conversations: Conversation[];
  profileId: string;
  onSelect: (conv: Conversation) => void;
}) {
  const [filter, setFilter] = useState<FilterKey>('all');

  const filtered = conversations.filter((c) => {
    if (filter === 'all') return true;
    if (filter === 'site') return c.type === 'project';
    if (filter === 'admin') return c.type === 'direct';
    return true;
  });

  return (
    <View style={{ flex: 1 }}>
      {/* Filters */}
      <View style={styles.filterRow}>
        {(Object.keys(FILTER_LABELS) as FilterKey[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {FILTER_LABELS[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.convList}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => onSelect(item)}>
            <Card style={styles.convCard} variant="interactive">
              <View style={styles.convRow}>
                <Avatar
                  name={item.type === 'project' ? 'Site' : 'Admin'}
                  size={48}
                />
                <View style={styles.convInfo}>
                  <Text style={styles.convName}>
                    {item.type === 'project' ? 'Site Chat' : 'Admin'}
                  </Text>
                  <Text style={styles.convType}>{item.type === 'project' ? 'Project Group' : 'Direct Message'}</Text>
                </View>
                <Text style={styles.convTime}>{formatDate(item.created_at)}</Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No messages</Text>
            <Text style={styles.emptyBody}>
              Messages from your site and admin will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

/** Chat thread view */
function ChatThread({
  conversation,
  profileId,
  onBack,
}: {
  conversation: Conversation;
  profileId: string;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [body, setBody] = useState('');
  const flatRef = useRef<FlatList>(null);
  const { data: messages } = useMessages(conversation.id);
  const send = useSendMessage();

  const handleSend = async () => {
    const text = body.trim();
    if (!text) return;
    setBody('');
    await send.mutateAsync({
      conversationId: conversation.id,
      senderId: profileId,
      body: text,
    });
    flatRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.bottom + 60}
    >
      <FlatList
        ref={flatRef}
        data={messages ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const isMe = item.sender_id === profileId;
          return (
            <View style={[styles.msgWrap, isMe ? styles.msgWrapMe : styles.msgWrapOther]}>
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                  {item.body}
                </Text>
                <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                  {formatTime(item.created_at)}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyBody}>No messages yet. Say hi! 👋</Text>
          </View>
        }
      />

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TextInput
          style={styles.textInput}
          value={body}
          onChangeText={setBody}
          placeholder="Type a message…"
          placeholderTextColor={colors.neutral[400]}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !body.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!body.trim()}
        >
          <Ionicons name="send" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Main Messages screen */
export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const [selected, setSelected] = useState<Conversation | null>(null);

  const { data: conversations, isLoading } = useMyConversations(profile?.id);

  const headerTitle = selected
    ? selected.type === 'project'
      ? 'Site Chat'
      : 'Admin'
    : 'Messages';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={selected ? () => setSelected(null) : () => router.back()}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>{headerTitle}</Text>
        {selected ? (
          <View style={{ width: 36 }} />
        ) : (
          <TouchableOpacity onPress={() => router.push('/(worker)/new-message' as any)} hitSlop={12} style={{ width: 36, alignItems: 'flex-end' }}>
            <Ionicons name="create-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {selected ? (
        <ChatThread
          conversation={selected}
          profileId={profile?.id ?? ''}
          onBack={() => setSelected(null)}
        />
      ) : (
        <ConversationList
          conversations={conversations ?? []}
          profileId={profile?.id ?? ''}
          onSelect={setSelected}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.white,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h5,
    color: colors.ink,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[100],
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    color: colors.neutral[600],
  },
  filterTextActive: {
    color: colors.white,
  },
  convList: {
    padding: spacing.lg,
    paddingBottom: spacing['5xl'],
    gap: spacing.sm,
  },
  convCard: {
    padding: spacing.lg,
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  convInfo: {
    flex: 1,
  },
  convName: {
    ...typography.h6,
    color: colors.ink,
    marginBottom: 2,
  },
  convType: {
    ...typography.caption,
    color: colors.neutral[500],
  },
  convTime: {
    ...typography.caption,
    color: colors.neutral[400],
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing['5xl'],
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h5,
    color: colors.neutral[400],
  },
  emptyBody: {
    ...typography.bodySmall,
    color: colors.neutral[400],
    textAlign: 'center',
  },
  // Chat thread
  chatContent: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
    gap: spacing.sm,
  },
  msgWrap: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  msgWrapMe: {
    justifyContent: 'flex-end',
  },
  msgWrapOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: radius.lg,
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  bubbleMe: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.xs,
  },
  bubbleOther: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: radius.xs,
  },
  bubbleText: {
    ...typography.bodyMedium,
    color: colors.ink,
  },
  bubbleTextMe: {
    color: colors.white,
  },
  bubbleTime: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: 2,
    textAlign: 'right',
  },
  bubbleTimeMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.neutral[100],
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.ink,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.neutral[300],
  },
});
