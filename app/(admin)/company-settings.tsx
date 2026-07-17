/**
 * Admin — Company Settings (name, city; owner/admin roles only)
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Card, Button, Input } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { showAlert } from '../../src/utils/alert';

export default function CompanySettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();

  const { data: company } = useQuery({
    queryKey: ['company', profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('*').eq('id', profile!.company_id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  useEffect(() => {
    if (company) { setName(company.name || ''); setCity(company.city || ''); }
  }, [company]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('companies')
        .update({ name: name.trim(), city: city.trim() || null })
        .eq('id', profile!.company_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company'] });
      showAlert('Saved ✅', 'Company details updated.');
    },
    onError: (e: any) => showAlert('Could not save', e?.message || 'Try again.'),
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Company Settings</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}>
        <Card style={styles.card}>
          <Input label="Company Name" value={name} onChangeText={setName} />
          <View style={{ height: spacing.md }} />
          <Input label="City" value={city} onChangeText={setCity} placeholder="Pune" />
          <View style={{ height: spacing.lg }} />
          <Button title="Save Changes" onPress={() => save.mutate()} loading={save.isPending} fullWidth />
        </Card>
        <Text style={styles.note}>
          Company details appear across the app and in exported reports. Only owner/admin roles can change them.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { ...typography.h4, color: colors.ink },
  card: { padding: spacing.lg },
  note: { ...typography.caption, color: colors.neutral[400], marginTop: spacing.md, textAlign: 'center', fontFamily: fontFamily.regular },
});
