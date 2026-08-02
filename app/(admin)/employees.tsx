import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { StatusChip, AssignProjectModal } from '../../src/components';
import { useEmployees, useEmployeeAssignments } from '../../src/hooks/useEmployees';
import { useProjects } from '../../src/hooks/useProjects';
import { colors } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import type { ProfileStatus } from '../../src/types';

const FILTERS: { label: string; value: ProfileStatus | 'all' }[] = [
  { label: 'All People', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Deactivated', value: 'inactive' },
  { label: 'On Leave', value: 'on_leave' },
];

const roleLabel: Record<string, string> = {
  owner: 'Owner', project_manager: 'Project Manager', hr: 'HR',
  accounts: 'Accounts', supervisor: 'Supervisor', worker: 'Worker',
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function EmployeesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: employees = [], refetch: refetchEmployees, isRefetching: loadingPeople } = useEmployees();
  const { data: assignments = [], refetch: refetchAssignments, isRefetching: loadingAssignments } = useEmployeeAssignments();
  const { data: projects = [] } = useProjects();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ProfileStatus | 'all'>('all');
  const [menuOpen, setMenuOpen] = useState(false);
  const [assignTargetEmployee, setAssignTargetEmployee] = useState<any>(null);
  const [actionSheetEmployee, setActionSheetEmployee] = useState<any>(null);

  const roster = useMemo(() => {
    const people = employees.filter(
      (p) => p.role !== 'client' &&
        (filter === 'all' || p.status === filter) &&
        (!search || p.full_name.toLowerCase().includes(search.toLowerCase()) || p.phone.includes(search))
    );
    const personMap = new Map(people.map((p) => [p.id, p]));
    const assigned = new Set(assignments.map((a) => a.profile_id));
    return {
      groups: projects
        .map((project) => ({
          project,
          entries: assignments
            .filter((a) => a.project_id === project.id)
            .map((a) => ({ person: personMap.get(a.profile_id), role: a.role_on_site }))
            .filter((x) => !!x.person),
        }))
        .filter((g) => g.entries.length),
      unassigned: people.filter((p) => !assigned.has(p.id)),
      count: people.length,
    };
  }, [employees, assignments, projects, filter, search]);

  return (
    <View style={styles.container}>
      {/* Light Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back-sharp" size={20} color="#1E1815" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.headerLabel}>{getGreeting()} 👋</Text>
            <Text style={styles.headerTitle}>Team Hub</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setMenuOpen(true)} activeOpacity={0.8}>
            <LinearGradient colors={['#5B4122', '#8B6840']} style={[StyleSheet.absoluteFill, { borderRadius: 22, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="add-sharp" size={22} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
          <StatChip icon="people-sharp" value={roster.count} label="Total" gradient={['#5B4122', '#8B6840']} />
          <StatChip icon="business-sharp" value={roster.groups.length} label="Active Sites" gradient={['#059669', '#10B981']} />
          <StatChip icon="time-sharp" value={roster.unassigned.length} label="Unassigned" gradient={['#D97706', '#F59E0B']} />
        </ScrollView>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-sharp" size={18} color="#695030" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search teams or people..."
            placeholderTextColor="#8B7E74"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle-sharp" size={18} color="#ccc" />
            </TouchableOpacity>
          ) : (
            <Ionicons name="options-sharp" size={18} color="#8B7E74" />
          )}
        </View>
      </View>

      {/* Filter chips */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.xs }}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              onPress={() => setFilter(f.value)}
              activeOpacity={0.8}
            >
              {filter === f.value ? (
                <LinearGradient colors={['#5B4122', '#8B6840']} style={styles.chip}>
                  <Text style={styles.chipTextActive}>{f.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{f.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loadingPeople || loadingAssignments}
            onRefresh={() => { refetchEmployees(); refetchAssignments(); }}
            tintColor={colors.primary}
          />
        }
      >
        {roster.groups.map(({ project, entries }) => (
          <View key={project.id} style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitleText}>{project.name}</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionCountText}>{entries.length} Assigned</Text>
              </View>
            </View>
            {entries.map(({ person, role }: any) => (
              <PersonCard
                key={person.id}
                person={person}
                siteRole={role}
                roleLabel={roleLabel}
                onPress={() => setActionSheetEmployee(person)}
                onAssign={() => setAssignTargetEmployee(person)}
              />
            ))}
          </View>
        ))}

        {!!roster.unassigned.length && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitleText, { color: '#9E4723' }]}>Unassigned / Deactivated</Text>
              <View style={[styles.sectionBadge, { backgroundColor: '#FDF2F0' }]}>
                <Text style={[styles.sectionCountText, { color: '#9E4723' }]}>{roster.unassigned.length} People</Text>
              </View>
            </View>
            {roster.unassigned.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                roleLabel={roleLabel}
                onPress={() => setActionSheetEmployee(person)}
                onAssign={() => setAssignTargetEmployee(person)}
              />
            ))}
          </View>
        )}

        {!roster.count && (
          <View style={styles.empty}>
            <Ionicons name="people-sharp" size={52} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>No people match this view</Text>
          </View>
        )}
      </ScrollView>

      {/* Employee Click Action Modal */}
      <Modal visible={!!actionSheetEmployee} transparent animationType="fade" onRequestClose={() => setActionSheetEmployee(null)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setActionSheetEmployee(null)}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{actionSheetEmployee?.full_name}</Text>

            <SheetItem
              icon="person-circle-sharp"
              title="View Full Profile"
              detail="Personal details, documents & assignments"
              onPress={() => {
                const emp = actionSheetEmployee;
                setActionSheetEmployee(null);
                router.push({ pathname: '/(admin)/employee-profile' as any, params: { id: emp?.id } });
              }}
            />
            <SheetItem
              icon="person-add-sharp"
              title="Assign to Site"
              detail="Allocate workspace site and role"
              onPress={() => {
                const emp = actionSheetEmployee;
                setActionSheetEmployee(null);
                setAssignTargetEmployee(emp);
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Quick Add Employee Floating Modal */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setMenuOpen(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Team Operations</Text>

            <SheetItem
              icon="person-add-sharp"
              title="Add New Employee"
              detail="Create new profile and generate credentials"
              onPress={() => { setMenuOpen(false); router.push('/(admin)/add-employee' as any); }}
            />
            <SheetItem
              icon="swap-horizontal-sharp"
              title="Assign Site Workers"
              detail="Batch allocate workforce across project sites"
              onPress={() => { setMenuOpen(false); router.push('/(admin)/assign-site' as any); }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Assign Modal */}
      {assignTargetEmployee && (
        <AssignProjectModal
          visible={!!assignTargetEmployee}
          employee={assignTargetEmployee}
          onClose={() => setAssignTargetEmployee(null)}
          onSuccess={() => {
            refetchEmployees();
            refetchAssignments();
          }}
        />
      )}
    </View>
  );
}

function StatChip({ icon, value, label, gradient }: any) {
  return (
    <View style={styles.statCardWrap}>
      <LinearGradient colors={['#FFFFFF', '#FDFBF7']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.statCard}>
        <View style={styles.statCardTop}>
          <LinearGradient colors={gradient} style={styles.statIconWrap}>
            <Ionicons name={icon as any} size={18} color="#fff" />
          </LinearGradient>
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </LinearGradient>
    </View>
  );
}

function PersonCard({ person, siteRole, roleLabel, onPress, onAssign }: any) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <LinearGradient colors={['#FFFFFF', '#FDFBF7']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.personCard}>
        <LinearGradient colors={['#5B4122', '#8B6840']} style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {person.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
          </Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.personName}>{person.full_name}</Text>
          <Text style={styles.personRole}>{siteRole || roleLabel[person.role] || person.role}</Text>
        </View>
        <StatusChip status={person.status} size="sm" />
        <TouchableOpacity
          style={styles.quickAssignBtn}
          onPress={(e) => {
            e.stopPropagation();
            if (onAssign) onAssign();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="person-add-sharp" size={20} color="#695030" />
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function SheetItem({ icon, title, detail, onPress }: any) {
  return (
    <TouchableOpacity style={styles.sheetItem} onPress={onPress} activeOpacity={0.7}>
      <LinearGradient colors={['#5B4122', '#8B6840']} style={styles.sheetIcon}>
        <Ionicons name={icon} size={20} color="#FFFFFF" />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={styles.sheetItemTitle}>{title}</Text>
        <Text style={styles.sheetItemDetail}>{detail}</Text>
      </View>
      <Ionicons name="chevron-forward-sharp" size={16} color={colors.neutral[300]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },

  // Header
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  headerLabel: { fontSize: 13, color: '#8B7E74', fontFamily: fontFamily.medium, letterSpacing: 0.2 },
  headerTitle: { fontSize: 32, color: '#1E1815', fontFamily: fontFamily.bold, letterSpacing: -0.5, marginTop: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#695030', alignItems: 'center', justifyContent: 'center', shadowColor: '#695030', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 },

  // Stats
  statsRow: { gap: spacing.md, marginBottom: spacing.lg, paddingBottom: spacing.sm },
  statCardWrap: { width: 110 },
  statCard: { backgroundColor: '#fff', borderRadius: 20, padding: spacing.md, shadowColor: '#695030', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 },
  statCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  statIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 24, fontFamily: fontFamily.bold, color: '#1E1815' },
  statLabel: { fontSize: 12, color: '#666', fontFamily: fontFamily.medium, marginTop: 2 },
  statLine: { height: 4, width: 24, borderRadius: 2, marginTop: spacing.sm },

  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: spacing.md, height: 50, gap: spacing.sm, borderWidth: 1, borderColor: 'rgba(105,80,48,0.1)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  searchInput: { flex: 1, fontSize: 14, color: '#1E1815', fontFamily: fontFamily.regular, padding: 0 },

  // Filters
  filterContainer: { marginBottom: spacing.sm },
  chip: { 
    height: 38, 
    paddingHorizontal: 20, 
    borderRadius: 19, 
    backgroundColor: '#F5EFE6',
    alignItems: 'center', 
    justifyContent: 'center',
    marginRight: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  chipActive: { 
    backgroundColor: '#695030',
    shadowColor: '#695030',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  chipText: { fontSize: 13, fontFamily: fontFamily.semiBold, color: '#8B7E74' },
  chipTextActive: { color: '#fff' },

  // List
  list: { paddingHorizontal: spacing.lg, paddingBottom: 120, paddingTop: spacing.md },

  // Section
  section: { marginBottom: spacing.xl },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs, marginBottom: spacing.md },
  sectionTitleText: { fontSize: 15, fontFamily: fontFamily.bold, color: '#695030', letterSpacing: -0.2 },
  sectionBadge: { backgroundColor: '#F5EFE6', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  sectionCountText: { fontSize: 11, fontFamily: fontFamily.bold, color: '#8B6840' },

  // Person Card
  personCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(105,80,48,0.08)',
    shadowColor: '#695030',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#EFEAE2', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontFamily: fontFamily.bold, color: '#695030' },
  personName: { fontSize: 15, fontFamily: fontFamily.bold, color: '#1E1815' },
  personRole: { fontSize: 12, color: '#8B7E74', marginTop: 2, textTransform: 'capitalize', fontFamily: fontFamily.medium },
  quickAssignBtn: { padding: spacing.xs, marginLeft: spacing.xs },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 80, gap: spacing.md },
  emptyText: { fontSize: 14, color: '#8B7E74', fontFamily: fontFamily.medium },

  // Bottom sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(20,16,12,0.4)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.xl, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: spacing.xl },
  sheetTitle: { fontSize: 20, fontFamily: fontFamily.bold, color: '#1E1815', marginBottom: spacing.lg },
  sheetItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  sheetIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: '#F9F6F0', alignItems: 'center', justifyContent: 'center' },
  sheetItemTitle: { fontSize: 15, fontFamily: fontFamily.bold, color: '#1E1815' },
  sheetItemDetail: { fontSize: 13, color: '#8B7E74', marginTop: 2, fontFamily: fontFamily.medium },
});
