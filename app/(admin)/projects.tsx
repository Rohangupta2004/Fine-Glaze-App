import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, StatusChip } from '../../src/components';
import { useProjects } from '../../src/hooks/useProjects';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import type { ProjectStatus } from '../../src/types';

const FILTERS: { label: string; value: ProjectStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'On Track', value: 'on_track' },
  { label: 'At Risk', value: 'at_risk' },
  { label: 'Delayed', value: 'delayed' },
  { label: 'Completed', value: 'completed' },
];

export default function AdminProjectsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: projects, refetch, isRefetching } = useProjects();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ProjectStatus | 'all'>('all');

  const filtered = (projects || []).filter((p) => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.city?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.title}>Projects</Text>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.neutral[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search projects..."
          placeholderTextColor={colors.neutral[400]}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.neutral[400]} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: spacing.sm }}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Project List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['6xl'] }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {filtered.map((project) => (
          <TouchableOpacity
            key={project.id}
            onPress={() => router.push({ pathname: '/(admin)/project-workspace' as any, params: { id: project.id } })}
          >
            <Card style={styles.projectCard} variant="interactive">
              <View style={styles.projectHeader}>
                <View style={styles.projectIcon}>
                  <Ionicons name="business" size={20} color={colors.primary} />
                </View>
                <View style={styles.projectInfo}>
                  <Text style={styles.projectName}>{project.name}</Text>
                  <Text style={styles.projectMeta}>
                    {[project.city, project.type, project.stage].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <StatusChip status={project.status} />
              </View>
              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${project.progress_pct}%` }]} />
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
            </Card>
          </TouchableOpacity>
        ))}
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="business-outline" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>{search ? 'No projects match your search' : 'No projects yet'}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  title: { ...typography.h3, color: colors.ink, marginBottom: spacing.lg },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.neutral[200],
  },
  searchInput: { flex: 1, ...typography.bodyMedium, color: colors.ink, padding: 0 },
  filterRow: { marginBottom: spacing.lg, flexGrow: 0 },
  filterChip: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.neutral[200],
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.neutral[600] },
  filterTextActive: { color: colors.white },
  projectCard: { padding: spacing.lg, marginBottom: spacing.md },
  projectHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  projectIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primary + '10', alignItems: 'center', justifyContent: 'center' },
  projectInfo: { flex: 1 },
  projectName: { ...typography.h6, color: colors.ink },
  projectMeta: { ...typography.caption, color: colors.neutral[500], marginTop: 2, textTransform: 'capitalize' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  progressTrack: { flex: 1, height: 6, backgroundColor: colors.neutral[100], borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  progressText: { ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.primary, width: 36, textAlign: 'right' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dateText: { ...typography.caption, color: colors.neutral[500] },
  empty: { alignItems: 'center', paddingVertical: spacing['5xl'], gap: spacing.md },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400] },
});
