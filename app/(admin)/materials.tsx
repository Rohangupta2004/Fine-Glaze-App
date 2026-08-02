import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, RefreshControl, Image, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

import { StatusChip, DatePickerField } from '../../src/components';
import {
  useAllMaterials, useMaterialRequests, useDeliveries,
  useUpsertMaterial, useDecideMaterialRequest, useCreateDelivery, useMarkDelivered,
  useDeliveryPhotoUrls, useSubmitMaterialRequest,
} from '../../src/hooks/useMaterials';
import { useProjects } from '../../src/hooks/useProjects';
import { useAuthStore } from '../../src/stores/authStore';
import { colors } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import type { Material, MaterialRequest, Delivery } from '../../src/types';
import { showAlert } from '../../src/utils/alert';

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
  const submitReq = useSubmitMaterialRequest();

  const projectName = useMemo(() => new Map((projects || []).map((p: any) => [p.id, p.name])), [projects]);

  // Stock modal state
  const [stockModal, setStockModal] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [mName, setMName] = useState('');
  const [mSpec, setMSpec] = useState('');
  const [mUnit, setMUnit] = useState('');
  const [mQty, setMQty] = useState('');
  const [mProject, setMProject] = useState<string | null>(null);

  // Request modal state
  const [reqModal, setReqModal] = useState(false);
  const [reqName, setReqName] = useState('');
  const [reqSpec, setReqSpec] = useState('');
  const [reqQty, setReqQty] = useState('');
  const [reqNeededBy, setReqNeededBy] = useState('');
  const [reqNotes, setReqNotes] = useState('');
  const [reqProject, setReqProject] = useState<string | null>(null);

  const handleAddPress = () => {
    if (tab === 'requests') {
      setReqName('');
      setReqSpec('');
      setReqQty('');
      setReqNeededBy('');
      setReqNotes('');
      setReqProject(projects[0]?.id || null);
      setReqModal(true);
    } else {
      openStockModal();
    }
  };

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
      showAlert('Missing Info', 'Material name and site are required.');
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
      rStock();
      showAlert('Success', editing ? 'Stock updated' : 'Stock item added');
    } catch (e: any) {
      showAlert('Could Not Save', e?.message || 'Please try again.');
    }
  };

  const saveRequest = async () => {
    if (!reqName.trim() || !reqQty || !reqProject || !profile) {
      showAlert('Missing Info', 'Material name, quantity, and site are required.');
      return;
    }
    const q = parseFloat(reqQty);
    if (isNaN(q) || q <= 0) {
      showAlert('Invalid Quantity', 'Please enter a valid quantity.');
      return;
    }
    try {
      await submitReq.mutateAsync({
        projectId: reqProject,
        requestedBy: profile.id,
        materialName: reqName.trim(),
        qty: q,
        spec: reqSpec.trim() || undefined,
        neededBy: reqNeededBy.trim() || undefined,
        notes: reqNotes.trim() || undefined,
      });
      setReqModal(false);
      rReq();
      showAlert('Success', 'Material request created successfully.');
    } catch (e: any) {
      showAlert('Error', e?.message || 'Could not submit request.');
    }
  };

  const onDecide = (req: MaterialRequest, status: 'approved' | 'rejected' | 'ordered') => {
    if (!profile) return;
    decide.mutate(
      { id: req.id, status, decidedBy: profile.id },
      { onError: (e: any) => showAlert('Failed', e?.message || 'Try again.') }
    );
  };

  const onCreateDelivery = (req: MaterialRequest) => {
    createDelivery.mutate(
      { material_request_id: req.id, project_id: req.project_id },
      {
        onSuccess: () => { setTab('deliveries'); rDel(); },
        onError: (e: any) => showAlert('Failed', e?.message || 'Try again.'),
      }
    );
  };

  const pending = requests.filter((r) => r.status === 'pending');
  const approved = requests.filter((r) => r.status === 'approved');
  const ordered = requests.filter((r) => r.status === 'ordered');
  const delivered = deliveries.filter((d) => d.status === 'delivered');

  return (
    <View style={styles.container}>
      {/* Light Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back-sharp" size={20} color="#1E1815" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.headerLabel}>Inventory & Logistics</Text>
            <Text style={styles.headerTitle}>Materials</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={handleAddPress} activeOpacity={0.8}>
            <LinearGradient colors={['#5B4122', '#8B6840']} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', borderRadius: 22 }]}>
              <Ionicons name="add-sharp" size={22} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Pipeline Strip */}
        <View style={styles.pipelineStrip}>
          <FlowStat label="Pending" value={pending.length} color="#F59E0B" />
          <Ionicons name="chevron-forward-sharp" size={14} color={colors.neutral[400]} />
          <FlowStat label="Approved" value={approved.length} color="#3B82F6" />
          <Ionicons name="chevron-forward-sharp" size={14} color={colors.neutral[400]} />
          <FlowStat label="Ordered" value={ordered.length} color="#8B5CF6" />
          <Ionicons name="chevron-forward-sharp" size={14} color={colors.neutral[400]} />
          <FlowStat label="Delivered" value={delivered.length} color="#10B981" />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <View style={styles.tabBar}>
          <TabBtn label={`Requests (${pending.length})`} active={tab === 'requests'} onPress={() => setTab('requests')} />
          <TabBtn label="Stock" active={tab === 'stock'} onPress={() => setTab('stock')} />
          <TabBtn label="Deliveries" active={tab === 'deliveries'} onPress={() => setTab('deliveries')} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={f1 || f2 || f3} onRefresh={() => { rReq(); rStock(); rDel(); }} tintColor="#695030" />}
      >
        {tab === 'requests' && (
          <>
            {requests.length === 0 && <EmptyState icon="cube-sharp" title="No requests" text="Tap + to create a site material request." />}
            {requests.map((req) => (
              <View key={req.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <LinearGradient colors={['#5B4122', '#8B6840']} style={styles.cardIconWrap}>
                    <Ionicons name="cube-sharp" size={20} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{req.material_name}</Text>
                    <Text style={styles.cardMeta}>
                      {req.qty} {req.spec ? `• ${req.spec}` : ''} • {projectName.get(req.project_id) || 'Site'}
                    </Text>
                  </View>
                  <StatusChip status={req.status === 'ordered' ? 'in_progress' : (req.status as any)} label={req.status === 'ordered' ? 'Ordered' : undefined} size="sm" />
                </View>
                {req.needed_by && (
                  <View style={styles.dateRow}>
                    <Ionicons name="calendar-outline" size={12} color={colors.neutral[500]} />
                    <Text style={styles.dateText}>Needed by: {req.needed_by}</Text>
                  </View>
                )}
                {req.notes ? <Text style={styles.notes}>{req.notes}</Text> : null}
                
                {req.status === 'pending' && (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionBtnOutline} onPress={() => onDecide(req, 'rejected')}>
                      <Text style={styles.actionOutlineText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtnFilled} onPress={() => onDecide(req, 'approved')}>
                      <Text style={styles.actionFilledText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {req.status === 'approved' && (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={[styles.actionBtnFilled, { backgroundColor: '#3B82F6' }]} onPress={() => onDecide(req, 'ordered')}>
                      <Ionicons name="cart" size={14} color="#fff" />
                      <Text style={styles.actionFilledText}>Mark Ordered</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {req.status === 'ordered' && (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={[styles.actionBtnFilled, { backgroundColor: '#8B5CF6' }]} onPress={() => onCreateDelivery(req)}>
                      <Ionicons name="car" size={14} color="#fff" />
                      <Text style={styles.actionFilledText}>Create Delivery</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {tab === 'stock' && (
          <>
            {stock.length === 0 && <EmptyState icon="archive-outline" title="No stock" text="Tap + to add materials per site." />}
            {stock.map((m) => (
              <TouchableOpacity key={m.id} activeOpacity={0.8} onPress={() => openStockModal(m)}>
                <View style={styles.card}>
                  <View style={styles.cardHead}>
                    <View style={styles.cardIconWrap}>
                      <Ionicons name="server-outline" size={20} color="#695030" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{m.name}</Text>
                      <Text style={styles.cardMeta}>{m.spec ? `${m.spec} • ` : ''}{projectName.get(m.project_id) || 'Site'}</Text>
                    </View>
                    <View style={styles.qtyBox}>
                      <Text style={styles.qtyNum}>{m.stock_qty ?? 0}</Text>
                      <Text style={styles.qtyUnit}>{m.unit || 'units'}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {tab === 'deliveries' && (
          <>
            {deliveries.length === 0 && <EmptyState icon="car-outline" title="No deliveries" text="Create one from an ordered request." />}
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

      {/* Stock Modal */}
      <Modal visible={stockModal} transparent animationType="slide" onRequestClose={() => setStockModal(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setStockModal(false)} />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.xl }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{editing ? 'Edit Stock Item' : 'Add Stock Item'}</Text>

            <ScrollView contentContainerStyle={{ gap: spacing.xs }} style={{ maxHeight: 400 }}>
              <Text style={styles.inputLabel}>Site / Project *</Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={mProject}
                  onValueChange={(val) => setMProject(val)}
                  mode="dropdown"
                  dropdownIconColor="#4A3820"
                  style={{ height: 50, color: '#1E1815', backgroundColor: '#FFFFFF' }}
                >
                  {projects.map((p: any) => (
                    <Picker.Item key={p.id} label={p.name} value={p.id} color="#1E1815" style={{ backgroundColor: '#FFFFFF' }} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.inputLabel}>Material Name *</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Aluminium Section AA6063"
                  placeholderTextColor="#94A3B8"
                  value={mName}
                  onChangeText={setMName}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Quantity *</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 100"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={mQty}
                      onChangeText={setMQty}
                    />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Unit</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. sqm / pcs"
                      placeholderTextColor="#94A3B8"
                      value={mUnit}
                      onChangeText={setMUnit}
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.inputLabel}>Specification / Grade</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Grade A6 / Bronze Anodized"
                  placeholderTextColor="#94A3B8"
                  value={mSpec}
                  onChangeText={setMSpec}
                />
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.saveBtn} activeOpacity={0.8} onPress={saveStock} disabled={upsert.isPending}>
              <View style={styles.saveBtnBg}>
                <Text style={styles.saveBtnText}>{editing ? 'Save Changes' : 'Add Stock Item'}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Material Request Modal */}
      <Modal visible={reqModal} transparent animationType="slide" onRequestClose={() => setReqModal(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setReqModal(false)} />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.xl }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>New Material Request</Text>

            <ScrollView contentContainerStyle={{ gap: spacing.xs }} style={{ maxHeight: 420 }}>
              <Text style={styles.inputLabel}>Site / Project *</Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={reqProject}
                  onValueChange={(val) => setReqProject(val)}
                  mode="dropdown"
                  dropdownIconColor="#4A3820"
                  style={{ height: 50, color: '#1E1815', backgroundColor: '#FFFFFF' }}
                >
                  {projects.map((p: any) => (
                    <Picker.Item key={p.id} label={p.name} value={p.id} color="#1E1815" style={{ backgroundColor: '#FFFFFF' }} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.inputLabel}>Material Name *</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Structural Silicon Sealant / Brackets"
                  placeholderTextColor="#94A3B8"
                  value={reqName}
                  onChangeText={setReqName}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Quantity *</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 50"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={reqQty}
                      onChangeText={setReqQty}
                    />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Specification</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Grade 1"
                      placeholderTextColor="#94A3B8"
                      value={reqSpec}
                      onChangeText={setReqSpec}
                    />
                  </View>
                </View>
              </View>

              <DatePickerField
                label="Needed By Date"
                value={reqNeededBy}
                onChange={setReqNeededBy}
                placeholder="Select date (e.g. YYYY-MM-DD)"
              />

              <Text style={styles.inputLabel}>Notes / Delivery Location</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Deliver to Tower A 5th Floor"
                  placeholderTextColor="#94A3B8"
                  value={reqNotes}
                  onChangeText={setReqNotes}
                />
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.saveBtn} activeOpacity={0.8} onPress={saveRequest} disabled={submitReq.isPending}>
              <View style={styles.saveBtnBg}>
                <Text style={styles.saveBtnText}>Submit Material Request</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function AdminDeliveryCard({ delivery, siteName, onMarkDelivered }: any) {
  const { data: photoUrls } = useDeliveryPhotoUrls(delivery.photos || []);
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.cardIconWrap}>
          <Ionicons name="car" size={20} color="#695030" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{delivery.delivery_code || 'Delivery'}</Text>
          <Text style={styles.cardMeta}>{siteName}{delivery.delivered_at ? ` • ${new Date(delivery.delivered_at).toLocaleDateString('en-IN')}` : ''}</Text>
        </View>
        <StatusChip status={delivery.status === 'delivered' ? 'completed' : 'in_progress'} label={delivery.status === 'delivered' ? 'Delivered' : 'In Transit'} size="sm" />
      </View>
      
      {delivery.photos && delivery.photos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll} contentContainerStyle={{ gap: spacing.sm }}>
          {delivery.photos.map((path: string, i: number) => (
            photoUrls?.[path] ? (
              <Image key={i} source={{ uri: photoUrls[path] }} style={styles.photoThumb} />
            ) : (
              <View key={i} style={[styles.photoThumb, styles.photoLoading]}>
                <Ionicons name="image" size={20} color={colors.neutral[300]} />
              </View>
            )
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.noPhotoText}>No challan photos</Text>
      )}

      {delivery.status !== 'delivered' && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtnFilled, { backgroundColor: '#10B981' }]} onPress={onMarkDelivered}>
            <Ionicons name="checkmark-done" size={16} color="#fff" />
            <Text style={styles.actionFilledText}>Mark Delivered</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function FlowStat({ label, value, color }: any) {
  return (
    <View style={styles.flowStat}>
      <Text style={[styles.flowNum, { color }]}>{value}</Text>
      <Text style={styles.flowLabel}>{label}</Text>
    </View>
  );
}

function TabBtn({ label, active, onPress }: any) {
  return (
    <TouchableOpacity style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function EmptyState({ icon, title, text }: any) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconBg}>
        <Ionicons name={icon} size={32} color="#695030" />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },

  // Header
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 4px 12px rgba(0,0,0,0.05)' } as any,
  headerLabel: { fontSize: 13, color: '#666', fontFamily: fontFamily.medium, letterSpacing: 0.2 },
  headerTitle: { fontSize: 32, color: '#1E1815', fontFamily: fontFamily.bold, letterSpacing: -0.5, marginTop: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 4px 12px rgba(0,0,0,0.05)' } as any,

  pipelineStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 16, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: 'rgba(105,80,48,0.1)', boxShadow: '0px 4px 12px rgba(0,0,0,0.03)' } as any,
  flowStat: { alignItems: 'center' },
  flowNum: { fontSize: 18, fontFamily: fontFamily.bold },
  flowLabel: { fontSize: 9, color: '#666', fontFamily: fontFamily.semiBold, marginTop: 2, textTransform: 'uppercase' },

  // Tabs
  tabContainer: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  tabBar: { flexDirection: 'row', backgroundColor: '#F9F6F0', borderRadius: 16, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  tabBtnActive: { backgroundColor: '#fff', boxShadow: '0px 2px 8px rgba(0,0,0,0.05)' } as any,
  tabBtnText: { fontSize: 13, fontFamily: fontFamily.medium, color: colors.neutral[500] },
  tabBtnTextActive: { color: '#695030', fontFamily: fontFamily.bold },

  // List
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100, gap: spacing.md, paddingTop: spacing.md },
  
  // Card
  card: { backgroundColor: '#fff', borderRadius: 20, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(105,80,48,0.08)', boxShadow: '0px 4px 16px rgba(0,0,0,0.03)' } as any,
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F9F6F0', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontFamily: fontFamily.bold, color: '#1E1815' },
  cardMeta: { fontSize: 12, color: colors.neutral[500], marginTop: 2, fontFamily: fontFamily.medium },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, marginLeft: 60 },
  dateText: { fontSize: 12, color: colors.neutral[600], fontFamily: fontFamily.medium },
  notes: { fontSize: 13, color: colors.neutral[600], marginTop: spacing.md, fontStyle: 'italic', backgroundColor: '#F9FAFB', padding: spacing.md, borderRadius: 12 },
  
  qtyBox: { alignItems: 'center', backgroundColor: '#F9F6F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  qtyNum: { fontSize: 16, fontFamily: fontFamily.bold, color: '#695030' },
  qtyUnit: { fontSize: 10, color: colors.neutral[500], fontFamily: fontFamily.medium },

  // Actions
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.md },
  actionBtnOutline: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.error + '30', backgroundColor: '#FEF2F2' },
  actionOutlineText: { fontSize: 13, fontFamily: fontFamily.semiBold, color: colors.error },
  actionBtnFilled: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 12, backgroundColor: '#10B981' },
  actionFilledText: { fontSize: 13, fontFamily: fontFamily.semiBold, color: '#fff' },

  // Delivery
  photoScroll: { marginTop: spacing.md },
  photoThumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: colors.neutral[100] },
  photoLoading: { alignItems: 'center', justifyContent: 'center' },
  noPhotoText: { fontSize: 12, color: colors.neutral[400], marginTop: spacing.md, fontStyle: 'italic' },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 60, gap: spacing.md },
  emptyIconBg: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(105,80,48,0.05)', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontFamily: fontFamily.bold, color: '#1E1815' },
  emptyText: { fontSize: 13, color: colors.neutral[400], textAlign: 'center' },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(20,16,12,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.xl },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { fontSize: 20, fontFamily: fontFamily.bold, color: '#1E1815', marginBottom: spacing.md },
  inputLabel: { fontSize: 12, fontFamily: fontFamily.bold, color: colors.neutral[500], marginTop: spacing.xs, marginBottom: 4 },
  inputWrap: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: colors.neutral[200], borderRadius: 14, paddingHorizontal: spacing.md, paddingVertical: 8 },
  pickerWrap: { backgroundColor: '#F8FAF9', borderRadius: 14, overflow: 'hidden', borderWidth: 0 },
  textInput: { fontSize: 14, fontFamily: fontFamily.medium, color: '#1E1815', padding: 0 },
  saveBtn: { marginTop: spacing.lg, borderRadius: 16, overflow: 'hidden' },
  saveBtnBg: { backgroundColor: '#695030', paddingVertical: spacing.md, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontFamily: fontFamily.bold, color: '#fff' },
});
