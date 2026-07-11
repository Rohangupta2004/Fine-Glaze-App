/**
 * Admin — My Profile (view + edit own contact details)
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Card, Avatar, Button, Input } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useUpdateEmployee } from '../../src/hooks/useEmployees';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', project_manager: 'Project Manager', hr: 'HR',
  accounts: 'Accounts', supervisor: 'Supervisor', worker: 'Worker', client: 'Client',
};

export default function MyProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const loadProfile = useAuthStore((s) => (s as any).loadProfile);
  const update = useUpdateEmployee();

  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(profile?.phone || '');
  const [address, setAddress] = useState(profile?.address || '');

  if (!profile) return null;

  const save = async () => {
    try {
      await update.mutateAsync({ id: profile.id, updates: { phone: phone.trim(), address: address.trim() || null } as any });
      // refresh auth store profile
      const { data } = await supabase.from('profiles').select('*').eq('id', profile.id).single();
      if (data && typeof loadProfile !== 'function') {
        useAuthStore.setState({ profile: data as any });
      } else if (data) {
        useAuthStore.setState({ profile: data as any });
      }
      setEditing(false);
      Alert.alert('Saved ✅');
    } catch (e: any) {
      Alert.alert('Could not save', e?.message || 'Try again.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>My Profile</Text>
        <TouchableOpacity onPress={() => setEditing(!editing)} style={styles.editBtn}>
          <Ionicons name={editing ? 'close' : 'create-outline'} size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}>
        <Card style={styles.profileCard}>
          <Avatar name={profile.full_name} uri={profile.avatar_url || undefined} size={72} />
          <Text style={styles.name}>{profile.full_name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{ROLE_LABELS[profile.role] || profile.role}</Text>
          </View>
        </Card>

        {editing ? (
          <Card style={styles.infoCard}>
            <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <View style={{ height: spacing.md }} />
            <Input label="Address" value={address} onChangeText={setAddress} multiline />
            <View style={{ height: spacing.md }} />
            <Button title="Save Changes" onPress={save} loading={update.isPending} fullWidth />
          </Card>
        ) : (
          <>
            <InfoRow icon="call-outline" label="Phone" value={profile.phone} />
            <InfoRow icon="location-outline" label="Address" value={profile.address || '—'} />
            <InfoRow icon="calendar-outline" label="Joined" value={profile.joining_date ? new Date(profile.joining_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
            <InfoRow icon="id-card-outline" label="Employee ID" value={profile.worker_id || '—'} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <Card style={styles.infoRow}>
      <Ionicons name={icon as any} size={20} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  editBtn: { width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' },
  title: { ...typography.h4, color: colors.ink },
  profileCard: { alignItems: 'center', padding: spacing.xl, marginBottom: spacing.lg, gap: spacing.sm },
  name: { ...typography.h4, color: colors.ink },
  roleBadge: { backgroundColor: colors.primary + '12', borderRadius: radius.md, paddingVertical: 4, paddingHorizontal: spacing.md },
  roleText: { ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.primary },
  infoCard: { padding: spacing.lg },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, marginBottom: spacing.sm },
  infoLabel: { ...typography.caption, color: colors.neutral[400] },
  infoValue: { ...typography.bodyMedium, color: colors.ink },
});
