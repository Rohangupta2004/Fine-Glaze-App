import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import * as XLSX from 'xlsx';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { radius, spacing, shadows } from '../theme/spacing';
import type { Task, TaskStatus } from '../types';
import { useCreateTask, useUpdateTaskMIS, useDeleteTask } from '../hooks/useTasks';
import { useAuthStore } from '../stores/authStore';
import { showAlert } from '../utils/alert';

interface ExcelTaskMISGridProps {
  projectId: string;
  tasks: Task[];
  onRefresh?: () => void;
}

export function ExcelTaskMISGrid({ projectId, tasks, onRefresh }: ExcelTaskMISGridProps) {
  const profile = useAuthStore((state) => state.profile);
  const createTask = useCreateTask();
  const updateTaskMIS = useUpdateTaskMIS();
  const deleteTask = useDeleteTask();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'tasks' | 'subtasks'>('tasks');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [viewLayout, setViewLayout] = useState<'cards' | 'table'>('cards');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalParentId, setModalParentId] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Facade');
  const [formUnit, setFormUnit] = useState('Sqm');
  const [formPlanned, setFormPlanned] = useState('1000');
  const [formCompleted, setFormCompleted] = useState('0');
  const [formStartDate, setFormStartDate] = useState('2026-07-01');
  const [formEndDate, setFormEndDate] = useState('2026-08-01');
  const [formStatus, setFormStatus] = useState<TaskStatus>('pending');

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
      
      let statusStr = t.status === 'done' ? 'Completed' : (t.completed_quantity || 0) > 0 ? 'In Progress' : 'Pending';
      const matchStatus = selectedStatus === 'All' || statusStr === selectedStatus;

      return matchSearch && matchCat && matchStatus;
    });
  }, [mainTasks, search, selectedCategory, selectedStatus]);

  // Tab-sensitive Stats calculation (Main Tasks vs Subtasks MIS)
  const targetList = activeTab === 'tasks' ? mainTasks : allSubtasks;
  const totalCount = targetList.length;
  const completedCount = targetList.filter((t) => t.status === 'done' || (t.planned_quantity && t.completed_quantity && t.completed_quantity >= t.planned_quantity)).length;
  const inProgressCount = targetList.filter((t) => t.status !== 'done' && (t.completed_quantity || 0) > 0).length;
  const pendingCount = Math.max(0, totalCount - completedCount - inProgressCount);
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Open Add/Edit Modal
  const handleOpenModal = (taskToEdit?: Task | null, parentIdForSubtask?: string | null) => {
    if (taskToEdit) {
      setEditingTask(taskToEdit);
      setModalParentId(taskToEdit.parent_id || null);
      setFormTitle(taskToEdit.title);
      setFormCategory(taskToEdit.category || 'Facade');
      setFormUnit(taskToEdit.unit || 'Sqm');
      setFormPlanned(String(taskToEdit.planned_quantity || 0));
      setFormCompleted(String(taskToEdit.completed_quantity || 0));
      setFormStartDate(taskToEdit.start_date || '2026-07-01');
      setFormEndDate(taskToEdit.end_date || '2026-08-01');
      setFormStatus(taskToEdit.status || 'pending');
    } else {
      setEditingTask(null);
      setModalParentId(parentIdForSubtask || null);
      setFormTitle('');
      setFormCategory('Facade');
      setFormUnit('Sqm');
      setFormPlanned('1000');
      setFormCompleted('0');
      setFormStartDate('2026-07-01');
      setFormEndDate('2026-08-01');
      setFormStatus('pending');
    }
    setIsModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!formTitle.trim()) {
      showAlert('Validation Error', 'Please enter a task name.');
      return;
    }

    const planned = parseFloat(formPlanned) || 0;
    const completed = parseFloat(formCompleted) || 0;
    const status: TaskStatus = formStatus;

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
          status,
          parentId: modalParentId,
        });
      } else {
        await createTask.mutateAsync({
          projectId,
          title: formTitle.trim(),
          createdBy: profile?.id || '',
          parentId: modalParentId,
          category: formCategory,
          unit: formUnit,
          plannedQuantity: planned,
          completedQuantity: completed,
          startDate: formStartDate,
          endDate: formEndDate,
        });

        if (modalParentId) {
          setSelectedParentId(modalParentId);
          setActiveTab('subtasks');
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to save task.');
    }
  };

  const handleDelete = (taskId: string, title: string) => {
    showAlert('Delete Task', `Are you sure you want to delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask.mutateAsync(taskId);
          } catch (err: any) {
            showAlert('Error', err.message || 'Failed to delete task.');
          }
        },
      },
    ]);
  };

  const handleExportExcel = async () => {
    try {
      const taskRows = tasks.map((t, idx) => {
        const planned = t.planned_quantity || 1000;
        const completed = t.completed_quantity || 0;
        const balance = Math.max(0, planned - completed);
        const pct = planned > 0 ? Math.round((completed / planned) * 100) : 0;
        const parentTask = t.parent_id ? tasks.find((p) => p.id === t.parent_id) : null;

        return {
          'Sr No': t.parent_id ? `1.${idx + 1}` : `${idx + 1}.0`,
          'Task Hierarchy': t.parent_id ? 'Subtask' : 'Main Task',
          'Parent Task': parentTask?.title || '—',
          'Category / Trade': t.category || 'Facade',
          'Task / Activity Description': t.title,
          'Unit': t.unit || 'Sqm',
          'Planned Scope': planned,
          'Executed Volume': completed,
          'Balance Volume': balance,
          'Completion %': `${pct}%`,
          'Current Status': t.status === 'done' ? 'Completed' : t.status === 'in_progress' ? 'In Progress' : t.status === 'blocked' ? 'Blocked' : 'Pending',
          'Start Date': t.start_date || '2026-07-01',
          'Target End Date': t.end_date || '2026-08-01',
        };
      });

      // Category Pivot Summary
      const categories = ['Facade', 'Structure', 'Civil', 'General'];
      const pivotRows = categories.map((cat) => {
        const catTasks = tasks.filter((t) => (t.category || 'Facade') === cat);
        const count = catTasks.length;
        const plannedSum = catTasks.reduce((s, t) => s + (t.planned_quantity || 1000), 0);
        const completedSum = catTasks.reduce((s, t) => s + (t.completed_quantity || 0), 0);
        const balanceSum = Math.max(0, plannedSum - completedSum);
        const pct = plannedSum > 0 ? Math.round((completedSum / plannedSum) * 100) : 0;

        return {
          'Category': cat,
          'Total Tasks': count,
          'Total Planned Scope': plannedSum,
          'Total Executed Volume': completedSum,
          'Total Balance Scope': balanceSum,
          'Category Completion %': `${pct}%`,
        };
      });

      const wb = XLSX.utils.book_new();
      const wsTasks = XLSX.utils.json_to_sheet(taskRows);
      const wsPivot = XLSX.utils.json_to_sheet(pivotRows);

      XLSX.utils.book_append_sheet(wb, wsTasks, 'MIS Tasks WBS');
      XLSX.utils.book_append_sheet(wb, wsPivot, 'Pivot Category Summary');

      const fileName = `MIS_Task_Report_${projectId.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.xlsx`;

      if (Platform.OS === 'web') {
        XLSX.writeFile(wb, fileName);
        showAlert('Download Started', `Excel file "${fileName}" downloaded to your browser download folder!`);
      } else {
        const Sharing = require('expo-sharing');
        const FileSystem = require('expo-file-system');
        const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const uri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
        await Sharing.shareAsync(uri);
        showAlert('Success', `Excel file generated: ${fileName}`);
      }
    } catch (err: any) {
      showAlert('Export Error', err.message || 'Failed to export Excel file.');
    }
  };

  return (
    <View style={styles.container}>
      {/* ── KPI Summary Cards ──────────────────────────────────────────────── */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { borderColor: '#E5E7EB' }]}>
          <View style={[styles.kpiIcon, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="list" size={20} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.kpiLabel}>Total Tasks</Text>
            <Text style={styles.kpiValue}>{totalCount}</Text>
            <Text style={styles.kpiSub}>All Registered Tasks</Text>
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
              {totalCount > 0 ? Math.round((inProgressCount / totalCount) * 100) : 0}% In Progress
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
              Task List
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'subtasks' && styles.tabBtnActive]}
            onPress={() => setActiveTab('subtasks')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'subtasks' && styles.tabBtnTextActive]}>
              Subtasks {activeParentTask ? `(${activeParentTask.title})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }]}
            onPress={() => setViewLayout((prev) => (prev === 'cards' ? 'table' : 'cards'))}
          >
            <Ionicons name={viewLayout === 'cards' ? 'grid' : 'list'} size={16} color={colors.neutral[700]} />
            <Text style={[styles.exportBtnText, { color: colors.neutral[800] }]}>
              {viewLayout === 'cards' ? 'Card View' : 'Table View'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exportBtn} onPress={handleExportExcel}>
            <Ionicons name="document-text" size={16} color="#15803D" />
            <Text style={styles.exportBtnText}>Export Excel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.addBtn} onPress={() => handleOpenModal(null)}>
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.addBtnText}>Add Task</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks..."
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
              const planned = t.planned_quantity || 1000;
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

                  {/* Bottom Row */}
                  <View style={styles.mobileCardFooter}>
                    <Text style={styles.mobileCardDateText}>
                      📅 {t.start_date || '01 Jul'} – {t.end_date || '15 Jul'}
                    </Text>
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
                      <TouchableOpacity onPress={() => handleDelete(t.id, t.title)}>
                        <Ionicons name="trash-outline" size={16} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
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
                <Text style={[styles.th, { width: 90 }]}>Planned</Text>
                <Text style={[styles.th, { width: 90 }]}>Completed</Text>
                <Text style={[styles.th, { width: 90 }]}>Balance</Text>
                <Text style={[styles.th, { width: 60 }]}>%</Text>
                <Text style={[styles.th, { width: 100 }]}>Status</Text>
                <Text style={[styles.th, { width: 90 }]}>Start Date</Text>
                <Text style={[styles.th, { width: 90 }]}>End Date</Text>
                <Text style={[styles.th, { width: 80 }]}>Actions</Text>
              </View>

              {/* Table Rows */}
              {filteredMainTasks.map((t, idx) => {
                const planned = t.planned_quantity || 1000;
                const completed = t.completed_quantity || 0;
                const balance = Math.max(0, planned - completed);
                const pct = planned > 0 ? Math.round((completed / planned) * 100) : 0;
                const status: TaskStatus = t.status || (pct >= 100 ? 'done' : completed > 0 ? 'in_progress' : 'pending');

                return (
                  <View key={t.id} style={styles.tr}>
                    <Text style={[styles.td, { width: 50, color: colors.neutral[400] }]}>{idx + 1}</Text>
                    
                    <TouchableOpacity
                      style={{ width: 180 }}
                      onPress={() => {
                        setSelectedParentId(t.id);
                        setActiveTab('subtasks');
                      }}
                    >
                      <Text style={[styles.td, { fontWeight: '600', color: colors.primary }]}>
                        {t.title}
                      </Text>
                    </TouchableOpacity>

                    <Text style={[styles.td, { width: 90 }]}>{t.category || 'Facade'}</Text>
                    <Text style={[styles.td, { width: 60 }]}>{t.unit || 'Sqm'}</Text>
                    <Text style={[styles.td, { width: 90 }]}>{planned.toLocaleString('en-IN')}</Text>
                    <Text style={[styles.td, { width: 90 }]}>{planned.toLocaleString('en-IN')}</Text>
                    <Text style={[styles.td, { width: 90, color: '#16A34A', fontWeight: '600' }]}>
                      {completed.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.td, { width: 90, color: '#DC2626' }]}>
                      {balance.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.td, { width: 60, fontWeight: '700' }]}>{pct}%</Text>

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

                    <Text style={[styles.td, { width: 90 }]}>{t.start_date || '01 Jul 2026'}</Text>
                    <Text style={[styles.td, { width: 90 }]}>{t.end_date || '15 Jul 2026'}</Text>

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
                      <TouchableOpacity onPress={() => handleDelete(t.id, t.title)}>
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

      {/* ── Tab 2: Subtasks Drawer Table ─────────────────────────────────────── */}
      {activeTab === 'subtasks' && (
        <View style={styles.subtasksContainer}>
          <View style={styles.subtasksHeader}>
            <Text style={styles.subtasksTitle}>
              Subtasks Filter: <Text style={{ color: colors.primary }}>{activeParentTask ? activeParentTask.title : 'All Subtasks'}</Text>
            </Text>
            <TouchableOpacity
              style={styles.addSubtaskBtn}
              onPress={() => handleOpenModal(null, activeParentTask?.id || null)}
            >
              <Ionicons name="add" size={16} color="#FFF" />
              <Text style={styles.addSubtaskBtnText}>Add Subtask</Text>
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
                  All Subtasks ({allSubtasks.length})
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
                <Text style={[styles.th, { width: 180 }]}>Subtask Name</Text>
                <Text style={[styles.th, { width: 60 }]}>Unit</Text>
                <Text style={[styles.th, { width: 90 }]}>Scope</Text>
                <Text style={[styles.th, { width: 90 }]}>Planned</Text>
                <Text style={[styles.th, { width: 90 }]}>Completed</Text>
                <Text style={[styles.th, { width: 90 }]}>Balance</Text>
                <Text style={[styles.th, { width: 60 }]}>%</Text>
                <Text style={[styles.th, { width: 100 }]}>Status</Text>
                <Text style={[styles.th, { width: 90 }]}>Start Date</Text>
                <Text style={[styles.th, { width: 90 }]}>End Date</Text>
                <Text style={[styles.th, { width: 80 }]}>Actions</Text>
              </View>

              {activeSubtasks.map((st, idx) => {
                const planned = st.planned_quantity || 1000;
                const completed = st.completed_quantity || 0;
                const balance = Math.max(0, planned - completed);
                const pct = planned > 0 ? Math.round((completed / planned) * 100) : 0;
                const status: TaskStatus = st.status || (pct >= 100 ? 'done' : completed > 0 ? 'in_progress' : 'pending');

                return (
                  <View key={st.id} style={styles.tr}>
                    <Text style={[styles.td, { width: 50, color: colors.neutral[400] }]}>{idx + 1}</Text>
                    <Text style={[styles.td, { width: 180, fontWeight: '500' }]}>{st.title}</Text>
                    <Text style={[styles.td, { width: 60 }]}>{st.unit || 'Sqm'}</Text>
                    <Text style={[styles.td, { width: 90 }]}>{planned.toLocaleString('en-IN')}</Text>
                    <Text style={[styles.td, { width: 90 }]}>{planned.toLocaleString('en-IN')}</Text>
                    <Text style={[styles.td, { width: 90, color: '#16A34A', fontWeight: '600' }]}>
                      {completed.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.td, { width: 90, color: '#DC2626' }]}>
                      {balance.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.td, { width: 60, fontWeight: '700' }]}>{pct}%</Text>

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

                    <Text style={[styles.td, { width: 90 }]}>{st.start_date || '01 Jul 2026'}</Text>
                    <Text style={[styles.td, { width: 90 }]}>{st.end_date || '15 Jul 2026'}</Text>

                    <View style={[styles.actionCell, { width: 80 }]}>
                      <TouchableOpacity onPress={() => handleOpenModal(st)}>
                        <Ionicons name="pencil" size={16} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(st.id, st.title)}>
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

      {/* ── Excel View (MIS Export Preview) Section ────────────────────────────── */}
      <View style={styles.excelPreviewCard}>
        <View style={styles.excelPreviewHeader}>
          <View>
            <Text style={styles.excelPreviewTitle}>Excel View (MIS Export Preview)</Text>
            <Text style={styles.excelPreviewSub}>This is how your data will appear in Excel</Text>
          </View>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportExcel}>
            <Ionicons name="document-text" size={16} color="#15803D" />
            <Text style={styles.exportBtnText}>Export to Excel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={styles.excelTable}>
            {/* Excel Row Headers */}
            <View style={styles.excelThRow}>
              {['Sr', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'M', 'N'].map((col, i) => (
                <Text key={col + i} style={[styles.excelTh, { width: i === 0 ? 30 : i === 2 ? 160 : 80 }]}>
                  {col}
                </Text>
              ))}
            </View>

            {/* Excel Sub Header */}
            <View style={styles.excelSubThRow}>
              <Text style={[styles.excelTd, { width: 30 }]}>1</Text>
              <Text style={[styles.excelTd, { width: 80, fontWeight: '700' }]}>Sr No</Text>
              <Text style={[styles.excelTd, { width: 160, fontWeight: '700' }]}>Task Name</Text>
              <Text style={[styles.excelTd, { width: 80, fontWeight: '700' }]}>Category</Text>
              <Text style={[styles.excelTd, { width: 80, fontWeight: '700' }]}>Unit</Text>
              <Text style={[styles.excelTd, { width: 80, fontWeight: '700' }]}>Scope</Text>
              <Text style={[styles.excelTd, { width: 80, fontWeight: '700' }]}>Planned</Text>
              <Text style={[styles.excelTd, { width: 80, fontWeight: '700' }]}>Completed</Text>
              <Text style={[styles.excelTd, { width: 80, fontWeight: '700' }]}>Balance</Text>
              <Text style={[styles.excelTd, { width: 80, fontWeight: '700' }]}>%</Text>
              <Text style={[styles.excelTd, { width: 80, fontWeight: '700' }]}>Status</Text>
              <Text style={[styles.excelTd, { width: 80, fontWeight: '700' }]}>Start Date</Text>
              <Text style={[styles.excelTd, { width: 80, fontWeight: '700' }]}>End Date</Text>
              <Text style={[styles.excelTd, { width: 80, fontWeight: '700' }]}>Remarks</Text>
            </View>

            {/* Excel Rows */}
            {mainTasks.map((t, idx) => {
              const planned = t.planned_quantity || 1000;
              const completed = t.completed_quantity || 0;
              const balance = Math.max(0, planned - completed);
              const pct = planned > 0 ? Math.round((completed / planned) * 100) : 0;

              return (
                <View key={'xl-' + t.id} style={styles.excelTr}>
                  <Text style={[styles.excelTd, { width: 30, backgroundColor: '#F3F4F6' }]}>{idx + 2}</Text>
                  <Text style={[styles.excelTd, { width: 80 }]}>{idx + 1}</Text>
                  <Text style={[styles.excelTd, { width: 160, fontWeight: '500' }]}>{t.title}</Text>
                  <Text style={[styles.excelTd, { width: 80 }]}>{t.category || 'Facade'}</Text>
                  <Text style={[styles.excelTd, { width: 80 }]}>{t.unit || 'Sqm'}</Text>
                  <Text style={[styles.excelTd, { width: 80 }]}>{planned}</Text>
                  <Text style={[styles.excelTd, { width: 80 }]}>{planned}</Text>
                  <Text style={[styles.excelTd, { width: 80 }]}>{completed}</Text>
                  <Text style={[styles.excelTd, { width: 80 }]}>{balance}</Text>
                  <Text style={[styles.excelTd, { width: 80, fontWeight: '600' }]}>{pct}%</Text>
                  <Text style={[styles.excelTd, { width: 80 }]}>{t.status === 'done' ? 'Completed' : 'In Progress'}</Text>
                  <Text style={[styles.excelTd, { width: 80 }]}>{t.start_date || '01-07-2026'}</Text>
                  <Text style={[styles.excelTd, { width: 80 }]}>{t.end_date || '15-07-2026'}</Text>
                  <Text style={[styles.excelTd, { width: 80 }]}>—</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* ── Add / Edit Task Modal ────────────────────────────────────────────── */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTask ? 'Edit Task / Subtask' : modalParentId ? 'Add Subtask' : 'Add New Task'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={styles.fieldLabel}>Task Type / WBS Level</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      !modalParentId && styles.chipActive,
                    ]}
                    onPress={() => setModalParentId(null)}
                  >
                    <Text style={[styles.chipText, !modalParentId && styles.chipTextActive]}>
                      📌 Main Task
                    </Text>
                  </TouchableOpacity>

                  {mainTasks.map((mt) => (
                    <TouchableOpacity
                      key={'p-select-' + mt.id}
                      style={[
                        styles.chip,
                        modalParentId === mt.id && styles.chipActive,
                      ]}
                      onPress={() => setModalParentId(mt.id)}
                    >
                      <Text style={[styles.chipText, modalParentId === mt.id && styles.chipTextActive]}>
                        🌿 Subtask of: {mt.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.fieldLabel}>Task Name *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. Aluminium Glazing"
                value={formTitle}
                onChangeText={setFormTitle}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Category</Text>
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
                  <Text style={styles.fieldLabel}>Scope / Planned Qty</Text>
                  <TextInput
                    style={styles.fieldInput}
                    keyboardType="numeric"
                    placeholder="1250"
                    value={formPlanned}
                    onChangeText={setFormPlanned}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>Completed Qty</Text>
                  <TextInput
                    style={styles.fieldInput}
                    keyboardType="numeric"
                    placeholder="920"
                    value={formCompleted}
                    onChangeText={setFormCompleted}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Start Date</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="YYYY-MM-DD"
                    value={formStartDate}
                    onChangeText={setFormStartDate}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>End Date</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="YYYY-MM-DD"
                    value={formEndDate}
                    onChangeText={setFormEndDate}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Task Status</Text>
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
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTask}>
                <Text style={styles.saveBtnText}>Save Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.md },

  // KPI Row
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  kpiCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#FFF',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabel: { fontSize: 12, color: colors.neutral[500] },
  kpiValue: { fontSize: 20, fontWeight: '700', color: colors.neutral[900] },
  kpiSub: { fontSize: 11, fontWeight: '500', color: colors.neutral[400] },

  // Section Header
  tableHeaderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    backgroundColor: '#FFF',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  tabsRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  tabBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  tabBtnActive: { backgroundColor: colors.primary },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: colors.neutral[600] },
  tabBtnTextActive: { color: '#FFF' },

  actionRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', alignItems: 'center' },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  exportBtnText: { color: '#15803D', fontSize: 12, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  addBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  floatingAddBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 99,
  },
  floatingAddBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Filter Bar
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    flex: 1,
    height: 38,
  },
  searchInput: { flex: 1, fontSize: 13, marginLeft: spacing.xs },
  filterGroup: { flexDirection: 'row', gap: 4 },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 12, color: colors.neutral[700] },
  chipTextActive: { color: '#FFF', fontWeight: '600' },

  // Table
  table: { backgroundColor: '#FFF', borderRadius: radius.md, overflow: 'hidden' },
  thRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderColor: colors.neutral[200],
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  th: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral[600],
    textTransform: 'uppercase',
  },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  td: { fontSize: 12, color: colors.neutral[800] },
  actionCell: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },

  // Mobile Cards Layout
  mobileCard: {
    backgroundColor: '#FFF',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    gap: 8,
    ...shadows.sm,
  },
  mobileCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  mobileCardSr: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral[400],
  },
  mobileCardCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mobileCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  mobileCardProgressSection: {
    marginTop: 2,
  },
  mobileCardMetaText: {
    fontSize: 12,
    color: colors.neutral[600],
  },
  mobileCardPctText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  mobileCardTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  mobileCardFill: {
    height: '100%',
    borderRadius: 3,
  },
  mobileCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
  },
  mobileCardDateText: {
    fontSize: 11,
    color: colors.neutral[500],
  },

  // Status Badges
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusDone: { backgroundColor: '#DCFCE7' },
  statusDoneText: { color: '#15803D' },
  statusProgress: { backgroundColor: '#FEF3C7' },
  statusProgressText: { color: '#B45309' },
  statusPending: { backgroundColor: '#FEE2E2' },
  statusPendingText: { color: '#B91C1C' },

  // Subtasks Section
  subtasksContainer: { backgroundColor: '#FFF', padding: spacing.md, borderRadius: radius.md },
  subtasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
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

  // Excel Preview Card
  excelPreviewCard: {
    backgroundColor: '#FFF',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  excelPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  excelPreviewTitle: { fontSize: 15, fontWeight: '700', color: colors.neutral[900] },
  excelPreviewSub: { fontSize: 12, color: colors.neutral[500] },
  excelTable: { borderWidth: 1, borderColor: '#D1D5DB' },
  excelThRow: { flexDirection: 'row', backgroundColor: '#E5E7EB' },
  excelTh: {
    borderRightWidth: 1,
    borderColor: '#D1D5DB',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    paddingVertical: 4,
  },
  excelSubThRow: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderColor: '#D1D5DB' },
  excelTr: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  excelTd: {
    borderRightWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 11,
    paddingHorizontal: 4,
    paddingVertical: 4,
    color: colors.neutral[800],
  },

  emptyState: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { color: colors.neutral[400], fontSize: 13 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
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
