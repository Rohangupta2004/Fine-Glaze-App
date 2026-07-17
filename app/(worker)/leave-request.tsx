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

import { Card, Button, Input, StatusChip } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useMyLeaveRequests, useSubmitLeave } from '../../src/hooks/useLeave';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import type { LeaveType, RequestStatus } from '../../src/types';
import { showAlert } from '../../src/utils/alert';

const LEAVE_TYPES: { key: LeaveType; label: string }[] = [
  { key: 'casual', label: 'Casual Leave' },
  { key: 'sick', label: 'Sick Leave' },
  { key: 'earned', label: 'Earned Leave' },
  { key: 'unpaid', label: 'Unpaid Leave' },
];

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function LeaveRequestScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);

  const [view, setView] = useState<'history' | 'new'>('history');
  const [leaveType, setLeaveType] = useState<LeaveType>('casual');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: requests, isLoading } = useMyLeaveRequests(profile?.id);
  const submitLeave = useSubmitLeave();

  const handleSubmit = async () => {
    if (!fromDate || !toDate) {
      showAlert('Error', 'Please fill in from and to dates (YYYY-MM-DD format)');
      return;
    }
    if (!profile?.id || !profile?.company_id) {
      showAlert('Error', 'Profile not loaded');
      return;
    }
    setSubmitting(true);
    try {
      await submitLeave.mutateAsync({
        profileId: profile.id,
        companyId: profile.company_id,
        type: leaveType,
        fromDate,
        toDate,
        reason: reason || undefined,
      });
      showAlert('Submitted', 'Your leave request has been submitted for approval.', [
        { text: 'OK', onPress: () => setView('history') },
      ]);
      setFromDate('');
      setToDate('');
      setReason('');
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to submit leave request');
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
        <Text style={styles.title}>Leave Request</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, view === 'history' && styles.tabActive]}
          onPress={() => setView('history')}
        >
          <Text style={[styles.tabText, view === 'history' && styles.tabTextActive]}>My Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, view === 'new' && styles.tabActive]}
          onPress={() => setView('new')}
        >
          <Text style={[styles.tabText, view === 'new' && styles.tabTextActive]}>New Request</Text>
        </TouchableOpacity>
      </View>

      {view === 'history' ? (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {(requests ?? []).length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={64} color={colors.neutral[300]} />
              <Text style={styles.emptyTitle}>No requests yet</Text>
              <Text style={styles.emptyBody}>Tap "New Request" to submit a leave application.</Text>
            </View>
          )}
          {(requests ?? []).map((req) => (
            <Card key={req.id} style={styles.reqCard} variant="interactive">
              <View style={styles.reqTop}>
                <View style={styles.reqInfo}>
                  <Text style={styles.reqType}>{req.type.charAt(0).toUpperCase() + req.type.slice(1)} Leave</Text>
                  <Text style={styles.reqDates}>
                    {formatDate(req.from_date)} – {formatDate(req.to_date)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        req.status === 'approved'
                          ? colors.successBg
                          : req.status === 'rejected'
                          ? colors.errorBg
                          : colors.warningBg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          req.status === 'approved'
                            ? colors.success
                            : req.status === 'rejected'
                            ? colors.error
                            : colors.warning,
                      },
                    ]}
                  >
                    {STATUS_LABEL[req.status]}
                  </Text>
                </View>
              </View>
              {req.reason ? (
                <Text style={styles.reqReason}>{req.reason}</Text>
              ) : null}
            </Card>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={styles.formCard}>
            {/* Leave type */}
            <Text style={styles.fieldLabel}>Leave Type</Text>
            <View style={styles.typeGrid}>
              {LEAVE_TYPES.map((lt) => (
                <TouchableOpacity
                  key={lt.key}
                  style={[styles.typeChip, leaveType === lt.key && styles.typeChipActive]}
                  onPress={() => setLeaveType(lt.key)}
                >
                  <Text style={[styles.typeChipText, leaveType === lt.key && styles.typeChipTextActive]}>
                    {lt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Dates */}
            <Text style={styles.fieldLabel}>From Date</Text>
            <Input
              value={fromDate}
              onChangeText={setFromDate}
              placeholder="YYYY-MM-DD"
              keyboardType="numeric"
            />

            <Text style={styles.fieldLabel}>To Date</Text>
            <Input
              value={toDate}
              onChangeText={setToDate}
              placeholder="YYYY-MM-DD"
              keyboardType="numeric"
            />

            {/* Reason */}
            <Text style={styles.fieldLabel}>Reason (optional)</Text>
            <Input
              value={reason}
              onChangeText={setReason}
              placeholder="Brief reason for leave…"
              multiline
              numberOfLines={3}
            />

            <Button
              title={submitting ? 'Submitting…' : 'Submit Request'}
              onPress={handleSubmit}
              disabled={submitting}
              style={{ marginTop: spacing.xl }}
            />
          </Card>

          <Card style={styles.noteCard} variant="flat">
            <View style={styles.noteRow}>
              <Ionicons name="information-circle-outline" size={18} color={colors.info} />
              <Text style={styles.noteText}>
                Leave requests are reviewed by your supervisor or HR. You'll be notified once approved or rejected.
              </Text>
            </View>
          </Card>
        </ScrollView>
      )}
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[100],
    margin: spacing.lg,
    borderRadius: radius.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: colors.white,
  },
  tabText: {
    ...typography.buttonSmall,
    color: colors.neutral[500],
  },
  tabTextActive: {
    color: colors.primary,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['5xl'],
    gap: spacing.sm,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing['5xl'],
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h5,
    color: colors.neutral[400],
  },
  emptyBody: {
    ...typography.bodySmall,
    color: colors.neutral[400],
    textAlign: 'center',
  },
  reqCard: {
    padding: spacing.lg,
  },
  reqTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  reqInfo: {
    flex: 1,
  },
  reqType: {
    ...typography.h6,
    color: colors.ink,
    marginBottom: 2,
  },
  reqDates: {
    ...typography.caption,
    color: colors.neutral[500],
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusText: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
  },
  reqReason: {
    ...typography.bodySmall,
    color: colors.neutral[600],
    marginTop: spacing.xs,
  },
  formCard: {
    padding: spacing.xl,
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.neutral[700],
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    color: colors.neutral[600],
  },
  typeChipTextActive: {
    color: colors.white,
  },
  noteCard: {
    padding: spacing.lg,
    backgroundColor: colors.infoBg,
  },
  noteRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  noteText: {
    ...typography.bodySmall,
    color: colors.neutral[600],
    flex: 1,
  },
});
