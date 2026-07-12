/**
 * Supervisor — Messages (conversation list + start new chats)
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Card, Avatar } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useMyConversations, useConversationMembers } from '../../src/hooks/useConversations';
import { useProjects } from '../../src/hooks/useProjects';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

export default function SupervisorMessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { data: conversations, refetch, isRefetching } = useMyConversations(profile?.id);
  const { data: projects } = useProjects();

  const projectMap = new Map((projects || []).map((p: any) => [p.id, p.name]));
  const directIds = (conversations || []).filter((c) => c.type === 'direct').map((c) => c.id);
  const { data: membersByConv = {} } = useConversationMembers(directIds);
  const directTitle = (convId: string) => {
    const others = (membersByConv[convId] || []).filter((m) => m.id !== profile?.id);
    return others.map((m) => m.full_name).join(', ') || 'Direct Message';
  };

  const open = (convId: string, title: string) =>
    router.push({ pathname: '/(supervisor)/conversation' as any, params: { conversationId: convId, title } });

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity onPress={() => router.push('/(supervisor)/new-message' as any)} style={styles.newBtn}>
          <Ionicons name="create-outline" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {(conversations || []).length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={40} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>No chats yet. Tap the pencil to message anyone in the team.</Text>
          </View>
        )}
        {(conversations || []).map((conv) => {
          const title = conv.type === 'project'
            ? (conv.project_id ? (projectMap.get(conv.project_id) as string) || 'Project Chat' : 'Project Chat')
            : directTitle(conv.id);
          return (
            <TouchableOpacity key={conv.id} onPress={() => open(conv.id, title)}>
              <Card style={styles.chatCard}>
                <View style={styles.chatRow}>
                  <Avatar name={title} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chatName}>{title}</Text>
                    <Text style={styles.chatMeta}>{conv.type === 'project' ? 'Project chat' : 'Direct message'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  newBtn: { width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' },
  title: { ...typography.h4, color: colors.ink },
  chatCard: { padding: spacing.md, marginBottom: spacing.sm },
  chatRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chatName: { ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },
  chatMeta: { ...typography.caption, color: colors.neutral[400], marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: spacing.xl * 2, gap: spacing.sm, paddingHorizontal: spacing.lg },
  emptyText: { ...typography.bodySmall, color: colors.neutral[400], textAlign: 'center' },
});
