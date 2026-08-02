import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as XLSX from 'xlsx';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { radius, spacing, shadows } from '../theme/spacing';
import type { Task, TaskStatus } from '../types';
import { useCreateTask, useUpdateTaskMIS, useDeleteTask } from '../hooks/useTasks';
import { useTaskDprs, useSubmitDpr, useDeleteDpr, useProjectDprs } from '../hooks/useDpr';
import { useAuthStore } from '../stores/authStore';
import { showAlert } from '../utils/alert';
import { DatePickerField } from './DatePickerField';

interface ExcelTaskMISGridProps {
  projectId: string;
  tasks: Task[];
  onRefresh?: () => void;
}

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ExcelTaskMISGrid({ projectId, tasks, onRefresh }: ExcelTaskMISGridProps) {
  const profile = useAuthStore((state) => state.profile);
  const createTask = useCreateTask();
  const updateTaskMIS = useUpdateTaskMIS();
  const deleteTask = useDeleteTask();
  const submitDpr = useSubmitDpr();
  const deleteDpr = useDeleteDpr();
  const { data: projectDprs = [] } = useProjectDprs(projectId, 500);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'tasks' | 'subtasks'>('tasks');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [viewLayout, setViewLayout] = useState<'cards' | 'table'>('cards');

  // Task Add/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalParentId, setModalParentId] = useState<string | null>(null);

  // Task Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Facade');
  const [formUnit, setFormUnit] = useState('Sqm');
  const [formPlanned, setFormPlanned] = useState('1000');
  const [formCompleted, setFormCompleted] = useState('0');
  const [formStartDate, setFormStartDate] = useState(getTodayISO());
  const [formEndDate, setFormEndDate] = useState(getTodayISO());
  const [formStatus, setFormStatus] = useState<TaskStatus>('pending');
  const [formClientVisible, setFormClientVisible] = useState(false);
  const [formChecklist, setFormChecklist] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [newCheckItemText, setNewCheckItemText] = useState('');

  // Log Progress Modal State
  const [logProgressTask, setLogProgressTask] = useState<Task | null>(null);
  const [logProgressDate, setLogProgressDate] = useState(getTodayISO());
  const [logProgressQty, setLogProgressQty] = useState('');
  const [logProgressNote, setLogProgressNote] = useState('');

  // Daily History Log Modal State
  const [historyTask, setHistoryTask] = useState<Task | null>(null);
  const { data: historyDprs = [], isLoading: isLoadingHistory } = useTaskDprs(historyTask?.id);

  // Hierarchy Separation
  const mainTasks = useMemo(() => tasks.filter((t) => !t.parent_id), [tasks]);
  const allSubtasks = useMemo(() => tasks.filter((t) => Boolean(t.parent_id)), [tasks]);

  const subtasksMap = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      if (t.parent_id) {
        if (!map[t.parent_id]) map[t.parent_id] = [];
        map[t.parent_id].push(t);
      }
    });
    return map;
  }, [tasks]);

  // Active selected parent for subtasks tab
  const activeParentTask = useMemo(() => {
    if (!selectedParentId || selectedParentId === 'ALL') return null;
    return mainTasks.find((t) => t.id === selectedParentId) || null;
  }, [selectedParentId, mainTasks]);

  const activeSubtasks = useMemo(() => {
    if (!selectedParentId || selectedParentId === 'ALL') return allSubtasks;
    return subtasksMap[selectedParentId] || [];
  }, [selectedParentId, allSubtasks, subtasksMap]);

  // Filtered Main Tasks
  const filteredMainTasks = useMemo(() => {
    return mainTasks.filter((t) => {
      const matchSearch =
        !search || t.title.toLowerCase().includes(search.toLowerCase());
      const matchCat =
        selectedCategory === 'All' || (t.category || 'Facade') === selectedCategory;

      const statusStr = t.status === 'done' ? 'Completed' : (t.completed_quantity || 0) > 0 ? 'In Progress' : 'Pending';
      const matchStatus = selectedStatus === 'All' || statusStr === selectedStatus;

      return matchSearch && matchCat && matchStatus;
    });
  }, [mainTasks, search, selectedCategory, selectedStatus]);

  // Tab-sensitive Stats calculation
  const targetList = activeTab === 'tasks' ? mainTasks : allSubtasks;
  const totalCount = targetList.length;
  const completedCount = targetList.filter((t) => t.status === 'done' || (t.planned_quantity && t.completed_quantity && t.completed_quantity >= t.planned_quantity)).length;
  const inProgressCount = targetList.filter((t) => t.status !== 'done' && (t.completed_quantity || 0) > 0).length;
  const pendingCount = Math.max(0, totalCount - completedCount - inProgressCount);
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Open Add/Edit Task Modal
  const handleOpenModal = (taskToEdit?: Task | null, parentIdForSubtask?: string | null) => {
    const today = getTodayISO();
    if (taskToEdit) {
      setEditingTask(taskToEdit);
      setModalParentId(taskToEdit.parent_id || null);
      setFormTitle(taskToEdit.title);
      setFormCategory(taskToEdit.category || 'Facade');
      setFormUnit(taskToEdit.unit || 'Sqm');
      setFormPlanned(String(taskToEdit.planned_quantity || 0));
      setFormCompleted(String(taskToEdit.completed_quantity || 0));
      setFormStartDate(taskToEdit.start_date || today);
      setFormEndDate(taskToEdit.end_date || today);
      setFormStatus(taskToEdit.status || 'pending');
      setFormClientVisible(Boolean(taskToEdit.client_visible));
      setFormChecklist(Array.isArray(taskToEdit.checklist) ? taskToEdit.checklist : []);
    } else {
      setEditingTask(null);
      // Determine default parent ID: explicit parameter > active WBS parent > first main task (if on subtasks tab) > null
      const defaultParent = parentIdForSubtask || (activeTab === 'subtasks' ? (activeParentTask?.id || mainTasks[0]?.id || null) : null);
      setModalParentId(defaultParent);
      setFormTitle('');
      setFormCategory('Facade');
      setFormUnit('Sqm');
      // Don't pre-fill qty for WBS subtasks — user must enter scope explicitly
      setFormPlanned(defaultParent ? '' : '1000');
      setFormCompleted('');
      setFormStartDate(today);
      setFormEndDate(today);
      setFormStatus('pending');
      setFormClientVisible(false);
      setFormChecklist([]);
    }
    setNewCheckItemText('');
    setIsModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!formTitle.trim()) {
      showAlert('Validation Error', 'Please enter a task name.');
      return;
    }

    const planned = parseFloat(formPlanned) || 0;
    const completed = parseFloat(formCompleted) || 0;

    try {
      if (editingTask) {
        await updateTaskMIS.mutateAsync({
          taskId: editingTask.id,
          title: formTitle.trim(),
          category: formCategory,
          unit: formUnit,
          plannedQuantity: planned,
          completedQuantity: completed,
          startDate: formStartDate,
          endDate: formEndDate,
          status: formStatus,
          parentId: modalParentId || null,
          checklist: formChecklist,
          clientVisible: formClientVisible,
        });
      } else {
        await createTask.mutateAsync({
          projectId,
          title: formTitle.trim(),
          createdBy: profile?.id || '',
          parentId: modalParentId || null,
          category: formCategory,
          unit: formUnit,
          plannedQuantity: planned,
          completedQuantity: completed,
          startDate: formStartDate,
          endDate: formEndDate,
          checklist: formChecklist,
          clientVisible: formClientVisible,
        });

        if (modalParentId) {
          setSelectedParentId(modalParentId);
          setActiveTab('subtasks');
        }
      }
      setIsModalOpen(false);
      onRefresh?.();
    } catch (err: any) {
      showAlert('Save Error', err.message || 'Failed to save task.');
    }
  };

  const handleDeleteTask = (taskId: string, title: string) => {
    showAlert('Delete Task', `Are you sure you want to delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask.mutateAsync(taskId);
            onRefresh?.();
          } catch (err: any) {
            showAlert('Error', err.message || 'Failed to delete task.');
          }
        },
      },
    ]);
  };

  // Open Log Progress Modal
  const handleOpenLogProgress = (task: Task) => {
    setLogProgressTask(task);
    setLogProgressDate(getTodayISO());
    setLogProgressQty('');
    setLogProgressNote('');
  };

  const handleSaveLogProgress = async () => {
    if (!logProgressTask) return;
    const qty = parseFloat(logProgressQty);
    if (isNaN(qty) || qty <= 0) {
      showAlert('Validation Error', 'Please enter a valid completed quantity greater than 0.');
      return;
    }

    try {
      await submitDpr.mutateAsync({
        projectId,
        submittedBy: profile?.id || '',
        taskId: logProgressTask.id,
        quantityCompleted: qty,
        date: logProgressDate,
        workType: logProgressTask.category || 'Site Work',
        levelZone: logProgressTask.level_zone || undefined,
        workDone: logProgressNote.trim() || `Completed ${qty} ${logProgressTask.unit || 'units'} on ${logProgressTask.title}`,
        status: 'approved', // Admin/PM logging directly approves the progress
      });

      showAlert('Progress Logged', `Logged ${qty} ${logProgressTask.unit || 'units'} for "${logProgressTask.title}". Task completion updated!`);
      setLogProgressTask(null);
      onRefresh?.();
    } catch (err: any) {
      showAlert('Log Progress Error', err.message || 'Failed to log daily progress.');
    }
  };

  // Checklist Actions
  const handleAddCheckItem = () => {
    if (!newCheckItemText.trim()) return;
    setFormChecklist((prev) => [
      ...prev,
      { id: String(Date.now()), text: newCheckItemText.trim(), completed: false },
    ]);
    setNewCheckItemText('');
  };

  const handleToggleCheckItem = (id: string) => {
    setFormChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleRemoveCheckItem = (id: string) => {
    setFormChecklist((prev) => prev.filter((item) => item.id !== id));
  };

  // Excel Export Handler (Full MIS vs Client Summary)
  const handleExportExcel = (variant: 'full' | 'client' = 'full') => {
    try {
      const isClient = variant === 'client';
      const tasksToExport = isClient ? mainTasks.filter((t) => t.client_visible) : mainTasks;
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      // ── MIS Tasks Sheet (AOA format to match real MIS layout) ──────────────
      const misAoa: (string | number)[][] = [
        ['MIS Dashboard _ Façade Work', '', '', '', '', '', '', '', ''],
        ['Contractor: Fine Glaze', '', '', '', '', '', '', '', ''],
        ['Project: (Project Reference)', '', '', '', '', '', 'Date', dateStr, ''],
        [],
        ['Sr.No.', 'Activity', 'Unit', 'Scope', 'Completed', 'Balance', 'Completed %', 'Remark', 'Status'],
      ];

      tasksToExport.forEach((t, idx) => {
        const planned = t.planned_quantity || 0;
        const completed = t.completed_quantity || 0;
        const balance = Math.max(0, planned - completed);
        const pct = planned > 0 ? Math.round((completed / planned) * 100) : 0;
        const status = t.status === 'done' ? 'Completed' : t.status === 'in_progress' ? 'In progress' : t.status === 'blocked' ? 'Delayed' : 'Pending';
        // Get latest DPR remark for this task
        const latestDpr = projectDprs.find((d) => d.task_id === t.id);
        const remark = latestDpr?.work_done ? latestDpr.work_done.slice(0, 60) : '';
        misAoa.push([idx + 1, t.title, t.unit || 'Sqm', planned, completed, balance, `${pct}%`, remark, status]);
      });

      // Subtasks if full MIS
      if (!isClient) {
        misAoa.push([]);
        misAoa.push(['', 'WBS Zone / Floor Breakdown', '', '', '', '', '', '', '']);
        allSubtasks.forEach((st, idx) => {
          const planned = st.planned_quantity || 0;
          const completed = st.completed_quantity || 0;
          const balance = Math.max(0, planned - completed);
          const pct = planned > 0 ? Math.round((completed / planned) * 100) : 0;
          const parentTask = tasks.find((p) => p.id === st.parent_id);
          const status = st.status === 'done' ? 'Completed' : st.status === 'in_progress' ? 'In progress' : 'Pending';
          misAoa.push([`1.${idx + 1}`, `  ↳ ${st.title} (${parentTask?.title || ''})`, st.unit || 'Sqm', planned, completed, balance, `${pct}%`, '', status]);
        });
      }

      const wsTasks = XLSX.utils.aoa_to_sheet(misAoa);

      // Column widths
      wsTasks['!cols'] = [
        { wch: 8 },   // Sr.No.
        { wch: 45 },  // Activity
        { wch: 8 },   // Unit
        { wch: 12 },  // Scope
        { wch: 12 },  // Completed
        { wch: 12 },  // Balance
        { wch: 14 },  // Completed %
        { wch: 35 },  // Remark
        { wch: 14 },  // Status
      ];

      // ── Category Pivot Sheet ───────────────────────────────────────────────
      const categories = ['Facade', 'Structure', 'Civil', 'General'];
      const pivotAoa: (string | number)[][] = [
        ['Category Scope Summary', '', '', '', '', ''],
        [],
        ['Category', 'No. of Tasks', 'Total Scope', 'Executed', 'Balance', 'Completion %'],
      ];
      categories.forEach((cat) => {
        const catTasks = mainTasks.filter((t) => (t.category || 'Facade') === cat && (!isClient || t.client_visible));
        const plannedSum = catTasks.reduce((s, t) => s + (t.planned_quantity || 0), 0);
        const completedSum = catTasks.reduce((s, t) => s + (t.completed_quantity || 0), 0);
        const balanceSum = Math.max(0, plannedSum - completedSum);
        const pct = plannedSum > 0 ? Math.round((completedSum / plannedSum) * 100) : 0;
        pivotAoa.push([cat, catTasks.length, plannedSum, completedSum, balanceSum, `${pct}%`]);
      });
      const wsPivot = XLSX.utils.aoa_to_sheet(pivotAoa);
      wsPivot['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];

      // ── Daily Progress Log Sheet ───────────────────────────────────────────
      const clientVisibleTaskIds = new Set(
        isClient ? tasks.filter((t) => t.client_visible).map((t) => t.id) : tasks.map((t) => t.id)
      );
      const dprAoa: (string | number)[][] = [
        ['Daily Progress Log', '', '', '', '', '', '', ''],
        [],
        ['Sr.No.', 'Date', 'Activity / Task', 'Category', 'Qty Executed', 'Unit', 'Work Notes / Remark', isClient ? '' : 'Status'],
      ];
      let dprIdx = 0;
      projectDprs
        .filter((d) => !isClient || (d.task_id && clientVisibleTaskIds.has(d.task_id)))
        .forEach((d) => {
          const linkedTask = tasks.find((t) => t.id === d.task_id);
          dprIdx++;
          dprAoa.push([
            dprIdx,
            d.date || '—',
            linkedTask?.title || '—',
            linkedTask?.category || '—',
            d.quantity_completed || 0,
            linkedTask?.unit || 'Sqm',
            d.work_done || '—',
            isClient ? '' : (d.status === 'approved' ? 'Approved' : 'Submitted'),
          ]);
        });
      if (dprIdx === 0) dprAoa.push(['No daily progress entries found yet.', '', '', '', '', '', '', '']);
      const wsDpr = XLSX.utils.aoa_to_sheet(dprAoa);
      wsDpr['!cols'] = [{ wch: 8 }, { wch: 14 }, { wch: 40 }, { wch: 12 }, { wch: 14 }, { wch: 8 }, { wch: 40 }, { wch: 12 }];

      // ── Build Workbook ─────────────────────────────────────────────────────
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsTasks, isClient ? 'Client MIS' : 'MIS Tasks');
      XLSX.utils.book_append_sheet(wb, wsDpr, 'Daily Progress Log');
      XLSX.utils.book_append_sheet(wb, wsPivot, 'Category Summary');

      const prefix = isClient ? 'Client_MIS' : 'Full_MIS';
      const fileName = `${prefix}_Report_${projectId.slice(0, 8)}_${getTodayISO()}.xlsx`;

      if (Platform.OS === 'web') {
        XLSX.writeFile(wb, fileName);
        showAlert('Export Ready', `Excel file "${fileName}" downloaded successfully!`);
      } else {
        const Sharing = require('expo-sharing');
        const FileSystem = require('expo-file-system');
        const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const uri = `${FileSystem.documentDirectory}${fileName}`;
        FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 }).then(() => {
          Sharing.shareAsync(uri);
        });
        showAlert('Success', `Excel file generated: ${fileName}`);
      }
    } catch (err: any) {
      showAlert('Export Error', err.message || 'Failed to export Excel file.');
    }
  };

  // Determine if Completed Qty is locked (PRD Section 10)
  const isEditingCompletedLocked = useMemo(() => {
    if (!editingTask) return false;
    const hasSubtasks = subtasksMap[editingTask.id]?.length > 0;
    const hasDprs = (editingTask.completed_quantity || 0) > 0;
    return hasSubtasks || hasDprs;
  }, [editingTask, subtasksMap]);

  return (
    <View style={styles.container}>
      {/* ── KPI Summary Cards ──────────────────────────────────────────────── */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { borderColor: '#E5E7EB' }]}>
          <View style={[styles.kpiIcon, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="list" size={20} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.kpiLabel}>Total Scope Tasks</Text>
            <Text style={styles.kpiValue}>{totalCount}</Text>
            <Text style={styles.kpiSub}>Registered Scope Items</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { borderColor: '#DCFCE7' }]}>
          <View style={[styles.kpiIcon, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
          </View>
          <View>
            <Text style={styles.kpiLabel}>Completed</Text>
            <Text style={styles.kpiValue}>{completedCount}</Text>
            <Text style={[styles.kpiSub, { color: '#16A34A' }]}>{completionPct}% Completed</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { borderColor: '#FEF3C7' }]}>
          <View style={[styles.kpiIcon, { backgroundColor: '#FFFBEB' }]}>
            <Ionicons name="time" size={20} color="#D97706" />
          </View>
          <View>
            <Text style={styles.kpiLabel}>In Progress</Text>
            <Text style={styles.kpiValue}>{inProgressCount}</Text>
            <Text style={[styles.kpiSub, { color: '#D97706' }]}>
              {totalCount > 0 ? Math.round((inProgressCount / totalCount) * 100) : 0}% Active
            </Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { borderColor: '#FEE2E2' }]}>
          <View style={[styles.kpiIcon, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
          </View>
          <View>
            <Text style={styles.kpiLabel}>Pending</Text>
            <Text style={styles.kpiValue}>{pendingCount}</Text>
            <Text style={[styles.kpiSub, { color: '#DC2626' }]}>
              {totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0}% Pending
            </Text>
          </View>
        </View>
      </View>

      {/* ── Main Controls Header ─────────────────────────────────────────────── */}
      <View style={styles.tableHeaderSection}>
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'tasks' && styles.tabBtnActive]}
            onPress={() => setActiveTab('tasks')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'tasks' && styles.tabBtnTextActive]}>
              Main Scope Tasks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'subtasks' && styles.tabBtnActive]}
            onPress={() => setActiveTab('subtasks')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'subtasks' && styles.tabBtnTextActive]}>
              WBS Subtasks {activeParentTask ? `(${activeParentTask.title})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }]}
            onPress={() => setViewLayout((prev) => (prev === 'cards' ? 'table' : 'cards'))}
          >
            <Ionicons name={viewLayout === 'cards' ? 'grid' : 'list'} size={15} color={colors.neutral[700]} />
            <Text style={[styles.exportBtnText, { color: colors.neutral[800] }]}>
              {viewLayout === 'cards' ? 'Card View' : 'Table View'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]} onPress={() => handleExportExcel('full')}>
            <Ionicons name="document-text" size={15} color="#15803D" />
            <Text style={[styles.exportBtnText, { color: '#15803D' }]}>Full MIS Excel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
            onPress={() => handleExportExcel('client')}
          >
            <Ionicons name="eye-outline" size={15} color="#2563EB" />
            <Text style={[styles.exportBtnText, { color: '#2563EB' }]}>Client Summary</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => handleOpenModal(null, activeTab === 'subtasks' ? (activeParentTask?.id || mainTasks[0]?.id || null) : null)}
          >
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.addBtnText}>
              {activeTab === 'subtasks' ? 'Add WBS Subtask' : 'Add Scope Task'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks by scope title..."
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.filterGroup}>
          {['All', 'Facade', 'Structure', 'Civil', 'General'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, selectedCategory === cat && styles.chipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Tab 1: Tasks Table / Cards ──────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        viewLayout === 'cards' ? (
          <View style={{ gap: spacing.sm }}>
            {filteredMainTasks.map((t, idx) => {
              const planned = t.planned_quantity || 0;
              const completed = t.completed_quantity || 0;
              const balance = Math.max(0, planned - completed);
              const pct = planned > 0 ? Math.round((completed / planned) * 100) : 0;
              const status: TaskStatus = t.status || (pct >= 100 ? 'done' : completed > 0 ? 'in_progress' : 'pending');

              const statusBg = status === 'done' ? '#DCFCE7' : status === 'in_progress' ? '#FEF3C7' : status === 'blocked' ? '#F3F4F6' : '#FEE2E2';
              const statusColor = status === 'done' ? '#15803D' : status === 'in_progress' ? '#B45309' : status === 'blocked' ? '#4B5563' : '#B91C1C';
              const statusLabel = status === 'done' ? 'Completed' : status === 'in_progress' ? 'In Progress' : status === 'blocked' ? 'Blocked' : 'Pending';

              return (
                <View key={t.id} style={styles.mobileCard}>
                  <View style={styles.mobileCardHeader}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Text style={styles.mobileCardSr}>#{idx + 1}</Text>
                        <Text style={styles.mobileCardCategory}>{t.category || 'Facade'}</Text>
                        {t.client_visible && (
                          <View style={styles.clientBadge}>
                            <Ionicons name="eye" size={10} color="#2563EB" />
                            <Text style={styles.clientBadgeText}>Client Visible</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.mobileCardTitle}>{t.title}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleOpenModal(t)}>
                      <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Progress Bar & Quantities */}
                  <View style={styles.mobileCardProgressSection}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={styles.mobileCardMetaText}>
                        Executed: <Text style={{ fontWeight: '700', color: '#16A34A' }}>{completed.toLocaleString('en-IN')}</Text> / {planned.toLocaleString('en-IN')} {t.unit || 'Sqm'}
                      </Text>
                      <Text style={styles.mobileCardPctText}>{pct}%</Text>
                    </View>
                    <View style={styles.mobileCardTrack}>
                      <View
                        style={[
                          styles.mobileCardFill,
                          {
                            width: `${Math.min(100, pct)}%`,
                            backgroundColor: pct >= 100 ? '#16A34A' : pct > 0 ? '#D97706' : '#DC2626',
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Action Bar */}
                  <View style={styles.cardActionBar}>
                    <TouchableOpacity
                      style={styles.logProgressBtn}
                      onPress={() => handleOpenLogProgress(t)}
                    >
                      <Ionicons name="trending-up" size={14} color="#FFF" />
                      <Text style={styles.logProgressBtnText}>Log Progress</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.historyBtn}
                      onPress={() => setHistoryTask(t)}
                    >
                      <Ionicons name="time-outline" size={14} color="#FFF" />
                      <Text style={styles.historyBtnText}>Daily History</Text>
                    </TouchableOpacity>

                    <View style={styles.actionCell}>
                      <TouchableOpacity onPress={() => handleOpenModal(t)}>
                        <Ionicons name="pencil" size={16} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedParentId(t.id);
                          handleOpenModal(null, t.id);
                        }}
                      >
                        <Ionicons name="git-branch-outline" size={16} color="#2563EB" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteTask(t.id, t.title)}>
                        <Ionicons name="trash-outline" size={16} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}

            {filteredMainTasks.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No main scope tasks registered yet.</Text>
              </View>
            )}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.thRow}>
                <Text style={[styles.th, { width: 50 }]}>Sr No</Text>
                <Text style={[styles.th, { width: 180 }]}>Task Name</Text>
                <Text style={[styles.th, { width: 90 }]}>Category</Text>
                <Text style={[styles.th, { width: 60 }]}>Unit</Text>
                <Text style={[styles.th, { width: 90 }]}>Scope</Text>
                <Text style={[styles.th, { width: 90 }]}>Completed</Text>
                <Text style={[styles.th, { width: 90 }]}>Balance</Text>
                <Text style={[styles.th, { width: 60 }]}>%</Text>
                <Text style={[styles.th, { width: 100 }]}>Status</Text>
                <Text style={[styles.th, { width: 110 }]}>Log Daily</Text>
                <Text style={[styles.th, { width: 80 }]}>Actions</Text>
              </View>

              {/* Table Rows */}
              {filteredMainTasks.map((t, idx) => {
                const planned = t.planned_quantity || 0;
                const completed = t.completed_quantity || 0;
                const balance = Math.max(0, planned - completed);
                const pct = planned > 0 ? Math.round((completed / planned) * 100) : 0;
                const status: TaskStatus = t.status || (pct >= 100 ? 'done' : completed > 0 ? 'in_progress' : 'pending');

                return (
                  <View key={t.id} style={[styles.tr, { backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }]}>
                    <Text style={[styles.td, { width: 50, color: colors.neutral[500], textAlign: 'center' }]}>{idx + 1}</Text>
                    
                    <TouchableOpacity
                      style={{ width: 180 }}
                      onPress={() => {
                        setSelectedParentId(t.id);
                        setActiveTab('subtasks');
                      }}
                    >
                      <Text style={[styles.td, { fontWeight: '600', color: '#2563EB' }]}>
                        {t.title}
                      </Text>
                    </TouchableOpacity>

                    <Text style={[styles.td, { width: 90 }]}>{t.category || 'Facade'}</Text>
                    <Text style={[styles.td, { width: 60 }]}>{t.unit || 'Sqm'}</Text>
                    <Text style={[styles.td, { width: 90, fontWeight: '600', color: '#0F172A' }]}>{planned.toLocaleString('en-IN')}</Text>
                    <Text style={[styles.td, { width: 90, color: '#16A34A', fontWeight: '700', backgroundColor: '#F0FDF4' }]}>
                      {completed.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.td, { width: 90, color: '#DC2626', fontWeight: '600', backgroundColor: '#FEF2F2' }]}>
                      {balance.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.td, { width: 60, fontWeight: '700', color: '#2563EB' }]}>{pct}%</Text>

                    {/* Status Badge */}
                    <TouchableOpacity style={{ width: 100 }} onPress={() => handleOpenModal(t)}>
                      <View
                        style={[
                          styles.statusBadge,
                          status === 'done'
                            ? styles.statusDone
                            : status === 'in_progress'
                            ? styles.statusProgress
                            : status === 'blocked'
                            ? { backgroundColor: '#F3F4F6' }
                            : styles.statusPending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            status === 'done'
                              ? styles.statusDoneText
                              : status === 'in_progress'
                              ? styles.statusProgressText
                              : status === 'blocked'
                              ? { color: '#4B5563' }
                              : styles.statusPendingText,
                          ]}
                        >
                          {status === 'done'
                            ? 'Completed'
                            : status === 'in_progress'
                            ? 'In Progress'
                            : status === 'blocked'
                            ? 'Blocked'
                            : 'Pending'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Log Progress Quick Button */}
                    <View style={{ width: 110, flexDirection: 'row', gap: 4 }}>
                      <TouchableOpacity
                        style={[styles.logProgressBtn, { paddingHorizontal: 6, paddingVertical: 4 }]}
                        onPress={() => handleOpenLogProgress(t)}
                      >
                        <Ionicons name="trending-up" size={12} color="#FFF" />
                        <Text style={[styles.logProgressBtnText, { fontSize: 10 }]}>Log</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.historyBtn, { paddingHorizontal: 4, paddingVertical: 4 }]}
                        onPress={() => setHistoryTask(t)}
                      >
                        <Ionicons name="time-outline" size={12} color="#FFF" />
                      </TouchableOpacity>
                    </View>

                    {/* Action Icons */}
                    <View style={[styles.actionCell, { width: 80 }]}>
                      <TouchableOpacity onPress={() => handleOpenModal(t)}>
                        <Ionicons name="pencil" size={16} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => {
                        setSelectedParentId(t.id);
                        handleOpenModal(null, t.id);
                      }}>
                        <Ionicons name="git-branch-outline" size={16} color="#2563EB" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteTask(t.id, t.title)}>
                        <Ionicons name="trash-outline" size={16} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {filteredMainTasks.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No tasks registered yet.</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )
      )}

      {/* ── Tab 2: WBS Subtasks Drawer Table ─────────────────────────────────── */}
      {activeTab === 'subtasks' && (
        <View style={styles.subtasksContainer}>
          <View style={styles.subtasksHeader}>
            <Text style={styles.subtasksTitle}>
              WBS Breakdown Filter: <Text style={{ color: colors.primary }}>{activeParentTask ? activeParentTask.title : 'All Subtasks'}</Text>
            </Text>
            <TouchableOpacity
              style={styles.addSubtaskBtn}
              onPress={() => handleOpenModal(null, activeParentTask?.id || mainTasks[0]?.id || null)}
            >
              <Ionicons name="add" size={16} color="#FFF" />
              <Text style={styles.addSubtaskBtnText}>Add WBS Zone/Floor</Text>
            </TouchableOpacity>
          </View>

          {/* Parent Task Selector Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  (!selectedParentId || selectedParentId === 'ALL') && styles.chipActive,
                ]}
                onPress={() => setSelectedParentId('ALL')}
              >
                <Text style={[styles.chipText, (!selectedParentId || selectedParentId === 'ALL') && styles.chipTextActive]}>
                  All WBS Subtasks ({allSubtasks.length})
                </Text>
              </TouchableOpacity>

              {mainTasks.map((mt) => {
                const count = subtasksMap[mt.id]?.length || 0;
                return (
                  <TouchableOpacity
                    key={'st-chip-' + mt.id}
                    style={[
                      styles.chip,
                      selectedParentId === mt.id && styles.chipActive,
                    ]}
                    onPress={() => setSelectedParentId(mt.id)}
                  >
                    <Text style={[styles.chipText, selectedParentId === mt.id && styles.chipTextActive]}>
                      {mt.title} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={styles.table}>
              <View style={styles.thRow}>
                <Text style={[styles.th, { width: 50 }]}>Sr No</Text>
                <Text style={[styles.th, { width: 180 }]}>Subtask Zone/Floor</Text>
                <Text style={[styles.th, { width: 60 }]}>Unit</Text>
                <Text style={[styles.th, { width: 90 }]}>Scope</Text>
                <Text style={[styles.th, { width: 90 }]}>Completed</Text>
                <Text style={[styles.th, { width: 90 }]}>Balance</Text>
                <Text style={[styles.th, { width: 60 }]}>%</Text>
                <Text style={[styles.th, { width: 100 }]}>Status</Text>
                <Text style={[styles.th, { width: 110 }]}>Log Daily</Text>
                <Text style={[styles.th, { width: 80 }]}>Actions</Text>
              </View>

              {activeSubtasks.map((st, idx) => {
                const planned = st.planned_quantity || 0;
                const completed = st.completed_quantity || 0;
                const balance = Math.max(0, planned - completed);
                const pct = planned > 0 ? Math.round((completed / planned) * 100) : 0;
                const status: TaskStatus = st.status || (pct >= 100 ? 'done' : completed > 0 ? 'in_progress' : 'pending');

                return (
                  <View key={st.id} style={[styles.tr, { backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }]}>
                    <Text style={[styles.td, { width: 50, color: colors.neutral[500], textAlign: 'center' }]}>{idx + 1}</Text>
                    <Text style={[styles.td, { width: 180, fontWeight: '600', color: '#0F172A' }]}>{st.title}</Text>
                    <Text style={[styles.td, { width: 60 }]}>{st.unit || 'Sqm'}</Text>
                    <Text style={[styles.td, { width: 90, fontWeight: '600', color: '#0F172A' }]}>{planned.toLocaleString('en-IN')}</Text>
                    <Text style={[styles.td, { width: 90, color: '#16A34A', fontWeight: '700', backgroundColor: '#F0FDF4' }]}>
                      {completed.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.td, { width: 90, color: '#DC2626', fontWeight: '600', backgroundColor: '#FEF2F2' }]}>
                      {balance.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.td, { width: 60, fontWeight: '700', color: '#2563EB' }]}>{pct}%</Text>

                    <TouchableOpacity style={{ width: 100 }} onPress={() => handleOpenModal(st)}>
                      <View
                        style={[
                          styles.statusBadge,
                          status === 'done'
                            ? styles.statusDone
                            : status === 'in_progress'
                            ? styles.statusProgress
                            : status === 'blocked'
                            ? { backgroundColor: '#F3F4F6' }
                            : styles.statusPending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            status === 'done'
                              ? styles.statusDoneText
                              : status === 'in_progress'
                              ? styles.statusProgressText
                              : status === 'blocked'
                              ? { color: '#4B5563' }
                              : styles.statusPendingText,
                          ]}
                        >
                          {status === 'done'
                            ? 'Completed'
                            : status === 'in_progress'
                            ? 'In Progress'
                            : status === 'blocked'
                            ? 'Blocked'
                            : 'Pending'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View style={{ width: 110, flexDirection: 'row', gap: 4 }}>
                      <TouchableOpacity
                        style={[styles.logProgressBtn, { paddingHorizontal: 6, paddingVertical: 4 }]}
                        onPress={() => handleOpenLogProgress(st)}
                      >
                        <Ionicons name="trending-up" size={12} color="#FFF" />
                        <Text style={[styles.logProgressBtnText, { fontSize: 10 }]}>Log</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.historyBtn, { paddingHorizontal: 4, paddingVertical: 4 }]}
                        onPress={() => setHistoryTask(st)}
                      >
                        <Ionicons name="time-outline" size={12} color="#FFF" />
                      </TouchableOpacity>
                    </View>

                    <View style={[styles.actionCell, { width: 80 }]}>
                      <TouchableOpacity onPress={() => handleOpenModal(st)}>
                        <Ionicons name="pencil" size={16} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteTask(st.id, st.title)}>
                        <Ionicons name="trash-outline" size={16} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {activeSubtasks.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No subtasks found for this task.</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── Add / Edit Task Modal ────────────────────────────────────────────── */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTask ? 'Edit Task / WBS Subtask' : modalParentId ? 'Add WBS Zone/Floor Subtask' : 'Add Main Scope Task'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }}>
              <Text style={styles.fieldLabel}>Task Scope Type (Parent Link)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      !modalParentId && { backgroundColor: '#2563EB', borderColor: '#1D4ED8' },
                    ]}
                    onPress={() => setModalParentId(null)}
                  >
                    <Text style={[styles.chipText, !modalParentId && { color: '#FFFFFF', fontWeight: '700' }]}>
                      📌 Main Scope Task
                    </Text>
                  </TouchableOpacity>

                  {mainTasks.map((mt) => {
                    const isSelected = modalParentId === mt.id;
                    return (
                      <TouchableOpacity
                        key={'p-select-' + mt.id}
                        style={[
                          styles.chip,
                          isSelected && { backgroundColor: '#2563EB', borderColor: '#1D4ED8' },
                        ]}
                        onPress={() => setModalParentId(mt.id)}
                      >
                        <Text style={[styles.chipText, isSelected && { color: '#FFFFFF', fontWeight: '700' }]}>
                          🌿 Subtask of: {mt.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Status Banner indicating clearly whether it will be a Main Task or WBS Subtask */}
              <View
                style={{
                  marginBottom: 14,
                  padding: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  backgroundColor: modalParentId ? '#EFF6FF' : '#F8FAFC',
                  borderColor: modalParentId ? '#BFDBFE' : '#E2E8F0',
                }}
              >
                {modalParentId ? (
                  <View>
                    <Text style={{ fontSize: 12, color: '#2563EB', fontWeight: '700' }}>
                      🌿 Creating WBS Subtask linked to: "{mainTasks.find((t) => t.id === modalParentId)?.title || 'Parent Task'}"
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      This subtask will appear under the WBS Subtasks breakdown tab.
                    </Text>
                  </View>
                ) : (
                  <View>
                    <Text style={{ fontSize: 12, color: '#0F172A', fontWeight: '700' }}>
                      📌 Creating Main Scope Task
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      This will create a new top-level task in the Main Scope list.
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.fieldLabel}>Task / WBS Zone Name *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. Aluminium Glazing — Tower A / Elevation 1"
                value={formTitle}
                onChangeText={setFormTitle}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Category / Trade</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Facade / Structure"
                    value={formCategory}
                    onChangeText={setFormCategory}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>Unit</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Sqm / Kg / Rmt"
                    value={formUnit}
                    onChangeText={setFormUnit}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Planned Scope Qty *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    keyboardType="numeric"
                    placeholder={modalParentId ? 'e.g. 10' : 'e.g. 1000'}
                    value={formPlanned}
                    onChangeText={setFormPlanned}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.fieldLabel}>Completed Qty</Text>
                    {isEditingCompletedLocked && (
                      <Text style={{ fontSize: 10, color: '#D97706', fontWeight: '700' }}>🔒 DPR Derived</Text>
                    )}
                  </View>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      isEditingCompletedLocked && { backgroundColor: '#F3F4F6', color: '#6B7280' },
                    ]}
                    keyboardType="numeric"
                    placeholder="0"
                    value={formCompleted}
                    editable={!isEditingCompletedLocked}
                    onChangeText={setFormCompleted}
                  />
                </View>
              </View>

              {/* Date Pickers */}
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <DatePickerField
                    label="Start Date"
                    value={formStartDate}
                    onChange={setFormStartDate}
                    placeholder="Select start date"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <DatePickerField
                    label="Target End Date"
                    value={formEndDate}
                    onChange={setFormEndDate}
                    placeholder="Select end date"
                  />
                </View>
              </View>

              {/* Client Visibility Toggle (PRD Section 9) */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Visible to Client</Text>
                  <Text style={styles.switchSub}>Allow clients to view progress % for this task in summary</Text>
                </View>
                <Switch
                  value={formClientVisible}
                  onValueChange={setFormClientVisible}
                  trackColor={{ false: '#D1D5DB', true: '#BFDBFE' }}
                  thumbColor={formClientVisible ? '#2563EB' : '#F3F4F6'}
                />
              </View>

              {/* Checklist Section (PRD Req #7) */}
              <View style={{ marginTop: 12 }}>
                <Text style={styles.fieldLabel}>Checklist Items (Persisted)</Text>
                {formChecklist.map((item) => (
                  <View key={item.id} style={styles.checkItemRow}>
                    <TouchableOpacity onPress={() => handleToggleCheckItem(item.id)}>
                      <Ionicons
                        name={item.completed ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={item.completed ? colors.primary : colors.neutral[400]}
                      />
                    </TouchableOpacity>
                    <Text
                      style={[
                        styles.checkItemText,
                        item.completed && { textDecorationLine: 'line-through', color: colors.neutral[400] },
                      ]}
                    >
                      {item.text}
                    </Text>
                    <TouchableOpacity onPress={() => handleRemoveCheckItem(item.id)}>
                      <Ionicons name="trash-outline" size={14} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={styles.addCheckItemRow}>
                  <TextInput
                    style={[styles.fieldInput, { flex: 1, marginTop: 0 }]}
                    placeholder="Add checklist item..."
                    value={newCheckItemText}
                    onChangeText={setNewCheckItemText}
                  />
                  <TouchableOpacity style={styles.addCheckItemBtn} onPress={handleAddCheckItem}>
                    <Ionicons name="add" size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Task Status Picker */}
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Task Status Override</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, marginBottom: 10 }}>
                {[
                  { id: 'pending', label: 'Pending', color: '#FEE2E2', textColor: '#B91C1C' },
                  { id: 'in_progress', label: 'In Progress', color: '#FEF3C7', textColor: '#B45309' },
                  { id: 'done', label: 'Done', color: '#DCFCE7', textColor: '#15803D' },
                  { id: 'blocked', label: 'Blocked', color: '#F3F4F6', textColor: '#4B5563' },
                ].map((st) => {
                  const isSel = formStatus === st.id;
                  return (
                    <TouchableOpacity
                      key={st.id}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 6,
                        alignItems: 'center',
                        backgroundColor: isSel ? st.color : '#F9FAFB',
                        borderWidth: 1,
                        borderColor: isSel ? st.textColor : '#E5E7EB',
                      }}
                      onPress={() => setFormStatus(st.id as TaskStatus)}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: isSel ? st.textColor : '#6B7280',
                        }}
                      >
                        {st.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTask}>
                <Text style={styles.saveBtnText}>Save Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Log Daily Progress Modal (PRD Section 4 & 10) ──────────────────────── */}
      <Modal visible={Boolean(logProgressTask)} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Log Daily Progress</Text>
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 2 }}>
                  {logProgressTask?.title}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setLogProgressTask(null)}>
                <Ionicons name="close" size={24} color={colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            <View style={{ marginVertical: 8 }}>
              <View style={styles.logScopeSummary}>
                <View>
                  <Text style={{ fontSize: 11, color: colors.neutral[500] }}>Planned Scope</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.neutral[800] }}>
                    {logProgressTask?.planned_quantity || 0} {logProgressTask?.unit || 'Sqm'}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: colors.neutral[500] }}>Current Completed</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#16A34A' }}>
                    {logProgressTask?.completed_quantity || 0} {logProgressTask?.unit || 'Sqm'}
                  </Text>
                </View>
              </View>

              <DatePickerField
                label="Progress Entry Date"
                value={logProgressDate}
                onChange={setLogProgressDate}
                placeholder="Select date"
              />

              <Text style={styles.fieldLabel}>Quantity Completed Today ({logProgressTask?.unit || 'Sqm'}) *</Text>
              <TextInput
                style={styles.fieldInput}
                keyboardType="numeric"
                placeholder="e.g. 150"
                value={logProgressQty}
                onChangeText={setLogProgressQty}
              />

              <Text style={styles.fieldLabel}>Daily Work Note / Remarks</Text>
              <TextInput
                style={[styles.fieldInput, { height: 70, textAlignVertical: 'top' }]}
                multiline
                placeholder="e.g. Installed 150 sqm glazing on East Elevation Floor 4"
                value={logProgressNote}
                onChangeText={setLogProgressNote}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setLogProgressTask(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: '#16A34A' }]}
                onPress={handleSaveLogProgress}
              >
                <Text style={styles.saveBtnText}>Log Daily Progress</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Daily Progress History Modal (PRD Section 6, Req #5) ───────────────── */}
      <Modal visible={Boolean(historyTask)} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Daily Progress History</Text>
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 2 }}>
                  {historyTask?.title}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setHistoryTask(null)}>
                <Ionicons name="close" size={24} color={colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            {isLoadingHistory ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 24 }} />
            ) : (
              <ScrollView style={{ maxHeight: 360 }}>
                {historyDprs.map((entry) => (
                  <View key={entry.id} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyDate}>📅 {entry.date}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          entry.status === 'approved'
                            ? styles.statusDone
                            : entry.status === 'submitted'
                            ? styles.statusProgress
                            : styles.statusPending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            entry.status === 'approved'
                              ? styles.statusDoneText
                              : entry.status === 'submitted'
                              ? styles.statusProgressText
                              : styles.statusPendingText,
                          ]}
                        >
                          {entry.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.historyQty}>
                      Quantity Executed: <Text style={{ fontWeight: '700', color: '#16A34A' }}>+{entry.quantity_completed || 0} {historyTask?.unit || 'Sqm'}</Text>
                    </Text>
                    {Boolean(entry.work_done) && (
                      <Text style={styles.historyNote}>{entry.work_done}</Text>
                    )}

                    <TouchableOpacity
                      style={{ alignSelf: 'flex-end', marginTop: 4 }}
                      onPress={async () => {
                        try {
                          await deleteDpr.mutateAsync(entry.id);
                          onRefresh?.();
                        } catch (err: any) {
                          showAlert('Error', err.message || 'Failed to delete entry.');
                        }
                      }}
                    >
                      <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '600' }}>Delete Entry</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {historyDprs.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No daily progress entries logged for this task yet.</Text>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setHistoryTask(null)}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  
  // KPI Section (Awwwards Double-Bezel Architecture)
  kpiRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' },
  kpiCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  kpiIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  kpiLabel: { fontSize: 10, color: '#64748B', fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  kpiValue: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginTop: 1 },
  kpiSub: { fontSize: 10, color: '#94A3B8', marginTop: 2, fontWeight: '600' },

  // Floating Glass Control Navigation Bar
  tableHeaderSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: '#FFFFFF',
    padding: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtn: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 10 },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  tabBtnTextActive: { color: '#2563EB', fontWeight: '700' },

  actionRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 7,
    borderRadius: 12,
  },
  exportBtnText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  addBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  logProgressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 7,
    borderRadius: radius.md,
  },
  logProgressBtnText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 7,
    borderRadius: radius.md,
  },
  historyBtnText: { color: '#334155', fontSize: 11, fontWeight: '700' },


  // Filter Bar
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    flex: 1,
    minWidth: 200,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  searchInput: { paddingVertical: 8, fontSize: 12, flex: 1, color: '#0F172A' },
  filterGroup: { flexDirection: 'row', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: '#2563EB', borderColor: '#1D4ED8' },
  chipText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  chipTextActive: { color: '#FFF', fontWeight: '700' },

  // Mobile Cards
  mobileCard: {
    backgroundColor: '#FFF',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: spacing.xs,
  },
  mobileCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  mobileCardSr: { fontSize: 11, fontWeight: '700', color: colors.neutral[400] },
  mobileCardCategory: { fontSize: 11, fontWeight: '600', color: colors.primary },
  mobileCardTitle: { fontSize: 14, fontWeight: '700', color: colors.neutral[900] },
  clientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  clientBadgeText: { fontSize: 9, color: '#2563EB', fontWeight: '700' },

  mobileCardProgressSection: { marginVertical: spacing.xs },
  mobileCardMetaText: { fontSize: 12, color: colors.neutral[600] },
  mobileCardPctText: { fontSize: 12, fontWeight: '700', color: colors.neutral[800] },
  mobileCardTrack: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  mobileCardFill: { height: '100%', borderRadius: 3 },

  cardActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
  },
  // Table View
  table: { backgroundColor: '#FFF', borderRadius: radius.md, borderWidth: 1, borderColor: '#CBD5E1', overflow: 'hidden' },
  thRow: { flexDirection: 'row', backgroundColor: '#F8FAFB', borderBottomWidth: 1, borderColor: '#CBD5E1' },
  th: { fontSize: 11, fontWeight: '700', color: '#475569', padding: 10, borderRightWidth: 1, borderColor: '#E2E8F0' },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  td: { fontSize: 12, color: colors.neutral[800], padding: 10, borderRightWidth: 1, borderColor: '#E2E8F0' },
  actionCell: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },

  // Status Badges
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusDone: { backgroundColor: '#DCFCE7' },
  statusDoneText: { color: '#15803D' },
  statusProgress: { backgroundColor: '#FEF3C7' },
  statusProgressText: { color: '#B45309' },
  statusPending: { backgroundColor: '#FEE2E2' },
  statusPendingText: { color: '#B91C1C' },

  // Subtasks Section
  subtasksContainer: { backgroundColor: '#FFF', padding: spacing.md, borderRadius: radius.md },
  subtasksHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  subtasksTitle: { fontSize: 14, fontWeight: '700', color: colors.neutral[800] },
  addSubtaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  addSubtaskBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  emptyState: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { color: colors.neutral[400], fontSize: 13 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.md },
  modalContent: { backgroundColor: '#FFF', borderRadius: radius.md, padding: spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.neutral[900] },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.neutral[700], marginTop: spacing.sm },
  fieldInput: {
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 13,
    marginTop: 4,
  },
  formRow: { flexDirection: 'row', marginTop: spacing.xs },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: 4,
  },
  switchLabel: { fontSize: 13, fontWeight: '600', color: colors.neutral[900] },
  switchSub: { fontSize: 11, color: colors.neutral[500] },

  // Checklist Styles
  checkItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  checkItemText: { fontSize: 13, color: colors.neutral[800], flex: 1 },
  addCheckItemRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 },
  addCheckItemBtn: { backgroundColor: colors.primary, width: 34, height: 34, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center' },

  // Log Progress Summary Box
  logScopeSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F3F4F6',
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },

  // History Card
  historyCard: { backgroundColor: '#F9FAFB', borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.xs, borderWidth: 1, borderColor: '#E5E7EB' },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyDate: { fontSize: 12, fontWeight: '700', color: colors.neutral[800] },
  historyQty: { fontSize: 12, color: colors.neutral[600], marginTop: 4 },
  historyNote: { fontSize: 12, color: colors.neutral[700], fontStyle: 'italic', marginTop: 2 },

  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  cancelBtnText: { color: colors.neutral[600], fontSize: 13 },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  saveBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
});
