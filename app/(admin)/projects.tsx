import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useProjects } from '../../src/hooks/useProjects';
import { colors } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/typography';
import { spacing, shadows, radius } from '../../src/theme/spacing';



export default function AdminProjectsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { intent } = useLocalSearchParams<{ intent?: string }>();
  const { data: projects, refetch, isRefetching } = useProjects();
  const [search, setSearch] = useState('');

  const filtered = (projects || []).filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.city || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Gradient Hero Header */}
      <LinearGradient
        colors={['#695030', '#7E6144', '#918050']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.xl }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerLabel}>Overview</Text>
            <Text style={styles.headerTitle}>Projects</Text>
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.headerCount}>{(projects || []).length}</Text>
            <Text style={styles.headerCountLabel}>Total</Text>
          </View>
        </View>

        {intent && (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: 12, borderRadius: 12, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="information-circle" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontFamily: fontFamily.medium, fontSize: 13 }}>
              Select a project to {intent === 'payment' ? 'add a payment' : intent === 'dpr' ? 'submit DPR' : intent === 'task' ? 'create a task' : 'request material'}
            </Text>
          </View>
        )}

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.neutral[500]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects..."
            placeholderTextColor={colors.neutral[400]}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={12}>
              <Ionicons name="close-circle" size={16} color={colors.neutral[300]} />
            </TouchableOpacity>
          ) : (
            <Ionicons name="filter" size={16} color={colors.neutral[500]} />
          )}
        </View>
      </LinearGradient>

      {/* Project List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {filtered.map((project) => (
          <TouchableOpacity
            key={project.id}
            activeOpacity={0.85}
            onPress={() => {
              const params: any = { id: project.id };
              if (intent) params.intent = intent;
              router.push({ pathname: '/(admin)/project-workspace' as any, params });
            }}
          >
            <View style={styles.projectCard}>
              <View style={styles.projectContent}>
                <View style={styles.projectHeader}>
                  <View style={styles.projectIconWrap}>
                    {project.image_url ? (
                      <Image
                        source={{ uri: project.image_url }}
                        style={styles.projectImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="business" size={18} color="#695030" />
                    )}
                  </View>
                  <View style={styles.projectInfo}>
                    <Text style={styles.projectName}>{project.name}</Text>
                    <Text style={styles.projectMeta}>
                      {[project.city, project.type, project.stage].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {project.status === 'completed' && (
                    <View style={styles.statusPill}>
                      <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                    </View>
                  )}
                </View>

                {/* Progress */}
                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <LinearGradient
                      colors={['#C8B79C', '#695030']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: `${Math.max(project.progress_pct, 2)}%` as any }]}
                    />
                  </View>
                  <Text style={styles.progressText}>{project.progress_pct}%</Text>
                </View>

                {project.start_date && (
                  <View style={styles.dateRow}>
                    <Ionicons name="calendar-outline" size={14} color={colors.neutral[400]} />
                    <Text style={styles.dateText}>
                      {new Date(project.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {project.expected_end_date && ` → ${new Date(project.expected_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="business-outline" size={52} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>{search ? 'No results' : 'No projects yet'}</Text>
            <Text style={styles.emptyText}>{search ? 'Try a different search term' : 'Create your first project to get started'}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },

  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    ...shadows.md,
  },
  headerGlow: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.lg },
  headerLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: fontFamily.medium, letterSpacing: 0.2 },
  headerTitle: { fontSize: 32, color: '#fff', fontFamily: fontFamily.bold, letterSpacing: -0.5, marginTop: 2 },
  headerMeta: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10 },
  headerCount: { fontSize: 24, color: '#fff', fontFamily: fontFamily.bold },
  headerCountLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: fontFamily.medium },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    gap: spacing.sm,
    ...shadows.sm,
  } as any,
  searchInput: { flex: 1, fontSize: 15, color: colors.ink, fontFamily: fontFamily.medium, padding: 0 },

  // List
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing['6xl'], gap: spacing.md, paddingTop: spacing.lg },

  // Project Card
  projectCard: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(105,80,48,0.08)',
    ...shadows.sm,
  } as any,
  projectContent: { flex: 1, padding: spacing.xl },
  projectHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  projectIconWrap: {
    width: 48, height: 48,
    borderRadius: radius.md,
    backgroundColor: '#F9F6F0',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  projectImage: { width: '100%', height: '100%' },
  projectInfo: { flex: 1 },
  projectName: { fontSize: 17, fontFamily: fontFamily.bold, color: '#1E1815' },
  projectMeta: { fontSize: 13, color: colors.neutral[500], marginTop: 2, textTransform: 'capitalize', fontFamily: fontFamily.medium },
  statusPill: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center', justifyContent: 'center',
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  progressTrack: { flex: 1, height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 13, fontFamily: fontFamily.bold, color: '#695030' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText: { fontSize: 13, color: colors.neutral[500], fontFamily: fontFamily.medium },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 80, gap: spacing.sm },
  emptyTitle: { fontSize: 17, fontFamily: fontFamily.semiBold, color: colors.neutral[400] },
  emptyText: { fontSize: 13, color: colors.neutral[300], textAlign: 'center', paddingHorizontal: 40 },
});
