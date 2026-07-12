/**
 * Admin — Materials Management
 * Full flow: Requests (pending → approved → ordered → delivered),
 * Site stock (add/edit), Deliveries (create/mark delivered).
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, RefreshControl, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Card, Button, Input, StatusChip, SegmentedControl } from '../../src/components';
import {
  useAllMaterials, useMaterialRequests, useDeliveries,
  useUpsertMaterial, useDecideMaterialRequest, useCreateDelivery, useMarkDelivered,
  useDeliveryPhotoUrls,
} from '../../src/hooks/useMaterials';
import { useProjects } from '../../src/hooks/useProjects';
import { useAuthStore } from '../../src/stores/authStore';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import type { Material, MaterialRequest, Delivery } from '../../src/types';

type Tab = 'requests' | 'stock' | 'deliveries';

export default function AdminMaterialsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const [tab, setTab] = useState<Tab>('requests');

  const { data: requests = [], refetch: rReq, isRefetching: f1 } = useMaterialRequests();
  const { data: stock = [], refetch: rStock, isRefetching: f2 } = useAllMaterials();
  const { data: deliveries = [], refetch: rDel, isRefetching: f3 } = useDeliveries();
  const { data: projects = [] } = useProjects();

  const decide = useDecideMaterialRequest();
  const upsert = useUpsertMaterial();
  const createDelivery = useCreateDelivery();
  const markDelivered = useMarkDelivered();

  const projectName = useMemo(
    () => new Map((projects || []).map((p: any) => [p.id, p.name])),
    [projects],
  );

  // ── Stock modal state ──
  const [stockModal, setStockModal] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [mName, setMName] = useState('');
  const [mSpec, setMSpec] = useState('');
  const [mUnit, setMUnit] = useState('');
  const [mQty, setMQty] = useState('');
  const [mProject, setMProject] = useState<string | null>(null);

  const openStockModal = (item?: Material) => {
    setEditing(item || null);
    setMName(item?.name || '');
    setMSpec(item?.spec || '');
    setMUnit(item?.unit || '');
    setMQty(item ? String(item.stock_qty ?? '') : '');
    setMProject(item?.project_id || projects[0]?.id || null);
    setStockModal(true);
  };

  const saveStock = async () => {
    if (!mName.trim() || !mProject) {
      Alert.alert('Missing info', 'Material name and site are required.');
      return;
    }
    try {
      await upsert.mutateAsync({
        id: editing?.id,
        project_id: mProject,
        name: mName.trim(),
        spec: mSpec.trim() || null,
        unit: mUnit.trim() || null,
        stock_qty: mQty ? Number(mQty) : 0,
      });
      setStockModal(false);
    } catch (e: any) {
      Alert.alert('Could not save', e?.message || 'Please try again.');
    }
  };

  const onDecide = (req: MaterialRequest, status: 'approved' | 'rejected' | 'ordered') => {
    if (!profile) return;
    decide.mutate(
      { id: req.id, status, decidedBy: profile.id },
      { onError: (e: any) => Alert.alert('Failed', e?.message || 'Try again.') },
    );
  };

  const onCreateDelivery = (req: MaterialRequest) => {
    createDelivery.mutate(
      { material_request_id: req.id, project_id: req.project_id },
      {
        onSuccess: () => { setTab('deliveries'); rDel(); },
        onError: (e: any) => Alert.alert('Failed', e?.message || 'Try again.'),
      },
    );
  };

  const pending = requests.filter((r) => r.status === 'pending');
  const approved = requests.filter((r) => r.status === 'approved');
  const ordered = requests.filter((r) => r.status === 'ordered');

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Materials</Text>
        <TouchableOpacity onPress={() => openStockModal()} style={styles.addBtn}>
          <Ionicons name="add-circle" size={30} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Flow summary */}
      <View style={styles.flowRow}>
        <FlowStat label="Pending" value={pending.length} color={colors.warning} />
        <Ionicons name="chevron-forward" size={14} color={colors.neutral[300]} />
        <FlowStat label="Approved" value={approved.length} color={colors.info} />
        <Ionicons name="chevron-forward" size={14} color={colors.neutral[300]} />
        <FlowStat label="Ordered" value={ordered.length} color={colors.primary} />
        <Ionicons name="chevron-forward" size={14} color={colors.neutral[300]} />
        <FlowStat label="Delivered" value={deliveries.filter((d) => d.status === 'delivered').length} color={colors.success} />
      </View>

      <SegmentedControl<Tab>
        segments={[
          { label: `Requests (${pending.length})`, value: 'requests' },
          { label: 'Stock', value: 'stock' },
          { label: 'Deliveries', value: 'deliveries' },
        ]}
        value={tab}
        onChange={setTab}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl, paddingTop: spacing.md }}
        refreshControl={
          <RefreshControl refreshing={f1 || f2 || f3} onRefresh={() => { rReq(); rStock(); rDel(); }} tintColor={colors.primary} />
        }
      >
        {tab === 'requests' && (
          <>
            {requests.length === 0 && (
              <EmptyState icon="cube-outline" text="No material requests yet. Supervisors and workers raise requests from their Materials screen." />
            )}
            {requests.map((req) => (
              <Card key={req.id} style={styles.itemCard}>
                <View style={styles.itemHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{req.material_name}</Text>
                    <Text style={styles.itemMeta}>
                      {req.qty} {req.spec ? `• ${req.spec}` : ''} • {projectName.get(req.project_id) || 'Site'}
                    </Text>
                    {req.needed_by ? <Text style={styles.itemMeta}>Needed by {req.needed_by}</Text> : null}
                  </View>
                  <StatusChip status={req.status === 'ordered' ? 'in_progress' : (req.status as any)} label={req.status === 'ordered' ? 'Ordered' : undefined} size="sm" />
                </View>
                {req.notes ? <Text style={styles.notes}>{req.notes}</Text> : null}
                {req.status === 'pending' && (
                  <View style={styles.actions}>
                    <ActionBtn label="Reject" color={colors.error} icon="close" onPress={() => onDecide(req, 'rejected')} />
                    <ActionBtn label="Approve" color={colors.success} icon="checkmark" onPress={() => onDecide(req, 'approved')} filled />
                  </View>
                )}
                {req.status === 'approved' && (
                  <View style={styles.actions}>
                    <ActionBtn label="Mark Ordered" color={colors.primary} icon="cart" onPress={() => onDecide(req, 'ordered')} filled />
                  </View>
                )}
                {req.status === 'ordered' && (
                  <View style={styles.actions}>
                    <ActionBtn label="Create Delivery" color={colors.primary} icon="car" onPress={() => onCreateDelivery(req)} filled />
                  </View>
                )}
              </Card>
            ))}
          </>
        )}

        {tab === 'stock' && (
          <>
            {stock.length === 0 && (
              <EmptyState icon="archive-outline" text="No stock recorded yet. Tap + to add materials per site." />
            )}
            {stock.map((m) => (
              <TouchableOpacity key={m.id} onPress={() => openStockModal(m)}>
                <Card style={styles.itemCard}>
                  <View style={styles.itemHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{m.name}</Text>
                      <Text style={styles.itemMeta}>
                        {m.spec ? `${m.spec} • ` : ''}{projectName.get(m.project_id) || 'Site'}
                      </Text>
                    </View>
                    <View style={styles.qtyBox}>
                      <Text style={styles.qtyNum}>{m.stock_qty ?? 0}</Text>
                      <Text style={styles.qtyUnit}>{m.unit || 'units'}</Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
            <Button title="Add Stock Material" onPress={() => openStockModal()} variant="secondary" fullWidth />
          </>
        )}

        {tab === 'deliveries' && (
          <>
            {deliveries.length === 0 && (
              <EmptyState icon="car-outline" text="No deliveries yet. Create one from an ordered request." />
            )}
            {deliveries.map((d) => (
              <AdminDeliveryCard
                key={d.id}
                delivery={d}
                siteName={projectName.get((d as any).project_id) || 'Site'}
                onMarkDelivered={() => markDelivered.mutate({ id: d.id })}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* ── Add/Edit stock modal ── */}
      <Modal visible={stockModal} transparent animationType="slide" onRequestClose={() => setStockModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Material' : 'Add Stock Material'}</Text>
              <TouchableOpacity onPress={() => setStockModal(false)}>
                <Ionicons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Input label="Material Name *" value={mName} onChangeText={setMName} placeholder="e.g. Aluminium Section AA6063" />
              <View style={styles.gap} />
              <Input label="Specification" value={mSpec} onChangeText={setMSpec} placeholder="Grade / size / brand" />
              <View style={styles.gap} />
              <View style={styles.inline}>
                <View style={{ flex: 1 }}>
                  <Input label="Quantity" value={mQty} onChangeText={setMQty} keyboardType="decimal-pad" placeholder="0" />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Unit" value={mUnit} onChangeText={setMUnit} placeholder="nos / kg / m" />
                </View>
              </View>
              <Text style={styles.fieldLabel}>Site *</Text>
              <View style={styles.chips}>
                {(projects || []).map((p: any) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.chip, mProject === p.id && styles.chipActive]}
                    onPress={() => setMProject(p.id)}
                  >
                    <Text style={[styles.chipText, mProject === p.id && styles.chipTextActive]}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Button title={editing ? 'Save Changes' : 'Add Material'} onPress={saveStock} loading={upsert.isPending} fullWidth />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function AdminDeliveryCard({
  delivery,
  siteName,
  onMarkDelivered,
}: {
  delivery: Delivery;
  siteName: string;
  onMarkDelivered: () => void;
}) {
  const { data: photoUrls } = useDeliveryPhotoUrls(delivery.photos || []);

  return (
    <Card style={styles.itemCard}>
      <View style={styles.itemHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle}>{delivery.delivery_code || 'Delivery'}</Text>
          <Text style={styles.itemMeta}>
            {siteName}
            {delivery.delivered_at ? ` • ${new Date(delivery.delivered_at).toLocaleDateString('en-IN')}` : ''}
          </Text>
        </View>
        <StatusChip
          status={delivery.status === 'delivered' ? 'completed' : 'in_progress'}
          label={delivery.status === 'delivered' ? 'Delivered' : 'In Transit'}
          size="sm"
        />
      </View>

      {/* Challan / material photos captured by the supervisor on site */}
      {delivery.photos && delivery.photos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deliveryPhotoRow} contentContainerStyle={{ gap: spacing.sm }}>
          {delivery.photos.map((path, i) => (
            photoUrls?.[path] ? (
              <Image key={i} source={{ uri: photoUrls[path] }} style={styles.deliveryPhotoThumb} />
            ) : (
              <View key={i} style={[styles.deliveryPhotoThumb, styles.deliveryPhotoLoading]}>
                <Ionicons name="image" size={18} color={colors.neutral[400]} />
              </View>
            )
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.noDeliveryPhotoText}>No challan photos uploaded yet</Text>
      )}

      {delivery.status !== 'delivered' && (
        <View style={styles.actions}>
          <ActionBtn label="Mark Delivered" color={colors.success} icon="checkmark-done" onPress={onMarkDelivered} filled />
        </View>
      )}
    </Card>
  );
}

function FlowStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.flowStat}>
      <Text style={[styles.flowNum, { color }]}>{value}</Text>
      <Text style={styles.flowLabel}>{label}</Text>
    </View>
  );
}

function ActionBtn({ label, color, icon, onPress, filled }: { label: string; color: string; icon: string; onPress: () => void; filled?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, filled ? { backgroundColor: color } : { borderWidth: 1, borderColor: color }]}
      onPress={onPress}
    >
      <Ionicons name={icon as any} size={16} color={filled ? colors.white : color} />
      <Text style={[styles.actionText, { color: filled ? colors.white : color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon as any} size={40} color={colors.neutral[300]} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  addBtn: { width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' },
  title: { ...typography.h4, color: colors.ink },
  flowRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral[100],
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.md,
  },
  flowStat: { alignItems: 'center', flex: 1 },
  flowNum: { ...typography.h4 },
  flowLabel: { ...typography.caption, color: colors.neutral[400], fontSize: 10 },
  itemCard: { padding: spacing.md, marginBottom: spacing.sm },
  deliveryPhotoRow: { marginTop: spacing.sm, flexGrow: 0 },
  deliveryPhotoThumb: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.neutral[100] },
  deliveryPhotoLoading: { alignItems: 'center', justifyContent: 'center' },
  noDeliveryPhotoText: { ...typography.caption, color: colors.neutral[300], marginTop: spacing.sm },
  itemHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  itemTitle: { ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },
  itemMeta: { ...typography.caption, color: colors.neutral[400], marginTop: 2 },
  notes: { ...typography.bodySmall, color: colors.neutral[600], marginTop: spacing.sm, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, justifyContent: 'flex-end' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md,
  },
  actionText: { ...typography.bodySmall, fontFamily: fontFamily.semiBold },
  qtyBox: { alignItems: 'center', backgroundColor: colors.background, borderRadius: radius.md, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  qtyNum: { ...typography.h4, color: colors.primary },
  qtyUnit: { ...typography.caption, color: colors.neutral[400], fontSize: 10 },
  empty: { alignItems: 'center', paddingVertical: spacing.xl * 2, gap: spacing.sm, paddingHorizontal: spacing.lg },
  emptyText: { ...typography.bodySmall, color: colors.neutral[400], textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(26,22,17,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: '85%' },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  modalTitle: { ...typography.h4, color: colors.ink },
  gap: { height: spacing.md },
  inline: { flexDirection: 'row', gap: spacing.md },
  fieldLabel: { ...typography.caption, fontFamily: fontFamily.medium, color: colors.neutral[600], marginTop: spacing.md, marginBottom: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral[200], backgroundColor: colors.white },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  chipText: { ...typography.bodySmall, color: colors.neutral[600] },
  chipTextActive: { color: colors.primary, fontFamily: fontFamily.semiBold },
});
