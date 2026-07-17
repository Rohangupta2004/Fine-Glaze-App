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

import { Avatar } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useMyConversations, useConversationMembers } from '../../src/hooks/useConversations';
import { useProjects } from '../../src/hooks/useProjects';
import { colors } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

export default function AdminChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { data: conversations, refetch, isRefetching } = useMyConversations(profile?.id);
  const { data: projects } = useProjects();

  const projectMap = new Map((projects || []).map(p => [p.id, p.name]));
  const directIds = (conversations || []).filter(c => c.type === 'direct').map(c => c.id);
  const { data: membersByConv = {} } = useConversationMembers(directIds);
  const directTitle = (convId: string) => {
    const others = (membersByConv[convId] || []).filter(m => m.id !== profile?.id);
    return others.map(m => m.full_name).join(', ') || 'Direct Message';
  };

  const projectChats = (conversations || []).filter(c => c.type === 'project');
  const directChats = (conversations || []).filter(c => c.type === 'direct');

  return (
    <View style={styles.container}>
      {/* Light Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerLabel}>Team</Text>
            <Text style={styles.headerTitle}>Messages</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(admin)/new-message' as any)}
            style={styles.newBtn}
          >
            <Ionicons name="create-outline" size={20} color="#1E1815" />
          </TouchableOpacity>
        </View>

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{projectChats.length}</Text>
            <Text style={styles.statLabel}>Project</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{directChats.length}</Text>
            <Text style={styles.statLabel}>Direct</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{(conversations || []).length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Project Chats */}
        {projectChats.length > 0 && (
          <>
            <SectionLabel icon="business" text="Project Chats" />
            {projectChats.map((conv) => (
              <TouchableOpacity
                key={conv.id}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/(admin)/conversation', params: { conversationId: conv.id, title: conv.project_id ? projectMap.get(conv.project_id) || 'Project Chat' : 'Project Chat' } })}
              >
                <View style={styles.chatCard}>
                  <View style={styles.chatIconGrad}>
                    <Ionicons name="business" size={20} color="#695030" />
                  </View>
                  <View style={styles.chatInfo}>
                    <Text style={styles.chatName}>{conv.project_id ? projectMap.get(conv.project_id) || 'Project Chat' : 'Project Chat'}</Text>
                    <Text style={styles.chatPreview}>Tap to open conversation</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.neutral[300]} />
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Direct Messages */}
        {directChats.length > 0 && (
          <>
            <SectionLabel icon="person" text="Direct Messages" />
            {directChats.map((conv) => (
              <TouchableOpacity
                key={conv.id}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/(admin)/conversation', params: { conversationId: conv.id, title: directTitle(conv.id) } })}
              >
                <View style={styles.chatCard}>
                  <Avatar name={directTitle(conv.id)} size={44} />
                  <View style={styles.chatInfo}>
                    <Text style={styles.chatName}>{directTitle(conv.id)}</Text>
                    <Text style={styles.chatPreview}>Tap to open</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.neutral[300]} />
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {(!conversations || conversations.length === 0) && (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubbles-outline" size={40} color="#695030" />
            </View>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyText}>Messages from project chats and direct messages will appear here</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SectionLabel({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.sectionRow}>
      <Ionicons name={icon as any} size={13} color={colors.neutral[500]} />
      <Text style={styles.sectionLabel}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },

  // Header
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  headerLabel: { fontSize: 13, color: '#666', fontFamily: fontFamily.medium, letterSpacing: 0.2 },
  headerTitle: { fontSize: 32, color: '#1E1815', fontFamily: fontFamily.bold, letterSpacing: -0.5, marginTop: 2 },
  newBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 4px 12px rgba(0,0,0,0.05)' } as any,

  // Stats strip
  statsStrip: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: 'rgba(105,80,48,0.1)', boxShadow: '0px 4px 12px rgba(0,0,0,0.03)' } as any,
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, color: '#1E1815', fontFamily: fontFamily.bold },
  statLabel: { fontSize: 10, color: '#666', fontFamily: fontFamily.medium, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(105,80,48,0.1)' },

  // List
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100, paddingTop: spacing.lg, gap: spacing.sm },

  // Section
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.md, marginBottom: spacing.sm },
  sectionLabel: { fontSize: 11, fontFamily: fontFamily.semiBold, color: colors.neutral[500], textTransform: 'uppercase', letterSpacing: 0.8 },

  // Chat Card
  chatCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(105,80,48,0.08)',
    boxShadow: '0px 4px 16px rgba(0,0,0,0.03)',
  } as any,
  chatIconGrad: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F9F6F0', alignItems: 'center', justifyContent: 'center' },
  chatInfo: { flex: 1 },
  chatName: { fontSize: 15, fontFamily: fontFamily.semiBold, color: '#1E1815' },
  chatPreview: { fontSize: 12, color: colors.neutral[400], marginTop: 2 },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 80, gap: spacing.md },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(105,80,48,0.05)', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontFamily: fontFamily.semiBold, color: colors.neutral[400] },
  emptyText: { fontSize: 13, color: colors.neutral[300], textAlign: 'center', paddingHorizontal: 40 },
});
