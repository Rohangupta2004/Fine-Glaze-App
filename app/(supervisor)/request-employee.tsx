import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, Button, Input } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import {
  useMyEmployeeRequests,
  useSubmitEmployeeRequest,
} from '../../src/hooks/useEmployeeRequests';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius, TOUCH_TARGET } from '../../src/theme/spacing';
import type { EmployeeRequestRole, EmployeeRequestStatus } from '../../src/types';

const ROLE_OPTIONS: { key: EmployeeRequestRole; label: string }[] = [
  { key: 'worker', label: 'Worker' },
  { key: 'helper', label: 'Helper' },
  { key: 'supervisor', label: 'Supervisor' },
];

const STATUS_META: Record<EmployeeRequestStatus, { color: string; bg: string; label: string }> = {
  pending: { color: colors.warning, bg: colors.warningBg, label: 'Pending' },
  approved: { color: colors.success, bg: colors.successBg, label: 'Approved' },
  rejected: { color: colors.error, bg: colors.errorBg, label: 'Rejected' },
};

type ViewMode = 'list' | 'new';

export default function RequestEmployeeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { data: projects } = useProjects();
  const activeProject = (projects || [])[0];
  const { data: requests, refetch, isRefetching } = useMyEmployeeRequests(profile?.id);
  const submitRequest = useSubmitEmployeeRequest();

  const [mode, setMode] = useState<ViewMode>('list');
  const [roleNeeded, setRoleNeeded] = useState<EmployeeRequestRole>('worker');
  const [headcount, setHeadcount] = useState('1');
  const [notes, setNotes] = useState('');

  const headcountValue = parseInt(headcount, 10);
  const headcountIsValid = !isNaN(headcountValue) && headcountValue > 0;

  const handleSubmit = async () => {
    if (!profile?.id || !profile.company_id || !activeProject?.id || !headcountIsValid) {
      Alert.alert('Check details', 'Enter a headcount of at least 1.');
      return;
    }
    try {
      await submitRequest.mutateAsync({
        companyId: profile.company_id,
        projectId: activeProject.id,
        requestedBy: profile.id,
        roleNeeded,
        headcount: headcountValue,
        notes: notes.trim() || undefined,
      });
      Alert.alert('Sent to Admin', 'Your employee request has been submitted for approval.');
      setHeadcount('1'); setNotes(''); setRoleNeeded('worker');
      setMode('list');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to submit request');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Request Employee</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setMode(mode === 'new' ? 'list' : 'new')}
          hitSlop={8}
        >
          <Ionicons
            name={mode === 'new' ? 'list-outline' : 'add-circle-outline'}
            size={26}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {mode === 'new' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.formTitle}>New Request — {activeProject?.name || 'Project'}</Text>
          <Text style={styles.formSub}>Sent directly to Admin for approval.</Text>

          <Text style={styles.fieldLabel}>Role Needed</Text>
          <View style={styles.roleRow}>
            {ROLE_OPTIONS.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={[styles.roleChip, roleNeeded === r.key && styles.roleChipActive]}
                onPress={() => setRoleNeeded(r.key)}
              >
                <Text style={[styles.roleChipText, roleNeeded === r.key && styles.roleChipTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: spacing.lg }} />
          <Input
            label="Headcount *"
            placeholder="e.g. 2"
            value={headcount}
            onChangeText={(v) => setHeadcount(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
          />
          {headcount.trim() !== '' && !headcountIsValid && (
            <Text style={styles.errorText}>Enter a headcount of at least 1</Text>
          )}
          <View style={{ height: spacing.md }} />
          <Input
            label="Notes (optional)"
            placeholder="e.g. Need 2 glazing helpers for facade work next week"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          <View style={{ height: spacing.xl }} />
          <Button
            title="Send Request"
            onPress={handleSubmit}
            loading={submitRequest.isPending}
            disabled={!headcountIsValid || !activeProject?.id}
          />
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
        >
          {(!requests || requests.length === 0) && (
            <View style={styles.empty}>
              <Ionicons name="person-add-outline" size={48} color={colors.neutral[300]} />
              <Text style={styles.emptyText}>No employee requests yet</Text>
              <Button title="Request Employee" onPress={() => setMode('new')} variant="secondary" />
            </View>
          )}
          {(requests || []).map((req) => {
            const meta = STATUS_META[req.status];
            return (
              <Card key={req.id} style={styles.reqCard} padding={spacing.md}>
                <View style={styles.reqRow}>
                  <View style={styles.reqIcon}>
                    <Ionicons name="person-add" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.reqInfo}>
                    <Text style={styles.reqTitle}>
                      {req.headcount} × {req.role_needed}
                    </Text>
                    <Text style={styles.reqMeta}>
                      Requested {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                    {req.notes && <Text style={styles.reqNotes}>{req.notes}</Text>}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.surface,
  },
  backBtn: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'flex-start', justifyContent: 'center' },
  title: { flex: 1, ...typography.h5, color: colors.ink },
  addBtn: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'flex-end', justifyContent: 'center' },
  form: { padding: spacing.lg, paddingBottom: spacing['6xl'] },
  formTitle: { ...typography.h6, color: colors.ink, marginBottom: spacing.xs },
  formSub: { ...typography.caption, color: colors.neutral[500], marginBottom: spacing.xl },
  fieldLabel: { ...typography.caption, fontFamily: fontFamily.medium, color: colors.neutral[600], marginBottom: spacing.sm },
  roleRow: { flexDirection: 'row', gap: spacing.sm },
  roleChip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral[200], backgroundColor: colors.white },
  roleChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  roleChipText: { ...typography.bodySmall, color: colors.neutral[600] },
  roleChipTextActive: { color: colors.primary, fontFamily: fontFamily.semiBold },
  errorText: { ...typography.caption, color: colors.error, marginTop: spacing.xs },
  list: { padding: spacing.lg, paddingBottom: spacing['6xl'] },
  reqCard: { marginBottom: spacing.sm },
  reqRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  reqIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.neutral[100], alignItems: 'center', justifyContent: 'center' },
  reqInfo: { flex: 1 },
  reqTitle: { ...typography.bodySmall, fontFamily: fontFamily.semiBold, color: colors.ink, textTransform: 'capitalize' },
  reqMeta: { ...typography.caption, color: colors.neutral[500], marginTop: 2 },
  reqNotes: { ...typography.caption, color: colors.neutral[400], marginTop: 4, fontStyle: 'italic' },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full, alignSelf: 'flex-start' },
  statusText: { ...typography.caption, fontFamily: fontFamily.semiBold },
  empty: { alignItems: 'center', paddingVertical: spacing['5xl'], gap: spacing.md },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400] },
});
