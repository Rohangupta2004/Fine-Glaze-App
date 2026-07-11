/**
 * Roles & Permissions — Admin (Owner only)
 * PRD §1 — Configurable permissions per role via role_permissions table.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Card, Button } from '../../src/components';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

const ROLES = [
  { key: 'project_manager', label: 'Project Manager', icon: 'briefcase' },
  { key: 'hr', label: 'HR', icon: 'people' },
  { key: 'accounts', label: 'Accounts', icon: 'calculator' },
  { key: 'supervisor', label: 'Supervisor', icon: 'shield' },
  { key: 'worker', label: 'Worker', icon: 'hammer' },
];

const PERMISSIONS = [
  { key: 'projects', label: 'Projects', desc: 'View and manage projects' },
  { key: 'tasks', label: 'Tasks', desc: 'Create and assign tasks' },
  { key: 'employees', label: 'Employees', desc: 'View and manage employees' },
  { key: 'attendance', label: 'Attendance', desc: 'View attendance records' },
  { key: 'dpr', label: 'DPR', desc: 'Review DPR reports' },
  { key: 'leave', label: 'Leave Approvals', desc: 'Approve/reject leave requests' },
  { key: 'materials', label: 'Materials', desc: 'Manage material requests' },
  { key: 'salary', label: 'Salary & Bank', desc: 'View salary and bank details' },
  { key: 'payments', label: 'Payments', desc: 'Manage payment milestones' },
  { key: 'documents', label: 'Documents', desc: 'Manage documents' },
  { key: 'reports', label: 'Reports & Analytics', desc: 'View analytics and reports' },
  { key: 'settings', label: 'Settings', desc: 'Access company settings' },
];

function useRolePermissions() {
  return useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*');
      if (error) throw error;
      return data || [];
    },
  });
}

function useUpdatePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ role, permissions }: { role: string; permissions: Record<string, boolean> }) => {
      const { error } = await supabase
        .from('role_permissions')
        .upsert({
          company_id: (await supabase.from('companies').select('id').single()).data?.id,
          role,
          permissions,
        }, { onConflict: 'company_id,role' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['role-permissions'] }),
  });
}

export default function RolesPermissionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: rolePerms } = useRolePermissions();
  const updatePerms = useUpdatePermissions();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const currentPerms = rolePerms?.find((rp: any) => rp.role === selectedRole)?.permissions || {};

  const togglePermission = (permKey: string) => {
    if (!selectedRole) return;
    const updated = { ...currentPerms, [permKey]: !currentPerms[permKey] };
    updatePerms.mutate({ role: selectedRole, permissions: updated });
  };

  if (selectedRole) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedRole(null)} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.title}>{ROLES.find(r => r.key === selectedRole)?.label}</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.subtitle}>Configure what this role can access</Text>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['6xl'] }}>
          {PERMISSIONS.map((perm) => (
            <Card key={perm.key} style={styles.permCard}>
              <View style={styles.permRow}>
                <View style={styles.permInfo}>
                  <Text style={styles.permLabel}>{perm.label}</Text>
                  <Text style={styles.permDesc}>{perm.desc}</Text>
                </View>
                <Switch
                  value={!!currentPerms[perm.key]}
                  onValueChange={() => togglePermission(perm.key)}
                  trackColor={{ false: colors.neutral[200], true: colors.tertiary }}
                  thumbColor={currentPerms[perm.key] ? colors.primary : colors.neutral[300]}
                />
              </View>
            </Card>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Roles & Permissions</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.subtitle}>Configure access per role. Owner always has full access.</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['6xl'] }}>
        {/* Owner (always full) */}
        <Card style={[styles.roleCard, { borderLeftWidth: 3, borderLeftColor: colors.primary }]}>
          <View style={styles.roleRow}>
            <View style={[styles.roleIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="star" size={22} color={colors.primary} />
            </View>
            <View style={styles.roleInfo}>
              <Text style={styles.roleName}>Owner</Text>
              <Text style={styles.roleDesc}>Full access — cannot be modified</Text>
            </View>
            <Ionicons name="lock-closed" size={18} color={colors.neutral[400]} />
          </View>
        </Card>

        {ROLES.map((role) => (
          <TouchableOpacity key={role.key} onPress={() => setSelectedRole(role.key)}>
            <Card style={styles.roleCard} variant="interactive">
              <View style={styles.roleRow}>
                <View style={[styles.roleIcon, { backgroundColor: colors.primary + '10' }]}>
                  <Ionicons name={role.icon as any} size={22} color={colors.primary} />
                </View>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleName}>{role.label}</Text>
                  <Text style={styles.roleDesc}>
                    {Object.values(rolePerms?.find((rp: any) => rp.role === role.key)?.permissions || {}).filter(Boolean).length} permissions enabled
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.neutral[400]} />
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  title: { ...typography.h4, color: colors.ink },
  subtitle: { ...typography.bodySmall, color: colors.neutral[500], marginBottom: spacing.xl },
  roleCard: { padding: spacing.lg, marginBottom: spacing.sm },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  roleIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  roleInfo: { flex: 1 },
  roleName: { ...typography.h6, color: colors.ink },
  roleDesc: { ...typography.caption, color: colors.neutral[500], marginTop: 2 },
  permCard: { padding: spacing.lg, marginBottom: spacing.sm },
  permRow: { flexDirection: 'row', alignItems: 'center' },
  permInfo: { flex: 1, marginRight: spacing.lg },
  permLabel: { ...typography.h6, color: colors.ink },
  permDesc: { ...typography.caption, color: colors.neutral[500], marginTop: 2 },
});
