import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, Avatar, StatusChip } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import { useEmployees } from '../../src/hooks/useEmployees';
import { usePendingMaterialRequests } from '../../src/hooks/useApprovals';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function SupervisorHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const firstName = profile?.full_name?.split(' ')[0] || 'Supervisor';

  const { data: projects, refetch: rP, isRefetching: r1 } = useProjects();
  const { data: employees, refetch: rE, isRefetching: r2 } = useEmployees();
  const { data: pendingMaterials } = usePendingMaterialRequests();

  const activeProject = (projects || [])[0];
  const workers = (employees || []).filter(e => e.role === 'worker');
  const activeWorkers = workers.filter(e => e.status === 'active');

  const onRefresh = () => { rP(); rE(); };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing['6xl'] }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={r1 || r2} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}, {firstName} 👋</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
        <Avatar name={profile?.full_name || 'S'} uri={profile?.avatar_url} size={44} />
      </View>

      {/* Today's Site */}
      {activeProject && (
        <Card style={styles.siteCard}>
          <View style={styles.siteHeader}>
            <View style={styles.siteInfo}>
              <Text style={styles.siteLabel}>Today's Site</Text>
              <Text style={styles.siteName}>{activeProject.name}</Text>
              <Text style={styles.siteDetail}>{activeProject.city} · {activeProject.stage}</Text>
            </View>
            <StatusChip status={activeProject.status} />
          </View>
        </Card>
      )}

      {/* Team Attendance */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>👷 Team Today</Text>
      </View>
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={[styles.statNum, { color: colors.success }]}>{activeWorkers.length}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statNum, { color: colors.warning }]}>{workers.filter(w => w.status === 'on_leave').length}</Text>
          <Text style={styles.statLabel}>On Leave</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statNum, { color: colors.info }]}>{workers.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </Card>
      </View>

      {/* Team Members */}
      {activeWorkers.slice(0, 5).map((w) => (
        <Card key={w.id} style={styles.workerCard}>
          <View style={styles.workerRow}>
            <Avatar name={w.full_name} uri={w.avatar_url} size={40} />
            <View style={styles.workerInfo}>
              <Text style={styles.workerName}>{w.full_name}</Text>
              <Text style={styles.workerMeta}>{w.worker_id || w.role}</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: w.status === 'active' ? colors.success : colors.neutral[300] }]} />
          </View>
        </Card>
      ))}

      {/* Materials */}
      {(pendingMaterials?.length || 0) > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📦 Pending Material Requests</Text>
          </View>
          {(pendingMaterials || []).slice(0, 3).map((m) => (
            <Card key={m.id} style={styles.materialCard}>
              <View style={styles.materialRow}>
                <Ionicons name="cube" size={20} color={colors.pending} />
                <View style={styles.materialInfo}>
                  <Text style={styles.materialName}>{m.material_name}</Text>
                  <Text style={styles.materialMeta}>Qty: {m.qty}{m.needed_by ? ` · By ${new Date(m.needed_by).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: colors.warningBg }]}>
                  <Text style={[styles.statusText, { color: colors.warning }]}>Pending</Text>
                </View>
              </View>
            </Card>
          ))}
        </>
      )}

      {/* Emergency Contacts */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🚨 Emergency Contacts</Text>
      </View>
      <Card style={styles.emergencyCard}>
        <EmergencyRow icon="shield" label="Site Safety Officer" phone="100" />
        <View style={styles.emergencyDivider} />
        <EmergencyRow icon="medkit" label="Ambulance" phone="108" />
        <View style={styles.emergencyDivider} />
        <EmergencyRow icon="alert-circle" label="National Emergency" phone="112" />
      </Card>
    </ScrollView>
  );
}

function EmergencyRow({ icon, label, phone }: { icon: string; label: string; phone: string }) {
  return (
    <View style={styles.emergencyRow}>
      <View style={styles.emergencyIconWrap}>
        <Ionicons name={icon as any} size={18} color={colors.error} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.emergencyLabel}>{label}</Text>
        <Text style={styles.emergencyPhone}>{phone}</Text>
      </View>
      <TouchableOpacity
        style={styles.emergencyCallBtn}
        onPress={() => Linking.openURL(`tel:${phone}`)}
        accessibilityLabel={`Call ${label}`}
        hitSlop={8}
      >
        <Ionicons name="call" size={18} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing['2xl'] },
  greeting: { ...typography.h4, color: colors.ink },
  date: { ...typography.bodySmall, color: colors.neutral[500], marginTop: 2 },
  siteCard: { padding: spacing.lg, marginBottom: spacing.xl },
  siteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  siteInfo: { flex: 1 },
  siteLabel: { ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.neutral[400], textTransform: 'uppercase', letterSpacing: 1 },
  siteName: { ...typography.h5, color: colors.ink, marginTop: spacing.xs },
  siteDetail: { ...typography.bodySmall, color: colors.neutral[500], marginTop: 2, textTransform: 'capitalize' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md, marginTop: spacing.md },
  sectionTitle: { ...typography.h6, color: colors.ink },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flex: 1, padding: spacing.md, alignItems: 'center' },
  statNum: { ...typography.h3 },
  statLabel: { ...typography.caption, color: colors.neutral[500] },
  workerCard: { padding: spacing.md, marginBottom: spacing.sm },
  workerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  workerInfo: { flex: 1 },
  workerName: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink },
  workerMeta: { ...typography.caption, color: colors.neutral[500] },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  materialCard: { padding: spacing.md, marginBottom: spacing.sm },
  materialRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  materialInfo: { flex: 1 },
  materialName: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink },
  materialMeta: { ...typography.caption, color: colors.neutral[500] },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  statusText: { ...typography.caption, fontFamily: fontFamily.semiBold },
  emergencyCard: { padding: spacing.md, marginBottom: spacing.xl },
  emergencyDivider: { height: 1, backgroundColor: colors.neutral[100], marginVertical: spacing.sm },
  emergencyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emergencyIconWrap: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.errorBg, alignItems: 'center', justifyContent: 'center' },
  emergencyLabel: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink },
  emergencyPhone: { ...typography.caption, color: colors.neutral[500] },
  emergencyCallBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center' },
});
