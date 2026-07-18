/**
 * Project Workspace — Admin / PM
 * Full-featured project hub with all PRD tabs.
 * Tabs: Overview · Tasks · Employees · Attendance · DPR · Photos · Documents
 *       Materials · Expenses · Payments · Communication · Timeline · Reports
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';

import { Card, StatusChip, Avatar, Button, GradientCard, ProgressRing } from '../../src/components';
import { useProject } from '../../src/hooks/useProjects';
import { useEmployees } from '../../src/hooks/useEmployees';
import { useProjectDprs } from '../../src/hooks/useDpr';
import { useProjectPayments, useUpdatePayment, useCreatePayment, useDeletePayment } from '../../src/hooks/usePayments';
import { useMaterialRequests } from '../../src/hooks/useMaterials';
import { useDocuments } from '../../src/hooks/useDocuments';
import { useProjectAttendance, TeamAttendanceRow } from '../../src/hooks/useAttendance';
import { useProjectTasks, useUpdateTaskStatus, useCreateTask } from '../../src/hooks/useTasks';
import { useProjectExpenses, useAddExpense } from '../../src/hooks/useExpenses';
import { useMyConversations } from '../../src/hooks/useConversations';
import { useAuthStore } from '../../src/stores/authStore';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius, shadows } from '../../src/theme/spacing';
import type { Task, Dpr, DocumentRow, Expense, Payment, MaterialRequest, Attendance } from '../../src/types';

// ── Tab Definition ────────────────────────────────────────────────────────────

const TABS = [
  'Overview', 'Tasks', 'Employees', 'Attendance',
  'DPR', 'Photos', 'Documents', 'Materials',
  'Expenses', 'Payments', 'Communication', 'Timeline', 'Reports',
] as const;
type Tab = typeof TABS[number];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(date: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', opts || { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtShort(date: string | null) {
  return fmt(date, { day: 'numeric', month: 'short' });
}

function fmtINR(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// ── Shared Sub-components ─────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={16} color={colors.neutral[400]} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function StatBox({ label, value, icon, color, onPress }: { label: string; value: string; icon: string; color: string; onPress?: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ flex: 1 }} disabled={!onPress}>
      <Card style={styles.statBox}>
        <Ionicons name={icon as any} size={20} color={color} />
        <Text style={[styles.statBoxValue, { color }]}>{value}</Text>
        <Text style={styles.statBoxLabel}>{label}</Text>
      </Card>
    </TouchableOpacity>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon as any} size={40} color={colors.neutral[300]} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
      {action && onAction && (
        <TouchableOpacity style={styles.sectionAction} onPress={onAction}>
          <Ionicons name="add-circle" size={20} color={colors.primary} />
          <Text style={styles.sectionActionText}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function StatusBadge({ status, map }: { status: string; map?: Record<string, { color: string; bg: string }> }) {
  const defaultMap: Record<string, { color: string; bg: string }> = {
    pending: { color: colors.warning, bg: colors.warningBg },
    submitted: { color: colors.info, bg: colors.infoBg },
    approved: { color: colors.success, bg: colors.successBg },
    rejected: { color: colors.error, bg: colors.errorBg },
    paid: { color: colors.success, bg: colors.successBg },
    done: { color: colors.success, bg: colors.successBg },
    blocked: { color: colors.error, bg: colors.errorBg },
    ordered: { color: colors.info, bg: colors.infoBg },
    present: { color: colors.success, bg: colors.successBg },
    absent: { color: colors.error, bg: colors.errorBg },
    leave: { color: colors.warning, bg: colors.warningBg },
    half_day: { color: colors.info, bg: colors.infoBg },
    draft: { color: colors.neutral[600], bg: colors.neutral[100] },
  };
  const m = map || defaultMap;
  const cfg = m[status] || { color: colors.neutral[600], bg: colors.neutral[100] };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{status.replace('_', ' ')}</Text>
    </View>
  );
}

// ── Tab Sections ──────────────────────────────────────────────────────────────

// Overview
function OverviewTab({
  project,
  employees,
  payments,
  materialReqs,
  tasks,
  onTabChange,
}: {
  project: any;
  employees: any[];
  payments: Payment[];
  materialReqs: MaterialRequest[];
  tasks: Task[];
  onTabChange: (tab: any) => void;
}) {
  const totalBilled = payments.reduce((s, p) => s + p.amount, 0);
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pendingMaterials = materialReqs.filter(m => m.status === 'pending');
  const openTasks = tasks.filter(t => t.status === 'pending');
  const payPct = totalBilled > 0 ? Math.round(totalPaid / totalBilled * 100) : 0;

  return (
    <View style={ovStyles.content}>
      {/* Hero: ring on top, meta grid below */}
      <View style={ovStyles.glassCard}>
        <View style={ovStyles.heroCard}>
          <View style={ovStyles.gaugeWrap}>
            <ProgressRing
              progress={project.progress_pct || 0}
              size={132}
              strokeWidth={10}
              startColor="#A9713F"
              endColor="#6B4423"
              trackColor="rgba(139,94,52,0.14)"
              showLabel={false}
            />
            <View style={ovStyles.gaugeLabel}>
              <Text style={ovStyles.gaugePct}>{project.progress_pct || 0}%</Text>
              <Text style={ovStyles.gaugeSub}>Complete</Text>
            </View>
          </View>

          <View style={ovStyles.metaDivider} />

          <View style={ovStyles.metaGrid}>
            <View style={ovStyles.metaItem}>
              <View style={[ovStyles.metaIcon, { backgroundColor: '#FCF0DA' }]}>
                <Ionicons name="layers" size={14} color="#B8860B" />
              </View>
              <View>
                <Text style={ovStyles.metaTextLabel}>Stage</Text>
                <Text style={[ovStyles.metaTextValue, { color: '#8B8680', fontFamily: fontFamily.medium }]}>{project.stage || '—'}</Text>
              </View>
            </View>
            <View style={ovStyles.metaItem}>
              <View style={[ovStyles.metaIcon, { backgroundColor: '#FCF0DA' }]}>
                <Ionicons name="location" size={14} color="#B8860B" />
              </View>
              <View>
                <Text style={ovStyles.metaTextLabel}>City</Text>
                <Text style={ovStyles.metaTextValue}>{project.city || '—'}</Text>
              </View>
            </View>
            <View style={ovStyles.metaItem}>
              <View style={[ovStyles.metaIcon, { backgroundColor: '#FCF0DA' }]}>
                <Ionicons name="calendar" size={14} color="#B8860B" />
              </View>
              <View>
                <Text style={ovStyles.metaTextLabel}>Start</Text>
                <Text style={ovStyles.metaTextValue}>{fmt(project.start_date)}</Text>
              </View>
            </View>
            <View style={ovStyles.metaItem}>
              <View style={[ovStyles.metaIcon, { backgroundColor: '#FCF0DA' }]}>
                <Ionicons name="flag" size={14} color="#B8860B" />
              </View>
              <View>
                <Text style={ovStyles.metaTextLabel}>End</Text>
                <Text style={ovStyles.metaTextValue}>{fmt(project.expected_end_date)}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* stat cards: 2x2, horizontal layout */}
      <View style={ovStyles.statsGrid}>
        <TouchableOpacity style={ovStyles.statCardGlass} activeOpacity={0.7} onPress={() => onTabChange('Employees')}>
          <View style={[ovStyles.statIcon, { backgroundColor: '#E8EEFC' }]}>
            <Ionicons name="people" size={19} color="#3D6FE0" />
          </View>
          <View>
            <Text style={ovStyles.statValue}>{employees.length}</Text>
            <Text style={ovStyles.statLabel}>Team</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={ovStyles.statCardGlass} activeOpacity={0.7} onPress={() => onTabChange('Tasks')}>
          <View style={[ovStyles.statIcon, { backgroundColor: '#FCF0DA' }]}>
            <Ionicons name="checkmark-circle" size={19} color="#B8860B" />
          </View>
          <View>
            <Text style={ovStyles.statValue}>{openTasks.length}</Text>
            <Text style={ovStyles.statLabel}>Tasks</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={ovStyles.statCardGlass} activeOpacity={0.7} onPress={() => onTabChange('Payments')}>
          <View style={[ovStyles.statIcon, { backgroundColor: '#E4F5E9' }]}>
            <Ionicons name="cash" size={19} color="#3FA65B" />
          </View>
          <View>
            <Text style={ovStyles.statValue}>₹{(totalPaid / 100000).toFixed(1)}L</Text>
            <Text style={ovStyles.statLabel}>Payments</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={ovStyles.statCardGlass} activeOpacity={0.7} onPress={() => onTabChange('Materials')}>
          <View style={[ovStyles.statIcon, { backgroundColor: '#FBE6E1' }]}>
            <Ionicons name="cube" size={19} color="#D6503A" />
          </View>
          <View>
            <Text style={ovStyles.statValue}>{pendingMaterials.length}</Text>
            <Text style={ovStyles.statLabel}>Materials</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* payment progress */}
      <View style={ovStyles.sectionCardGlass}>
        <View style={ovStyles.sectionHead}>
          <View style={[ovStyles.sectionIcon, { backgroundColor: '#FCF0DA' }]}>
            <Ionicons name="wallet" size={14} color="#B8860B" />
          </View>
          <Text style={ovStyles.sectionTitle}>Payment Progress</Text>
        </View>
        <View style={ovStyles.trackBar}>
          <LinearGradient
            colors={['#E8A93A', '#f3c465']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[ovStyles.trackFill, { width: `${Math.max(payPct, 2)}%` as any }]}
          />
        </View>
        <Text style={ovStyles.trackCaption}>
          <Text style={{ fontWeight: '700', color: '#2A241D' }}>{fmtINR(totalPaid)}</Text> collected of <Text style={{ fontWeight: '700', color: '#2A241D' }}>{fmtINR(totalBilled)}</Text> billed
        </Text>
      </View>

      {/* site address */}
      {!!project.address && (
        <View style={ovStyles.sectionCardGlass}>
          <View style={ovStyles.sectionHead}>
            <View style={[ovStyles.sectionIcon, { backgroundColor: '#FBE6E1' }]}>
              <Ionicons name="location" size={14} color="#D6503A" />
            </View>
            <Text style={ovStyles.sectionTitle}>Site Address</Text>
          </View>
          <Text style={ovStyles.addressText}>{project.address}</Text>
        </View>
      )}
    </View>
  );
}

// Tasks
function TasksTab({
  tasks,
  employees,
  projectId,
  currentUserId,
}: {
  tasks: Task[];
  employees: any[];
  projectId: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const updateStatus = useUpdateTaskStatus();
  const createTask = useCreateTask();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newAssignee, setNewAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'done' | 'blocked'>('all');

  const filtered = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus);

  const employeeMap = useMemo(
    () => new Map(employees.map(e => [e.id, e.full_name])),
    [employees]
  );

  async function handleAdd() {
    if (!newTitle.trim()) return;
    try {
      await createTask.mutateAsync({
        projectId,
        title: newTitle.trim(),
        priority: newPriority,
        createdBy: currentUserId,
        assignedTo: newAssignee || null,
      });
      setNewTitle('');
      setNewAssignee('');
      setShowAdd(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create task');
    }
  }

  async function handleToggle(task: Task) {
    const next = task.status === 'done' ? 'pending' : 'done';
    try {
      await updateStatus.mutateAsync({ taskId: task.id, status: next });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update task');
    }
  }

  const priorityColor: Record<string, string> = {
    high: colors.error,
    medium: colors.warning,
    low: colors.success,
  };

  return (
    <>
      <SectionHeader title="Project Tasks" action="Add Task" onAction={() => setShowAdd(true)} />

      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {(['all', 'pending', 'done', 'blocked'] as const).map(s => (
            <TouchableOpacity
              key={s}
              onPress={() => setFilterStatus(s)}
              style={[styles.filterPill, filterStatus === s && styles.filterPillActive]}
            >
              <Text style={[styles.filterPillText, filterStatus === s && styles.filterPillTextActive]}>
                {s === 'all' ? `All (${tasks.length})` : s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>New Task</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Task title..."
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />
            <Text style={[typography.caption, { color: colors.neutral[500], marginBottom: spacing.sm }]}>Priority</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
              {(['high', 'medium', 'low'] as const).map(p => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setNewPriority(p)}
                  style={[styles.filterPill, newPriority === p && { backgroundColor: priorityColor[p] }]}
                >
                  <Text style={[styles.filterPillText, newPriority === p && { color: colors.white }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[typography.caption, { color: colors.neutral[500], marginBottom: spacing.sm }]}>Assign To</Text>
            <View style={[styles.pickerContainer, { marginBottom: spacing.lg }]}>
              <Picker
                selectedValue={newAssignee}
                onValueChange={(val: string) => setNewAssignee(val)}
                style={styles.picker}
              >
                <Picker.Item label="Unassigned" value="" color={colors.neutral[500]} />
                {employees.map(emp => (
                  <Picker.Item key={emp.id} label={emp.full_name} value={emp.id} color={colors.ink} />
                ))}
              </Picker>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button title="Cancel" variant="tertiary" onPress={() => { setShowAdd(false); setNewAssignee(''); }} style={{ flex: 1 }} />
              <Button title="Add Task" onPress={handleAdd} loading={createTask.isPending} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {filtered.length === 0 && <EmptyState icon="checkmark-circle-outline" text="No tasks yet — tap Add Task to create one" />}
      {filtered.map(task => (
        <Card key={task.id} style={styles.listCard}>
          <View style={styles.listRow}>
            <TouchableOpacity
              onPress={() => handleToggle(task)}
              hitSlop={8}
              disabled={updateStatus.isPending}
            >
              <Ionicons
                name={task.status === 'done' ? 'checkmark-circle' : task.status === 'blocked' ? 'close-circle' : 'ellipse-outline'}
                size={24}
                color={task.status === 'done' ? colors.success : task.status === 'blocked' ? colors.error : colors.neutral[300]}
              />
            </TouchableOpacity>
            <View style={styles.listInfo}>
              <Text style={[styles.listTitle, task.status === 'done' && { textDecorationLine: 'line-through', color: colors.neutral[400] }]}>
                {task.title}
              </Text>
              <Text style={styles.listSubtitle}>
                {task.level_zone ? `${task.level_zone} · ` : ''}
                {task.assigned_to ? (
                  <Text 
                    style={{ color: colors.primary, textDecorationLine: 'underline' }}
                    onPress={() => router.push({ pathname: '/(admin)/employee-profile' as any, params: { id: task.assigned_to } })}
                  >
                    {employeeMap.get(task.assigned_to) || 'Assigned'}
                  </Text>
                ) : 'Unassigned'}
                {task.window_start ? ` · Due ${fmtShort(task.window_start)}` : ''}
              </Text>
            </View>
            <View style={[styles.priorityDot, { backgroundColor: priorityColor[task.priority] }]} />
          </View>
        </Card>
      ))}
    </>
  );
}

// Employees
function EmployeesTab({ employees, router }: { employees: any[]; router: any }) {
  const teamMembers = employees.filter(e => e.role !== 'client');
  const byRole = useMemo(() => {
    const groups: Record<string, any[]> = {};
    teamMembers.forEach(e => {
      const r = e.role || 'other';
      if (!groups[r]) groups[r] = [];
      groups[r].push(e);
    });
    return groups;
  }, [teamMembers]);

  return (
    <>
      <SectionHeader title={`Team Members (${teamMembers.length})`} />
      {Object.entries(byRole).map(([role, members]) => (
        <View key={role}>
          <Text style={styles.groupLabel}>{role.replace('_', ' ').toUpperCase()}</Text>
          {members.map(emp => (
            <TouchableOpacity
              key={emp.id}
              onPress={() => router.push({ pathname: '/(admin)/employee-profile' as any, params: { id: emp.id } })}
            >
              <Card style={styles.listCard}>
                <View style={styles.listRow}>
                  <Avatar name={emp.full_name} uri={emp.avatar_url} size={40} />
                  <View style={styles.listInfo}>
                    <Text style={styles.listTitle}>{emp.full_name}</Text>
                    <Text style={styles.listSubtitle}>
                      {emp.worker_id ? `ID: ${emp.worker_id}` : ''}
                      {emp.phone ? (emp.worker_id ? ` · ${emp.phone}` : emp.phone) : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={[styles.statusDot, { backgroundColor: emp.status === 'active' ? colors.success : colors.neutral[300] }]} />
                    <Ionicons name="chevron-forward" size={16} color={colors.neutral[300]} />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      ))}
      {teamMembers.length === 0 && <EmptyState icon="people-outline" text="No team members assigned" />}
    </>
  );
}

// Attendance
function AttendanceTab({ projectId }: { projectId: string }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const { data: rows, isLoading, refetch, isRefetching } = useProjectAttendance(projectId, date);

  const dateFmt = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  function shiftDate(delta: number) {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  }

  const present = (rows || []).filter(r => r.attendance?.status === 'present').length;
  const absent = (rows || []).filter(r => !r.attendance || r.attendance.status === 'absent').length;

  return (
    <>
      {/* Date Navigator */}
      <Card style={styles.dateNav}>
        <TouchableOpacity onPress={() => shiftDate(-1)} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.dateNavLabel}>{dateFmt}</Text>
        <TouchableOpacity onPress={() => shiftDate(1)} hitSlop={8} disabled={date >= new Date().toISOString().slice(0, 10)}>
          <Ionicons name="chevron-forward" size={20} color={date >= new Date().toISOString().slice(0, 10) ? colors.neutral[300] : colors.primary} />
        </TouchableOpacity>
      </Card>

      {/* Summary */}
      <View style={styles.quickStatsRow}>
        <StatBox label="Present" value={present.toString()} icon="checkmark-circle" color={colors.success} />
        <StatBox label="Absent" value={absent.toString()} icon="close-circle" color={colors.error} />
        <StatBox label="Total" value={(rows || []).length.toString()} icon="people" color={colors.info} />
      </View>

      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing['4xl'] }} />}

      {!isLoading && (rows || []).map(({ profile, attendance }) => (
        <Card key={profile.id} style={styles.listCard}>
          <View style={styles.listRow}>
            <Avatar name={profile.full_name} uri={profile.avatar_url} size={36} />
            <View style={styles.listInfo}>
              <Text style={styles.listTitle}>{profile.full_name}</Text>
              <Text style={styles.listSubtitle}>
                {attendance?.check_in_at
                  ? `In: ${new Date(attendance.check_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Not checked in'}
                {attendance?.check_out_at
                  ? ` · Out: ${new Date(attendance.check_out_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                  : ''}
              </Text>
            </View>
            {attendance ? (
              <StatusBadge status={attendance.status} />
            ) : (
              <View style={[styles.badge, { backgroundColor: colors.neutral[100] }]}>
                <Text style={[styles.badgeText, { color: colors.neutral[500] }]}>absent</Text>
              </View>
            )}
          </View>
        </Card>
      ))}
      {!isLoading && (rows || []).length === 0 && (
        <EmptyState icon="calendar-outline" text="No attendance data for this date" />
      )}
    </>
  );
}

// DPR
function DprTab({ dprs, employees }: { dprs: Dpr[]; employees: any[] }) {
  const employeeMap = useMemo(
    () => new Map(employees.map(e => [e.id, e.full_name])),
    [employees]
  );

  const statusColors: Record<string, { color: string; bg: string }> = {
    draft: { color: colors.neutral[600], bg: colors.neutral[100] },
    submitted: { color: colors.info, bg: colors.infoBg },
    approved: { color: colors.success, bg: colors.successBg },
    rejected: { color: colors.error, bg: colors.errorBg },
  };

  return (
    <>
      <SectionHeader title={`Daily Progress Reports (${dprs.length})`} />
      {dprs.length === 0 && <EmptyState icon="document-text-outline" text="No DPRs submitted for this project yet" />}
      {dprs.map(dpr => (
        <Card key={dpr.id} style={styles.listCard}>
          <View style={styles.listRow}>
            <View style={[styles.iconBox, { backgroundColor: statusColors[dpr.status]?.bg || colors.neutral[100] }]}>
              <Ionicons name="document-text" size={20} color={statusColors[dpr.status]?.color || colors.neutral[600]} />
            </View>
            <View style={styles.listInfo}>
              <Text style={styles.listTitle}>
                {fmt(dpr.date, { day: 'numeric', month: 'short', year: 'numeric' })}
                {dpr.work_type ? ` — ${dpr.work_type}` : ''}
              </Text>
              <Text style={styles.listSubtitle} numberOfLines={2}>
                {dpr.work_done}
              </Text>
              <Text style={[styles.listSubtitle, { marginTop: 2 }]}>
                By: {employeeMap.get(dpr.submitted_by) || dpr.submitted_by}
                {dpr.level_zone ? ` · ${dpr.level_zone}` : ''}
              </Text>
            </View>
            <StatusBadge status={dpr.status} />
          </View>
        </Card>
      ))}
    </>
  );
}

// Photos (from DPR media — show placeholder with DPR count as signal)
function PhotosTab({ dprs }: { dprs: Dpr[] }) {
  // Photos are stored as DprMedia linked to DPR IDs.
  // Without a heavy join query, we show DPR stubs with photo indicators.
  const dprsWithPhotos = dprs; // All DPRs potentially have photos

  return (
    <>
      <SectionHeader title="Site Photos" />
      {dprsWithPhotos.length === 0 && (
        <EmptyState icon="images-outline" text="No photos uploaded yet — workers attach photos with DPRs" />
      )}
      {dprsWithPhotos.length > 0 && (
        <Card style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Ionicons name="images" size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle}>Photos from {dprsWithPhotos.length} DPR{dprsWithPhotos.length !== 1 ? 's' : ''}</Text>
              <Text style={styles.listSubtitle}>
                Site photos are attached to Daily Progress Reports.
                Open a DPR to view its photos.
              </Text>
            </View>
          </View>
        </Card>
      )}
      <Card style={{ ...styles.sectionCard, backgroundColor: colors.infoBg }}>
        <Text style={[typography.caption, { color: colors.info }]}>
          💡 Workers upload site photos when submitting their daily progress reports. Photos are linked to specific work completed each day.
        </Text>
      </Card>
    </>
  );
}

// Documents
function DocumentsTab({ documents }: { documents: DocumentRow[] }) {
  const grouped = useMemo(() => {
    const g: Record<string, DocumentRow[]> = {};
    documents.forEach(d => {
      const cat = d.category || 'other';
      if (!g[cat]) g[cat] = [];
      g[cat].push(d);
    });
    return g;
  }, [documents]);

  return (
    <>
      <SectionHeader title={`Documents (${documents.length})`} />
      {documents.length === 0 && <EmptyState icon="folder-open-outline" text="No documents uploaded yet" />}
      {Object.entries(grouped).map(([cat, docs]) => (
        <View key={cat}>
          <Text style={styles.groupLabel}>{cat.replace('_', ' ').toUpperCase()}</Text>
          {docs.map(doc => (
            <Card key={doc.id} style={styles.listCard}>
              <View style={styles.listRow}>
                <View style={[styles.iconBox, { backgroundColor: colors.infoBg }]}>
                  <Ionicons name="document-text" size={20} color={colors.info} />
                </View>
                <View style={styles.listInfo}>
                  <Text style={styles.listTitle}>{doc.title}</Text>
                  <Text style={styles.listSubtitle}>{doc.category}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
              </View>
            </Card>
          ))}
        </View>
      ))}
    </>
  );
}

// Materials
function MaterialsTab({ materialReqs }: { materialReqs: MaterialRequest[] }) {
  const grouped = useMemo(() => {
    const g: Record<string, MaterialRequest[]> = {};
    materialReqs.forEach(m => {
      const s = m.status;
      if (!g[s]) g[s] = [];
      g[s].push(m);
    });
    return g;
  }, [materialReqs]);

  const statusIcon: Record<string, string> = {
    pending: 'time',
    approved: 'checkmark-circle',
    rejected: 'close-circle',
    ordered: 'cart',
  };

  return (
    <>
      <SectionHeader title={`Material Requests (${materialReqs.length})`} />
      {materialReqs.length === 0 && <EmptyState icon="cube-outline" text="No material requests yet" />}
      {Object.entries(grouped).map(([status, items]) => (
        <View key={status}>
          <Text style={styles.groupLabel}>{status.toUpperCase()} ({items.length})</Text>
          {items.map(m => (
            <Card key={m.id} style={styles.listCard}>
              <View style={styles.listRow}>
                <StatusBadge status={m.status} />
                <View style={styles.listInfo}>
                  <Text style={styles.listTitle}>{m.material_name}</Text>
                  <Text style={styles.listSubtitle}>
                    Qty: {m.qty}
                    {m.spec ? ` · ${m.spec}` : ''}
                    {m.needed_by ? ` · Need by ${fmtShort(m.needed_by)}` : ''}
                  </Text>
                  {m.notes ? <Text style={styles.listSubtitle}>{m.notes}</Text> : null}
                </View>
              </View>
            </Card>
          ))}
        </View>
      ))}
    </>
  );
}

// Expenses
function ExpensesTab({
  expenses,
  projectId,
  currentUserId,
}: {
  expenses: Expense[];
  projectId: string;
  currentUserId: string;
}) {
  const addExpense = useAddExpense();
  const [showAdd, setShowAdd] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  async function handleAdd() {
    const amt = parseFloat(amount);
    if (!desc.trim() || isNaN(amt) || amt <= 0) {
      Alert.alert('Validation', 'Please enter a description and valid amount');
      return;
    }
    try {
      await addExpense.mutateAsync({
        projectId,
        description: desc.trim(),
        amount: amt,
        category: category.trim() || null,
        enteredBy: currentUserId,
      });
      setDesc(''); setAmount(''); setCategory('');
      setShowAdd(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add expense');
    }
  }

  const byCat = useMemo(() => {
    const g: Record<string, number> = {};
    expenses.forEach(e => {
      const cat = e.category || 'other';
      g[cat] = (g[cat] || 0) + e.amount;
    });
    return g;
  }, [expenses]);

  return (
    <>
      <SectionHeader title={`Expenses (${expenses.length})`} action="Add" onAction={() => setShowAdd(true)} />

      {/* Total card */}
      {expenses.length > 0 && (
        <Card style={{ ...styles.sectionCard, marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.sectionCardTitle}>Total Expenses</Text>
            <Text style={[typography.h5, { color: colors.error }]}>{fmtINR(total)}</Text>
          </View>
          {Object.entries(byCat).map(([cat, amt]) => (
            <View key={cat} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
              <Text style={styles.listSubtitle}>{cat}</Text>
              <Text style={styles.listSubtitle}>{fmtINR(amt)}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Add Modal */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Expense</Text>
            <TextInput style={styles.modalInput} placeholder="Description..." value={desc} onChangeText={setDesc} />
            <TextInput
              style={styles.modalInput}
              placeholder="Amount (₹)..."
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            <TextInput style={styles.modalInput} placeholder="Category (optional)..." value={category} onChangeText={setCategory} />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button title="Cancel" variant="tertiary" onPress={() => setShowAdd(false)} style={{ flex: 1 }} />
              <Button title="Add" onPress={handleAdd} loading={addExpense.isPending} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {expenses.length === 0 && <EmptyState icon="receipt-outline" text="No expenses recorded yet" />}
      {expenses.map(e => (
        <Card key={e.id} style={styles.listCard}>
          <View style={styles.listRow}>
            <View style={[styles.iconBox, { backgroundColor: colors.errorBg }]}>
              <Ionicons name="receipt" size={20} color={colors.error} />
            </View>
            <View style={styles.listInfo}>
              <Text style={styles.listTitle}>{e.description}</Text>
              <Text style={styles.listSubtitle}>
                {e.category ? `${e.category} · ` : ''}{fmt(e.date, { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <Text style={[styles.amountText, { color: colors.error }]}>{fmtINR(e.amount)}</Text>
          </View>
        </Card>
      ))}
    </>
  );
}

// Payments
function PaymentsTab({ payments, projectId }: { payments: Payment[]; projectId: string }) {
  const updatePayment = useUpdatePayment();
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();

  const [showAdd, setShowAdd] = useState(false);
  const [milestoneName, setMilestoneName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  const totalBilled = payments.reduce((s, p) => s + p.amount, 0);
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalPending = totalBilled - totalPaid;
  const paidPct = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  async function handleToggle(p: Payment) {
    const next = p.status === 'paid' ? 'pending' : 'paid';
    try {
      await updatePayment.mutateAsync({ id: p.id, status: next });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update payment');
    }
  }

  async function handleAdd() {
    const amt = parseFloat(amount);
    if (!milestoneName.trim()) {
      Alert.alert('Validation', 'Please enter a milestone name');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation', 'Please enter a valid amount');
      return;
    }
    try {
      await createPayment.mutateAsync({
        projectId,
        milestoneName: milestoneName.trim(),
        amount: amt,
        dueDate: dueDate || null,
      });
      setMilestoneName('');
      setAmount('');
      setDueDate('');
      setShowAdd(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add payment milestone');
    }
  }

  function handleDelete(p: Payment) {
    Alert.alert(
      'Delete milestone',
      `Remove "${p.milestone_name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePayment.mutateAsync({ id: p.id });
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete payment');
            }
          },
        },
      ],
    );
  }

  return (
    <>
      <SectionHeader title="Payment Milestones" action="Add" onAction={() => setShowAdd(true)} />

      {/* ── Gradient Hero Summary Card ─────────────────────────────────── */}
      {payments.length > 0 && (
        <View style={payStyles.heroWrap}>
          <LinearGradient
            colors={['#695030', '#918050', '#C8B79C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={payStyles.heroCard}
          >
            {/* Glow halo behind the percentage ring */}
            <View style={payStyles.heroGlow} pointerEvents="none" />

            <View style={payStyles.heroTop}>
              <View style={payStyles.ringWrap}>
                <View style={payStyles.ringOuter}>
                  <Text style={payStyles.ringPct}>{paidPct}%</Text>
                  <Text style={payStyles.ringLabel}>Collected</Text>
                </View>
              </View>
              <View style={payStyles.heroStats}>
                <View style={payStyles.heroStatRow}>
                  <View style={[payStyles.heroDot, { backgroundColor: '#BBF7D0' }]} />
                  <Text style={payStyles.heroStatLabel}>Received</Text>
                  <Text style={payStyles.heroStatValue}>{fmtINR(totalPaid)}</Text>
                </View>
                <View style={payStyles.heroStatRow}>
                  <View style={[payStyles.heroDot, { backgroundColor: '#FDE68A' }]} />
                  <Text style={payStyles.heroStatLabel}>Pending</Text>
                  <Text style={payStyles.heroStatValue}>{fmtINR(totalPending)}</Text>
                </View>
                <View style={payStyles.heroStatRow}>
                  <View style={[payStyles.heroDot, { backgroundColor: 'rgba(255,255,255,0.85)' }]} />
                  <Text style={payStyles.heroStatLabel}>Total</Text>
                  <Text style={payStyles.heroStatValue}>{fmtINR(totalBilled)}</Text>
                </View>
              </View>
            </View>

            {/* Gradient progress bar */}
            <View style={payStyles.barTrack}>
              <LinearGradient
                colors={['#86EFAC', '#22C55E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[payStyles.barFill, { width: `${paidPct}%` }]}
              />
            </View>
          </LinearGradient>
        </View>
      )}

      {/* ── Add Payment Modal (glassy + gradient button) ───────────────── */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={payStyles.overlay}>
          <View style={payStyles.sheet}>
            {/* Glow accent at the top of the sheet */}
            <LinearGradient
              colors={['#695030', '#918050']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={payStyles.sheetAccent}
            />
            <View style={payStyles.sheetBody}>
              <View style={payStyles.sheetHeader}>
                <View style={payStyles.sheetIcon}>
                  <LinearGradient
                    colors={['#695030', '#918050']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={payStyles.sheetIconGrad}
                  >
                    <Ionicons name="cash" size={22} color={colors.white} />
                  </LinearGradient>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={payStyles.sheetTitle}>Add Payment Milestone</Text>
                  <Text style={payStyles.sheetSubtitle}>Track a new billing stage for this project</Text>
                </View>
              </View>

              {/* Field: Milestone name */}
              <Text style={payStyles.fieldLabel}>Milestone name</Text>
              <TextInput
                style={payStyles.input}
                placeholder="e.g. Booking, Foundation, Finishing..."
                placeholderTextColor={colors.neutral[400]}
                value={milestoneName}
                onChangeText={setMilestoneName}
              />

              {/* Field: Amount */}
              <Text style={payStyles.fieldLabel}>Amount (₹)</Text>
              <View style={payStyles.amountWrap}>
                <Text style={payStyles.amountPrefix}>₹</Text>
                <TextInput
                  style={payStyles.amountInput}
                  placeholder="0"
                  placeholderTextColor={colors.neutral[400]}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Field: Due date */}
              <Text style={payStyles.fieldLabel}>Due date <Text style={payStyles.optional}>(optional)</Text></Text>
              <TextInput
                style={payStyles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.neutral[400]}
                value={dueDate}
                onChangeText={setDueDate}
                keyboardType="numbers-and-punctuation"
              />

              {/* Action buttons */}
              <View style={payStyles.actionRow}>
                <TouchableOpacity
                  style={payStyles.cancelBtn}
                  onPress={() => setShowAdd(false)}
                  activeOpacity={0.7}
                >
                  <Text style={payStyles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={payStyles.addBtnWrap}
                  onPress={handleAdd}
                  disabled={createPayment.isPending}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#695030', '#918050']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={payStyles.addBtn}
                  >
                    {createPayment.isPending ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <>
                        <Ionicons name="add-circle" size={18} color={colors.white} />
                        <Text style={payStyles.addBtnText}>Add Milestone</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Empty State ────────────────────────────────────────────────── */}
      {payments.length === 0 && (
        <View style={payStyles.emptyWrap}>
          <LinearGradient
            colors={['#FFFBEB', '#F9F9F8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={payStyles.emptyCard}
          >
            <View style={payStyles.emptyIconWrap}>
              <LinearGradient
                colors={['#918050', '#C8B79C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={payStyles.emptyIconGrad}
              >
                <Ionicons name="cash-outline" size={32} color={colors.white} />
              </LinearGradient>
            </View>
            <Text style={payStyles.emptyTitle}>No milestones yet</Text>
            <Text style={payStyles.emptySubtitle}>Tap "Add" above to create your first payment milestone.</Text>
          </LinearGradient>
        </View>
      )}

      {/* ── Milestone cards ────────────────────────────────────────────── */}
      {payments.map(p => {
        const isPaid = p.status === 'paid';
        return (
          <View key={p.id} style={payStyles.milestoneWrap}>
            <Card style={payStyles.milestoneCard}>
              <View style={payStyles.milestoneRow}>
                <TouchableOpacity
                  onPress={() => handleToggle(p)}
                  disabled={updatePayment.isPending}
                  hitSlop={8}
                >
                  <LinearGradient
                    colors={isPaid ? ['#86EFAC', '#22C55E'] : ['#FDE68A', '#F59E0B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={payStyles.milestoneIcon}
                  >
                    <Ionicons
                      name={isPaid ? 'checkmark-circle' : 'time'}
                      size={20}
                      color={colors.white}
                    />
                  </LinearGradient>
                </TouchableOpacity>

                <View style={payStyles.milestoneInfo}>
                  <Text style={payStyles.milestoneName}>{p.milestone_name}</Text>
                  <Text style={payStyles.milestoneMeta}>
                    {p.due_date ? `Due ${fmtShort(p.due_date)}` : 'No due date'}
                    {p.paid_at ? ` · Paid ${fmtShort(p.paid_at)}` : ''}
                  </Text>
                </View>

                <View style={payStyles.milestoneRight}>
                  <Text style={[payStyles.milestoneAmount, { color: isPaid ? colors.success : colors.ink }]}>
                    {fmtINR(p.amount)}
                  </Text>
                  <View style={[payStyles.statusPill, { backgroundColor: isPaid ? colors.successBg : colors.warningBg }]}>
                    <View style={[payStyles.statusDot, { backgroundColor: isPaid ? colors.success : colors.warning }]} />
                    <Text style={[payStyles.statusText, { color: isPaid ? colors.success : colors.warning }]}>
                      {p.status}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => handleDelete(p)}
                  disabled={deletePayment.isPending}
                  hitSlop={8}
                  style={payStyles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.neutral[400]} />
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        );
      })}
    </>
  );
}

// Communication
function CommunicationTab({
  profileId,
  projectId,
  router,
}: {
  profileId: string;
  projectId: string;
  router: any;
}) {
  const { data: conversations, isLoading } = useMyConversations(profileId);
  const projectConvs = (conversations || []).filter(c => c.project_id === projectId);

  return (
    <>
      <SectionHeader title="Project Communication" />
      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing['4xl'] }} />}

      {!isLoading && projectConvs.length === 0 && (
        <EmptyState icon="chatbubbles-outline" text="No conversations for this project yet" />
      )}

      {!isLoading && projectConvs.map(conv => (
        <TouchableOpacity
          key={conv.id}
          onPress={() => router.push({ pathname: '/(admin)/chat' as any, params: { conversationId: conv.id } })}
        >
          <Card style={styles.listCard} variant="interactive">
            <View style={styles.listRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.infoBg }]}>
                <Ionicons name="chatbubbles" size={20} color={colors.primary} />
              </View>
              <View style={styles.listInfo}>
                <Text style={styles.listTitle}>Project Chat</Text>
                <Text style={styles.listSubtitle}>
                  {new Date(conv.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
            </View>
          </Card>
        </TouchableOpacity>
      ))}

      <Card style={{ ...styles.sectionCard, backgroundColor: colors.infoBg, marginTop: spacing.md }}>
        <Text style={[typography.caption, { color: colors.info }]}>
          💬 Project conversations include all team members assigned to this project. Use the Messages tab in the main nav to start a new conversation.
        </Text>
      </Card>
    </>
  );
}

// Timeline
function TimelineTab({ project, dprs, tasks, payments }: { project: any; dprs: Dpr[]; tasks: Task[]; payments: Payment[] }) {
  type TLEvent = { date: string; label: string; icon: string; color: string };
  const events: TLEvent[] = [];

  if (project.start_date) {
    events.push({ date: project.start_date, label: 'Project Started', icon: 'flag', color: colors.primary });
  }

  dprs.slice(0, 5).forEach(d => {
    events.push({ date: d.date, label: `DPR: ${d.work_done.substring(0, 40)}${d.work_done.length > 40 ? '…' : ''}`, icon: 'document-text', color: colors.info });
  });

  payments.filter(p => p.status === 'paid').forEach(p => {
    if (p.paid_at) {
      events.push({ date: p.paid_at, label: `Payment: ${p.milestone_name} — ${fmtINR(p.amount)}`, icon: 'cash', color: colors.success });
    }
  });

  tasks.filter(t => t.status === 'done' && t.window_end).forEach(t => {
    events.push({ date: t.window_end!, label: `Task done: ${t.title}`, icon: 'checkmark-circle', color: colors.success });
  });

  if (project.expected_end_date) {
    events.push({ date: project.expected_end_date, label: 'Expected Completion', icon: 'trophy', color: colors.secondary });
  }

  events.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <SectionHeader title="Project Timeline" />
      {events.length === 0 && <EmptyState icon="time-outline" text="No timeline events yet" />}
      {events.map((ev, i) => (
        <View key={i} style={styles.timelineRow}>
          <View style={styles.timelineLeft}>
            <View style={[styles.timelineDot, { backgroundColor: ev.color }]}>
              <Ionicons name={ev.icon as any} size={12} color={colors.white} />
            </View>
            {i < events.length - 1 && <View style={styles.timelineLine} />}
          </View>
          <View style={styles.timelineContent}>
            <Text style={styles.timelineDate}>{fmt(ev.date, { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            <Text style={styles.timelineLabel}>{ev.label}</Text>
          </View>
        </View>
      ))}
    </>
  );
}

// Reports
function ReportsTab({
  project,
  employees,
  payments,
  materialReqs,
  dprs,
  tasks,
  expenses,
}: {
  project: any;
  employees: any[];
  payments: Payment[];
  materialReqs: MaterialRequest[];
  dprs: Dpr[];
  tasks: Task[];
  expenses: Expense[];
}) {
  const totalBilled = payments.reduce((s, p) => s + p.amount, 0);
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const tasksDone = tasks.filter(t => t.status === 'done').length;
  const dprApproved = dprs.filter(d => d.status === 'approved').length;

  return (
    <>
      <SectionHeader title="Project Reports" />
      <Card style={styles.reportCard}>
        <Text style={styles.sectionCardTitle}>📊 Project Summary</Text>
        <ReportRow label="Progress" value={`${project.progress_pct}%`} />
        <ReportRow label="Stage" value={project.stage || '—'} />
        <ReportRow label="Start Date" value={fmt(project.start_date)} />
        <ReportRow label="Expected End" value={fmt(project.expected_end_date)} />
      </Card>

      <Card style={styles.reportCard}>
        <Text style={styles.sectionCardTitle}>👥 Team</Text>
        <ReportRow label="Total Members" value={employees.length.toString()} />
        <ReportRow label="Active" value={employees.filter(e => e.status === 'active').length.toString()} />
      </Card>

      <Card style={styles.reportCard}>
        <Text style={styles.sectionCardTitle}>✅ Tasks</Text>
        <ReportRow label="Total Tasks" value={tasks.length.toString()} />
        <ReportRow label="Done" value={tasksDone.toString()} />
        <ReportRow label="Pending" value={tasks.filter(t => t.status === 'pending').length.toString()} />
        <ReportRow label="Blocked" value={tasks.filter(t => t.status === 'blocked').length.toString()} />
      </Card>

      <Card style={styles.reportCard}>
        <Text style={styles.sectionCardTitle}>📋 DPRs</Text>
        <ReportRow label="Total Submitted" value={dprs.length.toString()} />
        <ReportRow label="Approved" value={dprApproved.toString()} />
        <ReportRow label="Pending Review" value={dprs.filter(d => d.status === 'submitted').length.toString()} />
      </Card>

      <Card style={styles.reportCard}>
        <Text style={styles.sectionCardTitle}>💰 Financials</Text>
        <ReportRow label="Total Billed" value={fmtINR(totalBilled)} />
        <ReportRow label="Collected" value={fmtINR(totalPaid)} />
        <ReportRow label="Outstanding" value={fmtINR(totalBilled - totalPaid)} />
        <ReportRow label="Site Expenses" value={fmtINR(totalExpenses)} />
      </Card>

      <Card style={styles.reportCard}>
        <Text style={styles.sectionCardTitle}>📦 Materials</Text>
        <ReportRow label="Total Requests" value={materialReqs.length.toString()} />
        <ReportRow label="Approved" value={materialReqs.filter(m => m.status === 'approved').length.toString()} />
        <ReportRow label="Pending" value={materialReqs.filter(m => m.status === 'pending').length.toString()} />
      </Card>
    </>
  );
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reportRow}>
      <Text style={styles.reportLabel}>{label}</Text>
      <Text style={styles.reportValue}>{value}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ProjectWorkspaceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useAuthStore((s) => s.profile);

  const { data: project, refetch, isRefetching } = useProject(id);
  const { data: employees = [] } = useEmployees();
  const { data: payments = [] } = useProjectPayments(id);
  const { data: materialReqs = [] } = useMaterialRequests(id);
  const { data: documents = [] } = useDocuments('project', id);
  const { data: dprs = [] } = useProjectDprs(id);
  const { data: tasks = [] } = useProjectTasks(id);
  const { data: expenses = [] } = useProjectExpenses(id);

  const [tab, setTab] = useState<Tab>('Overview');
  const [showMoreTabs, setShowMoreTabs] = useState(false);

  const VISIBLE_TABS = TABS.slice(0, 3);
  const EXTRA_TABS = TABS.slice(3) as Tab[];

  if (!project) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.loadingText, { marginTop: spacing.sm }]}>Loading project…</Text>
      </View>
    );
  }

  const currentUserId = profile?.id || '';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#3E2A18', '#6B4423', '#A9713F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.topbar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.projTitle} numberOfLines={1}>{project.name}</Text>
          <View style={styles.statusPillTop}>
            <View style={styles.statusDotTop} />
            <Text style={styles.statusTextTop}>On Track</Text>
          </View>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabBar}
            contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.lg, paddingVertical: 4 }}
          >
            {VISIBLE_TABS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tabPill, tab === t && styles.tabPillActive]}
                onPress={() => setTab(t)}
              >
                <Text style={[styles.tabPillText, tab === t && styles.tabPillTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={[styles.tabPill, EXTRA_TABS.includes(tab) && styles.tabPillActive]}
              onPress={() => setShowMoreTabs(true)}
            >
              <Text style={[styles.tabPillText, EXTRA_TABS.includes(tab) && styles.tabPillTextActive]}>
                {EXTRA_TABS.includes(tab) ? `${tab} ▾` : 'More ▾'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing['6xl'], paddingTop: spacing.md }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {tab === 'Overview' && (
          <OverviewTab
            project={project}
            employees={employees}
            payments={payments}
            materialReqs={materialReqs}
            tasks={tasks}
            onTabChange={setTab}
          />
        )}
        {tab === 'Tasks' && (
          <TasksTab
            tasks={tasks}
            employees={employees}
            projectId={id}
            currentUserId={currentUserId}
          />
        )}
        {tab === 'Employees' && (
          <EmployeesTab employees={employees} router={router} />
        )}
        {tab === 'Attendance' && (
          <AttendanceTab projectId={id} />
        )}
        {tab === 'DPR' && (
          <DprTab dprs={dprs} employees={employees} />
        )}
        {tab === 'Photos' && (
          <PhotosTab dprs={dprs} />
        )}
        {tab === 'Documents' && (
          <DocumentsTab documents={documents} />
        )}
        {tab === 'Materials' && (
          <MaterialsTab materialReqs={materialReqs} />
        )}
        {tab === 'Expenses' && (
          <ExpensesTab expenses={expenses} projectId={id} currentUserId={currentUserId} />
        )}
        {tab === 'Payments' && (
          <PaymentsTab payments={payments} projectId={id} />
        )}
        {tab === 'Communication' && (
          <CommunicationTab profileId={currentUserId} projectId={id} router={router} />
        )}
        {tab === 'Timeline' && (
          <TimelineTab project={project} dprs={dprs} tasks={tasks} payments={payments} />
        )}
        {tab === 'Reports' && (
          <ReportsTab
            project={project}
            employees={employees}
            payments={payments}
            materialReqs={materialReqs}
            dprs={dprs}
            tasks={tasks}
            expenses={expenses}
          />
        )}
      </ScrollView>

      {/* More Tabs Modal */}
      <Modal visible={showMoreTabs} transparent animationType="fade" onRequestClose={() => setShowMoreTabs(false)}>
        <TouchableOpacity style={styles.moreOverlay} activeOpacity={1} onPress={() => setShowMoreTabs(false)}>
          <View style={styles.moreDropdown}>
            {EXTRA_TABS.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.moreOption, tab === t && styles.moreOptionActive]}
                onPress={() => { setTab(t); setShowMoreTabs(false); }}
              >
                <Text style={[styles.moreOptionText, tab === t && styles.moreOptionTextActive]}>{t}</Text>
                {tab === t && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...typography.bodyMedium, color: colors.neutral[400] },

  // Header
  header: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.xl,
    paddingBottom: spacing.lg, overflow: 'hidden',
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 },
  backBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  projTitle: { flex: 1, textAlign: 'center', fontFamily: fontFamily.semiBold, fontSize: 19, color: '#fff', letterSpacing: 0.2 },
  statusPillTop: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100,
  },
  statusDotTop: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3FA65B' },
  statusTextTop: { fontSize: 11.5, fontFamily: fontFamily.bold, color: '#3FA65B' },

  // Tab bar
  tabsWrapper: { marginTop: 20, zIndex: 1, marginHorizontal: -spacing.lg },
  tabBar: { },
  tabPill: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100,
  },
  tabPillActive: { backgroundColor: '#fff', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 14 },
  tabPillText: { fontSize: 13, fontFamily: fontFamily.semiBold, color: 'rgba(255,255,255,0.75)' },
  tabPillTextActive: { color: '#3E2A18' },

  // Overview
  overviewCard: { padding: spacing.xl, marginBottom: spacing.md },
  progressSection: { flexDirection: 'row', gap: spacing.xl },
  progressRing: {
    width: 96, height: 96, borderRadius: 48, borderWidth: 6, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  progressPct: { ...typography.h3, color: colors.primary },
  progressLabel: { ...typography.caption, color: colors.neutral[500] },
  progressDetails: { flex: 1, justifyContent: 'center', gap: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoLabel: { ...typography.caption, color: colors.neutral[400], width: 36 },
  infoValue: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink, textTransform: 'capitalize', flex: 1 },
  progressTrack: { height: 8, backgroundColor: colors.neutral[100], borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },

  // Stats
  quickStatsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statBox: { flex: 1, padding: spacing.md, alignItems: 'center', gap: 2 },
  statBoxValue: { ...typography.h5 },
  statBoxLabel: { ...typography.caption, color: colors.neutral[500], textAlign: 'center' },

  // Section cards
  sectionCard: { padding: spacing.lg, marginBottom: spacing.md },
  sectionCardTitle: { ...typography.h6, color: colors.ink, marginBottom: spacing.md },

  // Section header row
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md, marginTop: spacing.xs },
  sectionHeaderText: { ...typography.h6, color: colors.ink },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionActionText: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.primary },

  // Group labels
  groupLabel: { ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.neutral[500], letterSpacing: 0.8, marginTop: spacing.md, marginBottom: spacing.xs },

  // List items
  listCard: { padding: spacing.md, marginBottom: spacing.sm },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  listInfo: { flex: 1 },
  listTitle: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink },
  listSubtitle: { ...typography.caption, color: colors.neutral[500], marginTop: 2, textTransform: 'capitalize' },

  // Badges
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.xs },
  badgeText: { ...typography.caption, fontFamily: fontFamily.semiBold, textTransform: 'capitalize' },

  // Icons
  iconBox: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  amountText: { ...typography.bodySmall, fontFamily: fontFamily.semiBold },

  // Filter pills
  filterPill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.neutral[100] },
  filterPillActive: { backgroundColor: colors.primary },
  filterPillText: { ...typography.caption, fontFamily: fontFamily.medium, color: colors.neutral[600] },
  filterPillTextActive: { color: colors.white },

  // Attendance date nav
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, marginBottom: spacing.md },
  dateNavLabel: { ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },

  // Timeline
  timelineRow: { flexDirection: 'row', marginBottom: spacing.md },
  timelineLeft: { width: 32, alignItems: 'center' },
  timelineDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.neutral[200], marginTop: 2 },
  timelineContent: { flex: 1, paddingLeft: spacing.md, paddingBottom: spacing.md },
  timelineDate: { ...typography.caption, color: colors.neutral[400] },
  timelineLabel: { ...typography.bodySmall, color: colors.ink, marginTop: 2 },

  // Reports
  reportCard: { padding: spacing.lg, marginBottom: spacing.md },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  reportLabel: { ...typography.bodySmall, color: colors.neutral[600] },
  reportValue: { ...typography.bodySmall, fontFamily: fontFamily.semiBold, color: colors.ink },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius['3xl'], borderTopRightRadius: radius['3xl'],
    padding: spacing['2xl'], paddingBottom: spacing['4xl'] + (Platform.OS === 'ios' ? 16 : 0),
  },
  modalTitle: { ...typography.h5, color: colors.ink, marginBottom: spacing.lg },
  modalInput: {
    borderWidth: 1, borderColor: colors.neutral[200], borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.md,
    ...typography.bodyMedium, color: colors.ink,
  },

  // Empty
  empty: { alignItems: 'center', paddingVertical: spacing['4xl'], gap: spacing.sm },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400], textAlign: 'center' },
  pickerContainer: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    overflow: 'hidden',
  },
  picker: { height: 50 },

  // More Dropdown
  moreOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  moreDropdown: { width: 220, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.sm, ...shadows.lg },
  moreOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderRadius: radius.md },
  moreOptionActive: { backgroundColor: colors.neutral[100] },
  moreOptionText: { ...typography.bodyMedium, color: colors.ink },
  moreOptionTextActive: { fontFamily: fontFamily.semiBold, color: colors.primary },
});

// ── Payments Tab — Gradient & Glow Styles ────────────────────────────────────
const payStyles = StyleSheet.create({
  // Hero summary card
  heroWrap: {
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
    ...shadows.xl,
  },
  heroCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },
  ringWrap: {
    position: 'relative',
  },
  ringOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: {
    ...typography.h4,
    color: colors.white,
    fontFamily: fontFamily.bold,
    fontSize: 22,
  },
  ringLabel: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroStats: {
    flex: 1,
    gap: spacing.sm,
  },
  heroStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heroStatLabel: {
    flex: 1,
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 11,
  },
  heroStatValue: {
    ...typography.bodyMedium,
    color: colors.white,
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
  },

  // Gradient progress bar
  barTrack: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    borderRadius: radius.full,
  },

  // ── Add Payment Modal ────────────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 24, 21, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    overflow: 'hidden',
    ...shadows.xl,
  },
  sheetAccent: {
    height: 5,
    width: '100%',
  },
  sheetBody: {
    padding: spacing['2xl'],
    paddingBottom: spacing['4xl'] + (Platform.OS === 'ios' ? 16 : 0),
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  sheetIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  sheetIconGrad: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    ...typography.h5,
    color: colors.ink,
    marginBottom: 2,
  },
  sheetSubtitle: {
    ...typography.caption,
    color: colors.neutral[500],
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.neutral[600],
    fontFamily: fontFamily.medium,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optional: {
    color: colors.neutral[400],
    textTransform: 'none',
    fontFamily: fontFamily.regular,
    fontSize: 11,
    letterSpacing: 0,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...typography.bodyMedium,
    color: colors.ink,
    backgroundColor: colors.neutral[100],
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    borderRadius: radius.md,
    marginBottom: spacing.md,
    backgroundColor: colors.neutral[100],
    paddingLeft: spacing.md,
  },
  amountPrefix: {
    ...typography.h6,
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
    marginRight: spacing.xs,
  },
  amountInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    ...typography.bodyMedium,
    color: colors.ink,
    fontFamily: fontFamily.semiBold,
    fontSize: 18,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    ...typography.bodyMedium,
    color: colors.neutral[600],
    fontFamily: fontFamily.medium,
  },
  addBtnWrap: {
    flex: 1.4,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  addBtnText: {
    ...typography.bodyMedium,
    color: colors.white,
    fontFamily: fontFamily.semiBold,
  },

  // ── Empty State ──────────────────────────────────────────────────────
  emptyWrap: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  emptyCard: {
    borderRadius: radius.xl,
    padding: spacing['4xl'],
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    ...shadows.lg,
  },
  emptyIconGrad: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typography.h6,
    color: colors.ink,
    fontFamily: fontFamily.semiBold,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 18,
  },

  // ── Milestone cards ──────────────────────────────────────────────────
  milestoneWrap: {
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
  },
  milestoneCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  milestoneIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneName: {
    ...typography.bodyMedium,
    fontFamily: fontFamily.medium,
    color: colors.ink,
  },
  milestoneMeta: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: 2,
    textTransform: 'capitalize',
  },
  milestoneRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  milestoneAmount: {
    ...typography.bodyMedium,
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    fontSize: 10,
    textTransform: 'capitalize',
  },
  deleteBtn: {
    paddingLeft: spacing.xs,
    paddingVertical: spacing.xs,
  },
});

// ── Overview Tab Styles ─────────────────────────────────────────────────────────
const ovStyles = StyleSheet.create({
  content: { gap: 14 },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderRadius: 22,
    shadowColor: '#3E2A18', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.15, shadowRadius: 34, elevation: 4,
    overflow: 'hidden',
  },
  heroCard: { padding: 24, paddingBottom: 20 },
  gaugeWrap: { position: 'relative', width: 132, height: 132, alignSelf: 'center' },
  gaugeLabel: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  gaugePct: { fontFamily: fontFamily.bold, fontSize: 28, color: '#3E2A18', lineHeight: 32 },
  gaugeSub: { fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: '#8B8680', fontFamily: fontFamily.semiBold, marginTop: 4 },
  metaDivider: { height: 1, backgroundColor: 'rgba(139,94,52,0.14)', marginVertical: 20 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '47%' },
  metaIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  metaTextLabel: { fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.5, color: '#8B8680', fontFamily: fontFamily.semiBold },
  metaTextValue: { fontSize: 13.5, fontFamily: fontFamily.semiBold, color: '#2A241D', marginTop: 2 },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  statCardGlass: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderRadius: 22,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: fontFamily.bold, fontSize: 18, color: '#3E2A18' },
  statLabel: { fontSize: 9.5, letterSpacing: 0.3, textTransform: 'uppercase', color: '#8B8680', fontFamily: fontFamily.semiBold, marginTop: 2 },
  
  sectionCardGlass: {
    backgroundColor: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderRadius: 22,
    padding: 18,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },
  sectionIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: fontFamily.semiBold, fontSize: 13.5, color: '#3E2A18' },
  trackBar: { width: '100%', height: 9, borderRadius: 100, backgroundColor: 'rgba(139,94,52,0.12)', overflow: 'hidden', marginBottom: 10 },
  trackFill: { height: '100%', borderRadius: 100 },
  trackCaption: { fontSize: 12, color: '#8B8680', fontFamily: fontFamily.medium },
  addressText: { fontSize: 13.5, color: '#2A241D', lineHeight: 20, fontFamily: fontFamily.medium },
});
