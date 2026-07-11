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
import { Ionicons } from '@expo/vector-icons';

import { Card, Avatar } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useMyConversations } from '../../src/hooks/useConversations';
import { useProjects } from '../../src/hooks/useProjects';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

export default function AdminChatScreen() {
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const { data: conversations, refetch, isRefetching } = useMyConversations(profile?.id);
  const { data: projects } = useProjects();

  const projectMap = new Map((projects || []).map(p => [p.id, p.name]));

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.title}>Messages</Text>

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
              <TouchableOpacity key={conv.id}>
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
              <TouchableOpacity key={conv.id}>
                <Card style={styles.chatCard} variant="interactive">
                  <View style={styles.chatRow}>
                    <Avatar name="DM" size={44} />
                    <View style={styles.chatInfo}>
                      <Text style={styles.chatName}>Direct Message</Text>
                      <Text style={styles.chatPreview} numberOfLines={1}>Tap to open</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}

        {(!conversations || conversations.length === 0) && (
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={56} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyText}>Messages from project chats and direct messages will appear here</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
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
