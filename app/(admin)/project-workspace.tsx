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

import { Card, StatusChip, Avatar, Button } from '../../src/components';
import { useProject } from '../../src/hooks/useProjects';
import { useEmployees } from '../../src/hooks/useEmployees';
import { useProjectDprs } from '../../src/hooks/useDpr';
import { useProjectPayments, useUpdatePayment } from '../../src/hooks/usePayments';
import { useMaterialRequests } from '../../src/hooks/useMaterials';
import { useDocuments } from '../../src/hooks/useDocuments';
import { useProjectAttendance, TeamAttendanceRow } from '../../src/hooks/useAttendance';
import { useProjectTasks, useUpdateTaskStatus, useCreateTask } from '../../src/hooks/useTasks';
import { useProjectExpenses, useAddExpense } from '../../src/hooks/useExpenses';
import { useMyConversations } from '../../src/hooks/useConversations';
import { useAuthStore } from '../../src/stores/authStore';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
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

function StatBox({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <Card style={styles.statBox}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[styles.statBoxValue, { color }]}>{value}</Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </Card>
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
}: {
  project: any;
  employees: any[];
  payments: Payment[];
  materialReqs: MaterialRequest[];
  tasks: Task[];
}) {
  const totalBilled = payments.reduce((s, p) => s + p.amount, 0);
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pendingMaterials = materialReqs.filter(m => m.status === 'pending');
  const openTasks = tasks.filter(t => t.status === 'pending');

  return (
    <>
      {/* Progress */}
      <Card style={styles.overviewCard}>
        <View style={styles.progressSection}>
          <View style={styles.progressRing}>
            <Text style={styles.progressPct}>{project.progress_pct}%</Text>
            <Text style={styles.progressLabel}>Complete</Text>
          </View>
          <View style={styles.progressDetails}>
            <InfoRow icon="layers" label="Stage" value={project.stage || '—'} />
            <InfoRow icon="location" label="City" value={project.city || '—'} />
            <InfoRow icon="calendar" label="Start" value={fmt(project.start_date)} />
            <InfoRow icon="flag" label="End" value={fmt(project.expected_end_date)} />
          </View>
        </View>
        {/* Full-width progress bar */}
        <View style={{ marginTop: spacing.lg }}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${project.progress_pct}%` as any, backgroundColor: colors.primary }]} />
          </View>
        </View>
      </Card>

      {/* Quick Stats */}
      <View style={styles.quickStatsRow}>
        <StatBox label="Team" value={employees.length.toString()} icon="people" color={colors.info} />
        <StatBox label="Tasks" value={openTasks.length.toString()} icon="checkmark-circle" color={colors.warning} />
        <StatBox label="Payments" value={`₹${(totalPaid / 100000).toFixed(1)}L`} icon="cash" color={colors.success} />
        <StatBox label="Materials" value={pendingMaterials.length.toString()} icon="cube" color={colors.error} />
      </View>

      {/* Payment Progress */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionCardTitle}>💰 Payment Progress</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, {
            width: `${totalBilled > 0 ? Math.round(totalPaid / totalBilled * 100) : 0}%` as any,
            backgroundColor: colors.success,
          }]} />
        </View>
        <Text style={[typography.bodySmall, { color: colors.neutral[600], marginTop: spacing.sm }]}>
          {fmtINR(totalPaid)} collected of {fmtINR(totalBilled)} billed
        </Text>
      </Card>

      {/* Address */}
      {!!project.address && (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>📍 Site Address</Text>
          <Text style={[typography.bodySmall, { color: colors.neutral[700] }]}>{project.address}</Text>
        </Card>
      )}
    </>
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
  const updateStatus = useUpdateTaskStatus();
  const createTask = useCreateTask();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
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
      });
      setNewTitle('');
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
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button title="Cancel" variant="tertiary" onPress={() => setShowAdd(false)} style={{ flex: 1 }} />
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
                {task.assigned_to ? employeeMap.get(task.assigned_to) || 'Assigned' : 'Unassigned'}
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

  const totalBilled = payments.reduce((s, p) => s + p.amount, 0);
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);

  async function handleToggle(p: Payment) {
    const next = p.status === 'paid' ? 'pending' : 'paid';
    try {
      await updatePayment.mutateAsync({ id: p.id, status: next });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update payment');
    }
  }

  return (
    <>
      <SectionHeader title="Payment Milestones" />

      {/* Summary */}
      {payments.length > 0 && (
        <Card style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={[typography.h5, { color: colors.success }]}>{fmtINR(totalPaid)}</Text>
              <Text style={styles.listSubtitle}>Received</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[typography.h5, { color: colors.warning }]}>{fmtINR(totalBilled - totalPaid)}</Text>
              <Text style={styles.listSubtitle}>Pending</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[typography.h5, { color: colors.ink }]}>{fmtINR(totalBilled)}</Text>
              <Text style={styles.listSubtitle}>Total</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {
              width: `${totalBilled > 0 ? Math.round(totalPaid / totalBilled * 100) : 0}%` as any,
              backgroundColor: colors.success,
            }]} />
          </View>
          <Text style={[typography.caption, { color: colors.neutral[500], marginTop: spacing.xs, textAlign: 'right' }]}>
            {totalBilled > 0 ? Math.round(totalPaid / totalBilled * 100) : 0}% collected
          </Text>
        </Card>
      )}

      {payments.length === 0 && <EmptyState icon="cash-outline" text="No payment milestones defined" />}
      {payments.map(p => (
        <Card key={p.id} style={styles.listCard}>
          <View style={styles.listRow}>
            <TouchableOpacity onPress={() => handleToggle(p)} disabled={updatePayment.isPending} hitSlop={8}>
              <View style={[styles.iconBox, { backgroundColor: p.status === 'paid' ? colors.successBg : colors.warningBg }]}>
                <Ionicons
                  name={p.status === 'paid' ? 'checkmark-circle' : 'time'}
                  size={20}
                  color={p.status === 'paid' ? colors.success : colors.warning}
                />
              </View>
            </TouchableOpacity>
            <View style={styles.listInfo}>
              <Text style={styles.listTitle}>{p.milestone_name}</Text>
              <Text style={styles.listSubtitle}>
                {p.due_date ? `Due ${fmtShort(p.due_date)}` : 'No due date'}
                {p.paid_at ? ` · Paid ${fmtShort(p.paid_at)}` : ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={[styles.amountText, { color: p.status === 'paid' ? colors.success : colors.ink }]}>
                {fmtINR(p.amount)}
              </Text>
              <StatusBadge status={p.status} />
            </View>
          </View>
        </Card>
      ))}
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{project.name}</Text>
          <StatusChip status={project.status} />
        </View>
      </View>

      {/* Tab Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={{ gap: spacing.xs, paddingHorizontal: spacing.lg }}
      >
        {TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabPill, tab === t && styles.tabPillActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabPillText, tab === t && styles.tabPillTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...typography.bodyMedium, color: colors.neutral[400] },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { ...typography.h5, color: colors.ink, flex: 1, marginRight: spacing.sm },

  // Tab bar
  tabBar: { flexGrow: 0, marginBottom: spacing.sm, paddingTop: spacing.sm },
  tabPill: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm - 2,
    borderRadius: radius.full, backgroundColor: colors.neutral[100],
    borderWidth: 1, borderColor: colors.neutral[200],
  },
  tabPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabPillText: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.neutral[500] },
  tabPillTextActive: { color: colors.white },

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
});
