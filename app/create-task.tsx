import React, { useState, useEffect } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

import { Card, Button } from '../src/components';
import { useAuthStore } from '../src/stores/authStore';
import { useEmployees } from '../src/hooks/useEmployees';
import { useProjects } from '../src/hooks/useProjects';
import { useCreateTask } from '../src/hooks/useTasks';
import { colors } from '../src/theme/colors';
import { typography, fontFamily } from '../src/theme/typography';
import { spacing, radius } from '../src/theme/spacing';
import { showAlert } from '../src/utils/alert';
import type { TaskPriority } from '../src/types';

function getRouteGroup(role: string): string {
  switch (role) {
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
  const profile = useAuthStore((s) => s.profile);
  
  const { data: employees = [] } = useEmployees();
  const { data: projects = [] } = useProjects();
  const createTask = useCreateTask();

  const [title, setTitle] = useState('');
  const [assigneeType, setAssigneeType] = useState<'myself' | 'supervisor' | 'worker'>('myself');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [projectId, setProjectId] = useState('');
  const [isVisible, setIsVisible] = useState(true);

  // Client role guard
  useEffect(() => {
    if (profile?.role === 'client') {
      router.replace('/');
    }
  }, [profile]);

  // Determine selectable assignee types based on role
  const getAssigneeOptions = (role: string | undefined): ('myself' | 'supervisor' | 'worker')[] => {
    if (!role) return ['myself'];
    if (role === 'supervisor') return ['myself', 'worker'];
    if (role === 'worker') return ['myself'];
    return ['myself', 'supervisor', 'worker'];
  };

  const assigneeOptions = getAssigneeOptions(profile?.role);

  // Filter employees based on selected role
  const filteredEmployees = employees.filter(e => e.role === assigneeType);

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

    const assignedTo = assigneeType === 'myself' ? profile?.id : selectedEmployeeId;

    try {
      await createTask.mutateAsync({
        title: title.trim(),
        assignedTo,
        priority,
        projectId: projectId || null,
        createdBy: profile?.id!,
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
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Employee..." value="" color={colors.neutral[400]} />
                      {filteredEmployees.map(emp => (
                        <Picker.Item key={emp.id} label={emp.full_name} value={emp.id} color={colors.ink} />
                      ))}
                    </Picker>
                  </View>
                </View>
              )}

              {/* Task Title */}
              <View style={styles.inputWrap}>
                <Text style={styles.label}>Task Title</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="What needs to be done?"
                  value={title}
                  onChangeText={setTitle}
                  multiline
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

              {/* Optional Site / Project */}
              <View style={styles.inputWrap}>
                <Text style={styles.label}>Linked Site (Optional)</Text>
                <Text style={styles.helpText}>Leave empty if this is a personal task without a specific site.</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={projectId}
                    onValueChange={(val: string) => setProjectId(val)}
                    style={styles.picker}
                  >
                    <Picker.Item label="No Site Linked" value="" color={colors.neutral[500]} />
                    {projects.filter(p => p.status !== 'completed').map(p => (
                      <Picker.Item key={p.id} label={p.name} value={p.id} color={colors.ink} />
                    ))}
                  </Picker>
                </View>
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
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
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
});
