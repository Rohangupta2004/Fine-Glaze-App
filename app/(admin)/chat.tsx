import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Card, Avatar, ListSkeleton, EmptyState, emptyStates } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useMyConversations, useConversationMembers } from '../../src/hooks/useConversations';
import { useProjects } from '../../src/hooks/useProjects';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

export default function AdminChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { data: conversations, refetch, isRefetching, isLoading } = useMyConversations(profile?.id);
  const { data: projects } = useProjects();

  const projectMap = new Map((projects || []).map(p => [p.id, p.name]));
  const directIds = (conversations || []).filter(c => c.type === 'direct').map(c => c.id);
  const { data: membersByConv = {} } = useConversationMembers(directIds);
  const directTitle = (convId: string) => {
    const others = (membersByConv[convId] || []).filter(m => m.id !== profile?.id);
    return others.map(m => m.full_name).join(', ') || 'Direct Message';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity onPress={() => router.push('/(admin)/new-message' as any)} style={styles.newBtn}>
          <Ionicons name="create-outline" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['6xl'] }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Project Chats */}
        {(conversations || []).filter(c => c.type === 'project').length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Project Chats</Text>
            {(conversations || []).filter(c => c.type === 'project').map((conv) => (
              <TouchableOpacity key={conv.id} onPress={() => router.push({ pathname: '/(admin)/conversation', params: { conversationId: conv.id, title: conv.project_id ? projectMap.get(conv.project_id) || 'Project Chat' : 'Project Chat' } })}>
                <Card style={styles.chatCard} variant="interactive">
                  <View style={styles.chatRow}>
                    <View style={styles.chatIcon}>
                      <Ionicons name="business" size={22} color={colors.primary} />
                    </View>
                    <View style={styles.chatInfo}>
                      <Text style={styles.chatName}>{conv.project_id ? projectMap.get(conv.project_id) || 'Project Chat' : 'Project Chat'}</Text>
                      <Text style={styles.chatPreview} numberOfLines={1}>Tap to open conversation</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Direct Messages */}
        {(conversations || []).filter(c => c.type === 'direct').length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Direct Messages</Text>
            {(conversations || []).filter(c => c.type === 'direct').map((conv) => (
              <TouchableOpacity key={conv.id} onPress={() => router.push({ pathname: '/(admin)/conversation', params: { conversationId: conv.id, title: directTitle(conv.id) } })}>
                <Card style={styles.chatCard} variant="interactive">
                  <View style={styles.chatRow}>
                    <Avatar name="DM" size={44} />
                    <View style={styles.chatInfo}>
                      <Text style={styles.chatName}>{directTitle(conv.id)}</Text>
                      <Text style={styles.chatPreview} numberOfLines={1}>Tap to open</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}

        {isLoading ? (
          <ListSkeleton count={5} style={{ paddingTop: spacing.lg }} />
        ) : (!conversations || conversations.length === 0) ? (
          <EmptyState
            {...emptyStates.messages}
            actionLabel="Start Chat"
            onAction={() => router.push('/(admin)/new-message' as any)}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  newBtn: { width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' },
  title: { ...typography.h3, color: colors.ink, marginBottom: spacing.xl },
  sectionLabel: {
    ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.neutral[400],
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.md,
  },
  chatCard: { padding: spacing.md, marginBottom: spacing.sm },
  chatRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chatIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary + '10', alignItems: 'center', justifyContent: 'center' },
  chatInfo: { flex: 1 },
  chatName: { ...typography.h6, color: colors.ink },
  chatPreview: { ...typography.caption, color: colors.neutral[500], marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: spacing['5xl'], gap: spacing.sm },
  emptyTitle: { ...typography.h5, color: colors.neutral[400] },
  emptyText: { ...typography.bodySmall, color: colors.neutral[400], textAlign: 'center', paddingHorizontal: spacing['3xl'] },
});
