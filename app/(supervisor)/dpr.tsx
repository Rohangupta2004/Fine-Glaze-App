import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Card, Button, GradientButton, Input } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import { useMyDprs, useSubmitDpr } from '../../src/hooks/useDpr';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius, shadows, TOUCH_TARGET } from '../../src/theme/spacing';
import type { DprStatus } from '../../src/types';
import { showAlert } from '../../src/utils/alert';

const STATUS_META: Record<DprStatus, { color: string; bg: string; label: string }> = {
  draft: { color: colors.neutral[600], bg: colors.neutral[100], label: 'Draft' },
  submitted: { color: colors.info, bg: colors.infoBg, label: 'Submitted' },
  approved: { color: colors.success, bg: colors.successBg, label: 'Approved' },
  rejected: { color: colors.error, bg: colors.errorBg, label: 'Rejected' },
};

type ViewMode = 'list' | 'new';

export default function SupervisorDprScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { data: projects } = useProjects();
  const activeProject = (projects || [])[0];
  const { data: dprs, refetch, isRefetching } = useMyDprs(profile?.id);
  const submitDpr = useSubmitDpr();

  const [mode, setMode] = useState<ViewMode>('list');
  const [workType, setWorkType] = useState('');
  const [levelZone, setLevelZone] = useState('');
  const [workDone, setWorkDone] = useState('');

  const handleSubmit = async () => {
    if (!workType.trim() || !workDone.trim() || !profile?.id || !activeProject?.id) return;
    try {
      await submitDpr.mutateAsync({
        projectId: activeProject.id,
        submittedBy: profile.id,
        workType: workType.trim(),
        levelZone: levelZone.trim(),
        workDone: workDone.trim(),
      });
      showAlert('Submitted', 'Daily Progress Report submitted successfully.');
      setWorkType(''); setLevelZone(''); setWorkDone('');
      setMode('list');
    } catch (e: any) {
      showAlert('Error', e?.message || 'Failed to submit DPR');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={['#FFFFFF', '#F9F8F6', '#EAE6DF']} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }} 
        style={StyleSheet.absoluteFill} 
      />
      <View style={[styles.innerContent, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.title}>Daily Progress Reports</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setMode(mode === 'new' ? 'list' : 'new')}
            hitSlop={12}
          >
            <Ionicons
              name={mode === 'new' ? 'list-outline' : 'add-circle-outline'}
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        {mode === 'new' ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formContainer}
            keyboardShouldPersistTaps="handled"
          >
            <Card style={styles.formCard} padding={spacing.xl}>
              <Text style={styles.formTitle}>New DPR — {activeProject?.name || 'Project'}</Text>
              <Text style={styles.formDate}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>

              <View style={styles.field}>
                <Input
                  label="Work Type"
                  placeholder="e.g. ACP Cladding, Glazing, Fabrication"
                  value={workType}
                  onChangeText={setWorkType}
                />
              </View>
              <View style={styles.field}>
                <Input
                  label="Level / Zone"
                  placeholder="e.g. Level 3 - North Facade"
                  value={levelZone}
                  onChangeText={setLevelZone}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.textAreaLabel}>Work Done *</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Describe progress made today…"
                  placeholderTextColor={colors.neutral[400]}
                  value={workDone}
                  onChangeText={setWorkDone}
                  multiline
                  numberOfLines={4}
                />
              </View>
              <View style={[styles.field, { marginTop: spacing.md }]}>
                <GradientButton
                  title="Submit DPR"
                  onPress={handleSubmit}
                  loading={submitDpr.isPending}
                  disabled={!workType.trim() || !workDone.trim()}
                  fullWidth
                />
              </View>
            </Card>
          </ScrollView>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
            }
          >
            {(!dprs || dprs.length === 0) && (
              <View style={styles.empty}>
                <Ionicons name="document-text-outline" size={48} color={colors.neutral[300]} />
                <Text style={styles.emptyText}>No DPRs submitted yet</Text>
                <Button title="Submit Today's DPR" onPress={() => setMode('new')} variant="secondary" />
              </View>
            )}
            {(dprs || []).map((dpr) => {
              const meta = STATUS_META[dpr.status];
              return (
                <Card key={dpr.id} style={styles.dprCard} padding={spacing.md}>
                  <View style={styles.dprRow}>
                    <View style={styles.dprIcon}>
                      <Ionicons name="document-text" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.dprInfo}>
                      <Text style={styles.dprDate}>
                        {new Date(dpr.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                      <Text style={styles.dprMeta}>
                        {dpr.work_type || 'General'}{dpr.level_zone ? ` · ${dpr.level_zone}` : ''}
                      </Text>
                      <Text style={styles.dprWork} numberOfLines={2}>{dpr.work_done}</Text>
                      {dpr.review_note && (
                        <Text style={styles.dprNote}>"{dpr.review_note}"</Text>
                      )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backBtn: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: { 
    flex: 1, 
    ...typography.h5, 
    color: colors.ink,
    fontFamily: fontFamily.bold,
  },
  addBtn: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  formContainer: {
    padding: spacing.lg,
    paddingBottom: spacing['6xl'],
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1.5,
    ...shadows.md,
  },
  formTitle: { 
    ...typography.h6, 
    color: colors.ink, 
    fontFamily: fontFamily.bold,
    marginBottom: spacing.xs,
  },
  formDate: { 
    ...typography.caption, 
    color: colors.neutral[500], 
    marginBottom: spacing.xl,
    fontFamily: fontFamily.medium,
  },
  field: { 
    marginBottom: spacing.md,
  },
  textAreaLabel: {
    ...typography.label,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  textArea: {
    ...typography.bodyMedium,
    fontFamily: fontFamily.regular,
    color: colors.ink,
    backgroundColor: '#FFFDF9',
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    borderRadius: radius.md,
    padding: spacing.lg,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing['6xl'],
  },
  dprCard: { 
    marginBottom: spacing.md, 
    backgroundColor: '#fff', 
    borderRadius: radius.xl, 
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1.5,
    ...shadows.sm,
  },
  dprRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    gap: spacing.md,
  },
  dprIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(105, 80, 48, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dprInfo: { 
    flex: 1,
  },
  dprDate: { 
    ...typography.bodyMedium, 
    fontFamily: fontFamily.bold, 
    color: colors.ink,
  },
  dprMeta: { 
    ...typography.caption, 
    color: '#695030', 
    marginTop: 2, 
    fontFamily: fontFamily.medium,
  },
  dprWork: { 
    ...typography.caption, 
    color: colors.neutral[600], 
    marginTop: 6, 
    lineHeight: 18,
    fontFamily: fontFamily.regular,
  },
  dprNote: { 
    ...typography.caption, 
    color: colors.neutral[500], 
    fontStyle: 'italic', 
    marginTop: 6, 
    paddingLeft: 8, 
    borderLeftWidth: 2, 
    borderLeftColor: colors.neutral[200],
    fontFamily: fontFamily.regular,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    fontFamily: fontFamily.semiBold,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
    gap: spacing.md,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.neutral[400],
    fontFamily: fontFamily.medium,
  },
});
