/**
 * Project Workspace — Admin / PM
 * Full-featured project hub with all PRD tabs.
 * Tabs: Overview · Tasks · Employees · Attendance · DPR · Photos · Documents
 *       Materials · Expenses · Payments · Communication · Timeline · Reports
 */
import React, { useState, useMemo } from 'react';
import { supabase } from '../../src/lib/supabase';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  Switch,
  Linking,
  Image,
  Share,
  TouchableWithoutFeedback,

} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';

import { Card, StatusChip, Avatar, Button, GradientCard, ProgressRing, SearchBar, Input, DatePickerField, ExcelTaskMISGrid, MISAnalyticsCharts, CadViewerModal, PdfViewerModal, XlsxViewerModal } from '../../src/components';


import { useProject, useUpdateProject } from '../../src/hooks/useProjects';
import { useEmployees } from '../../src/hooks/useEmployees';
import { useProjectDprs } from '../../src/hooks/useDpr';
import { useProjectPayments, useUpdatePayment, useCreatePayment, useDeletePayment } from '../../src/hooks/usePayments';
import { useMaterialRequests, useSubmitMaterialRequest } from '../../src/hooks/useMaterials';
import { useDocuments } from '../../src/hooks/useDocuments';
import { useDocumentUpload } from '../../src/hooks/useDocumentUpload';
import { useProjectAttendance, TeamAttendanceRow } from '../../src/hooks/useAttendance';
import { useProjectTasks, useUpdateTaskStatus, useCreateTask } from '../../src/hooks/useTasks';
import { useProjectExpenses, useAddExpense } from '../../src/hooks/useExpenses';
import { useMyConversations } from '../../src/hooks/useConversations';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjectBOQ, useUpdateBOQItemQuantity, useMaterialMaster } from '../../src/hooks/useBOQ';
import {
  useProjectVariations,
  useCreateVariation,
  useApproveVariation,
  useInventoryLedger,
  useCreateInventoryLedgerEntry,
  useSuppliers,
  useMaterialStock,
  useProjectEvents,
  useIssueMaterialRequest,
  ProjectEvent,
  usePurchaseOrders,
  useCreatePurchaseOrder,
  useGoodsReceivedNotes,
  useCreateGoodsReceivedNote,
} from '../../src/hooks/useContractorFeatures';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius, shadows } from '../../src/theme/spacing';
import type { Task, Dpr, DocumentRow, Expense, Payment, MaterialRequest, Attendance } from '../../src/types';
import { showAlert } from '../../src/utils/alert';

// ─ Tab Definition ─

const TABS = [
  'Overview', 'BOQ', 'Tasks', 'Employees', 'Attendance',
  'DPR', 'Photos', 'Documents', 'Materials', 'Variations', 'Procurement',
  'Expenses', 'Payments', 'Communication', 'Timeline', 'Reports',
] as const;
type Tab = typeof TABS[number];

// ─ Helpers ─

function fmt(date: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', opts || { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtShort(date: string | null) {
  return fmt(date, { day: 'numeric', month: 'short' });
}

function fmtINR(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// ─ Shared Sub-components ─

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={16} color={colors.neutral[400]} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function StatBox({ label, value, icon, color, onPress }: { label: string; value: string; icon: string; color: string; onPress?: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ flex: 1 }} disabled={!onPress}>
      <Card style={styles.statBox}>
        <Ionicons name={icon as any} size={20} color={color} />
        <Text style={[styles.statBoxValue, { color }]}>{value}</Text>
        <Text style={styles.statBoxLabel}>{label}</Text>
      </Card>
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

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
      {action && onAction && (
        <TouchableOpacity style={styles.sectionAction} onPress={onAction}>
          <Ionicons name="add-circle" size={20} color={colors.primary} />
          <Text style={styles.sectionActionText}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function StatusBadge({ status, map }: { status: string; map?: Record<string, { color: string; bg: string }> }) {
  const defaultMap: Record<string, { color: string; bg: string }> = {
    pending: { color: colors.warning, bg: colors.warningBg },
    submitted: { color: colors.info, bg: colors.infoBg },
    approved: { color: colors.success, bg: colors.successBg },
    rejected: { color: colors.error, bg: colors.errorBg },
    paid: { color: colors.success, bg: colors.successBg },
    done: { color: colors.success, bg: colors.successBg },
    blocked: { color: colors.error, bg: colors.errorBg },
    ordered: { color: colors.info, bg: colors.infoBg },
    present: { color: colors.success, bg: colors.successBg },
    absent: { color: colors.error, bg: colors.errorBg },
    leave: { color: colors.warning, bg: colors.warningBg },
    half_day: { color: colors.info, bg: colors.infoBg },
    draft: { color: colors.neutral[600], bg: colors.neutral[100] },
  };
  const m = map || defaultMap;
  const cfg = m[status] || { color: colors.neutral[600], bg: colors.neutral[100] };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{status.replace('_', ' ')}</Text>
    </View>
  );
}

// ─ Tab Sections ─

// BOQ Tab Component
function BOQTab({ projectId, projectName }: { projectId: string; projectName: string }) {
  const router = useRouter();
  const { data: boqItems = [], isLoading } = useProjectBOQ(projectId);
  const updateBOQQtyMutation = useUpdateBOQItemQuantity();
  const [search, setSearch] = useState('');

  if (isLoading) {
    return <ActivityIndicator color="#7E6144" style={{ marginTop: spacing.xl }} />;
  }

  const filtered = boqItems.filter(item =>
    item.item_name.toLowerCase().includes(search.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(search.toLowerCase()))
  );

  const totalCount = boqItems.length;
  const totalAmount = boqItems.reduce((acc, item) => acc + (item.amount || 0), 0);
  const completedAmount = boqItems.reduce((acc, item) => acc + ((item.completed_quantity || 0) * (item.rate || 0)), 0);
  const progressPct = totalAmount > 0 
    ? Math.round((completedAmount / totalAmount) * 100)
    : (totalCount > 0 
        ? Math.round(boqItems.reduce((acc, item) => acc + (item.completed_quantity / item.quantity), 0) / totalCount * 100)
        : 0
      );

  return (
    <View style={boqStyles.container}>
      {totalCount === 0 ? (
        <Card style={boqStyles.emptyCard}>
          <Ionicons name="document-text-outline" size={48} color={colors.neutral[300]} style={{ marginBottom: spacing.md }} />
          <Text style={boqStyles.emptyTitle}>No BOQ Imported Yet</Text>
          <Text style={boqStyles.emptyDesc}>
            Upload an Excel sheet to establish the official material quantity list, tracking, and billing for this project.
          </Text>
          <Button
            title="Import BOQ from Excel"
            onPress={() => router.push({
              pathname: '/(admin)/import-boq',
              params: { projectId, projectName }
            } as any)}
            variant="primary"
            style={{ backgroundColor: '#7E6144', marginTop: spacing.lg }}
          />
        </Card>
      ) : (
        <View style={{ gap: spacing.lg }}>
          {/* Dashboard Summary Card */}
          <Card style={boqStyles.summaryCard}>
            <View style={boqStyles.summaryHeader}>
              <View>
                <Text style={boqStyles.summaryLabel}>BOQ Progress</Text>
                <Text style={boqStyles.summaryVal}>{progressPct}% Physical Progress</Text>
              </View>
              <Text style={boqStyles.progressText}>{progressPct}%</Text>
            </View>
            <View style={boqStyles.progressBarBg}>
              <View style={[boqStyles.progressBarFill, { width: `${progressPct}%` }]} />
            </View>
            <View style={boqStyles.summaryFooter}>
              <Text style={boqStyles.summaryFooterLabel}>Total BOQ Value:</Text>
              <Text style={boqStyles.summaryFooterVal}>₹{totalAmount.toLocaleString('en-IN')}</Text>
            </View>
          </Card>

          {/* Search bar & Upload button row */}
          <View style={boqStyles.filterRow}>
            <View style={{ flex: 1 }}>
              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder="Search BOQ items..."
              />
            </View>
            <TouchableOpacity
              onPress={() => router.push({
                pathname: '/(admin)/import-boq',
                params: { projectId, projectName }
              } as any)}
              style={boqStyles.uploadBtn}
            >
              <Ionicons name="cloud-upload" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* BOQ Items list */}
          {filtered.map(item => {
            const isFullyDone = item.completed_quantity >= item.quantity;
            return (
              <Card key={item.id} style={[boqStyles.itemCard, isFullyDone && boqStyles.itemCardDone]}>
                <View style={boqStyles.itemHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[boqStyles.itemName, isFullyDone && boqStyles.itemNameDone]}>{item.item_name}</Text>
                    {item.description ? <Text style={boqStyles.itemDesc}>{item.description}</Text> : null}
                  </View>

                  {/* Quantity adjustment input */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: colors.neutral[200],
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        width: 70,
                        textAlign: 'center',
                        fontSize: 14,
                        fontFamily: fontFamily.medium,
                        backgroundColor: '#FAF9F6',
                        color: colors.ink,
                      }}
                      keyboardType="numeric"
                      defaultValue={item.completed_quantity.toString()}
                      onSubmitEditing={(e) => {
                        const val = parseFloat(e.nativeEvent.text);
                        if (isNaN(val) || val < 0 || val > item.quantity) {
                          showAlert('Invalid quantity', `Please enter a value between 0 and ${item.quantity}`);
                          return;
                        }
                        updateBOQQtyMutation.mutate({ id: item.id, completed_quantity: val });
                      }}
                    />
                    <Text style={{ fontSize: 13, color: colors.neutral[500] }}>/ {item.quantity} {item.unit}</Text>
                  </View>
                </View>

                <View style={boqStyles.itemDivider} />

                <View style={boqStyles.itemMetaGrid}>
                  <View>
                    <Text style={boqStyles.metaLabel}>Unit Rate</Text>
                    <Text style={boqStyles.metaVal}>₹{(item.rate || 0).toLocaleString('en-IN')}</Text>
                  </View>
                  <View>
                    <Text style={boqStyles.metaLabel}>Installed Value</Text>
                    <Text style={boqStyles.metaVal}>₹{((item.completed_quantity || 0) * (item.rate || 0)).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={boqStyles.metaLabel}>Total BOQ Value</Text>
                    <Text style={[boqStyles.metaVal, { color: colors.neutral[800], fontFamily: fontFamily.semiBold }]}>
                      ₹{(item.amount || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })}

          {filtered.length === 0 && (
            <Text style={boqStyles.emptySearchText}>No BOQ items match your filter.</Text>
          )}
        </View>
      )}
    </View>
  );
}

const boqStyles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  emptyCard: {
    padding: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.neutral[200],
    borderWidth: 1,
    borderStyle: 'dashed',
    backgroundColor: '#fff',
    marginTop: spacing.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[700],
    marginBottom: spacing.xs,
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.neutral[400],
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#7E6144',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    color: colors.neutral[400],
    textTransform: 'uppercase',
  },
  summaryVal: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[800],
  },
  progressText: {
    fontSize: 24,
    fontFamily: fontFamily.bold,
    color: '#7E6144',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.neutral[100],
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#7E6144',
    borderRadius: 4,
  },
  summaryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    paddingTop: spacing.sm,
  },
  summaryFooterLabel: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: colors.neutral[500],
  },
  summaryFooterVal: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[800],
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  uploadBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: '#7E6144',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  itemCard: {
    backgroundColor: '#fff',
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  itemCardDone: {
    borderColor: 'rgba(74, 222, 128, 0.3)',
    backgroundColor: 'rgba(240, 253, 244, 0.5)',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  itemName: {
    fontSize: 15,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[800],
    marginBottom: 2,
  },
  itemNameDone: {
    color: colors.neutral[600],
    textDecorationLine: 'line-through',
  },
  itemDesc: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.neutral[400],
  },
  switchContainer: {
    alignItems: 'center',
    gap: 2,
  },
  switchLabel: {
    fontSize: 9,
    fontFamily: fontFamily.bold,
    color: colors.neutral[400],
  },
  itemDivider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginVertical: spacing.md,
  },
  itemMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 10,
    fontFamily: fontFamily.medium,
    color: colors.neutral[400],
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metaVal: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: colors.neutral[600],
  },
  emptySearchText: {
    textAlign: 'center',
    color: colors.neutral[400],
    fontFamily: fontFamily.medium,
    paddingVertical: spacing.xl,
  },
});

// Overview
const PROJECT_PHASES = [
  { label: 'Design & Approval', pct: 20 },
  { label: 'Procurement & Fabrication', pct: 40 },
  { label: 'Delivery to Site', pct: 60 },
  { label: 'Installation', pct: 80 },
  { label: 'Finishing & Handover', pct: 100 },
];

function OverviewTab({
  project,
  employees,
  payments,
  materialReqs,
  tasks,
  onTabChange,
}: {
  project: any;
  employees: any[];
  payments: Payment[];
  materialReqs: MaterialRequest[];
  tasks: Task[];
  onTabChange: (tab: any) => void;
}) {
  const { data: boqItems = [] } = useProjectBOQ(project.id);
  const { data: variations = [] } = useProjectVariations(project.id);

  const approvedVars = variations
    .filter(v => v.status === 'approved')
    .reduce((acc, v) => acc + v.extra_amount, 0);

  const originalBOQVal = boqItems.reduce((acc, item) => acc + (item.amount || 0), 0);
  const totalValue = originalBOQVal + approvedVars;
  const totalBilled = payments.reduce((s, p) => s + p.amount, 0);
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const payPct = totalBilled > 0 ? Math.round(totalPaid / totalBilled * 100) : 0;

  const financialProgress = totalValue > 0 ? Math.round(totalBilled / totalValue * 100) : 0;

  const totalIssued = materialReqs.filter(m => m.status === 'ordered').reduce((acc, m) => acc + m.qty, 0);
  const totalBOQQty = boqItems.reduce((acc, item) => acc + item.quantity, 0);
  const materialIssuedPct = totalBOQQty > 0 ? Math.round(totalIssued / totalBOQQty * 100) : 0;

  const pendingSnags = tasks.filter(t => t.status === 'pending').length;

  const daysLeft = project.expected_end_date 
    ? Math.max(0, Math.ceil((new Date(project.expected_end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))) 
    : 0;

  const openTasks = tasks.filter(t => t.status === 'pending');
  const pendingMaterials = materialReqs.filter(m => m.status === 'pending');

  const updateProject = useUpdateProject();

  const handlePhaseToggle = (phasePct: number) => {
    let newPct = phasePct;
    if (project.progress_pct === phasePct) {
      const prevPhase = [...PROJECT_PHASES].reverse().find(p => p.pct < phasePct);
      newPct = prevPhase ? prevPhase.pct : 0;
    }
    updateProject.mutate({ id: project.id, updates: { progress_pct: newPct } });
  };

  return (
    <View style={ovStyles.content}>
      {/* 6 core Health Check KPIs (Awwwards Double-Bezel Architecture) */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: spacing.md }}>
        <Card style={{ flex: 1, minWidth: '47%', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 9, fontFamily: fontFamily.bold, color: '#64748B', letterSpacing: 0.6 }}>PHYSICAL PROGRESS</Text>
            <Ionicons name="trending-up" size={16} color="#2563EB" />
          </View>
          <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: '#0F172A', marginTop: 4 }}>{project.progress_pct || 0}%</Text>
          <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Scope completion rate</Text>
        </Card>

        <Card style={{ flex: 1, minWidth: '47%', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: '#BBF7D0', backgroundColor: '#FFFFFF' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 9, fontFamily: fontFamily.bold, color: '#16A34A', letterSpacing: 0.6 }}>FINANCIAL PROGRESS</Text>
            <Ionicons name="cash" size={16} color="#16A34A" />
          </View>
          <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: '#0F172A', marginTop: 4 }}>{financialProgress}%</Text>
          <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Billed vs Total Value</Text>
        </Card>

        <Card style={{ flex: 1, minWidth: '47%', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: '#FFFFFF' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 9, fontFamily: fontFamily.bold, color: '#2563EB', letterSpacing: 0.6 }}>MATERIALS ISSUED</Text>
            <Ionicons name="cube" size={16} color="#2563EB" />
          </View>
          <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: '#0F172A', marginTop: 4 }}>{materialIssuedPct}%</Text>
          <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Site dispatch ratio</Text>
        </Card>

        <Card style={{ flex: 1, minWidth: '47%', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: '#DDD6FE', backgroundColor: '#FFFFFF' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 9, fontFamily: fontFamily.bold, color: '#7C3AED', letterSpacing: 0.6 }}>APPROVED VARIATIONS</Text>
            <Ionicons name="document-text" size={16} color="#7C3AED" />
          </View>
          <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: '#0F172A', marginTop: 4 }}>₹{approvedVars.toLocaleString('en-IN')}</Text>
          <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Extra scope value</Text>
        </Card>

        <Card style={{ flex: 1, minWidth: '47%', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FFFFFF' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 9, fontFamily: fontFamily.bold, color: '#DC2626', letterSpacing: 0.6 }}>PENDING TASKS</Text>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
          </View>
          <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: '#0F172A', marginTop: 4 }}>{pendingSnags}</Text>
          <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Open work items</Text>
        </Card>

        <Card style={{ flex: 1, minWidth: '47%', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: '#FDE68A', backgroundColor: '#FFFFFF' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 9, fontFamily: fontFamily.bold, color: '#D97706', letterSpacing: 0.6 }}>DAYS REMAINING</Text>
            <Ionicons name="time" size={16} color="#D97706" />
          </View>
          <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: '#0F172A', marginTop: 4 }}>{daysLeft} Days</Text>
          <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Target completion</Text>
        </Card>
      </View>

      {/* Hero: ring on top, meta grid below */}
      <View style={ovStyles.glassCard}>
        <View style={ovStyles.heroCard}>
          <View style={ovStyles.gaugeWrap}>
            <ProgressRing
              progress={project.progress_pct || 0}
              size={132}
              strokeWidth={10}
              startColor="#A9713F"
              endColor="#6B4423"
              trackColor="rgba(139,94,52,0.14)"
              showLabel={false}
            />
            <View style={ovStyles.gaugeLabel}>
              <Text style={ovStyles.gaugePct}>{project.progress_pct || 0}%</Text>
              <Text style={ovStyles.gaugeSub}>Complete</Text>
            </View>
          </View>

          <View style={ovStyles.metaDivider} />

          <View style={ovStyles.metaGrid}>
            <View style={ovStyles.metaItem}>
              <View style={[ovStyles.metaIcon, { backgroundColor: '#FCF0DA' }]}>
                <Ionicons name="layers" size={14} color="#B8860B" />
              </View>
              <View>
                <Text style={ovStyles.metaTextLabel}>Stage</Text>
                <Text style={[ovStyles.metaTextValue, { color: '#8B8680', fontFamily: fontFamily.medium }]}>{project.stage || '—'}</Text>
              </View>
            </View>
            <View style={ovStyles.metaItem}>
              <View style={[ovStyles.metaIcon, { backgroundColor: '#FCF0DA' }]}>
                <Ionicons name="location" size={14} color="#B8860B" />
              </View>
              <View>
                <Text style={ovStyles.metaTextLabel}>City</Text>
                <Text style={ovStyles.metaTextValue}>{project.city || '—'}</Text>
              </View>
            </View>
            <View style={ovStyles.metaItem}>
              <View style={[ovStyles.metaIcon, { backgroundColor: '#FCF0DA' }]}>
                <Ionicons name="calendar" size={14} color="#B8860B" />
              </View>
              <View>
                <Text style={ovStyles.metaTextLabel}>Start</Text>
                <Text style={ovStyles.metaTextValue}>{fmt(project.start_date)}</Text>
              </View>
            </View>
            <View style={ovStyles.metaItem}>
              <View style={[ovStyles.metaIcon, { backgroundColor: '#FCF0DA' }]}>
                <Ionicons name="flag" size={14} color="#B8860B" />
              </View>
              <View>
                <Text style={ovStyles.metaTextLabel}>End</Text>
                <Text style={ovStyles.metaTextValue}>{fmt(project.expected_end_date)}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Project Phases Card */}
      <Card style={{ padding: spacing.xl, marginBottom: spacing.md }}>
        <Text style={{ fontSize: 16, fontFamily: fontFamily.bold, color: colors.ink, marginBottom: spacing.md }}>
          Project Phases
        </Text>
        <View style={{ gap: spacing.sm }}>
          {PROJECT_PHASES.map((phase) => {
            const isCompleted = (project.progress_pct || 0) >= phase.pct;
            return (
              <TouchableOpacity
                key={phase.pct}
                onPress={() => handlePhaseToggle(phase.pct)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  backgroundColor: isCompleted ? '#F0F9FF' : colors.white,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: isCompleted ? '#BAE6FD' : colors.neutral[200],
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={isCompleted ? '#0284C7' : colors.neutral[300]}
                />
                <Text
                  style={{
                    flex: 1,
                    marginLeft: spacing.md,
                    fontSize: 14,
                    fontFamily: isCompleted ? fontFamily.semiBold : fontFamily.medium,
                    color: isCompleted ? '#0369A1' : colors.neutral[700],
                  }}
                >
                  {phase.label}
                </Text>
                <Text style={{ fontSize: 12, color: colors.neutral[400] }}>{phase.pct}%</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* stat cards: 2x2, horizontal layout */}
      <View style={ovStyles.statsGrid}>
        <TouchableOpacity style={ovStyles.statCardGlass} activeOpacity={0.7} onPress={() => onTabChange('Employees')}>
          <View style={[ovStyles.statIcon, { backgroundColor: '#E8EEFC' }]}>
            <Ionicons name="people" size={19} color="#3D6FE0" />
          </View>
          <View>
            <Text style={ovStyles.statValue}>{employees.length}</Text>
            <Text style={ovStyles.statLabel}>Team</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={ovStyles.statCardGlass} activeOpacity={0.7} onPress={() => onTabChange('Tasks')}>
          <View style={[ovStyles.statIcon, { backgroundColor: '#FCF0DA' }]}>
            <Ionicons name="checkmark-circle" size={19} color="#B8860B" />
          </View>
          <View>
            <Text style={ovStyles.statValue}>{openTasks.length}</Text>
            <Text style={ovStyles.statLabel}>Tasks</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={ovStyles.statCardGlass} activeOpacity={0.7} onPress={() => onTabChange('Payments')}>
          <View style={[ovStyles.statIcon, { backgroundColor: '#E4F5E9' }]}>
            <Ionicons name="cash" size={19} color="#3FA65B" />
          </View>
          <View>
            <Text style={ovStyles.statValue}>₹{(totalPaid / 100000).toFixed(1)}L</Text>
            <Text style={ovStyles.statLabel}>Payments</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={ovStyles.statCardGlass} activeOpacity={0.7} onPress={() => onTabChange('Materials')}>
          <View style={[ovStyles.statIcon, { backgroundColor: '#FBE6E1' }]}>
            <Ionicons name="cube" size={19} color="#D6503A" />
          </View>
          <View>
            <Text style={ovStyles.statValue}>{pendingMaterials.length}</Text>
            <Text style={ovStyles.statLabel}>Materials</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* payment progress */}
      <View style={ovStyles.sectionCardGlass}>
        <View style={ovStyles.sectionHead}>
          <View style={[ovStyles.sectionIcon, { backgroundColor: '#FCF0DA' }]}>
            <Ionicons name="wallet" size={14} color="#B8860B" />
          </View>
          <Text style={ovStyles.sectionTitle}>Payment Progress</Text>
        </View>
        <View style={ovStyles.trackBar}>
          <LinearGradient
            colors={['#E8A93A', '#f3c465']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[ovStyles.trackFill, { width: `${Math.max(payPct, 2)}%` as any }]}
          />
        </View>
        <Text style={ovStyles.trackCaption}>
          <Text style={{ fontWeight: '700', color: '#2A241D' }}>{fmtINR(totalPaid)}</Text> collected of <Text style={{ fontWeight: '700', color: '#2A241D' }}>{fmtINR(totalBilled)}</Text> billed
        </Text>
      </View>

      {/* site address */}
      {!!project.address && (
        <View style={ovStyles.sectionCardGlass}>
          <View style={ovStyles.sectionHead}>
            <View style={[ovStyles.sectionIcon, { backgroundColor: '#FBE6E1' }]}>
              <Ionicons name="location" size={14} color="#D6503A" />
            </View>
            <Text style={ovStyles.sectionTitle}>Site Address</Text>
          </View>
          <Text style={ovStyles.addressText}>{project.address}</Text>
        </View>
      )}
    </View>
  );
}

// Tasks
function TasksTab({
  tasks,
  employees,
  projectId,
  currentUserId,
}: {
  tasks: Task[];
  employees: any[];
  projectId: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const updateStatus = useUpdateTaskStatus();
  const createTask = useCreateTask();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newAssignee, setNewAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'done' | 'blocked'>('all');

  const filtered = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus);

  const employeeMap = useMemo(
    () => new Map(employees.map(e => [e.id, e.full_name])),
    [employees]
  );

  async function handleAdd() {
    if (!newTitle.trim()) return;
    try {
      await createTask.mutateAsync({
        projectId,
        title: newTitle.trim(),
        priority: newPriority,
        createdBy: currentUserId,
        assignedTo: newAssignee || null,
      });
      setNewTitle('');
      setNewAssignee('');
      setShowAdd(false);
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to create task');
    }
  }

  async function handleToggle(task: Task) {
    const next = task.status === 'done' ? 'pending' : 'done';
    try {
      await updateStatus.mutateAsync({ taskId: task.id, status: next });
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to update task');
    }
  }

  const priorityColor: Record<string, string> = {
    high: colors.error,
    medium: colors.warning,
    low: colors.success,
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <ExcelTaskMISGrid projectId={projectId} tasks={tasks} />
      <MISAnalyticsCharts tasks={tasks} />
    </View>
  );
}
// Employees
function EmployeesTab({ employees, router }: { employees: any[]; router: any }) {
  const teamMembers = employees.filter(e => e.role !== 'client');
  const byRole = useMemo(() => {
    const groups: Record<string, any[]> = {};
    teamMembers.forEach(e => {
      const r = e.role || 'other';
      if (!groups[r]) groups[r] = [];
      groups[r].push(e);
    });
    return groups;
  }, [teamMembers]);

  return (
    <>
      <SectionHeader title={`Team Members (${teamMembers.length})`} />
      {Object.entries(byRole).map(([role, members]) => (
        <View key={role}>
          <Text style={styles.groupLabel}>{role.replace('_', ' ').toUpperCase()}</Text>
          {members.map(emp => (
            <TouchableOpacity
              key={emp.id}
              onPress={() => router.push({ pathname: '/(admin)/employee-profile' as any, params: { id: emp.id } })}
            >
              <Card style={styles.listCard}>
                <View style={styles.listRow}>
                  <Avatar name={emp.full_name} uri={emp.avatar_url} size={40} />
                  <View style={styles.listInfo}>
                    <Text style={styles.listTitle}>{emp.full_name}</Text>
                    <Text style={styles.listSubtitle}>
                      {emp.worker_id ? `ID: ${emp.worker_id}` : ''}
                      {emp.phone ? (emp.worker_id ? ` · ${emp.phone}` : emp.phone) : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={[styles.statusDot, { backgroundColor: emp.status === 'active' ? colors.success : colors.neutral[300] }]} />
                    <Ionicons name="chevron-forward" size={16} color={colors.neutral[300]} />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      ))}
      {teamMembers.length === 0 && <EmptyState icon="people-outline" text="No team members assigned" />}
    </>
  );
}

// Attendance
function AttendanceTab({ projectId }: { projectId: string }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const { data: rows, isLoading, refetch, isRefetching } = useProjectAttendance(projectId, date);

  const dateFmt = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  function shiftDate(delta: number) {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  }

  const present = (rows || []).filter(r => r.attendance?.status === 'present').length;
  const absent = (rows || []).filter(r => !r.attendance || r.attendance.status === 'absent').length;

  return (
    <>
      {/* Date Navigator */}
      <Card style={styles.dateNav}>
        <TouchableOpacity onPress={() => shiftDate(-1)} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.dateNavLabel}>{dateFmt}</Text>
        <TouchableOpacity onPress={() => shiftDate(1)} hitSlop={8} disabled={date >= new Date().toISOString().slice(0, 10)}>
          <Ionicons name="chevron-forward" size={20} color={date >= new Date().toISOString().slice(0, 10) ? colors.neutral[300] : colors.primary} />
        </TouchableOpacity>
      </Card>

      {/* Summary */}
      <View style={styles.quickStatsRow}>
        <StatBox label="Present" value={present.toString()} icon="checkmark-circle" color={colors.success} />
        <StatBox label="Absent" value={absent.toString()} icon="close-circle" color={colors.error} />
        <StatBox label="Total" value={(rows || []).length.toString()} icon="people" color={colors.info} />
      </View>

      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing['4xl'] }} />}

      {!isLoading && (rows || []).map(({ profile, attendance }) => (
        <Card key={profile.id} style={styles.listCard}>
          <View style={styles.listRow}>
            <Avatar name={profile.full_name} uri={profile.avatar_url} size={36} />
            <View style={styles.listInfo}>
              <Text style={styles.listTitle}>{profile.full_name}</Text>
              <Text style={styles.listSubtitle}>
                {attendance?.check_in_at
                  ? `In: ${new Date(attendance.check_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Not checked in'}
                {attendance?.check_out_at
                  ? ` · Out: ${new Date(attendance.check_out_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                  : ''}
              </Text>
            </View>
            {attendance ? (
              <StatusBadge status={attendance.status} />
            ) : (
              <View style={[styles.badge, { backgroundColor: colors.neutral[100] }]}>
                <Text style={[styles.badgeText, { color: colors.neutral[500] }]}>absent</Text>
              </View>
            )}
          </View>
        </Card>
      ))}
      {!isLoading && (rows || []).length === 0 && (
        <EmptyState icon="calendar-outline" text="No attendance data for this date" />
      )}
    </>
  );
}

// DPR
function DprTab({ dprs, employees, project }: { dprs: Dpr[]; employees: any[]; project: any }) {
  const updateProject = useUpdateProject();
  const [directToClient, setDirectToClient] = useState<boolean>(project?.dpr_direct_to_client || false);
  const [clientVisibleMap, setClientVisibleMap] = useState<Record<string, boolean>>({});

  // Extended View Modal states
  const [selectedDpr, setSelectedDpr] = useState<Dpr | null>(null);
  const [dprMedia, setDprMedia] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  const employeeMap = useMemo(
    () => new Map(employees.map(e => [e.id, e.full_name])),
    [employees]
  );

  const statusColors: Record<string, { color: string; bg: string }> = {
    draft: { color: colors.neutral[600], bg: colors.neutral[100] },
    submitted: { color: colors.info, bg: colors.infoBg },
    approved: { color: colors.success, bg: colors.successBg },
    rejected: { color: colors.error, bg: colors.errorBg },
  };

  const handleOpenExtendedDpr = async (dpr: Dpr) => {
    setSelectedDpr(dpr);
    setLoadingMedia(true);
    setDprMedia([]);
    try {
      const { data, error } = await supabase
        .from('dpr_media')
        .select('*')
        .eq('dpr_id', dpr.id);
      if (!error && data) {
        setDprMedia(data);
      }
    } catch (e) {
      console.warn('[DprTab] Error loading media:', e);
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleToggleDirectClient = async (val: boolean) => {
    setDirectToClient(val);
    try {
      if (project?.id) {
        await supabase.from('projects').update({ dpr_direct_to_client: val }).eq('id', project.id);
        showAlert(
          'Client Release Rule Updated',
          val
            ? 'DPR submissions will now automatically publish directly to Client views.'
            : 'Admin manual review & approval required before DPRs are published to Client views.'
        );
      }
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to update setting.');
    }
  };

  const handleToggleClientPublish = async (dprId: string, currentVisible: boolean) => {
    const nextState = !currentVisible;
    setClientVisibleMap((prev) => ({ ...prev, [dprId]: nextState }));
    try {
      await supabase.from('dprs').update({ client_visible: nextState }).eq('id', dprId);
      showAlert(
        nextState ? 'Published to Client' : 'Revoked from Client',
        nextState
          ? 'This DPR is now visible to the client on their dashboard.'
          : 'This DPR has been hidden from the client view.'
      );
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to update DPR client visibility.');
    }
  };

  return (
    <>
      <SectionHeader title={`Daily Progress Reports (${dprs.length})`} />

      {/* Admin Client Release Strategy Banner */}
      <Card style={{ marginBottom: spacing.md, backgroundColor: '#FFFBEB', borderColor: '#FCD34D' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#92400E' }}>
              Direct DPR Release to Client
            </Text>
            <Text style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>
              {directToClient
                ? 'Enabled: DPRs publish automatically to client.'
                : 'Disabled: Admin reviews & edits before releasing to client.'}
            </Text>
          </View>
          <Switch
            value={directToClient}
            onValueChange={handleToggleDirectClient}
            trackColor={{ true: colors.primary, false: colors.neutral[300] }}
          />
        </View>
      </Card>

      {dprs.length === 0 && <EmptyState icon="document-text-outline" text="No DPRs submitted for this project yet" />}
      {dprs.map(dpr => {
        const isVisibleToClient = clientVisibleMap[dpr.id] !== undefined
          ? clientVisibleMap[dpr.id]
          : directToClient || dpr.client_visible || dpr.status === 'approved';

        return (
          <TouchableOpacity
            key={dpr.id}
            onPress={() => handleOpenExtendedDpr(dpr)}
            activeOpacity={0.8}
          >
            <Card style={styles.listCard}>
              <View style={styles.listRow}>
                <View style={[styles.iconBox, { backgroundColor: statusColors[dpr.status]?.bg || colors.neutral[100] }]}>
                  <Ionicons name="document-text" size={20} color={statusColors[dpr.status]?.color || colors.neutral[600]} />
                </View>
                <View style={styles.listInfo}>
                  <Text style={styles.listTitle}>
                    {fmt(dpr.date, { day: 'numeric', month: 'short', year: 'numeric' })}
                    {dpr.work_type ? ` — ${dpr.work_type}` : ''}
                  </Text>
                  <Text style={styles.listSubtitle} numberOfLines={2}>
                    {dpr.work_done}
                  </Text>
                  <Text style={[styles.listSubtitle, { marginTop: 2 }]}>
                    By: {employeeMap.get(dpr.submitted_by) || dpr.submitted_by}
                    {dpr.level_zone ? ` · ${dpr.level_zone}` : ''}
                  </Text>
                </View>
                <StatusBadge status={dpr.status} />
              </View>

              {/* Extended View Button + Admin Client Release Control Button */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTopWidth: 1,
                  borderTopColor: '#F3F4F6',
                  marginTop: spacing.xs,
                  paddingTop: spacing.xs,
                }}
              >
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  onPress={() => handleOpenExtendedDpr(dpr)}
                >
                  <Ionicons name="open-outline" size={14} color={colors.primary} />
                  <Text style={{ fontSize: 11, color: colors.primary, fontFamily: fontFamily.bold }}>
                    Open Extended View
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: isVisibleToClient ? '#FEF2F2' : '#F0FDF4',
                    borderColor: isVisibleToClient ? '#FECACA' : '#BBF7D0',
                    borderWidth: 1,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 4,
                    borderRadius: radius.sm,
                  }}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleToggleClientPublish(dpr.id, isVisibleToClient);
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: isVisibleToClient ? '#DC2626' : '#15803D' }}>
                    {isVisibleToClient ? 'Revoke Client View' : 'Publish to Client'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          </TouchableOpacity>
        );
      })}

      {/* Extended DPR Details Modal */}
      <Modal
        visible={!!selectedDpr}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDpr(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, maxHeight: '90%' }}>
            {/* Modal Handle */}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: spacing.md }} />

            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <View style={{ flex: 1, paddingRight: spacing.sm }}>
                <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: colors.ink }}>
                  Extended DPR Details
                </Text>
                <Text style={{ fontSize: 12, color: colors.neutral[500] }}>
                  {selectedDpr ? fmt(selectedDpr.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedDpr(null)} hitSlop={12}>
                <Ionicons name="close-circle" size={26} color={colors.neutral[400]} />
              </TouchableOpacity>
            </View>

            {selectedDpr && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}>
                {/* Meta details card */}
                <Card style={{ padding: spacing.md, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
                    <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: colors.ink }}>
                      {selectedDpr.work_type || 'General Work'}
                    </Text>
                    <StatusBadge status={selectedDpr.status} />
                  </View>
                  <Text style={{ fontSize: 12, color: colors.neutral[600] }}>
                    Submitted By: <Text style={{ fontFamily: fontFamily.bold, color: colors.ink }}>{employeeMap.get(selectedDpr.submitted_by) || selectedDpr.submitted_by}</Text>
                  </Text>
                  {selectedDpr.level_zone ? (
                    <Text style={{ fontSize: 12, color: colors.neutral[600], marginTop: 2 }}>
                      Level / Zone: <Text style={{ fontFamily: fontFamily.bold, color: colors.ink }}>{selectedDpr.level_zone}</Text>
                    </Text>
                  ) : null}
                </Card>

                {/* Work Accomplished Description */}
                <View>
                  <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: colors.ink, marginBottom: 4 }}>
                    📝 Detailed Work Description
                  </Text>
                  <Card style={{ padding: spacing.md, backgroundColor: '#FFFFFF' }}>
                    <Text style={{ fontSize: 13, color: colors.neutral[700], lineHeight: 20 }}>
                      {selectedDpr.work_done || 'No detailed description logged.'}
                    </Text>
                  </Card>
                </View>

                {/* Attached Site Photos & Videos */}
                <View>
                  <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: colors.ink, marginBottom: 6 }}>
                    📸 Attached Site Photos & Videos ({dprMedia.length})
                  </Text>

                  {loadingMedia ? (
                    <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
                  ) : dprMedia.length === 0 ? (
                    <Card style={{ padding: spacing.md, alignItems: 'center', backgroundColor: '#F8FAFC' }}>
                      <Ionicons name="images-outline" size={28} color={colors.neutral[300]} />
                      <Text style={{ fontSize: 12, color: colors.neutral[500], marginTop: 4 }}>No photos attached to this DPR</Text>
                    </Card>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                      {dprMedia.map((m: any, idx: number) => (
                        <View key={m.id || idx} style={{ width: 120, height: 120, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.neutral[200] }}>
                          <Image source={{ uri: supabase.storage.from('dpr-media').getPublicUrl(m.storage_path).data.publicUrl }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>

                {/* Review Notes (if available) */}
                {selectedDpr.review_note ? (
                  <View>
                    <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: colors.ink, marginBottom: 4 }}>
                      💬 Supervisor / Admin Review Note
                    </Text>
                    <Card style={{ padding: spacing.md, backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }}>
                      <Text style={{ fontSize: 12, color: '#166534' }}>
                        {selectedDpr.review_note}
                      </Text>
                    </Card>
                  </View>
                ) : null}

                {/* Client Release Status Button */}
                <Button
                  title={selectedDpr.client_visible ? "Revoke Client Visibility" : "Publish DPR to Client"}
                  variant={selectedDpr.client_visible ? "secondary" : "primary"}
                  onPress={() => {
                    handleToggleClientPublish(selectedDpr.id, !!selectedDpr.client_visible);
                    setSelectedDpr(null);
                  }}
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}


// Photos (from DPR media — show placeholder with DPR count as signal)
function PhotosTab({ dprs }: { dprs: Dpr[] }) {
  // Photos are stored as DprMedia linked to DPR IDs.
  // Without a heavy join query, we show DPR stubs with photo indicators.
  const dprsWithPhotos = dprs; // All DPRs potentially have photos

  return (
    <>
      <SectionHeader title="Site Photos" />
      {dprsWithPhotos.length === 0 && (
        <EmptyState icon="images-outline" text="No photos uploaded yet — workers attach photos with DPRs" />
      )}
      {dprsWithPhotos.length > 0 && (
        <Card style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Ionicons name="images" size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle}>Photos from {dprsWithPhotos.length} DPR{dprsWithPhotos.length !== 1 ? 's' : ''}</Text>
              <Text style={styles.listSubtitle}>
                Site photos are attached to Daily Progress Reports.
                Open a DPR to view its photos.
              </Text>
            </View>
          </View>
        </Card>
      )}
      <Card style={{ ...styles.sectionCard, backgroundColor: colors.infoBg }}>
        <Text style={[typography.caption, { color: colors.info }]}>
          ðŸ’¡ Workers upload site photos when submitting their daily progress reports. Photos are linked to specific work completed each day.
        </Text>
      </Card>
    </>
  );
}

const DOC_CATEGORIES = [
  { key: 'drawings', label: 'Drawings' },
  { key: 'boq', label: 'BOQ' },
  { key: 'quotation', label: 'Quotations' },
  { key: 'work_orders', label: 'Work Orders' },
  { key: 'contracts', label: 'Contracts' },
  { key: 'invoices', label: 'Invoices / Bills' },
  { key: 'warranty', label: 'Warranty' },
  { key: 'safety', label: 'Safety' },
  { key: 'amc', label: 'AMC' },
  { key: 'other', label: 'Other' },
];

function DocumentsTab({ documents, projectId }: { documents: DocumentRow[], projectId: string }) {
  const [selectedDoc, setSelectedDoc] = useState<DocumentRow | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [uploadModal, setUploadModal] = useState(false);
  const [upCategory, setUpCategory] = useState('drawings');
  const upload = useDocumentUpload();

  // In-app PDF, CAD & Excel Viewers state
  const [cadViewerDoc, setCadViewerDoc] = useState<{ url: string; title: string } | null>(null);
  const [pdfViewerDoc, setPdfViewerDoc] = useState<{ url: string; title: string } | null>(null);
  const [xlsxViewerDoc, setXlsxViewerDoc] = useState<{ url: string; title: string } | null>(null);

  const doUpload = async () => {
    try {
      await upload.mutateAsync({ ownerType: 'project', ownerId: projectId, category: upCategory });
      setUploadModal(false);
      showAlert('Success', 'Document uploaded');
    } catch (e: any) {
      if (e.message !== 'Canceled') showAlert('Upload Failed', e.message);
    }
  };

  const grouped = useMemo(() => {
    const g: Record<string, DocumentRow[]> = {};
    documents.forEach(d => {
      const cat = d.category || 'other';
      if (!g[cat]) g[cat] = [];
      g[cat].push(d);
    });
    return g;
  }, [documents]);

  const handleOpenDoc = async (doc: DocumentRow) => {
    setLoadingFile(true);
    try {
      // 1. Fetch versions
      const { data: versions, error: verErr } = await supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', doc.id)
        .order('rev_no', { ascending: false });

      if (verErr) throw verErr;

      if (!versions || versions.length === 0) {
        showAlert('Info', 'No uploaded file versions found for this document record.');
        setLoadingFile(false);
        return;
      }

      const latestVersion = versions[0];

      // 2. Fetch signed URL
      const { data, error: signErr } = await supabase
        .storage
        .from('documents')
        .createSignedUrl(latestVersion.storage_path, 3600);

      if (signErr) throw signErr;

      if (data?.signedUrl) {
        const fileName = latestVersion.file_name || doc.title || '';
        const ext = fileName.split('.').pop()?.toLowerCase() || '';

        const cadExts = ['step', 'stp', 'dxf', 'dwg', 'stl', 'glb', '3mf', 'gcode'];
        const xlsxExts = ['xlsx', 'xls', 'csv'];

        const displayTitle = fileName.includes('.') ? fileName : (ext ? `${doc.title}.${ext}` : doc.title);

        if (cadExts.includes(ext) || doc.category === 'drawings') {
          setCadViewerDoc({ url: data.signedUrl, title: displayTitle });
        } else if (xlsxExts.includes(ext) || doc.category === 'boq') {
          setXlsxViewerDoc({ url: data.signedUrl, title: displayTitle });
        } else if (ext === 'pdf' || doc.category === 'contracts' || doc.category === 'invoices' || doc.category === 'quotation') {
          setPdfViewerDoc({ url: data.signedUrl, title: displayTitle });
        } else {
          setViewerUrl(data.signedUrl);
          setSelectedDoc(doc);
        }


      }
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to open document file link');
    } finally {
      setLoadingFile(false);
    }
  };


  const isImageFile = (url: string | null) => {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.png') || cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg') || cleanUrl.endsWith('.webp') || cleanUrl.endsWith('.gif');
  };

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: colors.ink }}>Documents ({documents.length})</Text>
        <Button
          title="Upload"
          onPress={() => setUploadModal(true)}
          variant="primary"
          style={{ minWidth: 100 }}
        />
      </View>
      {loadingFile && (
        <View style={{ padding: spacing.md, alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ fontSize: 11, color: colors.neutral[500], marginTop: 4 }}>Opening in-app viewer...</Text>
        </View>
      )}
      {documents.length === 0 && <EmptyState icon="folder-open-outline" text="No documents uploaded yet" />}
      {Object.entries(grouped).map(([cat, docs]) => (
        <View key={cat}>
          <Text style={styles.groupLabel}>{cat.replace('_', ' ').toUpperCase()}</Text>
          {docs.map(doc => (
            <TouchableOpacity key={doc.id} onPress={() => handleOpenDoc(doc)} activeOpacity={0.7}>
              <Card style={styles.listCard}>
                <View style={styles.listRow}>
                  <View style={[styles.iconBox, { backgroundColor: colors.infoBg }]}>
                    <Ionicons name="document-text" size={20} color={colors.info} />
                  </View>
                  <View style={styles.listInfo}>
                    <Text style={styles.listTitle}>{doc.title}</Text>
                    <Text style={styles.listSubtitle}>{doc.category}</Text>
                  </View>
                  <Ionicons name="eye-outline" size={18} color={colors.neutral[400]} />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {/* In-App Interactive CAD Viewer Modal */}
      <CadViewerModal
        visible={!!cadViewerDoc}
        onClose={() => setCadViewerDoc(null)}
        fileUrl={cadViewerDoc?.url || null}
        fileName={cadViewerDoc?.title || 'CAD Model'}
      />

      {/* In-App Native PDF Viewer Modal */}
      <PdfViewerModal
        visible={!!pdfViewerDoc}
        onClose={() => setPdfViewerDoc(null)}
        fileUrl={pdfViewerDoc?.url || null}
        fileName={pdfViewerDoc?.title || 'Document.pdf'}
      />

      {/* In-App Excel / CSV Spreadsheet Viewer Modal */}
      <XlsxViewerModal
        visible={!!xlsxViewerDoc}
        onClose={() => setXlsxViewerDoc(null)}
        fileUrl={xlsxViewerDoc?.url || null}
        fileName={xlsxViewerDoc?.title || 'Spreadsheet.xlsx'}
      />


      {/* In-App Image Document Viewer Modal */}
      <Modal visible={!!selectedDoc} animationType="slide" onRequestClose={() => setSelectedDoc(null)}>
        <View style={{ flex: 1, backgroundColor: '#1E293B' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderColor: '#334155', backgroundColor: '#0F172A', height: 56 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={() => setSelectedDoc(null)} style={{ padding: 6 }}>
                <Ionicons name="close" size={24} color="#F8FAFC" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 14, fontFamily: fontFamily.bold }} numberOfLines={1}>{selectedDoc?.title}</Text>
                <Text style={{ color: '#94A3B8', fontSize: 10 }}>Category: {selectedDoc?.category?.toUpperCase()}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  if (viewerUrl) {
                    if (Platform.OS === 'web') window.open(viewerUrl, '_blank');
                    else Share.share({ message: `Fine Glaze Image (${selectedDoc?.title}):\n${viewerUrl}` });
                  }
                }}
                style={{ padding: 6 }}
              >
                <Ionicons name="open-outline" size={20} color="#F8FAFC" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (viewerUrl) Share.share({ message: `Fine Glaze Image (${selectedDoc?.title}):\n${viewerUrl}` });
                }}
                style={{ padding: 6 }}
              >
                <Ionicons name="share-social-outline" size={20} color="#F8FAFC" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A', padding: spacing.md }}>
            {viewerUrl ? (
              <Image source={{ uri: viewerUrl }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
            ) : null}
          </View>
        </View>
      </Modal>



      {/* Upload modal */}
      <Modal visible={uploadModal} transparent animationType="slide" onRequestClose={() => setUploadModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
              <Text style={{ fontSize: 20, fontFamily: fontFamily.bold, color: colors.ink }}>Upload Document</Text>
              <TouchableOpacity onPress={() => setUploadModal(false)}>
                <Ionicons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: colors.neutral[500], marginBottom: spacing.lg }}>Select a category for this file.</Text>
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl }}>
              {DOC_CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: 100,
                    borderWidth: 1,
                    borderColor: upCategory === c.key ? colors.primary : colors.neutral[200],
                    backgroundColor: upCategory === c.key ? colors.primary + '15' : colors.white,
                  }}
                  onPress={() => setUpCategory(c.key)}
                >
                  <Text style={{ color: upCategory === c.key ? colors.primary : colors.neutral[600], fontFamily: upCategory === c.key ? fontFamily.semiBold : fontFamily.medium, fontSize: 13 }}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Button title="Choose File & Upload" onPress={doUpload} loading={upload.isPending} />
          </View>
        </View>
      </Modal>
    </>
  );
}

// Materials
function MaterialsTab({ materialReqs, projectId, currentUserId }: { materialReqs: MaterialRequest[]; projectId: string; currentUserId: string }) {
  const [subTab, setSubTab] = useState<'requests' | 'ledger'>('requests');
  const { data: ledger = [], refetch: refetchLedger } = useInventoryLedger(projectId);
  const { data: stockItems = [], refetch: refetchStock } = useMaterialStock(projectId);
  const { data: suppliers = [] } = useSuppliers();
  const { data: materialsMaster = [] } = useMaterialMaster();
  const { data: boqItems = [] } = useProjectBOQ(projectId);

  const createLedgerEntryMutation = useCreateInventoryLedgerEntry();
  const issueMutation = useIssueMaterialRequest();

  // Transaction form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [customMaterialName, setCustomMaterialName] = useState('');
  const [txType, setTxType] = useState<'opening' | 'received' | 'used' | 'return' | 'transfer' | 'adjustment' | 'wastage' | 'scrap'>('received');
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');

  // Issue modal states
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaterialRequest | null>(null);
  const [issueQty, setIssueQty] = useState('');
  const [issueBatch, setIssueBatch] = useState('');

  const handleSaveEntry = async () => {
    let matId = selectedMaterialId;

    if (!matId && customMaterialName.trim()) {
      const match = materialsMaster.find(m => m.name.toLowerCase() === customMaterialName.trim().toLowerCase());
      if (match) {
        matId = match.id;
      } else {
        const { data: createdMat, error: createErr } = await supabase
          .from('material_master')
          .insert({
            name: customMaterialName.trim(),
            category: 'General',
            unit: 'pcs',
          })
          .select('id')
          .single();

        if (createErr) {
          showAlert('Error', 'Failed to create material record: ' + createErr.message);
          return;
        }
        matId = createdMat.id;
      }
    }

    const parsedQty = parseFloat(qty);
    if (!matId || isNaN(parsedQty) || parsedQty <= 0) {
      showAlert('Error', 'Please select or type a material name and enter a valid quantity.');
      return;
    }
    try {
      await createLedgerEntryMutation.mutateAsync({
        projectId,
        materialMasterId: matId,
        transactionType: txType,
        quantity: parsedQty,
        notes: notes.trim(),
        createdBy: currentUserId,
        batchNumber: batchNumber.trim() || undefined,
        supplierId: supplierId || undefined,
      });
      setIsModalOpen(false);
      setSelectedMaterialId('');
      setCustomMaterialName('');
      setQty('');
      setNotes('');
      setBatchNumber('');
      setSupplierId('');
      showAlert('Success', 'Inventory ledger transaction logged.');
      refetchLedger();
      refetchStock();
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to log transaction');
    }
  };

  const handleIssueRequest = async () => {
    if (!selectedRequest || !issueQty || !issueBatch) {
      showAlert('Error', 'Please enter quantity and batch number.');
      return;
    }

    // Try to resolve material master id
    const mat = materialsMaster.find(m => m.name.toLowerCase() === selectedRequest.material_name.toLowerCase());
    if (!mat) {
      showAlert('Error', 'Could not resolve material master item in database');
      return;
    }

    try {
      await issueMutation.mutateAsync({
        requestId: selectedRequest.id,
        projectId,
        materialMasterId: mat.id,
        materialName: selectedRequest.material_name,
        qty: parseFloat(issueQty),
        batchNumber: issueBatch.trim(),
        issuerId: currentUserId,
      });
      setIsIssueModalOpen(false);
      setSelectedRequest(null);
      setIssueQty('');
      setIssueBatch('');
      showAlert('Success', 'Material issued successfully.');
      refetchLedger();
      refetchStock();
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to issue material');
    }
  };

  const submitMaterialRequest = useSubmitMaterialRequest();

  // Create Request Modal state
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [reqMaterialName, setReqMaterialName] = useState('');
  const [reqQty, setReqQty] = useState('');
  const [reqSpec, setReqSpec] = useState('');
  const [reqNeededBy, setReqNeededBy] = useState('');
  const [reqNotes, setReqNotes] = useState('');

  const handleCreateMaterialRequest = async () => {
    if (!reqMaterialName.trim() || !reqQty || parseFloat(reqQty) <= 0) {
      showAlert('Error', 'Please enter a material name and valid quantity.');
      return;
    }
    try {
      await submitMaterialRequest.mutateAsync({
        projectId,
        requestedBy: currentUserId,
        materialName: reqMaterialName.trim(),
        qty: parseFloat(reqQty),
        spec: reqSpec.trim() || undefined,
        neededBy: reqNeededBy || undefined,
        notes: reqNotes.trim() || undefined,
      });
      setIsReqModalOpen(false);
      setReqMaterialName('');
      setReqQty('');
      setReqSpec('');
      setReqNeededBy('');
      setReqNotes('');
      showAlert('Success', 'Material request submitted successfully.');
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to submit material request');
    }
  };

  const grouped = useMemo(() => {
    const g: Record<string, MaterialRequest[]> = {};
    materialReqs.forEach(m => {
      const s = m.status;
      if (!g[s]) g[s] = [];
      g[s].push(m);
    });
    return g;
  }, [materialReqs]);

  return (
    <View style={{ gap: spacing.md }}>
      {/* Segmented Control */}
      <View style={{ flexDirection: 'row', backgroundColor: '#EAE6DF', padding: 4, borderRadius: 12 }}>
        <TouchableOpacity
          onPress={() => setSubTab('requests')}
          style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: subTab === 'requests' ? '#fff' : 'transparent', borderRadius: 10 }}
        >
          <Text style={{ fontFamily: fontFamily.semiBold, fontSize: 13, color: subTab === 'requests' ? colors.ink : colors.neutral[600] }}>Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSubTab('ledger')}
          style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: subTab === 'ledger' ? '#fff' : 'transparent', borderRadius: 10 }}
        >
          <Text style={{ fontFamily: fontFamily.semiBold, fontSize: 13, color: subTab === 'ledger' ? colors.ink : colors.neutral[600] }}>Inventory Ledger</Text>
        </TouchableOpacity>
      </View>

      {subTab === 'requests' ? (
        <>
          <SectionHeader title={`Material Requests (${materialReqs.length})`} action="Request Material" onAction={() => setIsReqModalOpen(true)} />
          {materialReqs.length === 0 && <EmptyState icon="cube-outline" text="No material requests yet" />}
          {Object.entries(grouped).map(([status, items]) => (
            <View key={status}>
              <Text style={styles.groupLabel}>{status.toUpperCase()} ({items.length})</Text>
              {items.map(m => (
                <Card key={m.id} style={styles.listCard}>
                  <View style={{ gap: 8 }}>
                    <View style={styles.listRow}>
                      <StatusBadge status={m.status} />
                      <View style={styles.listInfo}>
                        <Text style={styles.listTitle}>{m.material_name}</Text>
                        <Text style={styles.listSubtitle}>
                          Qty: {m.qty}
                          {m.spec ? ` · ${m.spec}` : ''}
                          {m.needed_by ? ` · Need by ${fmtShort(m.needed_by)}` : ''}
                        </Text>
                        {m.notes ? <Text style={styles.listSubtitle}>{m.notes}</Text> : null}
                      </View>
                    </View>
                    {m.status === 'pending' && (
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderColor: '#F0EBE1', paddingTop: 8 }}>
                        <Button
                          title="Issue Stock"
                          onPress={() => {
                            setSelectedRequest(m);
                            setIssueQty(m.qty.toString());
                            setIsIssueModalOpen(true);
                          }}
                          variant="primary"
                          style={{ paddingVertical: 4, paddingHorizontal: 12 }}
                        />
                      </View>
                    )}
                  </View>
                </Card>
              ))}
            </View>
          ))}

          {/* Create Material Request Modal */}
          <Modal visible={isReqModalOpen} animationType="slide" onRequestClose={() => setIsReqModalOpen(false)}>
            <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.md, backgroundColor: '#FAF8F5' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: colors.ink }}>Create Material Request</Text>
                <TouchableOpacity onPress={() => setIsReqModalOpen(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={24} color={colors.ink} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 12, color: colors.neutral[600] }}>
                Submit a site material requisition for glass, mullions, brackets, silicon sealant, or hardware.
              </Text>

              <Input
                label="Material Name *"
                placeholder="e.g. 12mm Toughened Glass / Sealant"
                value={reqMaterialName}
                onChangeText={setReqMaterialName}
              />

              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Quantity *"
                    keyboardType="numeric"
                    placeholder="e.g. 100"
                    value={reqQty}
                    onChangeText={setReqQty}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Spec / Grade"
                    placeholder="e.g. Grade A6"
                    value={reqSpec}
                    onChangeText={setReqSpec}
                  />
                </View>
              </View>

              <DatePickerField
                label="Needed By Date"
                value={reqNeededBy}
                onChange={setReqNeededBy}
                placeholder="Select date (e.g. YYYY-MM-DD)"
              />

              <Input
                label="Notes / Delivery Location"
                placeholder="e.g. Deliver to Tower B, 4th Floor"
                value={reqNotes}
                onChangeText={setReqNotes}
              />

              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, marginBottom: spacing['2xl'] }}>
                <Button title="Cancel" onPress={() => setIsReqModalOpen(false)} variant="secondary" style={{ flex: 1 }} />
                <Button title="Submit Request" onPress={handleCreateMaterialRequest} loading={submitMaterialRequest.isPending} variant="primary" style={{ flex: 1, backgroundColor: '#2563EB' }} />
              </View>
            </ScrollView>
          </Modal>
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontFamily: fontFamily.bold, color: colors.ink }}>Current Stock Balance</Text>
            <Button
              title="Add Transaction"
              onPress={() => setIsModalOpen(true)}
              variant="primary"
              style={{ paddingVertical: 6, paddingHorizontal: 12 }}
            />
          </View>

          {/* Stock summary card list */}
          {stockItems.length === 0 && <EmptyState icon="cube" text="No stock items registered." />}
          {stockItems.map(item => {
            const isOutOfStock = item.available_quantity <= 0;
            const isBelowMin = item.available_quantity < item.minimum_stock;
            const statusLabel = isOutOfStock ? '❌ Out of Stock' : (isBelowMin ? '⚠️ Below Minimum' : '✔ Healthy');
            const statusColor = isOutOfStock ? colors.error : (isBelowMin ? colors.warning : colors.success);
            
            return (
              <Card key={item.id} style={{ padding: spacing.md, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: colors.ink }}>{item.material_name}</Text>
                  <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: statusColor }}>{statusLabel}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <View>
                    <Text style={{ fontSize: 10, color: colors.neutral[500] }}>Current Qty</Text>
                    <Text style={{ fontSize: 12, fontFamily: fontFamily.semiBold, color: colors.ink }}>{item.current_quantity} {item.material_unit}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, color: colors.neutral[500] }}>Reserved Qty</Text>
                    <Text style={{ fontSize: 12, fontFamily: fontFamily.semiBold, color: colors.warning }}>{item.reserved_quantity}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, color: colors.neutral[500] }}>Min Limit</Text>
                    <Text style={{ fontSize: 12, fontFamily: fontFamily.semiBold, color: colors.neutral[600] }}>{item.minimum_stock}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 10, color: colors.neutral[500], fontFamily: fontFamily.bold }}>Available</Text>
                    <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: colors.primary }}>{item.available_quantity} {item.material_unit}</Text>
                  </View>
                </View>
              </Card>
            );
          })}

          {ledger.length > 0 && (
            <>
              <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: colors.ink, marginTop: spacing.md }}>Ledger Timeline Log</Text>
              {ledger.slice(0, 10).map(entry => {
                const isDeduction = entry.transaction_type === 'used' || entry.transaction_type === 'wastage' || entry.transaction_type === 'scrap' || entry.transaction_type === 'transfer';
                return (
                  <Card key={entry.id} style={{ padding: spacing.md, borderLeftWidth: 3, borderLeftColor: isDeduction ? colors.error : colors.success }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, fontFamily: fontFamily.semiBold, color: colors.ink }}>{entry.material_name}</Text>
                      <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: isDeduction ? colors.error : colors.success }}>
                        {isDeduction ? '-' : '+'}{entry.quantity}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: colors.neutral[500] }}>Type: {entry.transaction_type.replace('_', ' ')}</Text>
                      <Text style={{ fontSize: 11, color: colors.neutral[400] }}>{new Date(entry.created_at).toLocaleDateString('en-IN')}</Text>
                    </View>
                    {entry.batch_number ? (
                      <Text style={{ fontSize: 10, color: colors.neutral[500] }}>Batch: {entry.batch_number} {entry.supplier_name ? ` · Supplier: ${entry.supplier_name}` : ''}</Text>
                    ) : null}
                    {entry.notes ? <Text style={{ fontSize: 11, color: colors.neutral[600], fontStyle: 'italic', marginTop: 4 }}>"{entry.notes}"</Text> : null}
                  </Card>
                );
              })}
            </>
          )}

          {/* Add Ledger Transaction Modal */}
          <Modal visible={isModalOpen} animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
            <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}>
              <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: colors.ink }}>Log Material Transaction</Text>

              <Text style={{ fontSize: 13, fontFamily: fontFamily.semiBold, color: colors.neutral[700] }}>Select Material (Master or BOQ)</Text>
              <Picker
                selectedValue={selectedMaterialId}
                onValueChange={(val) => {
                  setSelectedMaterialId(val);
                  if (val) setCustomMaterialName('');
                }}
                style={{ backgroundColor: '#FAF9F6', borderRadius: 8 }}
              >
                <Picker.Item label="-- Select Material Master or BOQ Item --" value="" />
                {materialsMaster.map(m => (
                  <Picker.Item key={m.id} label={`${m.name} (${m.unit || 'pcs'})`} value={m.id} />
                ))}
                {boqItems.map(b => (
                  <Picker.Item key={`boq-${b.id}`} label={`BOQ: ${b.item_name} (${b.unit})`} value={b.id} />
                ))}
              </Picker>

              <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: colors.neutral[500], marginVertical: 2, textAlign: 'center' }}>
                — OR WRITE / TYPE A CUSTOM MATERIAL —
              </Text>

              <Input
                label="Custom Material Name"
                placeholder="e.g. 12mm Toughened Glass / Structural Sealant"
                value={customMaterialName}
                onChangeText={(text) => {
                  setCustomMaterialName(text);
                  if (text) setSelectedMaterialId('');
                }}
              />

              <Text style={{ fontSize: 13, fontFamily: fontFamily.semiBold, color: colors.neutral[700] }}>Transaction Type</Text>
              <Picker
                selectedValue={txType}
                onValueChange={(val) => setTxType(val as any)}
                style={{ backgroundColor: '#FAF9F6', borderRadius: 8 }}
              >
                <Picker.Item label="Opening Stock" value="opening" />
                <Picker.Item label="Purchase Received" value="received" />
                <Picker.Item label="Site Issue (Used)" value="used" />
                <Picker.Item label="Return to Supplier" value="return" />
                <Picker.Item label="Transfer to Site" value="transfer" />
                <Picker.Item label="Inventory Adjustment" value="adjustment" />
                <Picker.Item label="Wastage" value="wastage" />
                <Picker.Item label="Scrap" value="scrap" />
              </Picker>

              {txType === 'received' && (
                <>
                  <Text style={{ fontSize: 13, fontFamily: fontFamily.semiBold, color: colors.neutral[700] }}>Supplier</Text>
                  <Picker
                    selectedValue={supplierId}
                    onValueChange={(val) => setSupplierId(val)}
                    style={{ backgroundColor: '#FAF9F6', borderRadius: 8 }}
                  >
                    <Picker.Item label="-- Select Supplier --" value="" />
                    {suppliers.map(s => (
                      <Picker.Item key={s.id} label={s.name} value={s.id} />
                    ))}
                  </Picker>
                </>
              )}

              <Input label="Batch / Lot Number" placeholder="e.g. B-012" value={batchNumber} onChangeText={setBatchNumber} />
              <Input label="Quantity" keyboardType="numeric" placeholder="0" value={qty} onChangeText={setQty} />
              <Input label="Notes / Reference Details" placeholder="e.g. Unloaded from truck MH-12" value={notes} onChangeText={setNotes} />

              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
                <Button title="Cancel" onPress={() => setIsModalOpen(false)} variant="secondary" style={{ flex: 1 }} />
                <Button title="Save Entry" onPress={handleSaveEntry} variant="primary" style={{ flex: 1 }} />
              </View>
            </ScrollView>
          </Modal>

          {/* Issue Material Request Modal */}
          <Modal visible={isIssueModalOpen} animationType="slide" onRequestClose={() => setIsIssueModalOpen(false)}>
            <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}>
              <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: colors.ink }}>Issue Material Request</Text>
              <Text style={{ fontSize: 13, color: colors.neutral[600] }}>
                Material: {selectedRequest?.material_name} (Requested: {selectedRequest?.qty})
              </Text>

              <Input label="Issue Quantity" keyboardType="numeric" placeholder="0" value={issueQty} onChangeText={setIssueQty} />
              <Input label="Allocated Batch Number" placeholder="e.g. B-012" value={issueBatch} onChangeText={setIssueBatch} />

              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
                <Button title="Cancel" onPress={() => setIsIssueModalOpen(false)} variant="secondary" style={{ flex: 1 }} />
                <Button title="Issue Stock" onPress={handleIssueRequest} variant="primary" style={{ flex: 1 }} />
              </View>
            </ScrollView>
          </Modal>
        </>
      )}
    </View>
  );
}

// Variations
function VariationsTab({ projectId, currentUserId }: { projectId: string; currentUserId: string }) {
  const { data: variations = [], refetch } = useProjectVariations(projectId);
  const { data: materialsMaster = [] } = useMaterialMaster();
  const createVariationMutation = useCreateVariation();
  const approveVariationMutation = useApproveVariation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<{ material_master_id: string | null; item_name: string; quantity: number; unit: string; rate: number }[]>([]);

  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('sqm');
  const [rate, setRate] = useState('');

  const handleAddItem = () => {
    let name = customItemName.trim();
    let matId: string | null = null;
    if (selectedMaterialId) {
      const mat = materialsMaster.find(m => m.id === selectedMaterialId);
      if (mat) {
        name = mat.name;
        matId = mat.id;
      }
    }

    if (!name || !qty || !rate) {
      showAlert('Error', 'Please fill item name/material, quantity, and rate.');
      return;
    }

    setItems(prev => [
      ...prev,
      {
        material_master_id: matId,
        item_name: name,
        quantity: parseFloat(qty),
        unit,
        rate: parseFloat(rate),
      }
    ]);

    setSelectedMaterialId('');
    setCustomItemName('');
    setQty('');
    setRate('');
  };

  const handleSaveVariation = async () => {
    if (!title.trim() || items.length === 0) {
      showAlert('Error', 'Please enter a title and add at least one item.');
      return;
    }
    try {
      await createVariationMutation.mutateAsync({
        projectId,
        title: title.trim(),
        description: description.trim(),
        items,
      });
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setItems([]);
      showAlert('Success', 'Variation created successfully.');
      refetch();
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to create variation');
    }
  };

  const totalExtra = variations
    .filter(v => v.status === 'approved')
    .reduce((acc, v) => acc + v.extra_amount, 0);

  return (
    <View style={{ gap: spacing.md }}>
      <Card style={{ backgroundColor: '#FAF9F6', padding: spacing.md, borderWidth: 1, borderColor: colors.neutral[200] }}>
        <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: colors.neutral[500], textTransform: 'uppercase' }}>
          Total Approved Variations Value
        </Text>
        <Text style={{ fontSize: 22, fontFamily: fontFamily.bold, color: colors.success, marginTop: 4 }}>
          ₹{totalExtra.toLocaleString('en-IN')}
        </Text>
      </Card>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 15, fontFamily: fontFamily.bold, color: colors.ink }}>
          Variations / Change Orders
        </Text>
        <Button
          title="+ Add Variation"
          onPress={() => setIsModalOpen(true)}
          variant="primary"
          style={{ paddingVertical: 6, paddingHorizontal: 12 }}
        />
      </View>

      {variations.length === 0 ? (
        <EmptyState icon="document-text-outline" text="No variations or change orders recorded yet." />
      ) : (
        variations.map(v => (
          <Card key={v.id} style={{ padding: spacing.md, gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: colors.ink }}>
                  Variation #{v.number}: {v.title}
                </Text>
                {v.description ? <Text style={{ fontSize: 11, color: colors.neutral[500] }}>{v.description}</Text> : null}
              </View>
              <StatusBadge status={v.status} />
            </View>

            <View style={{ height: 1, backgroundColor: colors.neutral[100], marginVertical: 4 }} />

            {v.items?.map((it, idx) => (
              <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                <Text style={{ color: colors.neutral[700], fontSize: 12 }}>• {it.item_name} ({it.quantity} {it.unit} @ ₹{it.rate})</Text>
                <Text style={{ fontFamily: fontFamily.semiBold, color: colors.ink, fontSize: 12 }}>₹{it.amount.toLocaleString('en-IN')}</Text>
              </View>
            ))}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <Text style={{ fontSize: 12, fontFamily: fontFamily.semiBold, color: colors.neutral[600] }}>Total Extra Cost:</Text>
              <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: colors.ink }}>₹{v.extra_amount.toLocaleString('en-IN')}</Text>
            </View>

            {v.status === 'pending' && (
              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
                <TouchableOpacity
                  onPress={() => approveVariationMutation.mutate({ variationId: v.id, status: 'approved', approverId: currentUserId })}
                  style={{ flex: 1, backgroundColor: colors.successBg, paddingVertical: 8, borderRadius: radius.md, alignItems: 'center' }}
                >
                  <Text style={{ color: colors.success, fontFamily: fontFamily.bold, fontSize: 12 }}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => approveVariationMutation.mutate({ variationId: v.id, status: 'rejected', approverId: currentUserId })}
                  style={{ flex: 1, backgroundColor: colors.errorBg, paddingVertical: 8, borderRadius: radius.md, alignItems: 'center' }}
                >
                  <Text style={{ color: colors.error, fontFamily: fontFamily.bold, fontSize: 12 }}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        ))
      )}

      {/* Add Variation Modal */}
      <Modal visible={isModalOpen} animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}>
          <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: colors.ink }}>Create New Variation</Text>

          <Input label="Title / Heading" placeholder="e.g. Additional bay glass installation" value={title} onChangeText={setTitle} />
          <Input label="Description" placeholder="Provide reason or client directive details" value={description} onChangeText={setDescription} />

          <View style={{ height: 1, backgroundColor: colors.neutral[200], marginVertical: 8 }} />

          <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: colors.neutral[700] }}>Add Variation Material/Item</Text>

          <Picker
            selectedValue={selectedMaterialId}
            onValueChange={(val) => setSelectedMaterialId(val)}
            style={{ backgroundColor: '#FAF9F6', borderRadius: 8 }}
          >
            <Picker.Item label="-- Select Material Master (Optional) --" value="" />
            {materialsMaster.map(m => (
              <Picker.Item key={m.id} label={`${m.name} (${m.unit})`} value={m.id} />
            ))}
          </Picker>

          {!selectedMaterialId && (
            <Input label="Or Enter Custom Item Name" placeholder="e.g. Special brackets" value={customItemName} onChangeText={setCustomItemName} />
          )}

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Input label="Quantity" keyboardType="numeric" placeholder="100" value={qty} onChangeText={setQty} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Unit" placeholder="m2" value={unit} onChangeText={setUnit} />
            </View>
          </View>

          <Input label="Unit Rate (₹)" keyboardType="numeric" placeholder="1500" value={rate} onChangeText={setRate} />

          <Button title="+ Add Item to List" onPress={handleAddItem} variant="secondary" />

          {items.length > 0 && (
            <Card style={{ padding: spacing.md, marginTop: spacing.sm, gap: 4 }}>
              <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: colors.neutral[500] }}>Items Added:</Text>
              {items.map((it, idx) => (
                <Text key={idx} style={{ fontSize: 12, color: colors.neutral[700] }}>
                  {it.item_name}: {it.quantity} {it.unit} @ ₹{it.rate}
                </Text>
              ))}
            </Card>
          )}

          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
            <Button title="Cancel" onPress={() => setIsModalOpen(false)} variant="secondary" style={{ flex: 1 }} />
            <Button title="Save Variation" onPress={handleSaveVariation} variant="primary" style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}


// Expenses
function ExpensesTab({
  expenses,
  projectId,
  currentUserId,
}: {
  expenses: Expense[];
  projectId: string;
  currentUserId: string;
}) {
  const addExpense = useAddExpense();
  const [showAdd, setShowAdd] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  async function handleAdd() {
    const amt = parseFloat(amount);
    if (!desc.trim() || isNaN(amt) || amt <= 0) {
      showAlert('Validation', 'Please enter a description and valid amount');
      return;
    }
    try {
      await addExpense.mutateAsync({
        projectId,
        description: desc.trim(),
        amount: amt,
        category: category.trim() || null,
        enteredBy: currentUserId,
      });
      setDesc(''); setAmount(''); setCategory('');
      setShowAdd(false);
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to add expense');
    }
  }

  const byCat = useMemo(() => {
    const g: Record<string, number> = {};
    expenses.forEach(e => {
      const cat = e.category || 'other';
      g[cat] = (g[cat] || 0) + e.amount;
    });
    return g;
  }, [expenses]);

  return (
    <>
      <SectionHeader title={`Expenses (${expenses.length})`} action="Add" onAction={() => setShowAdd(true)} />

      {/* Total card */}
      {expenses.length > 0 && (
        <Card style={{ ...styles.sectionCard, marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.sectionCardTitle}>Total Expenses</Text>
            <Text style={[typography.h5, { color: colors.error }]}>{fmtINR(total)}</Text>
          </View>
          {Object.entries(byCat).map(([cat, amt]) => (
            <View key={cat} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
              <Text style={styles.listSubtitle}>{cat}</Text>
              <Text style={styles.listSubtitle}>{fmtINR(amt)}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Add Modal */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Expense</Text>
            <TextInput style={styles.modalInput} placeholder="Description..." value={desc} onChangeText={setDesc} />
            <TextInput
              style={styles.modalInput}
              placeholder="Amount (₹)..."
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            <TextInput style={styles.modalInput} placeholder="Category (optional)..." value={category} onChangeText={setCategory} />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button title="Cancel" variant="tertiary" onPress={() => setShowAdd(false)} style={{ flex: 1 }} />
              <Button title="Add" onPress={handleAdd} loading={addExpense.isPending} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {expenses.length === 0 && <EmptyState icon="receipt-outline" text="No expenses recorded yet" />}
      {expenses.map(e => (
        <Card key={e.id} style={styles.listCard}>
          <View style={styles.listRow}>
            <View style={[styles.iconBox, { backgroundColor: colors.errorBg }]}>
              <Ionicons name="receipt" size={20} color={colors.error} />
            </View>
            <View style={styles.listInfo}>
              <Text style={styles.listTitle}>{e.description}</Text>
              <Text style={styles.listSubtitle}>
                {e.category ? `${e.category} · ` : ''}{fmt(e.date, { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <Text style={[styles.amountText, { color: colors.error }]}>{fmtINR(e.amount)}</Text>
          </View>
        </Card>
      ))}
    </>
  );
}

// Payments
function PaymentsTab({ payments, projectId }: { payments: Payment[]; projectId: string }) {
  const updatePayment = useUpdatePayment();
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();

  const [showAdd, setShowAdd] = useState(false);
  const [milestoneName, setMilestoneName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  const totalBilled = payments.reduce((s, p) => s + p.amount, 0);
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalPending = totalBilled - totalPaid;
  const paidPct = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  async function handleToggle(p: Payment) {
    const next = p.status === 'paid' ? 'pending' : 'paid';
    try {
      await updatePayment.mutateAsync({ id: p.id, status: next });
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to update payment');
    }
  }

  async function handleAdd() {
    const amt = parseFloat(amount);
    if (!milestoneName.trim()) {
      showAlert('Validation', 'Please enter a milestone name');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      showAlert('Validation', 'Please enter a valid amount');
      return;
    }
    try {
      await createPayment.mutateAsync({
        projectId,
        milestoneName: milestoneName.trim(),
        amount: amt,
        dueDate: dueDate || null,
      });
      setMilestoneName('');
      setAmount('');
      setDueDate('');
      setShowAdd(false);
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to add payment milestone');
    }
  }

  function handleDelete(p: Payment) {
    showAlert(
      'Delete milestone',
      `Remove "${p.milestone_name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePayment.mutateAsync({ id: p.id });
            } catch (e: any) {
              showAlert('Error', e.message || 'Failed to delete payment');
            }
          },
        },
      ],
    );
  }

  return (
    <>
      <SectionHeader title="Payment Milestones" action="Add" onAction={() => setShowAdd(true)} />

      {/* â”€â”€ Gradient Hero Summary Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {payments.length > 0 && (
        <View style={payStyles.heroWrap}>
          <LinearGradient
            colors={['#695030', '#918050', '#C8B79C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={payStyles.heroCard}
          >
            {/* Glow halo behind the percentage ring */}
            <View style={payStyles.heroGlow} pointerEvents="none" />

            <View style={payStyles.heroTop}>
              <View style={payStyles.ringWrap}>
                <View style={payStyles.ringOuter}>
                  <Text style={payStyles.ringPct}>{paidPct}%</Text>
                  <Text style={payStyles.ringLabel}>Collected</Text>
                </View>
              </View>
              <View style={payStyles.heroStats}>
                <View style={payStyles.heroStatRow}>
                  <View style={[payStyles.heroDot, { backgroundColor: '#BBF7D0' }]} />
                  <Text style={payStyles.heroStatLabel}>Received</Text>
                  <Text style={payStyles.heroStatValue}>{fmtINR(totalPaid)}</Text>
                </View>
                <View style={payStyles.heroStatRow}>
                  <View style={[payStyles.heroDot, { backgroundColor: '#FDE68A' }]} />
                  <Text style={payStyles.heroStatLabel}>Pending</Text>
                  <Text style={payStyles.heroStatValue}>{fmtINR(totalPending)}</Text>
                </View>
                <View style={payStyles.heroStatRow}>
                  <View style={[payStyles.heroDot, { backgroundColor: 'rgba(255,255,255,0.85)' }]} />
                  <Text style={payStyles.heroStatLabel}>Total</Text>
                  <Text style={payStyles.heroStatValue}>{fmtINR(totalBilled)}</Text>
                </View>
              </View>
            </View>

            {/* Gradient progress bar */}
            <View style={payStyles.barTrack}>
              <LinearGradient
                colors={['#86EFAC', '#22C55E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[payStyles.barFill, { width: `${paidPct}%` }]}
              />
            </View>
          </LinearGradient>
        </View>
      )}

      {/* â”€â”€ Add Payment Modal (glassy + gradient button) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={payStyles.overlay}>
          <View style={payStyles.sheet}>
            {/* Glow accent at the top of the sheet */}
            <LinearGradient
              colors={['#695030', '#918050']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={payStyles.sheetAccent}
            />
            <View style={payStyles.sheetBody}>
              <View style={payStyles.sheetHeader}>
                <View style={payStyles.sheetIcon}>
                  <LinearGradient
                    colors={['#695030', '#918050']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={payStyles.sheetIconGrad}
                  >
                    <Ionicons name="cash" size={22} color={colors.white} />
                  </LinearGradient>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={payStyles.sheetTitle}>Add Payment Milestone</Text>
                  <Text style={payStyles.sheetSubtitle}>Track a new billing stage for this project</Text>
                </View>
              </View>

              {/* Field: Milestone name */}
              <Text style={payStyles.fieldLabel}>Milestone name</Text>
              <TextInput
                style={payStyles.input}
                placeholder="e.g. Booking, Foundation, Finishing..."
                placeholderTextColor={colors.neutral[400]}
                value={milestoneName}
                onChangeText={setMilestoneName}
              />

              {/* Field: Amount */}
              <Text style={payStyles.fieldLabel}>Amount (₹)</Text>
              <View style={payStyles.amountWrap}>
                <Text style={payStyles.amountPrefix}>₹</Text>
                <TextInput
                  style={payStyles.amountInput}
                  placeholder="0"
                  placeholderTextColor={colors.neutral[400]}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Field: Due date */}
              <DatePickerField
                label="Due date (optional)"
                value={dueDate}
                onChange={setDueDate}
                placeholder="Select milestone due date"
              />

              {/* Action buttons */}
              <View style={payStyles.actionRow}>
                <TouchableOpacity
                  style={payStyles.cancelBtn}
                  onPress={() => setShowAdd(false)}
                  activeOpacity={0.7}
                >
                  <Text style={payStyles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={payStyles.addBtnWrap}
                  onPress={handleAdd}
                  disabled={createPayment.isPending}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#695030', '#918050']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={payStyles.addBtn}
                  >
                    {createPayment.isPending ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <>
                        <Ionicons name="add-circle" size={18} color={colors.white} />
                        <Text style={payStyles.addBtnText}>Add Milestone</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* â”€â”€ Empty State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {payments.length === 0 && (
        <View style={payStyles.emptyWrap}>
          <LinearGradient
            colors={['#FFFBEB', '#F9F9F8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={payStyles.emptyCard}
          >
            <View style={payStyles.emptyIconWrap}>
              <LinearGradient
                colors={['#918050', '#C8B79C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={payStyles.emptyIconGrad}
              >
                <Ionicons name="cash-outline" size={32} color={colors.white} />
              </LinearGradient>
            </View>
            <Text style={payStyles.emptyTitle}>No milestones yet</Text>
            <Text style={payStyles.emptySubtitle}>Tap "Add" above to create your first payment milestone.</Text>
          </LinearGradient>
        </View>
      )}

      {/* â”€â”€ Milestone cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {payments.map(p => {
        const isPaid = p.status === 'paid';
        return (
          <View key={p.id} style={payStyles.milestoneWrap}>
            <Card style={payStyles.milestoneCard}>
              <View style={payStyles.milestoneRow}>
                <TouchableOpacity
                  onPress={() => handleToggle(p)}
                  disabled={updatePayment.isPending}
                  hitSlop={8}
                >
                  <LinearGradient
                    colors={isPaid ? ['#86EFAC', '#22C55E'] : ['#FDE68A', '#F59E0B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={payStyles.milestoneIcon}
                  >
                    <Ionicons
                      name={isPaid ? 'checkmark-circle' : 'time'}
                      size={20}
                      color={colors.white}
                    />
                  </LinearGradient>
                </TouchableOpacity>

                <View style={payStyles.milestoneInfo}>
                  <Text style={payStyles.milestoneName}>{p.milestone_name}</Text>
                  <Text style={payStyles.milestoneMeta}>
                    {p.due_date ? `Due ${fmtShort(p.due_date)}` : 'No due date'}
                    {p.paid_at ? ` · Paid ${fmtShort(p.paid_at)}` : ''}
                  </Text>
                </View>

                <View style={payStyles.milestoneRight}>
                  <Text style={[payStyles.milestoneAmount, { color: isPaid ? colors.success : colors.ink }]}>
                    {fmtINR(p.amount)}
                  </Text>
                  <View style={[payStyles.statusPill, { backgroundColor: isPaid ? colors.successBg : colors.warningBg }]}>
                    <View style={[payStyles.statusDot, { backgroundColor: isPaid ? colors.success : colors.warning }]} />
                    <Text style={[payStyles.statusText, { color: isPaid ? colors.success : colors.warning }]}>
                      {p.status}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => handleDelete(p)}
                  disabled={deletePayment.isPending}
                  hitSlop={8}
                  style={payStyles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.neutral[400]} />
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        );
      })}
    </>
  );
}

// Communication
function CommunicationTab({
  profileId,
  projectId,
  router,
}: {
  profileId: string;
  projectId: string;
  router: any;
}) {
  const { data: conversations, isLoading } = useMyConversations(profileId);
  const projectConvs = (conversations || []).filter(c => c.project_id === projectId);

  return (
    <>
      <SectionHeader title="Project Communication" />
      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing['4xl'] }} />}

      {!isLoading && projectConvs.length === 0 && (
        <EmptyState icon="chatbubbles-outline" text="No conversations for this project yet" />
      )}

      {!isLoading && projectConvs.map(conv => (
        <TouchableOpacity
          key={conv.id}
          onPress={() => router.push({ pathname: '/(admin)/chat' as any, params: { conversationId: conv.id } })}
        >
          <Card style={styles.listCard} variant="interactive">
            <View style={styles.listRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.infoBg }]}>
                <Ionicons name="chatbubbles" size={20} color={colors.primary} />
              </View>
              <View style={styles.listInfo}>
                <Text style={styles.listTitle}>Project Chat</Text>
                <Text style={styles.listSubtitle}>
                  {new Date(conv.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
            </View>
          </Card>
        </TouchableOpacity>
      ))}

      <Card style={{ ...styles.sectionCard, backgroundColor: colors.infoBg, marginTop: spacing.md }}>
        <Text style={[typography.caption, { color: colors.info }]}>
          ðŸ’¬ Project conversations include all team members assigned to this project. Use the Messages tab in the main nav to start a new conversation.
        </Text>
      </Card>
    </>
  );
}

// Timeline
function TimelineTab({ projectId }: { projectId: string }) {
  const { data: events = [], isLoading } = useProjectEvents(projectId);
  const [filter, setFilter] = useState<'All' | 'DPR' | 'Inventory' | 'QA' | 'Variations' | 'BOQ' | 'Photos'>('All');
  const [selectedEvent, setSelectedEvent] = useState<ProjectEvent | null>(null);

  if (isLoading) {
    return <ActivityIndicator color="#7E6144" style={{ marginTop: spacing.xl }} />;
  }

  const getEventMeta = (type: string) => {
    switch (type) {
      case 'BOQ_IMPORTED': return { label: 'BOQ', icon: 'document-text', color: '#4F46E5' };
      case 'DPR_SUBMITTED': return { label: 'DPR', icon: 'document', color: '#F59E0B' };
      case 'DPR_APPROVED': return { label: 'DPR', icon: 'checkmark-circle', color: '#10B981' };
      case 'VARIATION_APPROVED': return { label: 'Variations', icon: 'trending-up', color: '#10B981' };
      case 'QA_PASSED': return { label: 'QA', icon: 'shield-checkmark', color: '#10B981' };
      case 'SNAG_CREATED': return { label: 'QA', icon: 'alert-circle', color: '#EF4444' };
      case 'MATERIAL_ISSUED': return { label: 'Inventory', icon: 'cube-outline', color: '#6B7280' };
      case 'STOCK_RECEIVED': return { label: 'Inventory', icon: 'cloud-download', color: '#3B82F6' };
      default: return { label: 'Other', icon: 'flag', color: colors.primary };
    }
  };

  const filteredEvents = events.filter(ev => {
    if (filter === 'All') return true;
    const meta = getEventMeta(ev.event_type);
    if (filter === 'Photos') {
      return ev.metadata && ev.metadata.photos && ev.metadata.photos.length > 0;
    }
    return meta.label.toLowerCase() === filter.toLowerCase();
  });

  return (
    <>
      <SectionHeader title="Project Activity Log" />

      {/* Filter Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: spacing.md }}>
        {['All', 'DPR', 'Inventory', 'QA', 'Variations', 'BOQ', 'Photos'].map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setFilter(cat as any)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: filter === cat ? colors.primary : '#EAE6DF',
            }}
          >
            <Text style={{ fontSize: 11, fontFamily: fontFamily.semiBold, color: filter === cat ? '#fff' : colors.neutral[700] }}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filteredEvents.length === 0 && <EmptyState icon="time-outline" text={`No ${filter === 'All' ? '' : filter.toLowerCase() + ' '}activity events logged.`} />}
      {filteredEvents.map((ev, i) => {
        const meta = getEventMeta(ev.event_type);
        return (
          <TouchableOpacity
            key={ev.id}
            onPress={() => setSelectedEvent(ev)}
            style={styles.timelineRow}
            activeOpacity={0.7}
          >
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineDot, { backgroundColor: meta.color }]}>
                <Ionicons name={meta.icon as any} size={12} color={colors.white} />
              </View>
              {i < filteredEvents.length - 1 && <View style={styles.timelineLine} />}
            </View>
            <View style={[styles.timelineContent, { backgroundColor: '#FFFDF9', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#F0EBE1' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: meta.color }}>{meta.label.toUpperCase()}</Text>
                <Text style={{ fontSize: 9, color: colors.neutral[400] }}>{new Date(ev.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <Text style={[styles.timelineLabel, { fontSize: 12, marginTop: 2 }]}>{ev.description}</Text>
              {ev.created_name ? (
                <Text style={{ fontSize: 10, color: colors.neutral[500], marginTop: 4 }}>By: {ev.created_name}</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Details Modal */}
      <Modal visible={!!selectedEvent} animationType="slide" onRequestClose={() => setSelectedEvent(null)}>
        <View style={{ padding: spacing.xl, gap: spacing.md, flex: 1, backgroundColor: '#FAF9F6' }}>
          <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: colors.ink }}>Event Details</Text>
          {selectedEvent && (
            <Card style={{ padding: spacing.md, gap: spacing.sm }}>
              <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: getEventMeta(selectedEvent.event_type).color }}>
                {selectedEvent.event_type.replace('_', ' ')}
              </Text>
              <Text style={{ fontSize: 14, color: colors.ink }}>{selectedEvent.description}</Text>
              <Text style={{ fontSize: 11, color: colors.neutral[500] }}>
                Logged at: {new Date(selectedEvent.created_at).toLocaleString('en-IN')}
              </Text>
              {selectedEvent.created_name && (
                <Text style={{ fontSize: 11, color: colors.neutral[500] }}>Operator: {selectedEvent.created_name}</Text>
              )}
              {selectedEvent.metadata && (
                <View style={{ marginTop: spacing.md, borderTopWidth: 1, borderColor: '#F0EBE1', paddingTop: spacing.md }}>
                  <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: colors.neutral[700], marginBottom: 4 }}>Metadata Payload</Text>
                  <Text style={{ fontSize: 11, fontFamily: fontFamily.medium, color: colors.neutral[600], backgroundColor: '#EAE6DF', padding: 8, borderRadius: 6 }}>
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </Text>
                </View>
              )}
            </Card>
          )}
          <Button title="Close" onPress={() => setSelectedEvent(null)} variant="primary" style={{ marginTop: 'auto' }} />
        </View>
      </Modal>
    </>
  );
}

// Reports
function ReportsTab({
  project,
  employees,
  payments,
  materialReqs,
  dprs,
  tasks,
  expenses,
}: {
  project: any;
  employees: any[];
  payments: Payment[];
  materialReqs: MaterialRequest[];
  dprs: Dpr[];
  tasks: Task[];
  expenses: Expense[];
}) {
  const totalBilled = payments.reduce((s, p) => s + p.amount, 0);
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const tasksDone = tasks.filter(t => t.status === 'done').length;
  const dprApproved = dprs.filter(d => d.status === 'approved').length;

  return (
    <>
      <SectionHeader title="Project Reports" />
      <MISAnalyticsCharts tasks={tasks} overallProgressPct={project.progress_pct} />
      <Card style={styles.reportCard}>
        <Text style={styles.sectionCardTitle}>ðŸ“Š Project Summary</Text>
        <ReportRow label="Progress" value={`${project.progress_pct}%`} />
        <ReportRow label="Stage" value={project.stage || '—'} />
        <ReportRow label="Start Date" value={fmt(project.start_date)} />
        <ReportRow label="Expected End" value={fmt(project.expected_end_date)} />
      </Card>

      <Card style={styles.reportCard}>
        <Text style={styles.sectionCardTitle}>ðŸ‘¥ Team</Text>
        <ReportRow label="Total Members" value={employees.length.toString()} />
        <ReportRow label="Active" value={employees.filter(e => e.status === 'active').length.toString()} />
      </Card>

      <Card style={styles.reportCard}>
        <Text style={styles.sectionCardTitle}>✅ Tasks</Text>
        <ReportRow label="Total Tasks" value={tasks.length.toString()} />
        <ReportRow label="Done" value={tasksDone.toString()} />
        <ReportRow label="Pending" value={tasks.filter(t => t.status === 'pending').length.toString()} />
        <ReportRow label="Blocked" value={tasks.filter(t => t.status === 'blocked').length.toString()} />
      </Card>

      <Card style={styles.reportCard}>
        <Text style={styles.sectionCardTitle}>ðŸ“‹ DPRs</Text>
        <ReportRow label="Total Submitted" value={dprs.length.toString()} />
        <ReportRow label="Approved" value={dprApproved.toString()} />
        <ReportRow label="Pending Review" value={dprs.filter(d => d.status === 'submitted').length.toString()} />
      </Card>

      <Card style={styles.reportCard}>
        <Text style={styles.sectionCardTitle}>ðŸ’° Financials</Text>
        <ReportRow label="Total Billed" value={fmtINR(totalBilled)} />
        <ReportRow label="Collected" value={fmtINR(totalPaid)} />
        <ReportRow label="Outstanding" value={fmtINR(totalBilled - totalPaid)} />
        <ReportRow label="Site Expenses" value={fmtINR(totalExpenses)} />
      </Card>

      <Card style={styles.reportCard}>
        <Text style={styles.sectionCardTitle}>ðŸ“¦ Materials</Text>
        <ReportRow label="Total Requests" value={materialReqs.length.toString()} />
        <ReportRow label="Approved" value={materialReqs.filter(m => m.status === 'approved').length.toString()} />
        <ReportRow label="Pending" value={materialReqs.filter(m => m.status === 'pending').length.toString()} />
      </Card>
    </>
  );
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reportRow}>
      <Text style={styles.reportLabel}>{label}</Text>
      <Text style={styles.reportValue}>{value}</Text>
    </View>
  );
}

// Procurement Tab
function ProcurementTab({ projectId, companyId }: { projectId: string; companyId: string }) {
  const [activeSubTab, setActiveSubTab] = useState<'PO' | 'GRN'>('PO');
  const { data: pos = [], isLoading: poLoading } = usePurchaseOrders(projectId);
  const { data: grns = [], isLoading: grnLoading } = useGoodsReceivedNotes(projectId);
  const { data: suppliers = [] } = useSuppliers();
  const { data: materials = [] } = useMaterialMaster();

  const createPO = useCreatePurchaseOrder();
  const createGRN = useCreateGoodsReceivedNote();

  // PO Form states
  const [showPOModal, setShowPOModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [poRemarks, setPoRemarks] = useState('');
  const [poTerms, setPoTerms] = useState('');
  const [poItems, setPoItems] = useState<{ material_master_id: string; qty_ordered: number; rate: number }[]>([]);

  // Item builder states
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [itemRate, setItemRate] = useState('');

  // GRN Form states
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [grnNumber, setGrnNumber] = useState('');
  const [deliveryChallan, setDeliveryChallan] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [inspectionStatus, setInspectionStatus] = useState<'passed' | 'failed' | 'partial'>('passed');
  const [grnItems, setGrnItems] = useState<{ purchase_order_item_id: string; qty_received: number; qty_accepted: number; qty_rejected: number; rejection_reason?: string; batch_number: string }[]>([]);

  const handleAddPOItem = () => {
    if (!selectedMaterial || !itemQty || !itemRate) return;
    setPoItems([...poItems, {
      material_master_id: selectedMaterial,
      qty_ordered: parseFloat(itemQty),
      rate: parseFloat(itemRate),
    }]);
    setSelectedMaterial('');
    setItemQty('');
    setItemRate('');
  };

  const handleCreatePOSubmit = async () => {
    if (!selectedSupplier || !poNumber || poItems.length === 0) {
      alert('Please fill required details and add at least one item');
      return;
    }
    const currentUserId = (await supabase.auth.getUser()).data.user?.id || '';
    
    await createPO.mutateAsync({
      projectId,
      companyId,
      supplierId: selectedSupplier,
      poNumber,
      expectedDeliveryDate: deliveryDate || null,
      deliveryAddress: deliveryAddress || null,
      currency: 'INR',
      remarks: poRemarks || null,
      termsConditions: poTerms || null,
      items: poItems,
      createdBy: currentUserId,
    });

    setShowPOModal(false);
    setSelectedSupplier('');
    setPoNumber('');
    setDeliveryDate('');
    setDeliveryAddress('');
    setPoRemarks('');
    setPoTerms('');
    setPoItems([]);
  };

  const handleCreateGRNSubmit = async () => {
    if (!selectedPO || !grnNumber || grnItems.length === 0) {
      alert('Please fill required details');
      return;
    }
    const invalidItem = grnItems.find(it => it.qty_accepted + it.qty_rejected !== it.qty_received);
    if (invalidItem) {
      alert('Accepted quantity + Rejected quantity must equal Received quantity.');
      return;
    }

    const currentUserId = (await supabase.auth.getUser()).data.user?.id || '';

    await createGRN.mutateAsync({
      companyId,
      purchaseOrderId: selectedPO.id,
      grnNumber,
      receivedBy: currentUserId,
      deliveryChallan: deliveryChallan || null,
      invoiceNumber: invoiceNumber || null,
      vehicleNumber: vehicleNumber || null,
      driverName: driverName || null,
      driverPhone: driverPhone || null,
      inspectionStatus,
      items: grnItems,
    });

    setShowGRNModal(false);
    setSelectedPO(null);
    setGrnNumber('');
    setDeliveryChallan('');
    setInvoiceNumber('');
    setVehicleNumber('');
    setDriverName('');
    setDriverPhone('');
    setInspectionStatus('passed');
    setGrnItems([]);
  };

  return (
    <>
      <SectionHeader title="Procurement & GRN" />

      {/* Sub-tab navigation */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <TouchableOpacity
          onPress={() => setActiveSubTab('PO')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: activeSubTab === 'PO' ? colors.primary : '#EAE6DF',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: fontFamily.bold, color: activeSubTab === 'PO' ? '#fff' : colors.neutral[700], fontSize: 13 }}>
            Purchase Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveSubTab('GRN')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: activeSubTab === 'GRN' ? colors.primary : '#EAE6DF',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: fontFamily.bold, color: activeSubTab === 'GRN' ? '#fff' : colors.neutral[700], fontSize: 13 }}>
            Goods Received Notes
          </Text>
        </TouchableOpacity>
      </View>

      {activeSubTab === 'PO' ? (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: colors.neutral[800] }}>POs Directory</Text>
            <TouchableOpacity onPress={() => setShowPOModal(true)} style={{ backgroundColor: '#7E6144', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontFamily: fontFamily.bold }}>+ New PO</Text>
            </TouchableOpacity>
          </View>

          {poLoading && <ActivityIndicator color="#7E6144" />}
          {pos.length === 0 && <EmptyState icon="document-text-outline" text="No purchase orders raised yet" />}
          {pos.map((po) => (
            <Card key={po.id} style={{ padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: '#F0EBE1', backgroundColor: '#FFFDF9' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontFamily: fontFamily.bold }}>{po.po_number}</Text>
                <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: po.status === 'fully_received' ? '#D1FAE5' : '#FEF3C7' }}>
                  <Text style={{ fontSize: 9, fontFamily: fontFamily.bold, color: po.status === 'fully_received' ? '#065F46' : '#92400E' }}>
                    {po.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: colors.neutral[600], marginTop: 4 }}>Supplier: {po.supplier_name}</Text>
              <Text style={{ fontSize: 12, color: colors.neutral[700], fontFamily: fontFamily.semiBold, marginTop: 4 }}>Total: ₹{po.total_amount.toLocaleString('en-IN')}</Text>
              {po.expected_delivery_date && (
                <Text style={{ fontSize: 11, color: colors.neutral[500], marginTop: 4 }}>Expected Delivery: {po.expected_delivery_date}</Text>
              )}
              {po.items && po.items.length > 0 && (
                <View style={{ borderTopWidth: 1, borderColor: '#F0EBE1', marginTop: 8, paddingTop: 8 }}>
                  <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: colors.neutral[700] }}>Items Ordered:</Text>
                  {po.items.map((it: any) => (
                    <Text key={it.id} style={{ fontSize: 11, color: colors.neutral[600] }}>
                      • {it.material_name} : {it.qty_ordered} units @ ₹{it.rate}/unit (Received: {it.qty_received})
                    </Text>
                  ))}
                </View>
              )}
            </Card>
          ))}
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: colors.neutral[800] }}>GRNs History</Text>
            <TouchableOpacity onPress={() => setShowGRNModal(true)} style={{ backgroundColor: '#7E6144', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontFamily: fontFamily.bold }}>+ Add GRN Receipt</Text>
            </TouchableOpacity>
          </View>

          {grnLoading && <ActivityIndicator color="#7E6144" />}
          {grns.length === 0 && <EmptyState icon="cloud-download-outline" text="No goods received receipts logged" />}
          {grns.map((grn) => (
            <Card key={grn.id} style={{ padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: '#F0EBE1', backgroundColor: '#FFFDF9' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontFamily: fontFamily.bold }}>GRN: {grn.grn_number}</Text>
                <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: grn.inspection_status === 'passed' ? '#D1FAE5' : '#FEE2E2' }}>
                  <Text style={{ fontSize: 9, fontFamily: fontFamily.bold, color: grn.inspection_status === 'passed' ? '#065F46' : '#991B1B' }}>
                    {grn.inspection_status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: colors.neutral[500], marginTop: 2 }}>Received Date: {grn.received_date}</Text>
              {grn.vehicle_number && (
                <Text style={{ fontSize: 11, color: colors.neutral[600], marginTop: 2 }}>Vehicle: {grn.vehicle_number} | Driver: {grn.driver_name} ({grn.driver_phone})</Text>
              )}
            </Card>
          ))}
        </>
      )}

      <Modal visible={showPOModal} animationType="slide">
        <ScrollView style={{ backgroundColor: '#FAF9F6' }} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}>
          <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: colors.ink, marginBottom: spacing.md }}>Create Purchase Order</Text>
          
          <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: colors.neutral[700], marginBottom: 4 }}>Select Supplier *</Text>
          <View style={{ borderWidth: 1, borderColor: '#EAE6DF', borderRadius: 8, backgroundColor: '#fff', marginBottom: spacing.sm }}>
            <Picker selectedValue={selectedSupplier} onValueChange={(v) => setSelectedSupplier(v)}>
              <Picker.Item label="Choose Supplier" value="" />
              {suppliers.map(s => <Picker.Item key={s.id} label={s.name} value={s.id} />)}
            </Picker>
          </View>

          <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: colors.neutral[700], marginBottom: 4 }}>PO Number *</Text>
          <TextInput style={{ borderWidth: 1, borderColor: '#EAE6DF', borderRadius: 8, padding: 10, backgroundColor: '#fff', marginBottom: spacing.sm }} value={poNumber} onChangeText={setPoNumber} placeholder="PO-1002" />

          <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: colors.neutral[700], marginBottom: 4 }}>Expected Delivery Date</Text>
          <TextInput style={{ borderWidth: 1, borderColor: '#EAE6DF', borderRadius: 8, padding: 10, backgroundColor: '#fff', marginBottom: spacing.sm }} value={deliveryDate} onChangeText={setDeliveryDate} placeholder="YYYY-MM-DD" />

          <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: colors.neutral[700], marginBottom: 4 }}>Delivery Address</Text>
          <TextInput style={{ borderWidth: 1, borderColor: '#EAE6DF', borderRadius: 8, padding: 10, backgroundColor: '#fff', marginBottom: spacing.sm }} value={deliveryAddress} onChangeText={setDeliveryAddress} placeholder="Warehouse Location" />

          {/* PO items builder */}
          <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: colors.neutral[800], marginTop: spacing.md }}>Add PO Items</Text>
          <Card style={{ padding: spacing.md, marginTop: 4, gap: spacing.xs, backgroundColor: '#FFFDF9' }}>
            <Text style={{ fontSize: 11, fontFamily: fontFamily.bold }}>Material *</Text>
            <View style={{ borderWidth: 1, borderColor: '#EAE6DF', borderRadius: 8, backgroundColor: '#fff' }}>
              <Picker selectedValue={selectedMaterial} onValueChange={(v) => setSelectedMaterial(v)}>
                <Picker.Item label="Choose Material" value="" />
                {materials.map(m => <Picker.Item key={m.id} label={m.name} value={m.id} />)}
              </Picker>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontFamily: fontFamily.bold }}>Quantity *</Text>
                <TextInput style={{ borderWidth: 1, borderColor: '#EAE6DF', borderRadius: 8, padding: 8, backgroundColor: '#fff' }} value={itemQty} onChangeText={setItemQty} placeholder="100" keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontFamily: fontFamily.bold }}>Rate (₹/unit) *</Text>
                <TextInput style={{ borderWidth: 1, borderColor: '#EAE6DF', borderRadius: 8, padding: 8, backgroundColor: '#fff' }} value={itemRate} onChangeText={setItemRate} placeholder="450" keyboardType="numeric" />
              </View>
            </View>
            <TouchableOpacity onPress={handleAddPOItem} style={{ backgroundColor: '#7E6144', padding: 8, borderRadius: 6, alignItems: 'center', marginTop: spacing.xs }}>
              <Text style={{ color: '#fff', fontFamily: fontFamily.bold, fontSize: 11 }}>+ Add Line Item</Text>
            </TouchableOpacity>
          </Card>

          {poItems.length > 0 && (
            <View style={{ marginTop: spacing.sm }}>
              <Text style={{ fontSize: 12, fontFamily: fontFamily.bold }}>Staged Items:</Text>
              {poItems.map((it, idx) => {
                const name = materials.find(m => m.id === it.material_master_id)?.name || 'Unknown';
                return (
                  <Text key={idx} style={{ fontSize: 11, color: colors.neutral[600] }}>
                    {idx + 1}. {name} — {it.qty_ordered} units @ ₹{it.rate}
                  </Text>
                );
              })}
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl, marginBottom: spacing.xl }}>
            <Button title="Cancel" onPress={() => setShowPOModal(false)} variant="secondary" style={{ flex: 1 }} />
            <Button title="Submit PO" onPress={handleCreatePOSubmit} variant="primary" style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </Modal>

      <Modal visible={showGRNModal} animationType="slide">
        <ScrollView style={{ backgroundColor: '#FAF9F6' }} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}>
          <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: colors.ink, marginBottom: spacing.md }}>Goods Received Note</Text>
          
          <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: colors.neutral[700], marginBottom: 4 }}>Select PO *</Text>
          <View style={{ borderWidth: 1, borderColor: '#EAE6DF', borderRadius: 8, backgroundColor: '#fff', marginBottom: spacing.sm }}>
            <Picker selectedValue={selectedPO?.id} onValueChange={(val) => {
              const matched = pos.find(p => p.id === val);
              setSelectedPO(matched);
              if (matched && matched.items) {
                setGrnItems(matched.items.map((it: any) => ({
                  purchase_order_item_id: it.id,
                  qty_received: it.qty_ordered - it.qty_received,
                  qty_accepted: it.qty_ordered - it.qty_received,
                  qty_rejected: 0,
                  batch_number: `B-${new Date().getTime().toString().slice(-4)}`,
                })));
              }
            }}>
              <Picker.Item label="Choose PO Reference" value="" />
              {pos.filter(p => p.status !== 'fully_received').map(p => <Picker.Item key={p.id} label={p.po_number} value={p.id} />)}
            </Picker>
          </View>

          <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: colors.neutral[700], marginBottom: 4 }}>GRN Number *</Text>
          <TextInput style={{ borderWidth: 1, borderColor: '#EAE6DF', borderRadius: 8, padding: 10, backgroundColor: '#fff', marginBottom: spacing.sm }} value={grnNumber} onChangeText={setGrnNumber} placeholder="GRN-1002" />

          <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: colors.neutral[700], marginBottom: 4 }}>Vehicle Number</Text>
          <TextInput style={{ borderWidth: 1, borderColor: '#EAE6DF', borderRadius: 8, padding: 10, backgroundColor: '#fff', marginBottom: spacing.sm }} value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="DL-3C-YA-1234" />

          <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: colors.neutral[700], marginBottom: 4 }}>Driver Name</Text>
          <TextInput style={{ borderWidth: 1, borderColor: '#EAE6DF', borderRadius: 8, padding: 10, backgroundColor: '#fff', marginBottom: spacing.sm }} value={driverName} onChangeText={setDriverName} placeholder="Ramesh Singh" />

          <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: colors.neutral[700], marginBottom: 4 }}>Driver Phone</Text>
          <TextInput style={{ borderWidth: 1, borderColor: '#EAE6DF', borderRadius: 8, padding: 10, backgroundColor: '#fff', marginBottom: spacing.sm }} value={driverPhone} onChangeText={setDriverPhone} placeholder="9876543210" />

          {selectedPO && grnItems.length > 0 && (
            <View style={{ marginTop: spacing.md }}>
              <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, marginBottom: spacing.xs }}>Fulfill Staged Items</Text>
              {grnItems.map((item, idx) => {
                const poItem = selectedPO.items.find((it: any) => it.id === item.purchase_order_item_id);
                return (
                  <Card key={idx} style={{ padding: spacing.sm, marginBottom: spacing.sm, gap: 4 }}>
                    <Text style={{ fontSize: 12, fontFamily: fontFamily.bold }}>Item: {poItem?.material_name}</Text>
                    <Text style={{ fontSize: 11, color: colors.neutral[500] }}>Pending to Receive: {poItem?.qty_ordered - poItem?.qty_received}</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10 }}>Received</Text>
                        <TextInput style={{ borderWidth: 1, borderColor: '#EAE6DF', borderRadius: 6, padding: 4, backgroundColor: '#fff', fontSize: 11 }} value={String(item.qty_received)} onChangeText={(val) => {
                          const updated = [...grnItems];
                          updated[idx].qty_received = parseFloat(val) || 0;
                          setGrnItems(updated);
                        }} keyboardType="numeric" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10 }}>Accepted</Text>
                        <TextInput style={{ borderWidth: 1, borderColor: '#EAE6DF', borderRadius: 6, padding: 4, backgroundColor: '#fff', fontSize: 11 }} value={String(item.qty_accepted)} onChangeText={(val) => {
                          const updated = [...grnItems];
                          updated[idx].qty_accepted = parseFloat(val) || 0;
                          setGrnItems(updated);
                        }} keyboardType="numeric" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10 }}>Rejected</Text>
                        <TextInput style={{ borderWidth: 1, borderColor: '#EAE6DF', borderRadius: 6, padding: 4, backgroundColor: '#fff', fontSize: 11 }} value={String(item.qty_rejected)} onChangeText={(val) => {
                          const updated = [...grnItems];
                          updated[idx].qty_rejected = parseFloat(val) || 0;
                          setGrnItems(updated);
                        }} keyboardType="numeric" />
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10 }}>Batch Number</Text>
                        <TextInput style={{ borderWidth: 1, borderColor: '#EAE6DF', borderRadius: 6, padding: 4, backgroundColor: '#fff', fontSize: 11 }} value={item.batch_number} onChangeText={(val) => {
                          const updated = [...grnItems];
                          updated[idx].batch_number = val;
                  setGrnItems(updated);
                        }} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10 }}>Rejection Reason</Text>
                        <TextInput style={{ borderWidth: 1, borderColor: '#EAE6DF', borderRadius: 6, padding: 4, backgroundColor: '#fff', fontSize: 11 }} value={item.rejection_reason || ''} onChangeText={(val) => {
                          const updated = [...grnItems];
                          updated[idx].rejection_reason = val;
                          setGrnItems(updated);
                        }} />
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl, marginBottom: spacing.xl }}>
            <Button title="Cancel" onPress={() => setShowGRNModal(false)} variant="secondary" style={{ flex: 1 }} />
            <Button title="Submit GRN" onPress={handleCreateGRNSubmit} variant="primary" style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </Modal>
    </>
  );
}

// ─ Main Screen ─

export default function ProjectWorkspaceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useAuthStore((s) => s.profile);

  const { data: project, refetch, isRefetching } = useProject(id);
  const { data: employees = [] } = useEmployees();
  const { data: payments = [] } = useProjectPayments(id);
  const { data: materialReqs = [] } = useMaterialRequests(id);
  const { data: documents = [] } = useDocuments('project', id);
  const { data: dprs = [] } = useProjectDprs(id);
  const { data: tasks = [] } = useProjectTasks(id);
  const { data: expenses = [] } = useProjectExpenses(id);

  const [tab, setTab] = useState<Tab>('Overview');
  const [showMoreTabs, setShowMoreTabs] = useState(false);

  const VISIBLE_TABS: Tab[] = ['Overview', 'BOQ', 'Tasks', 'DPR', 'Materials', 'Reports'];
  const EXTRA_TABS: Tab[] = ['Photos', 'Documents', 'Employees', 'Attendance', 'Variations', 'Procurement', 'Expenses', 'Payments', 'Communication', 'Timeline'];

  if (!project) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.loadingText, { marginTop: spacing.sm }]}>Loading project…</Text>
      </View>
    );
  }

  const handleBack = () => {
    router.push('/(admin)/projects' as any);
  };

  const currentUserId = profile?.id || '';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Premium Brand Header (Awwwards-Tier Architectural Glass Design) */}
      <LinearGradient
        colors={['#695030', '#7E6144', '#918050']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >


        <View style={styles.topbar}>
          <TouchableOpacity onPress={handleBack} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={18} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 10, alignItems: 'center' }}>
            <Text style={styles.projTitle} numberOfLines={1}>{project.name}</Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontFamily: fontFamily.medium, marginTop: 1 }}>
              {project.city || 'Mumbai'} · Project Workspace
            </Text>
          </View>
          <View style={styles.statusPillTop}>
            <View style={styles.statusDotTop} />
            <Text style={styles.statusTextTop}>On Track</Text>
          </View>
        </View>

        {/* Floating Glass Pill Navigation Bar */}
        <View style={styles.tabsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabBar}
            contentContainerStyle={{ gap: 6, paddingHorizontal: spacing.lg, paddingVertical: 4 }}
          >
            {VISIBLE_TABS.map((t) => {
              const isActive = tab === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.tabPill, isActive && styles.tabPillActive]}
                  onPress={() => setTab(t)}
                >
                  <Text style={[styles.tabPillText, isActive && styles.tabPillTextActive]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
            
            <TouchableOpacity
              style={[styles.tabPill, EXTRA_TABS.includes(tab) && styles.tabPillActive]}
              onPress={() => setShowMoreTabs(true)}
            >
              <Text style={[styles.tabPillText, EXTRA_TABS.includes(tab) && styles.tabPillTextActive]}>
                {EXTRA_TABS.includes(tab) ? `${tab} ▾` : 'More ▾'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing['6xl'], paddingTop: spacing.md }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {tab === 'Overview' && (
          <OverviewTab
            project={project}
            employees={employees}
            payments={payments}
            materialReqs={materialReqs}
            tasks={tasks}
            onTabChange={setTab}
          />
        )}
        {tab === 'BOQ' && (
          <BOQTab projectId={id} projectName={project.name} />
        )}
        {tab === 'Tasks' && (
          <TasksTab
            tasks={tasks}
            employees={employees}
            projectId={id}
            currentUserId={currentUserId}
          />
        )}
        {tab === 'Employees' && (
          <EmployeesTab employees={employees} router={router} />
        )}
        {tab === 'Attendance' && (
          <AttendanceTab projectId={id} />
        )}
        {tab === 'DPR' && (
          <DprTab dprs={dprs} employees={employees} project={project} />
        )}
        {tab === 'Photos' && (
          <PhotosTab dprs={dprs} />
        )}
        {tab === 'Documents' && (
          <DocumentsTab documents={documents} projectId={id} />
        )}
        {tab === 'Materials' && (
          <MaterialsTab materialReqs={materialReqs} projectId={id} currentUserId={currentUserId} />
        )}
        {tab === 'Variations' && (
          <VariationsTab projectId={id} currentUserId={currentUserId} />
        )}
        {tab === 'Procurement' && (
          <ProcurementTab projectId={id} companyId={profile?.company_id || ''} />
        )}
        {tab === 'Expenses' && (
          <ExpensesTab expenses={expenses} projectId={id} currentUserId={currentUserId} />
        )}
        {tab === 'Payments' && (
          <PaymentsTab payments={payments} projectId={id} />
        )}
        {tab === 'Communication' && (
          <CommunicationTab profileId={currentUserId} projectId={id} router={router} />
        )}
        {tab === 'Timeline' && (
          <TimelineTab projectId={id} />
        )}
        {tab === 'Reports' && (
          <ReportsTab
            project={project}
            employees={employees}
            payments={payments}
            materialReqs={materialReqs}
            dprs={dprs}
            tasks={tasks}
            expenses={expenses}
          />
        )}
      </ScrollView>

      {/* High-End Architectural Glass More Modules Bottom Sheet Modal */}
      <Modal visible={showMoreTabs} transparent animationType="slide" onRequestClose={() => setShowMoreTabs(false)}>
        <TouchableOpacity style={styles.moreOverlay} activeOpacity={1} onPress={() => setShowMoreTabs(false)}>
          <TouchableWithoutFeedback>
            <View style={styles.moreSheetContent}>
              <View style={styles.moreSheetHeader}>
                <View>
                  <Text style={styles.moreSheetTitle}>Project Modules & Tools</Text>
                  <Text style={styles.moreSheetSub}>Select a workspace section to manage</Text>
                </View>
                <TouchableOpacity style={styles.moreCloseBtn} onPress={() => setShowMoreTabs(false)}>
                  <Ionicons name="close" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                <View style={styles.moreGrid}>
                  {EXTRA_TABS.map((t) => {
                    const isSel = tab === t;
                    const iconMap: Record<string, string> = {
                      Photos: 'images-outline',
                      Documents: 'folder-open-outline',
                      Employees: 'people-outline',
                      Attendance: 'time-outline',
                      Variations: 'git-compare-outline',
                      Procurement: 'cart-outline',
                      Expenses: 'receipt-outline',
                      Payments: 'cash-outline',
                      Communication: 'chatbubbles-outline',
                      Timeline: 'analytics-outline',
                    };
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[styles.moreGridItem, isSel && styles.moreGridItemActive]}
                        onPress={() => {
                          setTab(t);
                          setShowMoreTabs(false);
                        }}
                      >
                        <View style={[styles.moreGridIcon, isSel && { backgroundColor: '#2563EB' }]}>
                          <Ionicons
                            name={(iconMap[t] || 'apps-outline') as any}
                            size={16}
                            color={isSel ? '#FFF' : '#64748B'}
                          />
                        </View>
                        <Text style={[styles.moreGridLabel, isSel && styles.moreGridLabelActive]}>
                          {t}
                        </Text>
                        {isSel && <Ionicons name="checkmark-circle" size={14} color="#2563EB" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─ Styles ─

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...typography.bodyMedium, color: colors.neutral[400] },

  // Header (High-End Architectural Glass)
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#3E2A18',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projTitle: { fontFamily: fontFamily.bold, fontSize: 18, color: '#FFFFFF', letterSpacing: 0.2 },
  statusPillTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  statusDotTop: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' },
  statusTextTop: { fontSize: 11, fontFamily: fontFamily.bold, color: '#16A34A' },

  // Floating Glass Tab Bar
  tabsWrapper: { marginTop: 16, zIndex: 1, marginHorizontal: -spacing.lg },
  tabBar: {},
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  tabPillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  tabPillText: { fontSize: 12, fontFamily: fontFamily.semiBold, color: 'rgba(255, 255, 255, 0.85)' },
  tabPillTextActive: { color: '#695030', fontFamily: fontFamily.bold },



  // Overview
  overviewCard: { padding: spacing.xl, marginBottom: spacing.md },
  progressSection: { flexDirection: 'row', gap: spacing.xl },
  progressRing: {
    width: 96, height: 96, borderRadius: 48, borderWidth: 6, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  progressPct: { ...typography.h3, color: colors.primary },
  progressLabel: { ...typography.caption, color: colors.neutral[500] },
  progressDetails: { flex: 1, justifyContent: 'center', gap: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoLabel: { ...typography.caption, color: colors.neutral[400], width: 36 },
  infoValue: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink, textTransform: 'capitalize', flex: 1 },
  progressTrack: { height: 8, backgroundColor: colors.neutral[100], borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },

  // Stats
  quickStatsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statBox: { flex: 1, padding: spacing.md, alignItems: 'center', gap: 2 },
  statBoxValue: { ...typography.h5 },
  statBoxLabel: { ...typography.caption, color: colors.neutral[500], textAlign: 'center' },

  // Section cards
  sectionCard: { padding: spacing.lg, marginBottom: spacing.md },
  sectionCardTitle: { ...typography.h6, color: colors.ink, marginBottom: spacing.md },

  // Section header row
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md, marginTop: spacing.xs },
  sectionHeaderText: { ...typography.h6, color: colors.ink },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionActionText: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.primary },

  // Group labels
  groupLabel: { ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.neutral[500], letterSpacing: 0.8, marginTop: spacing.md, marginBottom: spacing.xs },

  // List items
  listCard: { padding: spacing.md, marginBottom: spacing.sm },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  listInfo: { flex: 1 },
  listTitle: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink },
  listSubtitle: { ...typography.caption, color: colors.neutral[500], marginTop: 2, textTransform: 'capitalize' },

  // Badges
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.xs },
  badgeText: { ...typography.caption, fontFamily: fontFamily.semiBold, textTransform: 'capitalize' },

  // Icons
  iconBox: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  amountText: { ...typography.bodySmall, fontFamily: fontFamily.semiBold },

  // Filter pills
  filterPill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.neutral[100] },
  filterPillActive: { backgroundColor: colors.primary },
  filterPillText: { ...typography.caption, fontFamily: fontFamily.medium, color: colors.neutral[600] },
  filterPillTextActive: { color: colors.white },

  // Attendance date nav
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, marginBottom: spacing.md },
  dateNavLabel: { ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },

  // Timeline
  timelineRow: { flexDirection: 'row', marginBottom: spacing.md },
  timelineLeft: { width: 32, alignItems: 'center' },
  timelineDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.neutral[200], marginTop: 2 },
  timelineContent: { flex: 1, paddingLeft: spacing.md, paddingBottom: spacing.md },
  timelineDate: { ...typography.caption, color: colors.neutral[400] },
  timelineLabel: { ...typography.bodySmall, color: colors.ink, marginTop: 2 },

  // Reports
  reportCard: { padding: spacing.lg, marginBottom: spacing.md },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  reportLabel: { ...typography.bodySmall, color: colors.neutral[600] },
  reportValue: { ...typography.bodySmall, fontFamily: fontFamily.semiBold, color: colors.ink },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius['3xl'], borderTopRightRadius: radius['3xl'],
    padding: spacing['2xl'], paddingBottom: spacing['4xl'] + (Platform.OS === 'ios' ? 16 : 0),
  },
  modalTitle: { ...typography.h5, color: colors.ink, marginBottom: spacing.lg },
  modalInput: {
    borderWidth: 1, borderColor: colors.neutral[200], borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.md,
    ...typography.bodyMedium, color: colors.ink,
  },

  // Empty
  empty: { alignItems: 'center', paddingVertical: spacing['4xl'], gap: spacing.sm },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400], textAlign: 'center' },
  pickerContainer: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    overflow: 'hidden',
  },
  picker: { height: 50 },

  // More Dropdown Grid Sheet
  moreOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  moreSheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.lg,
    paddingBottom: spacing.xl + (Platform.OS === 'ios' ? 24 : 0),
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  moreSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  moreSheetTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  moreSheetSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  moreCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moreGridItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  moreGridItemActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  moreGridIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreGridLabel: { fontSize: 12, fontWeight: '600', color: '#334155', flex: 1 },
  moreGridLabelActive: { color: '#2563EB', fontWeight: '700' },
});

// ─ Payments Tab — Gradient & Glow Styles ─
const payStyles = StyleSheet.create({
  // Hero summary card
  heroWrap: {
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
    ...shadows.xl,
  },
  heroCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },
  ringWrap: {
    position: 'relative',
  },
  ringOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: {
    ...typography.h4,
    color: colors.white,
    fontFamily: fontFamily.bold,
    fontSize: 22,
  },
  ringLabel: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroStats: {
    flex: 1,
    gap: spacing.sm,
  },
  heroStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heroStatLabel: {
    flex: 1,
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 11,
  },
  heroStatValue: {
    ...typography.bodyMedium,
    color: colors.white,
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
  },

  // Gradient progress bar
  barTrack: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    borderRadius: radius.full,
  },

  // ─ Add Payment Modal ─
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 24, 21, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    overflow: 'hidden',
    ...shadows.xl,
  },
  sheetAccent: {
    height: 5,
    width: '100%',
  },
  sheetBody: {
    padding: spacing['2xl'],
    paddingBottom: spacing['4xl'] + (Platform.OS === 'ios' ? 16 : 0),
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  sheetIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  sheetIconGrad: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    ...typography.h5,
    color: colors.ink,
    marginBottom: 2,
  },
  sheetSubtitle: {
    ...typography.caption,
    color: colors.neutral[500],
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.neutral[600],
    fontFamily: fontFamily.medium,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optional: {
    color: colors.neutral[400],
    textTransform: 'none',
    fontFamily: fontFamily.regular,
    fontSize: 11,
    letterSpacing: 0,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...typography.bodyMedium,
    color: colors.ink,
    backgroundColor: colors.neutral[100],
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    borderRadius: radius.md,
    marginBottom: spacing.md,
    backgroundColor: colors.neutral[100],
    paddingLeft: spacing.md,
  },
  amountPrefix: {
    ...typography.h6,
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
    marginRight: spacing.xs,
  },
  amountInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    ...typography.bodyMedium,
    color: colors.ink,
    fontFamily: fontFamily.semiBold,
    fontSize: 18,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    ...typography.bodyMedium,
    color: colors.neutral[600],
    fontFamily: fontFamily.medium,
  },
  addBtnWrap: {
    flex: 1.4,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  addBtnText: {
    ...typography.bodyMedium,
    color: colors.white,
    fontFamily: fontFamily.semiBold,
  },

  // ─ Empty State ─
  emptyWrap: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  emptyCard: {
    borderRadius: radius.xl,
    padding: spacing['4xl'],
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    ...shadows.lg,
  },
  emptyIconGrad: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typography.h6,
    color: colors.ink,
    fontFamily: fontFamily.semiBold,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 18,
  },

  // ─ Milestone cards ─
  milestoneWrap: {
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
  },
  milestoneCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  milestoneIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneName: {
    ...typography.bodyMedium,
    fontFamily: fontFamily.medium,
    color: colors.ink,
  },
  milestoneMeta: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: 2,
    textTransform: 'capitalize',
  },
  milestoneRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  milestoneAmount: {
    ...typography.bodyMedium,
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    fontSize: 10,
    textTransform: 'capitalize',
  },
  deleteBtn: {
    paddingLeft: spacing.xs,
    paddingVertical: spacing.xs,
  },
});

// ─ Overview Tab Styles ─
const ovStyles = StyleSheet.create({
  content: { gap: 14 },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderRadius: 22,
    shadowColor: '#3E2A18', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.15, shadowRadius: 34, elevation: 4,
    overflow: 'hidden',
  },
  heroCard: { padding: 24, paddingBottom: 20 },
  gaugeWrap: { position: 'relative', width: 132, height: 132, alignSelf: 'center' },
  gaugeLabel: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  gaugePct: { fontFamily: fontFamily.bold, fontSize: 28, color: '#3E2A18', lineHeight: 32 },
  gaugeSub: { fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: '#8B8680', fontFamily: fontFamily.semiBold, marginTop: 4 },
  metaDivider: { height: 1, backgroundColor: 'rgba(139,94,52,0.14)', marginVertical: 20 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '47%' },
  metaIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  metaTextLabel: { fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.5, color: '#8B8680', fontFamily: fontFamily.semiBold },
  metaTextValue: { fontSize: 13.5, fontFamily: fontFamily.semiBold, color: '#2A241D', marginTop: 2 },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  statCardGlass: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderRadius: 22,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: fontFamily.bold, fontSize: 18, color: '#3E2A18' },
  statLabel: { fontSize: 9.5, letterSpacing: 0.3, textTransform: 'uppercase', color: '#8B8680', fontFamily: fontFamily.semiBold, marginTop: 2 },
  
  sectionCardGlass: {
    backgroundColor: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderRadius: 22,
    padding: 18,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },
  sectionIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: fontFamily.semiBold, fontSize: 13.5, color: '#3E2A18' },
  trackBar: { width: '100%', height: 9, borderRadius: 100, backgroundColor: 'rgba(139,94,52,0.12)', overflow: 'hidden', marginBottom: 10 },
  trackFill: { height: '100%', borderRadius: 100 },
  trackCaption: { fontSize: 12, color: '#8B8680', fontFamily: fontFamily.medium },
  addressText: { fontSize: 13.5, color: '#2A241D', lineHeight: 20, fontFamily: fontFamily.medium },
});
