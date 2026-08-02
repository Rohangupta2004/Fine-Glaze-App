import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from './Button';
import { Input } from './Input';
import { DatePickerField } from './DatePickerField';
import { useProjects } from '../hooks/useProjects';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { colors } from '../theme/colors';
import { typography, fontFamily } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { showAlert } from '../utils/alert';

export interface AssignProjectEmployee {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string | null;
}

interface AssignProjectModalProps {
  visible: boolean;
  employee: AssignProjectEmployee | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const SHIFTS = ['General Shift', 'Day Shift (08:00 - 17:00)', 'Night Shift (20:00 - 05:00)'];

export function AssignProjectModal({ visible, employee, onClose, onSuccess }: AssignProjectModalProps) {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const { data: projects = [], isLoading: loadingProjects } = useProjects();

  const todayIso = new Date().toISOString().split('T')[0];

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [scheduleType, setScheduleType] = useState<'everyday' | 'date'>('everyday');
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [siteRole, setSiteRole] = useState<string>('worker');
  const [shift, setShift] = useState<string>('General Shift');
  const [levelZone, setLevelZone] = useState<string>('');

  // Task creation state
  const [includeTask, setIncludeTask] = useState<boolean>(false);
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (employee) {
      setSiteRole(employee.role || 'worker');
    }
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [employee, projects]);

  const handleSave = async () => {
    if (!employee) return;
    if (!selectedProjectId) {
      showAlert('Select Project', 'Please choose a project to assign.');
      return;
    }
    if (scheduleType === 'date' && !selectedDate) {
      showAlert('Select Date', 'Please select the assignment date.');
      return;
    }
    if (includeTask && !taskTitle.trim()) {
      showAlert('Task Required', 'Please enter a task title or uncheck Include Task.');
      return;
    }

    setSaving(true);
    try {
      const selectedProject = projects.find((p) => p.id === selectedProjectId);
      const projectName = selectedProject?.name || 'Project';
      const scheduleLabel = scheduleType === 'everyday' ? 'Everyday' : `Date: ${selectedDate}`;
      const zoneLabel = [scheduleLabel, shift, levelZone.trim()].filter(Boolean).join(' • ');

      // 1. Upsert site assignment
      const { data: assignmentData, error: assignErr } = await supabase
        .from('assignments')
        .upsert(
          {
            project_id: selectedProjectId,
            profile_id: employee.id,
            role_on_site: siteRole,
            level_zone: zoneLabel,
            active: true,
          },
          { onConflict: 'project_id,profile_id' }
        )
        .select()
        .single();

      if (assignErr) throw assignErr;

      // 2. Optionally create Task if requested
      if (includeTask && taskTitle.trim()) {
        const { error: taskErr } = await supabase.from('tasks').insert({
          project_id: selectedProjectId,
          assigned_to: employee.id,
          title: taskTitle.trim(),
          priority: taskPriority,
          status: 'pending',
          level_zone: levelZone.trim() || null,
          start_date: scheduleType === 'date' ? selectedDate : todayIso,
          end_date: scheduleType === 'date' ? selectedDate : null,
          created_by: profile?.id || employee.id,
        });

        if (taskErr) throw taskErr;
      }

      // 3. Create Notification for Employee
      const notifTitle = includeTask && taskTitle.trim() ? 'New Site & Task Assignment 📍📋' : 'New Project Assignment 📍';
      const notifBody = includeTask && taskTitle.trim()
        ? `You have been assigned to ${projectName} (${scheduleLabel}) as ${siteRole.replace('_', ' ')} with Task: "${taskTitle.trim()}".`
        : `You have been assigned to ${projectName} (${scheduleLabel}) as ${siteRole.replace('_', ' ')}.`;

      await supabase.from('notifications').insert({
        recipient_id: employee.id,
        kind: 'site_assignment',
        title: notifTitle,
        body: notifBody,
        ref_table: 'assignments',
        ref_id: assignmentData?.id || null,
        important: true,
      });

      // 4. Invalidate React Query cache
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['assignments'] }),
        qc.invalidateQueries({ queryKey: ['employees'] }),
        qc.invalidateQueries({ queryKey: ['notifications'] }),
        qc.invalidateQueries({ queryKey: ['tasks'] }),
        qc.invalidateQueries({ queryKey: ['my-tasks'] }),
      ]);

      const successMsg = includeTask && taskTitle.trim()
        ? `${employee.full_name} assigned to ${projectName} (${scheduleLabel}) and task "${taskTitle.trim()}" created & notified.`
        : `${employee.full_name} assigned to ${projectName} (${scheduleLabel}). Notification sent.`;

      showAlert(
        'Assigned Successfully',
        successMsg,
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
              if (onSuccess) onSuccess();
            },
          },
        ]
      );
    } catch (err: any) {
      showAlert('Assignment Failed', err?.message || 'Could not assign employee to project.');
    } finally {
      setSaving(false);
    }
  };

  if (!visible || !employee) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Assign to Project</Text>
              <Text style={styles.subtitle}>
                Assign <Text style={{ fontFamily: fontFamily.bold, color: colors.ink }}>{employee.full_name}</Text> to a site
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* 1. Select Project */}
            <Text style={styles.sectionLabel}>1. Select Project</Text>
            {loadingProjects ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectScroll}>
                {projects.map((p) => {
                  const isSel = selectedProjectId === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.projectChip, isSel && styles.projectChipActive]}
                      onPress={() => setSelectedProjectId(p.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="business" size={16} color={isSel ? colors.white : colors.primary} />
                      <Text style={[styles.projectChipText, isSel && styles.projectChipTextActive]} numberOfLines={1}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* 2. Schedule Type (Everyday vs Date) */}
            <Text style={styles.sectionLabel}>2. Schedule Type</Text>
            <View style={styles.scheduleSegment}>
              <TouchableOpacity
                style={[styles.segmentBtn, scheduleType === 'everyday' && styles.segmentBtnActive]}
                onPress={() => setScheduleType('everyday')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="repeat"
                  size={18}
                  color={scheduleType === 'everyday' ? colors.white : colors.neutral[600]}
                />
                <Text style={[styles.segmentText, scheduleType === 'everyday' && styles.segmentTextActive]}>
                  Everyday (Daily)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentBtn, scheduleType === 'date' && styles.segmentBtnActive]}
                onPress={() => setScheduleType('date')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={scheduleType === 'date' ? colors.white : colors.neutral[600]}
                />
                <Text style={[styles.segmentText, scheduleType === 'date' && styles.segmentTextActive]}>
                  Specific Date
                </Text>
              </TouchableOpacity>
            </View>

            {/* Date Picker if Date schedule selected */}
            {scheduleType === 'date' && (
              <View style={styles.datePickerWrap}>
                <DatePickerField
                  label="Select Assignment Date *"
                  value={selectedDate}
                  onChange={setSelectedDate}
                  minDate={todayIso}
                />
              </View>
            )}

            {/* 3. Role on Site */}
            <Text style={styles.sectionLabel}>3. Role on Site</Text>
            <View style={styles.chipsRow}>
              {['worker', 'supervisor', 'foreman', 'fitter', 'helper'].map((r) => {
                const isSel = siteRole === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleChip, isSel && styles.roleChipActive]}
                    onPress={() => setSiteRole(r)}
                  >
                    <Text style={[styles.roleChipText, isSel && styles.roleChipTextActive]}>
                      {r.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 4. Shift & Zone */}
            <Text style={styles.sectionLabel}>4. Shift & Level / Zone</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs, marginBottom: spacing.md }}>
              {SHIFTS.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setShift(s)}
                  style={[styles.shiftChip, shift === s && styles.shiftChipActive]}
                >
                  <Text style={[styles.shiftChipText, shift === s && styles.shiftChipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Input
              label="Level / Zone / Notes (optional)"
              value={levelZone}
              onChangeText={setLevelZone}
              placeholder="e.g. Tower A — 4th Floor"
            />

            {/* 5. Assign Task (Optional) */}
            <View style={styles.taskSectionHeader}>
              <Text style={styles.sectionLabel}>5. Assign Task (Optional)</Text>
              <TouchableOpacity
                style={styles.taskToggleRow}
                onPress={() => setIncludeTask(!includeTask)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={includeTask ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={includeTask ? colors.primary : colors.neutral[400]}
                />
                <Text style={[styles.taskToggleText, includeTask && styles.taskToggleTextActive]}>
                  Create & Assign Task
                </Text>
              </TouchableOpacity>
            </View>

            {includeTask && (
              <View style={styles.taskCardBox}>
                <Input
                  label="Task Title *"
                  value={taskTitle}
                  onChangeText={setTaskTitle}
                  placeholder="e.g. Install 4th Floor Glazing Panels"
                />

                <Text style={styles.subLabel}>Task Priority</Text>
                <View style={styles.priorityRow}>
                  {(['high', 'medium', 'low'] as const).map((p) => {
                    const isSel = taskPriority === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.priorityChip,
                          isSel && {
                            backgroundColor: p === 'high' ? colors.errorBg : p === 'medium' ? colors.warningBg : colors.successBg,
                            borderColor: p === 'high' ? colors.error : p === 'medium' ? colors.warning : colors.success,
                          },
                        ]}
                        onPress={() => setTaskPriority(p)}
                      >
                        <Text
                          style={[
                            styles.priorityChipText,
                            isSel && {
                              color: p === 'high' ? colors.error : p === 'medium' ? colors.warning : colors.success,
                              fontFamily: fontFamily.bold,
                            },
                          ]}
                        >
                          {p.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={{ height: spacing.lg }} />

            {/* Save Button */}
            <Button
              title={saving ? 'Assigning…' : 'Confirm Assignment & Notify'}
              onPress={handleSave}
              loading={saving}
              fullWidth
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 16, 12, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h4,
    color: colors.ink,
    fontFamily: fontFamily.bold,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.neutral[500],
    marginTop: 2,
  },
  sectionLabel: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[600],
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  projectScroll: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  projectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  projectChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  projectChipText: {
    ...typography.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.ink,
  },
  projectChipTextActive: {
    color: colors.white,
    fontFamily: fontFamily.semiBold,
  },
  scheduleSegment: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  segmentBtnActive: {
    backgroundColor: '#695030',
    borderColor: '#695030',
  },
  segmentText: {
    ...typography.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[700],
  },
  segmentTextActive: {
    color: colors.white,
  },
  datePickerWrap: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  roleChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.white,
  },
  roleChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  roleChipText: {
    ...typography.bodySmall,
    color: colors.neutral[700],
    textTransform: 'capitalize',
  },
  roleChipTextActive: {
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
  },
  shiftChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  shiftChipActive: {
    backgroundColor: '#695030',
    borderColor: '#695030',
  },
  shiftChipText: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: colors.neutral[700],
  },
  shiftChipTextActive: {
    color: colors.white,
    fontFamily: fontFamily.semiBold,
  },
  taskSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  taskToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  taskToggleText: {
    ...typography.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.neutral[600],
  },
  taskToggleTextActive: {
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
  },
  taskCardBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  subLabel: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[600],
    marginTop: spacing.xs,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.white,
  },
  priorityChipText: {
    fontSize: 11,
    color: colors.neutral[500],
    fontFamily: fontFamily.medium,
  },
});
