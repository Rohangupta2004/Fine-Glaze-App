import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, Avatar, Button } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useMonthlySalary } from '../../src/hooks/useSalary';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import { useTranslation } from 'react-i18next';

type TabKey = 'details' | 'salary' | 'bank' | 'settings';

const TABS: { key: TabKey; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'details', label: 'Profile', icon: 'person-outline' },
  { key: 'salary', label: 'Salary', icon: 'wallet-outline' },
  { key: 'bank', label: 'Bank', icon: 'card-outline' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline' },
];

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value ?? '—'}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { profile, signOut } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabKey>('details');

  const now = new Date();
  const { data: salary } = useMonthlySalary(profile?.id, now.getFullYear(), now.getMonth() + 1);

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/welcome');
          },
        },
      ]
    );
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const bankDetails = profile?.bank_details as Record<string, string> | null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>My Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Profile summary */}
      <View style={styles.profileBanner}>
        <Avatar name={profile?.full_name ?? 'W'} uri={profile?.avatar_url} size={72} />
        <View style={styles.profileText}>
          <Text style={styles.profileName}>{profile?.full_name ?? 'Worker'}</Text>
          <Text style={styles.profileMeta}>{profile?.worker_id ?? profile?.phone ?? ''}</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  profile?.status === 'active' ? colors.successBg : colors.warningBg,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: profile?.status === 'active' ? colors.success : colors.warning },
              ]}
            >
              {(profile?.status ?? 'active').replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={20}
              color={activeTab === tab.key ? colors.primary : colors.neutral[400]}
            />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Details tab */}
        {activeTab === 'details' && (
          <Card style={styles.card}>
            <InfoRow label="Full Name" value={profile?.full_name} />
            <InfoRow label="Phone" value={profile?.phone} />
            <InfoRow label="Worker ID" value={profile?.worker_id} />
            <InfoRow label="Role" value={profile?.role} />
            <InfoRow
              label="Joining Date"
              value={
                profile?.joining_date
                  ? new Date(profile.joining_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : null
              }
            />
            <InfoRow label="Address" value={profile?.address} />
            <InfoRow label="Status" value={profile?.status} />
          </Card>
        )}

        {/* Salary tab */}
        {activeTab === 'salary' && (
          <>
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>
                {now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} — Summary
              </Text>
              {salary ? (
                <>
                  <View style={styles.salaryGrid}>
                    <View style={styles.salaryItem}>
                      <Text style={styles.salaryNum}>{salary.present_days}</Text>
                      <Text style={styles.salaryItemLabel}>Present Days</Text>
                    </View>
                    <View style={styles.salaryItem}>
                      <Text style={styles.salaryNum}>{salary.half_days}</Text>
                      <Text style={styles.salaryItemLabel}>Half Days</Text>
                    </View>
                    <View style={styles.salaryItem}>
                      <Text style={styles.salaryNum}>{(salary.ot_hours ?? 0).toFixed(1)}h</Text>
                      <Text style={styles.salaryItemLabel}>OT Hours</Text>
                    </View>
                    <View style={styles.salaryItem}>
                      <Text style={styles.salaryNum}>₹{salary.advances_taken ?? 0}</Text>
                      <Text style={styles.salaryItemLabel}>Advances</Text>
                    </View>
                  </View>
                  <View style={styles.payableRow}>
                    <Text style={styles.payableLabel}>Net Payable</Text>
                    <Text style={styles.payableAmount}>₹{(salary.payable ?? 0).toFixed(0)}</Text>
                  </View>
                  <View style={styles.rateRow}>
                    <Text style={styles.rateText}>Daily Rate: ₹{profile?.daily_rate ?? '—'}</Text>
                  </View>
                </>
              ) : (
                <View style={styles.emptyInline}>
                  <Text style={styles.emptyText}>No salary data for this month yet.</Text>
                </View>
              )}
            </Card>
            <Card style={styles.noteCard} variant="flat">
              <View style={styles.noteRow}>
                <Ionicons name="information-circle-outline" size={16} color={colors.info} />
                <Text style={styles.noteText}>
                  Salary is computed from attendance records. Contact HR for disputes.
                </Text>
              </View>
            </Card>
          </>
        )}

        {/* Bank tab */}
        {activeTab === 'bank' && (
          <Card style={styles.card}>
            <View style={styles.bankHeader}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.neutral[400]} />
              <Text style={styles.bankNote}>Visible to you only. Managed by HR.</Text>
            </View>
            <InfoRow label="Bank Name" value={bankDetails?.bank_name} />
            <InfoRow label="Account Number" value={bankDetails?.account_number ? `•••• ${bankDetails.account_number.slice(-4)}` : null} />
            <InfoRow label="IFSC Code" value={bankDetails?.ifsc} />
            <InfoRow label="Account Holder" value={bankDetails?.holder_name ?? profile?.full_name} />
            <InfoRow label="Account Type" value={bankDetails?.account_type ?? 'Savings'} />
          </Card>
        )}

        {/* Settings tab */}
        {activeTab === 'settings' && (
          <>
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Language</Text>
              <View style={styles.langRow}>
                {[
                  { code: 'en', label: 'English' },
                  { code: 'hi', label: 'हिंदी' },
                  { code: 'mr', label: 'मराठी' },
                ].map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.langChip,
                      i18n.language === lang.code && styles.langChipActive,
                    ]}
                    onPress={() => changeLanguage(lang.code)}
                  >
                    <Text
                      style={[
                        styles.langText,
                        i18n.language === lang.code && styles.langTextActive,
                      ]}
                    >
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            <Card style={styles.menuCard} padding={0}>
              {[
                { icon: 'key-outline' as const, label: 'Change PIN', route: '/(auth)/forgot-pin' },
                { icon: 'help-circle-outline' as const, label: 'Help & Support', route: null },
                { icon: 'shield-outline' as const, label: 'Privacy Policy', route: null },
              ].map((item, index, arr) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.menuItem, index < arr.length - 1 && styles.menuItemBorder]}
                  onPress={() => item.route && router.push(item.route as any)}
                >
                  <Ionicons name={item.icon} size={22} color={colors.neutral[600]} />
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
                </TouchableOpacity>
              ))}
            </Card>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color={colors.error} />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </>
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
  profileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    ...typography.h4,
    color: colors.ink,
    marginBottom: 4,
  },
  profileMeta: {
    ...typography.bodySmall,
    color: colors.neutral[500],
    marginBottom: spacing.sm,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusText: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    letterSpacing: 0.5,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: colors.transparent,
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    color: colors.neutral[400],
  },
  tabLabelActive: {
    color: colors.primary,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['5xl'],
    gap: spacing.lg,
  },
  card: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h6,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  infoLabel: {
    ...typography.bodySmall,
    color: colors.neutral[500],
  },
  infoValue: {
    ...typography.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.ink,
    flex: 1,
    textAlign: 'right',
    textTransform: 'capitalize',
  },
  // Salary
  salaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  salaryItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: radius.md,
    padding: spacing.md,
  },
  salaryNum: {
    ...typography.h4,
    color: colors.primary,
    marginBottom: 4,
  },
  salaryItemLabel: {
    ...typography.caption,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  payableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  payableLabel: {
    ...typography.h6,
    color: colors.white,
  },
  payableAmount: {
    ...typography.h4,
    color: colors.white,
  },
  rateRow: {
    alignItems: 'flex-end',
  },
  rateText: {
    ...typography.caption,
    color: colors.neutral[400],
  },
  emptyInline: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.neutral[400],
  },
  noteCard: {
    backgroundColor: colors.infoBg,
    padding: spacing.md,
  },
  noteRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  noteText: {
    ...typography.caption,
    color: colors.neutral[600],
    flex: 1,
  },
  // Bank
  bankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  bankNote: {
    ...typography.caption,
    color: colors.neutral[400],
  },
  // Settings
  langRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  langChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[100],
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
  },
  langChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '18',
  },
  langText: {
    ...typography.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.neutral[600],
  },
  langTextActive: {
    color: colors.primary,
  },
  menuCard: {
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  menuLabel: {
    flex: 1,
    ...typography.bodyMedium,
    fontFamily: fontFamily.medium,
    color: colors.ink,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  logoutText: {
    ...typography.button,
    color: colors.error,
  },
});
