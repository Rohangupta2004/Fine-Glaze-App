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

import { useProjects, useDeleteProject } from '../../../src/hooks/useProjects';
import { colors } from '../../../src/theme/colors';
import { fontFamily } from '../../../src/theme/typography';
import { spacing, shadows, radius } from '../../../src/theme/spacing';
import { showAlert } from '../../../src/utils/alert';

export default function AdminProjectsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { intent } = useLocalSearchParams<{ intent?: string }>();
  const { data: projects, refetch, isRefetching } = useProjects();
  const deleteProject = useDeleteProject();
  const [search, setSearch] = useState('');

  const [filterStage, setFilterStage] = useState<'All' | 'Active' | 'Completed'>('All');

  const filtered = (projects || []).filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.city || '').toLowerCase().includes(search.toLowerCase());
    const isDone = (p.progress_pct || 0) >= 100;
    const matchStage = filterStage === 'All' || (filterStage === 'Completed' ? isDone : !isDone);
    return matchSearch && matchStage;
  });

  const totalProjects = (projects || []).length;
  const completedProjects = (projects || []).filter((p) => (p.progress_pct || 0) >= 100).length;
  const activeProjects = totalProjects - completedProjects;

  const handleDeleteProject = (e: any, projectId: string, projectName: string) => {
    if (e && e.stopPropagation) e.stopPropagation();
    showAlert(
      'Delete Project',
      `Are you sure you want to permanently delete "${projectName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProject.mutateAsync(projectId);
              showAlert('Project Deleted', `"${projectName}" was deleted successfully.`);
            } catch (err: any) {
              showAlert('Delete Error', err.message || 'Failed to delete project.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Brand Hero Header */}
      <LinearGradient
        colors={['#5B4122', '#7D5F3A', '#9A7B4F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.lg }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerLabel}>OVERVIEW</Text>
            <Text style={styles.headerTitle}>Project Hub</Text>
          </View>

          <TouchableOpacity
            style={styles.newProjectBtn}
            onPress={() => router.push('/(admin)/create-project' as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-sharp" size={18} color="#695030" />
            <Text style={styles.newProjectBtnText}>New Site</Text>
          </TouchableOpacity>
        </View>

        {intent && (
          <View style={styles.intentBanner}>
            <Ionicons name="information-circle-sharp" size={18} color="#FFF" />
            <Text style={styles.intentText}>
              Select a project to {intent === 'payment' ? 'add payment' : intent === 'task' ? 'create task' : 'request material'}
            </Text>
          </View>
        )}

        {/* Search Box */}
        <View style={styles.searchBar}>
          <Ionicons name="search-sharp" size={17} color="#695030" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects by name or location..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={12}>
              <Ionicons name="close-circle-sharp" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </LinearGradient>

      {/* KPI Stats Bar */}
      <View style={styles.kpiContainer}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>TOTAL SITES</Text>
          <Text style={styles.kpiValue}>{totalProjects}</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }]}>
          <Text style={[styles.kpiLabel, { color: '#2563EB' }]}>ACTIVE</Text>
          <Text style={[styles.kpiValue, { color: '#2563EB' }]}>{activeProjects}</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }]}>
          <Text style={[styles.kpiLabel, { color: '#16A34A' }]}>COMPLETED</Text>
          <Text style={[styles.kpiValue, { color: '#16A34A' }]}>{completedProjects}</Text>
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {(['All', 'Active', 'Completed'] as const).map((st) => {
          const isSel = filterStage === st;
          return (
            <TouchableOpacity
              key={st}
              onPress={() => setFilterStage(st)}
              activeOpacity={0.8}
            >
              {isSel ? (
                <LinearGradient
                  colors={['#5B4122', '#8B6840']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.filterChip, { borderWidth: 0 }]}
                >
                  <Text style={styles.filterChipTextActive}>{st}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipText}>{st}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

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
            <LinearGradient 
              colors={['#FFFFFF', '#FDFBF7']} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 1 }} 
              style={styles.projectCard}
            >
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
                      <LinearGradient
                        colors={['#5B4122', '#8B6840']}
                        style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
                      >
                        <Ionicons name="business-sharp" size={18} color="#FFFFFF" />
                      </LinearGradient>
                    )}
                  </View>
                  <View style={styles.projectInfo}>
                    <Text style={styles.projectName}>{project.name}</Text>
                    <Text style={styles.projectMeta}>
                      {[project.city, project.type, project.stage].filter(Boolean).join(' · ')}
                    </Text>
                  </View>

                  {/* Admin Delete Action */}
                  <TouchableOpacity
                    onPress={(e) => handleDeleteProject(e, project.id, project.name)}
                    style={styles.deleteBtn}
                    hitSlop={10}
                  >
                    <Ionicons name="trash-bin-sharp" size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>

                {/* Progress */}
                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <LinearGradient
                      colors={['#5B4122', '#8B6840', '#A88454']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: `${Math.max(project.progress_pct, 2)}%` as any }]}
                    />
                  </View>
                  <Text style={styles.progressText}>{project.progress_pct}%</Text>
                </View>

                {project.start_date && (
                  <View style={styles.dateRow}>
                    <Ionicons name="calendar-sharp" size={13} color="#8B6840" />
                    <Text style={styles.dateText}>
                      {new Date(project.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {project.expected_end_date && ` → ${new Date(project.expected_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                    </Text>
                  </View>
                )}
              </View>
            </LinearGradient>
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
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#3E2A18',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  headerLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontFamily: fontFamily.bold, letterSpacing: 0.8 },
  headerTitle: { fontSize: 26, color: '#FFF', fontFamily: fontFamily.bold, letterSpacing: -0.5, marginTop: 1 },
  newProjectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  newProjectBtnText: { fontSize: 12, fontFamily: fontFamily.bold, color: '#695030' },

  intentBanner: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  intentText: { color: '#FFF', fontFamily: fontFamily.medium, fontSize: 12 },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A', fontFamily: fontFamily.medium, padding: 0 },

  // KPI Section
  kpiContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiLabel: { fontSize: 9, fontFamily: fontFamily.bold, color: '#64748B', letterSpacing: 0.5 },
  kpiValue: { fontSize: 18, fontFamily: fontFamily.bold, color: '#0F172A', marginTop: 2 },

  // Filter Row
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: '#695030', borderColor: '#523E24' },
  filterChipText: { fontSize: 11, fontFamily: fontFamily.semiBold, color: '#475569' },
  filterChipTextActive: { color: '#FFFFFF', fontFamily: fontFamily.bold },

  // List
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing['6xl'], gap: spacing.md, paddingTop: spacing.md },

  // Project Card (Double-Bezel Architecture)
  projectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  projectContent: { flex: 1, padding: spacing.md + 2 },
  projectHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  projectIconWrap: {
    width: 44, height: 44,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  projectImage: { width: '100%', height: '100%' },
  projectInfo: { flex: 1 },
  projectName: { fontSize: 16, fontFamily: fontFamily.bold, color: '#0F172A' },
  projectMeta: { fontSize: 12, color: '#64748B', marginTop: 2, textTransform: 'capitalize', fontFamily: fontFamily.medium },
  
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: 8 },
  progressTrack: { flex: 1, height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12, fontFamily: fontFamily.bold, color: '#695030' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 11, color: '#64748B', fontFamily: fontFamily.medium },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyTitle: { fontSize: 16, fontFamily: fontFamily.semiBold, color: '#64748B' },
  emptyText: { fontSize: 12, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 40 },
});
