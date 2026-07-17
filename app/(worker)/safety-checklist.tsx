import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, Button, Input } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import { useTodaySafetyCheck, useSubmitSafetyCheck } from '../../src/hooks/useSafetyChecks';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import { showAlert } from '../../src/utils/alert';

const PPE_ITEMS = [
  { key: 'helmet', label: 'Hard Hat / Helmet', icon: 'construct-outline' as const },
  { key: 'safety_shoes', label: 'Safety Shoes', icon: 'footsteps-outline' as const },
  { key: 'vest', label: 'High-Visibility Vest', icon: 'shirt-outline' as const },
  { key: 'harness', label: 'Safety Harness (if working at height)', icon: 'git-merge-outline' as const },
  { key: 'gloves', label: 'Gloves', icon: 'hand-left-outline' as const },
  { key: 'eye_protection', label: 'Eye Protection / Goggles', icon: 'eye-outline' as const },
];

export default function SafetyChecklistScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { data: projects } = useProjects();
  const project = projects?.[0];

  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(PPE_ITEMS.map((p) => [p.key, false]))
  );
  const [concern, setConcern] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: todayCheck } = useTodaySafetyCheck(profile?.id);
  const submitCheck = useSubmitSafetyCheck();

  const allChecked = PPE_ITEMS.every((p) => checked[p.key]);
  const alreadySubmitted = !!todayCheck;

  const toggleItem = (key: string) => {
    if (alreadySubmitted) return;
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async () => {
    if (!profile?.id || !project?.id) {
      showAlert('Error', 'Profile or project not loaded');
      return;
    }
    if (!allChecked) {
      showAlert('PPE Required', 'Please confirm all PPE items are worn before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      await submitCheck.mutateAsync({
        profileId: profile.id,
        projectId: project.id,
        items: checked,
        concernReported: concern || null,
      });
      showAlert('Submitted', 'Safety checklist submitted. Stay safe! 👷');
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Safety Checklist</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Banner */}
        <Card style={styles.banner} variant="flat">
          <View style={styles.bannerRow}>
            <Ionicons name="shield-checkmark" size={28} color={colors.warning} />
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>Daily PPE Check</Text>
              <Text style={styles.bannerBody}>
                {alreadySubmitted
                  ? "You've completed today's safety check. Stay safe!"
                  : 'Complete before starting work. Required every day.'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Today's date */}
        <Text style={styles.dateLabel}>
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </Text>

        {/* PPE Checklist */}
        <Card style={styles.listCard}>
          {PPE_ITEMS.map((item, index) => {
            const isChecked = alreadySubmitted
              ? (todayCheck?.items as Record<string, boolean>)?.[item.key] ?? false
              : checked[item.key];

            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.checkItem,
                  index < PPE_ITEMS.length - 1 && styles.checkItemBorder,
                ]}
                onPress={() => toggleItem(item.key)}
                activeOpacity={alreadySubmitted ? 1 : 0.7}
              >
                <View style={styles.checkIcon}>
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={isChecked ? colors.success : colors.neutral[400]}
                  />
                </View>
                <Text style={styles.checkLabel}>{item.label}</Text>
                <View
                  style={[
                    styles.checkbox,
                    isChecked && styles.checkboxChecked,
                  ]}
                >
                  {isChecked && (
                    <Ionicons name="checkmark" size={16} color={colors.white} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </Card>

        {/* Concern report */}
        {!alreadySubmitted && (
          <>
            <Text style={styles.sectionLabel}>Report a Safety Concern (optional)</Text>
            <Card style={styles.concernCard}>
              <Input
                value={concern}
                onChangeText={setConcern}
                placeholder="Describe any safety hazard or concern on site…"
                multiline
                numberOfLines={4}
              />
            </Card>
          </>
        )}

        {alreadySubmitted && todayCheck?.concern_reported && (
          <Card style={styles.concernCard} variant="flat">
            <View style={styles.concernReportedRow}>
              <Ionicons name="warning-outline" size={18} color={colors.warning} />
              <Text style={styles.concernReportedText}>
                Concern reported: {todayCheck.concern_reported}
              </Text>
            </View>
          </Card>
        )}

        {/* Submit */}
        {!alreadySubmitted && (
          <Button
            title={submitting ? 'Submitting…' : 'Submit Safety Check'}
            onPress={handleSubmit}
            disabled={submitting || !allChecked}
            style={styles.submitBtn}
          />
        )}

        {alreadySubmitted && (
          <Card style={styles.doneCard} variant="flat">
            <View style={styles.doneRow}>
              <Ionicons name="checkmark-circle" size={28} color={colors.success} />
              <Text style={styles.doneText}>Completed today</Text>
            </View>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.white,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h5,
    color: colors.ink,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['5xl'],
    gap: spacing.lg,
  },
  banner: {
    backgroundColor: colors.warningBg,
    padding: spacing.lg,
  },
  bannerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    ...typography.h6,
    color: colors.ink,
    marginBottom: 4,
  },
  bannerBody: {
    ...typography.bodySmall,
    color: colors.neutral[600],
  },
  dateLabel: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[400],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  listCard: {
    padding: 0,
    overflow: 'hidden',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    minHeight: 56,
  },
  checkItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  checkIcon: {
    width: 32,
    alignItems: 'center',
  },
  checkLabel: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.ink,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.neutral[700],
  },
  concernCard: {
    padding: spacing.md,
  },
  concernReportedRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.warningBg,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  concernReportedText: {
    ...typography.bodySmall,
    color: colors.neutral[700],
    flex: 1,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  doneCard: {
    backgroundColor: colors.successBg,
    padding: spacing.lg,
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  doneText: {
    ...typography.h5,
    color: colors.success,
  },
});
