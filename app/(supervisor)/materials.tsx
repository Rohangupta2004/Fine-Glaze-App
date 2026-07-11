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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, Button, Input } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import { useMaterialRequests, useSubmitMaterialRequest } from '../../src/hooks/useMaterials';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

type ViewMode = 'requests' | 'new';

export default function SupervisorMaterialsScreen() {
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const { data: projects } = useProjects();
  const activeProject = (projects || [])[0];
  const { data: requests, refetch, isRefetching } = useMaterialRequests(activeProject?.id);
  const submitRequest = useSubmitMaterialRequest();

  const [mode, setMode] = useState<ViewMode>('requests');
  const [materialName, setMaterialName] = useState('');
  const [spec, setSpec] = useState('');
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!materialName.trim() || !qty.trim() || !profile?.id || !activeProject?.id) return;
    try {
      await submitRequest.mutateAsync({
        projectId: activeProject.id,
        requestedBy: profile.id,
        materialName: materialName.trim(),
        spec: spec.trim() || undefined,
        qty: parseInt(qty, 10),
        notes: notes.trim() || undefined,
      });
      Alert.alert('Submitted', 'Material request sent for approval.');
      setMaterialName(''); setSpec(''); setQty(''); setNotes('');
      setMode('requests');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to submit request');
    }
  };

  const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
    pending: { color: colors.warning, bg: colors.warningBg },
    approved: { color: colors.success, bg: colors.successBg },
    rejected: { color: colors.error, bg: colors.errorBg },
    ordered: { color: colors.info, bg: colors.infoBg },
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Materials</Text>
        <TouchableOpacity onPress={() => setMode(mode === 'new' ? 'requests' : 'new')}>
          <Ionicons name={mode === 'new' ? 'list' : 'add-circle'} size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {mode === 'new' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['6xl'] }}>
          <Text style={styles.subtitle}>New Material Request</Text>
          <Input label="Material Name" placeholder="e.g. ACP Panel 4mm" value={materialName} onChangeText={setMaterialName} />
          <View style={{ height: spacing.md }} />
          <Input label="Specification" placeholder="e.g. Silver metallic, FR grade" value={spec} onChangeText={setSpec} />
          <View style={{ height: spacing.md }} />
          <Input label="Quantity" placeholder="e.g. 50" value={qty} onChangeText={setQty} keyboardType="numeric" />
          <View style={{ height: spacing.md }} />
          <Input label="Notes (optional)" placeholder="Additional notes" value={notes} onChangeText={setNotes} multiline />
          <View style={{ height: spacing.xl }} />
          <Button title="Submit Request" onPress={handleSubmit} loading={submitRequest.isPending} disabled={!materialName.trim() || !qty.trim()} />
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing['6xl'] }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        >
          {(requests || []).map((r) => {
            const sc = STATUS_COLOR[r.status] || STATUS_COLOR.pending;
            return (
              <Card key={r.id} style={styles.requestCard}>
                <View style={styles.requestRow}>
                  <View style={[styles.requestIcon, { backgroundColor: sc.bg }]}>
                    <Ionicons name="cube" size={20} color={sc.color} />
                  </View>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{r.material_name}</Text>
                    <Text style={styles.requestMeta}>
                      Qty: {r.qty}{r.spec ? ` · ${r.spec}` : ''}
                      {r.needed_by ? ` · By ${new Date(r.needed_by).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                    </Text>
                    {r.notes && <Text style={styles.requestNotes}>{r.notes}</Text>}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.color }]}>{r.status}</Text>
                  </View>
                </View>
              </Card>
            );
          })}
          {(!requests || requests.length === 0) && (
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={48} color={colors.neutral[300]} />
              <Text style={styles.emptyText}>No material requests yet</Text>
              <Button title="Request Material" onPress={() => setMode('new')} variant="secondary" />
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  title: { ...typography.h3, color: colors.ink },
  subtitle: { ...typography.h5, color: colors.ink, marginBottom: spacing.xl },
  requestCard: { padding: spacing.md, marginBottom: spacing.sm },
  requestRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  requestIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  requestInfo: { flex: 1 },
  requestName: { ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },
  requestMeta: { ...typography.caption, color: colors.neutral[500], marginTop: 2 },
  requestNotes: { ...typography.caption, color: colors.neutral[400], marginTop: 4, fontStyle: 'italic' },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  statusText: { ...typography.caption, fontFamily: fontFamily.semiBold, textTransform: 'capitalize' },
  empty: { alignItems: 'center', paddingVertical: spacing['5xl'], gap: spacing.md },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400] },
});
