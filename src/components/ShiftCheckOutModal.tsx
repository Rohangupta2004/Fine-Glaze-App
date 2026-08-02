import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from './Card';
import { Button } from './Button';
import { colors } from '../theme/colors';
import { typography, fontFamily } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

export interface TaskItem {
  id: string;
  title: string;
  level_zone?: string | null;
  status: string;
  priority: string;
}

interface ShiftCheckOutModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmPunchOut: () => void;
  isPunchingOut: boolean;
  pendingTasks: TaskItem[];
  onToggleTaskDone: (taskId: string) => void;
  hasSubmittedDpr: boolean;
  onNavigateDpr: () => void;
}

export function ShiftCheckOutModal({
  visible,
  onClose,
  onConfirmPunchOut,
  isPunchingOut,
  pendingTasks,
  onToggleTaskDone,
  hasSubmittedDpr,
  onNavigateDpr,
}: ShiftCheckOutModalProps) {
  const insets = useSafeAreaInsets();
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>({});

  const handleToggle = (id: string) => {
    setCompletedTaskIds((prev) => ({ ...prev, [id]: !prev[id] }));
    onToggleTaskDone(id);
  };

  const remainingCount = pendingTasks.filter((t) => !completedTaskIds[t.id]).length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.container, { paddingBottom: insets.bottom + spacing.lg }]}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Ionicons name="clipboard-outline" size={24} color={colors.primary} />
              <Text style={styles.title}>End-of-Shift Verification</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close-circle" size={24} color={colors.neutral[400]} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Before punching out, verify your task completion and daily report status.
          </Text>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Task Checklist Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="checkbox-outline" size={18} color={colors.ink} />
                <Text style={styles.sectionTitle}>
                  Assigned Tasks ({pendingTasks.length - remainingCount}/{pendingTasks.length} Completed)
                </Text>
              </View>

              {pendingTasks.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  <Text style={styles.emptyText}>All assigned tasks marked complete!</Text>
                </Card>
              ) : (
                <View style={styles.taskList}>
                  {pendingTasks.map((task) => {
                    const isChecked = !!completedTaskIds[task.id];
                    return (
                      <TouchableOpacity
                        key={task.id}
                        style={[styles.taskRow, isChecked && styles.taskRowDone]}
                        onPress={() => handleToggle(task.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isChecked ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={isChecked ? colors.success : colors.neutral[400]}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.taskTitle, isChecked && styles.taskTitleDone]}
                            numberOfLines={1}
                          >
                            {task.title}
                          </Text>
                          <Text style={styles.taskMeta}>
                            {task.level_zone || 'General'} • {task.priority.toUpperCase()}
                          </Text>
                        </View>
                        {isChecked && (
                          <View style={styles.doneBadge}>
                            <Text style={styles.doneBadgeText}>DONE</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* DPR Status Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text-outline" size={18} color={colors.ink} />
                <Text style={styles.sectionTitle}>Daily Progress Report (DPR)</Text>
              </View>

              <Card style={styles.dprCard}>
                <View style={styles.dprRow}>
                  <Ionicons
                    name={hasSubmittedDpr ? 'checkmark-circle' : 'alert-circle'}
                    size={22}
                    color={hasSubmittedDpr ? colors.success : colors.warning}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dprStatusTitle}>
                      {hasSubmittedDpr ? 'DPR Submitted Today' : 'DPR Pending'}
                    </Text>
                    <Text style={styles.dprStatusSub}>
                      {hasSubmittedDpr
                        ? 'Your site work report is logged.'
                        : 'Submit photo/work details before shift checkout.'}
                    </Text>
                  </View>
                  {!hasSubmittedDpr && (
                    <TouchableOpacity style={styles.dprBtn} onPress={onNavigateDpr}>
                      <Text style={styles.dprBtnText}>Submit DPR</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.footerActions}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <Button
              title={isPunchingOut ? 'Punching Out...' : 'Confirm & Punch Out'}
              onPress={onConfirmPunchOut}
              loading={isPunchingOut}
              style={{ flex: 1.5 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: '85%',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral[300],
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.h5,
    fontFamily: fontFamily.bold,
    color: colors.ink,
  },
  subtitle: {
    ...typography.caption,
    color: colors.neutral[500],
    marginBottom: spacing.md,
  },
  scrollContent: {
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.bodySmall,
    fontFamily: fontFamily.bold,
    color: colors.ink,
  },
  emptyCard: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successBg,
  },
  emptyText: {
    ...typography.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.success,
  },
  taskList: {
    gap: spacing.xs,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  taskRowDone: {
    backgroundColor: colors.successBg + '40',
    borderColor: colors.success + '40',
  },
  taskTitle: {
    ...typography.bodyMedium,
    fontFamily: fontFamily.medium,
    color: colors.ink,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.neutral[500],
  },
  taskMeta: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: 2,
  },
  doneBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  doneBadgeText: {
    fontSize: 9,
    fontFamily: fontFamily.bold,
    color: '#FFFFFF',
  },
  dprCard: {
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
  },
  dprRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dprStatusTitle: {
    ...typography.bodySmall,
    fontFamily: fontFamily.bold,
    color: colors.ink,
  },
  dprStatusSub: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: 2,
  },
  dprBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  dprBtnText: {
    fontSize: 11,
    fontFamily: fontFamily.bold,
    color: '#FFFFFF',
  },
  footerActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
});
