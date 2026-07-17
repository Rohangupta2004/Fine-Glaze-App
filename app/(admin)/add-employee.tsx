import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button, Card, Input } from '../../src/components';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import { showAlert } from '../../src/utils/alert';

import type { UserRole } from '../../src/types';

const ROLES: { label: string; value: UserRole }[] = [
  { label: 'Worker', value: 'worker' },
  { label: 'Supervisor', value: 'supervisor' },
  { label: 'Project Manager', value: 'project_manager' },
  { label: 'HR', value: 'hr' },
  { label: 'Accounts', value: 'accounts' },
];

type Step = 'info' | 'role' | 'review';
const STEPS: Step[] = ['info', 'role', 'review'];

// ── Security note ────────────────────────────────────────────────────────────
// We do NOT call supabase.auth.signUp() from the client because:
//   1. The anon key cannot bypass email-confirmation requirements securely.
//   2. It would create an unauthenticated session for the new user on the
//      admin's device (session hijack risk).
//   3. Service-role operations must stay server-side.
//
// Instead, we call the `create-user` Edge Function, which runs with the
// service-role key and returns only the new user's id + generated password.
// ─────────────────────────────────────────────────────────────────────────────

export default function AddEmployeeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState<Step>('info');
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('worker');
  const [dailyRate, setDailyRate] = useState('');
  const [address, setAddress] = useState('');

  const stepIndex = STEPS.indexOf(step);
  const canNext = step === 'info' ? (fullName.trim() && phone.trim().length >= 10) : true;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: funcData, error: funcErr } = await supabase.functions.invoke('create-user', {
        body: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          role,
          daily_rate: dailyRate ? parseFloat(dailyRate) : null,
          address: address.trim() || null,
        }
      });

      if (funcErr) {
        throw new Error(funcErr.message || 'Failed to create user');
      }

      if (funcData?.error) {
        throw new Error(funcData.error);
      }

      showAlert('Employee Added!', `${fullName} has been added.\nLogin: ${phone}\nTemp password: ${funcData.temp_password}`);
      router.back();
    } catch (e: any) {
      const msg = e?.message || 'Failed to add employee';
      showAlert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Employee</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.steps}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <View style={[styles.stepDot, i <= stepIndex && styles.stepDotActive]}>
              <Text style={[styles.stepNum, i <= stepIndex && styles.stepNumActive]}>{i + 1}</Text>
            </View>
            {i < STEPS.length - 1 && <View style={[styles.stepLine, i < stepIndex && styles.stepLineActive]} />}
          </React.Fragment>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing['6xl'] }}>
        {step === 'info' && (
          <>
            <Text style={styles.stepTitle}>Basic Information</Text>
            <Input label="Full Name" placeholder="Enter full name" value={fullName} onChangeText={setFullName} />
            <View style={{ height: spacing.md }} />
            <Input label="Phone Number" placeholder="10-digit mobile" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <View style={{ height: spacing.md }} />
            <Input label="Address (optional)" placeholder="Enter address" value={address} onChangeText={setAddress} multiline />
          </>
        )}

        {step === 'role' && (
          <>
            <Text style={styles.stepTitle}>Role & Pay</Text>
            <Text style={styles.fieldLabel}>Select Role</Text>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[styles.roleOption, role === r.value && styles.roleOptionActive]}
                onPress={() => setRole(r.value)}
              >
                <Ionicons
                  name={role === r.value ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={role === r.value ? colors.primary : colors.neutral[400]}
                />
                <Text style={[styles.roleText, role === r.value && styles.roleTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={{ height: spacing.lg }} />
            <Input label="Daily Rate (₹)" placeholder="e.g. 800" value={dailyRate} onChangeText={setDailyRate} keyboardType="numeric" />
          </>
        )}

        {step === 'review' && (
          <>
            <Text style={styles.stepTitle}>Review & Confirm</Text>
            <Card style={styles.reviewCard}>
              <ReviewRow label="Name" value={fullName} />
              <ReviewRow label="Phone" value={phone} />
              <ReviewRow label="Role" value={ROLES.find(r => r.value === role)?.label || role} />
              {dailyRate ? <ReviewRow label="Daily Rate" value={`₹${dailyRate}`} /> : null}
              {address ? <ReviewRow label="Address" value={address} /> : null}
            </Card>
            <Card style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={colors.info} />
              <Text style={styles.infoText}>
                A temporary password will be generated. Share the login credentials with the employee.
              </Text>
            </Card>
          </>
        )}
        {/* Navigation buttons inside scroll */}
        <View style={[styles.bottomActions, { marginTop: spacing.xl }]}>
          {stepIndex > 0 && (
            <Button title="Back" variant="secondary" onPress={() => setStep(STEPS[stepIndex - 1])} style={{ flex: 1 }} />
          )}
          {stepIndex < STEPS.length - 1 ? (
            <Button title="Next" onPress={() => setStep(STEPS[stepIndex + 1])} disabled={!canNext} style={{ flex: 1 }} />
          ) : (
            <Button title="Add Employee" onPress={handleSubmit} loading={submitting} style={{ flex: 1 }} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { ...typography.h5, color: colors.ink },
  steps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['3xl'], marginBottom: spacing['2xl'] },
  stepDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.neutral[200], alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: colors.primary },
  stepNum: { ...typography.bodySmall, fontFamily: fontFamily.semiBold, color: colors.neutral[500] },
  stepNumActive: { color: colors.white },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.neutral[200], marginHorizontal: spacing.sm },
  stepLineActive: { backgroundColor: colors.primary },
  stepTitle: { ...typography.h4, color: colors.ink, marginBottom: spacing.xl },
  fieldLabel: { ...typography.label, color: colors.ink, marginBottom: spacing.md },
  roleOption: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderRadius: radius.md, backgroundColor: colors.surface,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.neutral[200],
  },
  roleOptionActive: { borderColor: colors.primary, backgroundColor: colors.primary + '08' },
  roleText: { ...typography.bodyMedium, color: colors.neutral[600] },
  roleTextActive: { color: colors.primary, fontFamily: fontFamily.medium },
  reviewCard: { padding: spacing.lg, marginBottom: spacing.lg, gap: spacing.md },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  reviewLabel: { ...typography.bodySmall, color: colors.neutral[500] },
  reviewValue: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.infoBg },
  infoText: { flex: 1, ...typography.bodySmall, color: colors.info },
  bottomActions: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.neutral[100], backgroundColor: colors.white, boxShadow: '0px -4px 16px rgba(0,0,0,0.06)' },
});
