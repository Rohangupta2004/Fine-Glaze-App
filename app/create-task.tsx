import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

import { Card, Button } from '../src/components';
import { useAuthStore } from '../src/stores/authStore';
import { useEmployees, useEmployeeAssignments } from '../src/hooks/useEmployees';
import { useProjects } from '../src/hooks/useProjects';
import { useCreateTask, useProjectTasks } from '../src/hooks/useTasks';
import { colors } from '../src/theme/colors';
import { typography, fontFamily } from '../src/theme/typography';
import { spacing, radius } from '../src/theme/spacing';
import { showAlert } from '../src/utils/alert';
import type { TaskPriority } from '../src/types';

function getRouteGroup(role: string): string {
  switch (role) {
    case 'admin':
    case 'owner':
    case 'project_manager':
    case 'hr':
    case 'accounts':
      return 'admin';
    case 'supervisor':
      return 'supervisor';
    case 'client':
      return 'client';
    default:
      return 'worker';
  }
}

export default function CreateTaskScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const routeParams = useLocalSearchParams<{ projectId?: string; assigneeId?: string }>();
  const profile = useAuthStore((s) => s.profile);
  
  const { data: employees = [] } = useEmployees();
  const { data: assignments = [] } = useEmployeeAssignments();
  const { data: projects = [] } = useProjects();
  const createTask = useCreateTask();

  const [title, setTitle] = useState('');
  const [assigneeType, setAssigneeType] = useState<'myself' | 'supervisor' | 'worker'>('myself');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(routeParams.assigneeId || '');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [projectId, setProjectId] = useState(routeParams.projectId || '');
  const [plannedQuantity, setPlannedQuantity] = useState('');
  const [unit, setUnit] = useState('Sqm');
  const [levelZone, setLevelZone] = useState('');
  const [parentId, setParentId] = useState('');
  const [category, setCategory] = useState('Facade');
  const [isVisible, setIsVisible] = useState(true);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const { data: projectTasks = [] } = useProjectTasks(projectId || null);

  // Client role guard
  useEffect(() => {
    if (profile?.role === 'client') {
      router.replace('/');
    }
  }, [profile]);

  // Sync route params if they change
  useEffect(() => {
    if (routeParams.projectId && !projectId) {
      setProjectId(routeParams.projectId);
    }
    if (routeParams.assigneeId && !selectedEmployeeId) {
      setSelectedEmployeeId(routeParams.assigneeId);
    }
  }, [routeParams.projectId, routeParams.assigneeId]);

  // Determine selectable assignee types based on role
  const getAssigneeOptions = (role: string | undefined): ('myself' | 'supervisor' | 'worker')[] => {
    if (!role) return ['myself'];
    if (role === 'supervisor') return ['myself', 'worker'];
    if (role === 'worker') return ['myself'];
    return ['myself', 'supervisor', 'worker'];
  };

  const assigneeOptions = getAssigneeOptions(profile?.role);

  // Active site assignments map for filtering
  const siteEmployeeIds = useMemo(() => {
    if (!projectId) return null;
    return new Set(assignments.filter(a => a.project_id === projectId).map(a => a.profile_id));
  }, [projectId, assignments]);

  // Filter & sort employees: employees assigned to the selected site appear first
  const filteredEmployees = useMemo(() => {
    const byRole = employees.filter(e => e.role === assigneeType);
    if (!siteEmployeeIds || siteEmployeeIds.size === 0) return byRole;

    return [...byRole].sort((a, b) => {
      const aOnSite = siteEmployeeIds.has(a.id) ? 1 : 0;
      const bOnSite = siteEmployeeIds.has(b.id) ? 1 : 0;
      return bOnSite - aOnSite;
    });
  }, [employees, assigneeType, siteEmployeeIds]);

  useFocusEffect(
    React.useCallback(() => {
      setIsVisible(true);
    }, [])
  );

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        const experience = getRouteGroup(profile?.role || 'worker');
        router.navigate(`/(${experience})/home` as any);
      }
    }, 50);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      showAlert('Error', 'Please enter a task title');
      return;
    }
    const isAssigningToOthers = assigneeType !== 'myself';
    if (isAssigningToOthers && !selectedEmployeeId) {
      showAlert('Error', `Please select a ${assigneeType}`);
      return;
    }

    const currentUserId = profile?.id || useAuthStore.getState().userId;
    const assignedTo = assigneeType === 'myself' ? currentUserId : selectedEmployeeId;

    try {
      await createTask.mutateAsync({
        title: title.trim(),
        assignedTo,
        priority,
        projectId: projectId || null,
        createdBy: currentUserId!,
        checklist: checklist.map(text => ({ text, done: false })),
        plannedQuantity: parseFloat(plannedQuantity) || 0,
        unit: unit.trim() || 'Units',
        levelZone: levelZone.trim() || null,
        parentId: parentId || null,
        category,
      });
      showAlert(
        'Success', 
        'Task created successfully!', 
        [{ text: 'OK', onPress: handleClose }]
      );
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to create task');
    }
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill}>
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={styles.backBtn}>
                <Ionicons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
              <Text style={headerTitleStyle(profile?.role)}>Create Task</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              
              {/* Site / Project Selection */}
              <View style={styles.inputWrap}>
                <Text style={styles.label}>Target Site / Project</Text>
                <Text style={styles.helpText}>Select the site where this task will be executed.</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={projectId}
                    onValueChange={(val: string) => setProjectId(val)}
                    mode="dropdown"
                    dropdownIconColor="#4A3820"
                    style={{ height: 50, color: '#1E1815', backgroundColor: '#FFFFFF' }}
                  >
                    <Picker.Item label="All Sites / Personal Task" value="" color="#71717A" style={{ backgroundColor: '#FFFFFF' }} />
                    {projects.filter(p => p.status !== 'completed').map(p => (
                      <Picker.Item key={p.id} label={`${p.name}${p.city ? ` (${p.city})` : ''}`} value={p.id} color="#1E1815" style={{ backgroundColor: '#FFFFFF' }} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Assign To Selection (only show if role has choices) */}
              {assigneeOptions.length > 1 && (
                <View style={styles.inputWrap}>
                  <Text style={styles.label}>Assign To</Text>
                  <View style={styles.segmentedControl}>
                    {assigneeOptions.map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[styles.segment, assigneeType === type && styles.segmentActive]}
                        onPress={() => {
                          setAssigneeType(type);
                          setSelectedEmployeeId('');
                        }}
                      >
                        <Text style={[styles.segmentText, assigneeType === type && styles.segmentTextActive]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Employee Dropdown if applicable */}
              {assigneeType !== 'myself' && assigneeOptions.includes(assigneeType) && (
                <View style={styles.inputWrap}>
                  <Text style={styles.label}>Select {assigneeType === 'supervisor' ? 'Supervisor' : 'Worker'}</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={selectedEmployeeId}
                      onValueChange={(val: string) => setSelectedEmployeeId(val)}
                      mode="dropdown"
                      dropdownIconColor="#4A3820"
                      style={{ height: 50, color: '#1E1815', backgroundColor: '#FFFFFF' }}
                    >
                      <Picker.Item label="Select Employee..." value="" color="#71717A" style={{ backgroundColor: '#FFFFFF' }} />
                      {filteredEmployees.map(emp => {
                        const isAssigned = siteEmployeeIds?.has(emp.id);
                        return (
                          <Picker.Item 
                            key={emp.id} 
                            label={`${emp.full_name}${isAssigned ? ' (Site Assigned ⭐)' : ''}`} 
                            value={emp.id} 
                            color="#1E1815" 
                            style={{ backgroundColor: '#FFFFFF' }}
                          />
                        );
                      })}
                    </Picker>
                  </View>
                </View>
              )}

              {/* Task Title */}
              <View style={styles.inputWrap}>
                <Text style={styles.label}>Task Title *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Glass Installation - Level 3"
                  value={title}
                  onChangeText={setTitle}
                  multiline
                />
              </View>

              {/* Subtask Parent Selection */}
              {projectTasks.length > 0 && (
                <View style={styles.inputWrap}>
                  <Text style={styles.label}>Is this a Subtask under a Main Task? (Optional)</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={parentId}
                      onValueChange={(val: string) => setParentId(val)}
                      mode="dropdown"
                      dropdownIconColor="#4A3820"
                      style={{ height: 50, color: '#1E1815', backgroundColor: '#FFFFFF' }}
                    >
                      <Picker.Item label="None (Main Task)" value="" color="#71717A" style={{ backgroundColor: '#FFFFFF' }} />
                      {projectTasks.filter((t: any) => !t.parent_id).map((t: any) => (
                        <Picker.Item key={t.id} label={`Parent Task: ${t.title}`} value={t.id} color="#1E1815" style={{ backgroundColor: '#FFFFFF' }} />
                      ))}
                    </Picker>
                  </View>
                </View>
              )}

              {/* Target Planned Scope & Unit */}
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Target Quantity</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 100"
                    keyboardType="numeric"
                    value={plannedQuantity}
                    onChangeText={setPlannedQuantity}
                  />
                </View>
                <View style={{ width: 110 }}>
                  <Text style={styles.label}>Unit</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Sqm"
                    value={unit}
                    onChangeText={setUnit}
                  />
                </View>
              </View>

              {/* Level / Zone */}
              <View style={styles.inputWrap}>
                <Text style={styles.label}>Level / Zone (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Level 3 – Zone B"
                  value={levelZone}
                  onChangeText={setLevelZone}
                />
              </View>

              {/* Priority */}
              <View style={styles.inputWrap}>
                <Text style={styles.label}>Priority</Text>
                <View style={styles.priorityRow}>
                  {(['high', 'medium', 'low'] as TaskPriority[]).map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.priorityBtn,
                        priority === p && {
                          backgroundColor: p === 'high' ? colors.errorBg : p === 'medium' ? colors.warningBg : colors.successBg,
                          borderColor: p === 'high' ? colors.error : p === 'medium' ? colors.warning : colors.success
                        }
                      ]}
                      onPress={() => setPriority(p)}
                    >
                      <Text style={[
                        styles.priorityText,
                        priority === p && {
                          color: p === 'high' ? colors.error : p === 'medium' ? colors.warning : colors.success,
                          fontFamily: fontFamily.semiBold
                        }
                      ]}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Task Checklist Items */}
              <View style={styles.inputWrap}>
                <Text style={styles.label}>Checklist Items</Text>
                
                <View style={styles.checklistInputRow}>
                  <TextInput
                    style={[styles.textInput, { flex: 1, minHeight: 44, maxHeight: 44, paddingVertical: 10 }]}
                    placeholder="Add item to checklist..."
                    placeholderTextColor={colors.neutral[400]}
                    value={newChecklistItem}
                    onChangeText={setNewChecklistItem}
                  />
                  <TouchableOpacity
                    style={styles.addChecklistItemBtn}
                    onPress={() => {
                      const trimmed = newChecklistItem.trim();
                      if (trimmed) {
                        setChecklist((prev) => [...prev, trimmed]);
                        setNewChecklistItem('');
                      }
                    }}
                  >
                    <Ionicons name="add" size={24} color={colors.white} />
                  </TouchableOpacity>
                </View>

                {checklist.length > 0 && (
                  <View style={styles.checklistFormItems}>
                    {checklist.map((item, index) => (
                      <View key={index} style={styles.checklistFormRow}>
                        <Ionicons name="ellipse" size={8} color={colors.primary} />
                        <Text style={styles.checklistFormText}>{item}</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setChecklist((prev) => prev.filter((_, i) => i !== index));
                          }}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <Button 
                title="Create Task" 
                onPress={handleCreate} 
                loading={createTask.isPending} 
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </BlurView>
    </Modal>
  );
}

function headerTitleStyle(role: string | undefined) {
  return styles.headerTitle;
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  backBtn: { padding: spacing.xs },
  headerTitle: { ...typography.h4, color: colors.ink },
  scrollContent: { padding: spacing.lg, gap: spacing.xl },
  inputWrap: { gap: spacing.sm },
  label: { ...typography.bodyMedium, fontFamily: fontFamily.semiBold, color: colors.ink },
  helpText: { ...typography.caption, color: colors.neutral[500], marginTop: -4 },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[100],
    padding: 4,
    borderRadius: radius.md,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  segmentActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segmentText: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.neutral[500] },
  segmentTextActive: { color: colors.primary, fontFamily: fontFamily.semiBold },
  pickerContainer: {
    backgroundColor: '#F8FAF9',
    borderRadius: radius.md,
    borderWidth: 0,
    overflow: 'hidden',
  },
  picker: { height: 50 },
  textInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.bodyMedium,
    color: colors.ink,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  priorityRow: { flexDirection: 'row', gap: spacing.sm },
  priorityBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.white,
  },
  priorityText: { ...typography.bodySmall, color: colors.neutral[500] },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  checklistInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addChecklistItemBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistFormItems: {
    backgroundColor: colors.neutral[100],
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  checklistFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  checklistFormText: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.ink,
  },
});
