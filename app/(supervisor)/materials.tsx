import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

import { Card, Button, Input } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import {
  useProjectMaterials,
  useMaterialRequests,
  useDeliveries,
  useSubmitMaterialRequest,
  useAddDeliveryPhotos,
  useDeliveryPhotoUrls,
} from '../../src/hooks/useMaterials';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius, TOUCH_TARGET } from '../../src/theme/spacing';
import type { Delivery } from '../../src/types';
import { showAlert } from '../../src/utils/alert';

type Tab = 'stock' | 'requests' | 'deliveries';
type RequestView = 'list' | 'new';

const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  pending: { color: colors.warning, bg: colors.warningBg },
  approved: { color: colors.success, bg: colors.successBg },
  rejected: { color: colors.error, bg: colors.errorBg },
  ordered: { color: colors.info, bg: colors.infoBg },
};

const DELIVERY_STATUS: Record<string, { color: string; bg: string; label: string }> = {
  in_transit: { color: colors.info, bg: colors.infoBg, label: 'In Transit' },
  delivered: { color: colors.success, bg: colors.successBg, label: 'Delivered' },
};

export default function SupervisorMaterialsScreen() {
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const { data: projects } = useProjects();
  const activeProject = (projects || [])[0];

  const { data: materials, refetch: refetchMaterials, isRefetching: r1 } = useProjectMaterials(activeProject?.id);
  const { data: requests, refetch: refetchRequests, isRefetching: r2 } = useMaterialRequests(activeProject?.id);
  const { data: deliveries, refetch: refetchDeliveries, isRefetching: r3 } = useDeliveries();
  const submitRequest = useSubmitMaterialRequest();

  const [tab, setTab] = useState<Tab>('requests');
  const [requestView, setRequestView] = useState<RequestView>('list');

  // Request form state
  const [materialName, setMaterialName] = useState('');
  const [spec, setSpec] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');

  // Accept decimal quantities (e.g. 12.5 running metres, 2.5 litres of sealant).
  // A trailing "." while typing is allowed so the field doesn't reject input mid-entry.
  const qtyValue = qty.trim() === '' || qty.trim() === '.' ? NaN : parseFloat(qty);
  const qtyIsValid = !isNaN(qtyValue) && qtyValue > 0;

  const handleQtyChange = (val: string) => {
    // Only allow digits and a single decimal point, matching the DB's NUMERIC(10,2) column.
    const cleaned = val.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
    setQty(normalized);
  };

  const handleSubmitRequest = async () => {
    if (!materialName.trim() || !qtyIsValid || !profile?.id || !activeProject?.id) {
      showAlert('Check quantity', 'Enter a material name and a quantity greater than 0 (decimals like 2.5 are allowed).');
      return;
    }
    try {
      await submitRequest.mutateAsync({
        projectId: activeProject.id,
        requestedBy: profile.id,
        materialName: materialName.trim(),
        spec: [spec.trim(), unit.trim() ? `Unit: ${unit.trim()}` : ''].filter(Boolean).join(' · ') || undefined,
        qty: Math.round(qtyValue * 100) / 100,
        notes: notes.trim() || undefined,
      });
      showAlert('Submitted', 'Material request sent for approval.');
      setMaterialName(''); setSpec(''); setQty(''); setUnit(''); setNotes('');
      setRequestView('list');
    } catch (e: any) {
      showAlert('Error', e?.message || 'Failed to submit request');
    }
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'requests', label: 'Requests', icon: 'clipboard-outline' },
    { key: 'stock', label: 'Site Stock', icon: 'archive-outline' },
    { key: 'deliveries', label: 'Deliveries', icon: 'car-outline' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#695030', '#7E6144', '#918050']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerWrap, { paddingTop: insets.top }]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Materials</Text>
          {tab === 'requests' && requestView === 'list' && (
            <TouchableOpacity
              onPress={() => setRequestView('new')}
              hitSlop={8}
              style={styles.addBtn}
            >
              <Ionicons name="add-circle" size={30} color="#fff" />
            </TouchableOpacity>
          )}
          {tab === 'requests' && requestView === 'new' && (
            <TouchableOpacity
              onPress={() => setRequestView('list')}
              hitSlop={8}
              style={styles.addBtn}
            >
              <Ionicons name="list-outline" size={26} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => {
              setTab(t.key);
              if (t.key !== 'requests') setRequestView('list');
            }}
            hitSlop={4}
          >
            <Ionicons
              name={t.icon as any}
              size={18}
              color={tab === t.key ? colors.primary : colors.neutral[400]}
            />
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Site Stock Tab ── */}
      {tab === 'stock' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={r1} onRefresh={refetchMaterials} tintColor={colors.primary} />
          }
        >
          {(materials || []).map((m) => (
            <Card key={m.id} style={styles.itemCard} padding={spacing.md}>
              <View style={styles.itemRow}>
                <View style={[styles.iconBox, { backgroundColor: colors.infoBg }]}>
                  <Ionicons name="archive" size={20} color={colors.info} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{m.name}</Text>
                  {m.spec && <Text style={styles.itemMeta}>{m.spec}</Text>}
                </View>
                <View style={styles.qtyBadge}>
                  <Text style={styles.qtyNum}>{m.stock_qty}</Text>
                  <Text style={styles.qtyUnit}>{m.unit || 'units'}</Text>
                </View>
              </View>
            </Card>
          ))}
          {(!materials || materials.length === 0) && (
            <View style={styles.empty}>
              <Ionicons name="archive-outline" size={48} color={colors.neutral[300]} />
              <Text style={styles.emptyText}>No stock items recorded</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Requests Tab ── */}
      {tab === 'requests' && requestView === 'new' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.subtitle}>New Material Request</Text>
          <Input
            label="Material Name *"
            placeholder="e.g. ACP Panel 4mm"
            value={materialName}
            onChangeText={setMaterialName}
          />
          <View style={{ height: spacing.md }} />
          <Input
            label="Specification"
            placeholder="e.g. Silver metallic, FR grade"
            value={spec}
            onChangeText={setSpec}
          />
          <View style={{ height: spacing.md }} />
          <View style={styles.qtyUnitRow}>
            <View style={{ flex: 1 }}>
              <Input
                label="Quantity *"
                placeholder="e.g. 12.5"
                value={qty}
                onChangeText={handleQtyChange}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Unit"
                placeholder="e.g. nos, kg, sq.m, litres"
                value={unit}
                onChangeText={setUnit}
              />
            </View>
          </View>
          {qty.trim() !== '' && !qtyIsValid && (
            <Text style={styles.qtyError}>Enter a quantity greater than 0</Text>
          )}
          <View style={{ height: spacing.md }} />
          <Input
            label="Notes (optional)"
            placeholder="Additional notes"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          <View style={{ height: spacing.xl }} />
          <Button
            title="Submit Request"
            onPress={handleSubmitRequest}
            loading={submitRequest.isPending}
            disabled={!materialName.trim() || !qtyIsValid}
          />
        </ScrollView>
      )}

      {tab === 'requests' && requestView === 'list' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={r2} onRefresh={refetchRequests} tintColor={colors.primary} />
          }
        >
          <Button title="+  Request Material" onPress={() => setRequestView('new')} fullWidth />
          <View style={{ height: spacing.md }} />
          {(requests || []).map((r) => {
            const sc = STATUS_COLOR[r.status] || STATUS_COLOR.pending;
            return (
              <Card key={r.id} style={styles.itemCard} padding={spacing.md}>
                <View style={styles.itemRow}>
                  <View style={[styles.iconBox, { backgroundColor: sc.bg }]}>
                    <Ionicons name="cube" size={20} color={sc.color} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{r.material_name}</Text>
                    <Text style={styles.itemMeta}>
                      Qty: {r.qty}{r.spec ? ` · ${r.spec}` : ''}
                      {r.needed_by
                        ? ` · By ${new Date(r.needed_by).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                        : ''}
                    </Text>
                    {r.notes && <Text style={styles.itemNotes}>{r.notes}</Text>}
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
              <Button title="Request Material" onPress={() => setRequestView('new')} variant="secondary" />
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Deliveries Tab ── */}
      {tab === 'deliveries' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={r3} onRefresh={refetchDeliveries} tintColor={colors.primary} />
          }
        >
          {(deliveries || []).map((d) => (
            <DeliveryCard
              key={d.id}
              delivery={d}
              materialName={(requests || []).find((r) => r.id === d.material_request_id)?.material_name}
            />
          ))}
          {(!deliveries || deliveries.length === 0) && (
            <View style={styles.empty}>
              <Ionicons name="car-outline" size={48} color={colors.neutral[300]} />
              <Text style={styles.emptyText}>No deliveries yet</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function DeliveryCard({ delivery, materialName }: { delivery: Delivery; materialName?: string }) {
  const meta = DELIVERY_STATUS[delivery.status] || DELIVERY_STATUS.in_transit;
  const addPhotos = useAddDeliveryPhotos();
  const { data: photoUrls } = useDeliveryPhotoUrls(delivery.photos || []);

  const handleAddPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission needed', 'Photo library access is required to attach a challan photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 6,
    });
    if (result.canceled || !result.assets?.length) return;
    try {
      await addPhotos.mutateAsync({
        deliveryId: delivery.id,
        localUris: result.assets.map((a) => a.uri),
      });
    } catch (e: any) {
      showAlert('Upload failed', e?.message || 'Could not upload the photo. Please try again.');
    }
  };

  return (
    <Card style={styles.itemCard} padding={spacing.md}>
      <View style={styles.itemRow}>
        <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
          <Ionicons name="car" size={20} color={meta.color} />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{materialName || 'Delivery'}</Text>
          {delivery.delivery_code && (
            <Text style={styles.itemMeta}>Code: {delivery.delivery_code}</Text>
          )}
          {delivery.delivered_at && (
            <Text style={styles.itemMeta}>
              Delivered: {new Date(delivery.delivered_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          )}

          {/* Challan / material / truck photos */}
          {delivery.photos && delivery.photos.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photoRow}
              contentContainerStyle={{ gap: spacing.sm }}
            >
              {delivery.photos.map((path, i) => (
                photoUrls?.[path] ? (
                  <Image key={i} source={{ uri: photoUrls[path] }} style={styles.photoThumb} />
                ) : (
                  <View key={i} style={styles.photoPlaceholder}>
                    <Ionicons name="image" size={24} color={colors.neutral[400]} />
                  </View>
                )
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noPhotoRow}>
              <Ionicons name="camera-outline" size={14} color={colors.neutral[300]} />
              <Text style={styles.noPhotoText}>No delivery challan photos yet</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.addPhotoBtn}
            onPress={handleAddPhotos}
            disabled={addPhotos.isPending}
            accessibilityLabel="Add challan photo"
          >
            <Ionicons name="camera" size={16} color={colors.primary} />
            <Text style={styles.addPhotoText}>
              {addPhotos.isPending ? 'Uploading…' : 'Add Challan Photo'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },
  headerWrap: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: { ...typography.h4, color: '#fff' },
  addBtn: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'flex-end', justifyContent: 'center' },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabLabel: { ...typography.bodySmall, fontFamily: fontFamily.semiBold, color: colors.neutral[400] },
  tabLabelActive: { color: colors.primary },
  list: { padding: spacing.lg, paddingBottom: spacing['6xl'] },
  itemCard: { marginBottom: spacing.md, backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing.md },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemName: { ...typography.bodyMedium, fontFamily: fontFamily.bold, color: colors.ink },
  itemMeta: { ...typography.caption, color: colors.neutral[500], marginTop: 2 },
  qtyBadge: { alignItems: 'flex-end' },
  qtyNum: { ...typography.h5, color: colors.primary },
  qtyUnit: { ...typography.caption, color: colors.neutral[400] },
  empty: { alignItems: 'center', paddingVertical: spacing['5xl'], gap: spacing.md },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400] },
  form: { padding: spacing.lg, paddingBottom: spacing['6xl'] },
  formTitle: { ...typography.h5, color: colors.ink, marginBottom: spacing.sm },
  formSub: { ...typography.caption, color: colors.neutral[500], marginBottom: spacing.xl },
  field: { marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  reqCard: { marginBottom: spacing.md, backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing.md },
  reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  reqInfo: { flex: 1 },
  reqName: { ...typography.bodyMedium, fontFamily: fontFamily.bold, color: colors.ink },
  reqDate: { ...typography.caption, color: colors.neutral[400], marginTop: 2 },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full },
  statusText: { ...typography.caption, fontFamily: fontFamily.bold },
  reqMeta: { ...typography.bodySmall, color: colors.neutral[600], marginBottom: 4 },
  reqQty: { ...typography.caption, color: colors.neutral[500] },
  delCard: { marginBottom: spacing.md, backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing.md },
  delHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  delInfo: { flex: 1 },
  delChallan: { ...typography.bodyMedium, fontFamily: fontFamily.bold, color: colors.ink },
  delDate: { ...typography.caption, color: colors.neutral[400], marginTop: 2 },
  delDetails: { marginTop: spacing.sm },
  delRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 4 },
  delText: { ...typography.caption, color: colors.neutral[600] },
  photoGrid: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  photoThumb: { width: 60, height: 60, borderRadius: radius.sm, backgroundColor: colors.neutral[100] },
  camBtn: {
    width: 60, height: 60, borderRadius: radius.sm, backgroundColor: colors.neutral[100],
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed'
  },
  expandBtn: { alignItems: 'center', padding: spacing.sm, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
  expandText: { ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.primary },
  qtyUnitRow: { flexDirection: 'row', gap: spacing.md },
  qtyError: { ...typography.caption, color: colors.error, marginTop: spacing.xs },
  itemNotes: { ...typography.caption, color: colors.neutral[400], marginTop: 4, fontStyle: 'italic' },
  photoRow: { marginTop: spacing.sm, flexGrow: 0 },
  photoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  noPhotoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  addPhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  addPhotoText: { ...typography.caption, fontFamily: fontFamily.medium, color: colors.primary },
  noPhotoText: { ...typography.caption, color: colors.neutral[300] },
  subtitle: {
    ...typography.h6,
    color: colors.ink,
    marginBottom: spacing.md,
  },
});
