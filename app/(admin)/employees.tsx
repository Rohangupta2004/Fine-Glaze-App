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

import { Card, Avatar, StatusChip, ListSkeleton, EmptyState, emptyStates } from '../../src/components';
import { useEmployees } from '../../src/hooks/useEmployees';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import type { ProfileStatus } from '../../src/types';

const FILTERS: { label: string; value: ProfileStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'On Leave', value: 'on_leave' },
  { label: 'Inactive', value: 'inactive' },
];

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  project_manager: 'Project Manager',
  hr: 'HR',
  accounts: 'Accounts',
  supervisor: 'Supervisor',
  worker: 'Worker',
  client: 'Client',
};

export default function EmployeesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: employees, refetch, isRefetching, isLoading } = useEmployees();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ProfileStatus | 'all'>('all');

  const filtered = (employees || []).filter((e) => {
    if (e.role === 'client') return false; // Clients shown separately
    if (filter !== 'all' && e.status !== filter) return false;
    if (search && !e.full_name.toLowerCase().includes(search.toLowerCase()) && !e.phone.includes(search)) return false;
    return true;
  });

  const grouped = filtered.reduce((acc, emp) => {
    const role = ROLE_LABELS[emp.role] || emp.role;
    if (!acc[role]) acc[role] = [];
    acc[role].push(emp);
    return acc;
  }, {} as Record<string, typeof filtered>);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Employees</Text>
        <TouchableOpacity onPress={() => router.push('/(admin)/add-employee' as any)}>
          <Ionicons name="person-add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{(employees || []).filter(e => e.role !== 'client').length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.success }]}>{(employees || []).filter(e => e.status === 'active' && e.role !== 'client').length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.warning }]}>{(employees || []).filter(e => e.status === 'on_leave').length}</Text>
          <Text style={styles.statLabel}>On Leave</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.neutral[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone..."
          placeholderTextColor={colors.neutral[400]}
          value={search}
          onChangeText={setSearch}
        />
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

      {/* Employee List grouped by role */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['6xl'] }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {Object.entries(grouped).map(([role, emps]) => (
          <View key={role}>
            <Text style={styles.groupTitle}>{role} ({emps.length})</Text>
            {emps.map((emp) => (
              <TouchableOpacity
                key={emp.id}
                onPress={() => router.push({ pathname: '/(admin)/employee-profile' as any, params: { id: emp.id } })}
              >
                <Card style={styles.empCard} variant="interactive">
                  <View style={styles.empRow}>
                    <Avatar name={emp.full_name} uri={emp.avatar_url} size={44} />
                    <View style={styles.empInfo}>
                      <Text style={styles.empName}>{emp.full_name}</Text>
                      <Text style={styles.empDetail}>
                        {emp.worker_id ? `${emp.worker_id} · ` : ''}{emp.phone}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: emp.status === 'active' ? colors.success : emp.status === 'on_leave' ? colors.warning : colors.neutral[300] }
                    ]} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        ))}
        {isLoading ? (
          <ListSkeleton count={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            {...(search ? emptyStates.search : emptyStates.employees)}
            actionLabel={!search ? 'Add Employee' : undefined}
            onAction={!search ? () => router.push('/(admin)/add-employee' as any) : undefined}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  title: { ...typography.h4, color: colors.ink },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  statItem: { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing.md },
  statNum: { ...typography.h4, color: colors.ink },
  statLabel: { ...typography.caption, color: colors.neutral[500] },
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
  groupTitle: {
    ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.neutral[400],
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.md,
  },
  empCard: { padding: spacing.md, marginBottom: spacing.sm },
  empRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  empInfo: { flex: 1 },
  empName: { ...typography.h6, color: colors.ink },
  empDetail: { ...typography.caption, color: colors.neutral[500], marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  empty: { alignItems: 'center', paddingVertical: spacing['5xl'], gap: spacing.md },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400] },
});
