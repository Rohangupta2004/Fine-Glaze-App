import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, Avatar, Button, Input } from '../../src/components';
import { useEmployee, useUpdateEmployee } from '../../src/hooks/useEmployees';
import { useAttendanceHistory } from '../../src/hooks/useAttendance';
import { useMyTasks } from '../../src/hooks/useTasks';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

const TABS = ['Overview', 'Attendance', 'Tasks', 'Salary'] as const;
type Tab = typeof TABS[number];

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', project_manager: 'Project Manager', hr: 'HR',
  accounts: 'Accounts', supervisor: 'Supervisor', worker: 'Worker', client: 'Client',
};

export default function EmployeeProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: emp } = useEmployee(id);
  const { data: attendance } = useAttendanceHistory(id, 31);
  const { data: tasks } = useMyTasks(id);
  const [tab, setTab] = useState<Tab>('Overview');
  const updateEmployee = useUpdateEmployee();

  // ── Edit state ──
  const [editOpen, setEditOpen] = useState(false);
  const [ePhone, setEPhone] = useState('');
  const [eAddress, setEAddress] = useState('');
  const [eRate, setERate] = useState('');
  const [eRole, setERole] = useState('worker');

  const openEdit = () => {
    if (!emp) return;
    setEPhone(emp.phone || '');
    setEAddress(emp.address || '');
    setERate(emp.daily_rate != null ? String(emp.daily_rate) : '');
    setERole(emp.role);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!emp) return;
    try {
      await updateEmployee.mutateAsync({
        id: emp.id,
        updates: {
          phone: ePhone.trim(),
          address: eAddress.trim() || null,
          daily_rate: eRate ? Number(eRate) : null,
          role: eRole as any,
        } as any,
      });
      setEditOpen(false);
    } catch (e: any) {
      Alert.alert('Could not save', e?.message || 'Try again.');
    }
  };

  const toggleActive = () => {
    if (!emp) return;
    const deactivating = emp.status === 'active';
    Alert.alert(
      deactivating ? 'Deactivate employee?' : 'Reactivate employee?',
      deactivating
        ? `${emp.full_name} will no longer be able to use the app.`
        : `${emp.full_name} will regain app access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: deactivating ? 'Deactivate' : 'Reactivate',
          style: deactivating ? 'destructive' : 'default',
          onPress: () =>
            updateEmployee.mutate(
              { id: emp.id, updates: { status: deactivating ? 'inactive' : 'active' } as any },
              { onError: (e: any) => Alert.alert('Failed', e?.message || 'Try again.') },
            ),
        },
      ],
    );
  };

  if (!emp) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const presentDays = (attendance || []).filter(a => a.status === 'present').length;
  const leaveDays = (attendance || []).filter(a => a.status === 'leave').length;
  const pendingTasks = (tasks || []).filter(t => t.status === 'pending').length;
  const completedTasks = (tasks || []).filter(t => t.status === 'done').length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employee Profile</Text>
        <TouchableOpacity onPress={openEdit} hitSlop={12}>
          <Ionicons name="create-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['6xl'] }}>
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Avatar name={emp.full_name} uri={emp.avatar_url} size={64} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{emp.full_name}</Text>
              <Text style={styles.profileRole}>{ROLE_LABELS[emp.role] || emp.role}</Text>
              {emp.worker_id && <Text style={styles.profileId}>{emp.worker_id}</Text>}
            </View>
            <View style={[styles.statusBadge, {
              backgroundColor: emp.status === 'active' ? colors.successBg : emp.status === 'on_leave' ? colors.warningBg : colors.neutral[100]
            }]}>
              <Text style={[styles.statusText, {
                color: emp.status === 'active' ? colors.success : emp.status === 'on_leave' ? colors.warning : colors.neutral[500]
              }]}>{emp.status.replace('_', ' ')}</Text>
            </View>
          </View>
          <View style={styles.contactRow}>
            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={16} color={colors.neutral[500]} />
              <Text style={styles.contactText}>{emp.phone}</Text>
            </View>
            {emp.joining_date && (
              <View style={styles.contactItem}>
                <Ionicons name="calendar-outline" size={16} color={colors.neutral[500]} />
                <Text style={styles.contactText}>Since {new Date(emp.joining_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow} contentContainerStyle={{ gap: spacing.xs }}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tab Content */}
        {tab === 'Overview' && (
          <View style={styles.tabContent}>
            <View style={styles.quickStats}>
              <QuickStat icon="calendar" label="Present (30d)" value={presentDays} color={colors.success} />
              <QuickStat icon="airplane" label="Leave (30d)" value={leaveDays} color={colors.warning} />
              <QuickStat icon="list" label="Tasks" value={pendingTasks} color={colors.info} />
              <QuickStat icon="checkmark-done" label="Done" value={completedTasks} color={colors.success} />
            </View>
            {emp.address && (
              <Card style={styles.infoCard}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{emp.address}</Text>
              </Card>
            )}
            {emp.reporting_to && (
              <Card style={styles.infoCard}>
                <Text style={styles.infoLabel}>Reports To</Text>
                <Text style={styles.infoValue}>{emp.reporting_to}</Text>
              </Card>
            )}
          </View>
        )}

        {tab === 'Attendance' && (
          <View style={styles.tabContent}>
            {(attendance || []).slice(0, 15).map((a) => (
              <Card key={a.id} style={styles.attendanceCard}>
                <View style={styles.attendanceRow}>
                  <View style={[styles.attendanceDot, {
                    backgroundColor: a.status === 'present' ? colors.success : a.status === 'leave' ? colors.warning : a.status === 'half_day' ? colors.pending : colors.error,
                  }]} />
                  <View style={styles.attendanceInfo}>
                    <Text style={styles.attendanceDate}>
                      {new Date(a.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </Text>
                    <Text style={styles.attendanceTime}>
                      {a.check_in_at ? new Date(a.check_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      {a.check_out_at ? ` → ${new Date(a.check_out_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.attendanceStatus, {
                    color: a.status === 'present' ? colors.success : a.status === 'leave' ? colors.warning : colors.error,
                  }]}>{a.status.replace('_', ' ')}</Text>
                </View>
              </Card>
            ))}
            {(!attendance || attendance.length === 0) && <Text style={styles.emptyText}>No attendance records</Text>}
          </View>
        )}

        {tab === 'Tasks' && (
          <View style={styles.tabContent}>
            {(tasks || []).map((task) => (
              <Card key={task.id} style={styles.taskCard}>
                <View style={styles.taskRow}>
                  <View style={[styles.priorityDot, {
                    backgroundColor: task.priority === 'high' ? colors.error : task.priority === 'medium' ? colors.warning : colors.success,
                  }]} />
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    {task.level_zone && <Text style={styles.taskMeta}>{task.level_zone}</Text>}
                  </View>
                  <Text style={[styles.taskStatus, {
                    color: task.status === 'done' ? colors.success : task.status === 'blocked' ? colors.error : colors.warning,
                  }]}>{task.status}</Text>
                </View>
              </Card>
            ))}
            {(!tasks || tasks.length === 0) && <Text style={styles.emptyText}>No tasks assigned</Text>}
          </View>
        )}

        {tab === 'Salary' && (
          <View style={styles.tabContent}>
            <Card style={styles.salaryCard}>
              <Text style={styles.salaryLabel}>Daily Rate</Text>
              <Text style={styles.salaryValue}>₹{emp.daily_rate?.toLocaleString('en-IN') || '—'}</Text>
            </Card>
            <Card style={styles.salaryCard}>
              <Text style={styles.salaryLabel}>Present Days (Last 30)</Text>
              <Text style={styles.salaryValue}>{presentDays}</Text>
            </Card>
            <Card style={styles.salaryCard}>
              <Text style={styles.salaryLabel}>Estimated Payable</Text>
              <Text style={[styles.salaryValue, { color: colors.success }]}>
                ₹{emp.daily_rate ? (presentDays * emp.daily_rate).toLocaleString('en-IN') : '—'}
              </Text>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* ── Edit modal ── */}
      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Edit {emp.full_name}</Text>
              <TouchableOpacity onPress={() => setEditOpen(false)}>
                <Ionicons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Input label="Phone" value={ePhone} onChangeText={setEPhone} keyboardType="phone-pad" />
              <View style={styles.editGap} />
              <Input label="Address" value={eAddress} onChangeText={setEAddress} multiline />
              <View style={styles.editGap} />
              <Input label="Daily Rate (₹)" value={eRate} onChangeText={setERate} keyboardType="numeric" placeholder="e.g. 800" />
              <Text style={styles.editLabel}>Role</Text>
              <View style={styles.roleChips}>
                {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'client' && k !== 'owner').map(([value, label]) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.roleChip, eRole === value && styles.roleChipActive]}
                    onPress={() => setERole(value)}
                  >
                    <Text style={[styles.roleChipText, eRole === value && styles.roleChipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Button title="Save Changes" onPress={saveEdit} loading={updateEmployee.isPending} fullWidth />
              <View style={styles.editGap} />
              <Button
                title={emp.status === 'active' ? 'Deactivate Employee' : 'Reactivate Employee'}
                variant="secondary"
                onPress={() => { setEditOpen(false); setTimeout(toggleActive, 350); }}
                fullWidth
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function QuickStat({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <View style={styles.quickStatItem}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[styles.quickStatValue, { color }]}>{value}</Text>
      <Text style={styles.quickStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(26,22,17,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: '88%' },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md, gap: spacing.md },
  modalTitle: { ...typography.h4, color: colors.ink, flex: 1 },
  editGap: { height: spacing.md },
  editLabel: { ...typography.caption, fontFamily: fontFamily.medium, color: colors.neutral[600], marginTop: spacing.md, marginBottom: spacing.xs },
  roleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  roleChip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral[200], backgroundColor: colors.white },
  roleChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  roleChipText: { ...typography.bodySmall, color: colors.neutral[600] },
  roleChipTextActive: { color: colors.primary, fontFamily: fontFamily.semiBold },
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...typography.bodyMedium, color: colors.neutral[400] },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  headerTitle: { ...typography.h5, color: colors.ink },
  profileCard: { padding: spacing.xl, marginHorizontal: spacing.lg, marginBottom: spacing.md },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.lg },
  profileInfo: { flex: 1 },
  profileName: { ...typography.h4, color: colors.ink },
  profileRole: { ...typography.bodySmall, color: colors.neutral[500], textTransform: 'capitalize' },
  profileId: { ...typography.caption, color: colors.primary, marginTop: 2 },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full },
  statusText: { ...typography.caption, fontFamily: fontFamily.semiBold, textTransform: 'capitalize' },
  contactRow: { flexDirection: 'row', gap: spacing.xl },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  contactText: { ...typography.bodySmall, color: colors.neutral[600] },
  tabRow: { marginHorizontal: spacing.lg, marginBottom: spacing.lg, flexGrow: 0 },
  tab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.primary },
  tabText: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.neutral[500] },
  tabTextActive: { color: colors.white },
  tabContent: { paddingHorizontal: spacing.lg },
  quickStats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  quickStatItem: { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing.md, gap: 2 },
  quickStatValue: { ...typography.h5 },
  quickStatLabel: { ...typography.caption, color: colors.neutral[500], textAlign: 'center' },
  infoCard: { padding: spacing.lg, marginBottom: spacing.sm },
  infoLabel: { ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.neutral[400], marginBottom: spacing.xs },
  infoValue: { ...typography.bodyMedium, color: colors.ink },
  attendanceCard: { padding: spacing.md, marginBottom: spacing.sm },
  attendanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  attendanceDot: { width: 10, height: 10, borderRadius: 5 },
  attendanceInfo: { flex: 1 },
  attendanceDate: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink },
  attendanceTime: { ...typography.caption, color: colors.neutral[500] },
  attendanceStatus: { ...typography.caption, fontFamily: fontFamily.semiBold, textTransform: 'capitalize' },
  taskCard: { padding: spacing.md, marginBottom: spacing.sm },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  taskInfo: { flex: 1 },
  taskTitle: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink },
  taskMeta: { ...typography.caption, color: colors.neutral[500] },
  taskStatus: { ...typography.caption, fontFamily: fontFamily.semiBold, textTransform: 'capitalize' },
  salaryCard: { padding: spacing.lg, marginBottom: spacing.sm },
  salaryLabel: { ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.neutral[400], marginBottom: spacing.xs },
  salaryValue: { ...typography.h4, color: colors.ink },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400], textAlign: 'center', paddingVertical: spacing['3xl'] },
});
