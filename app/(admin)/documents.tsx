/**
 * Admin — Documents Vault
 * Company + project documents with categories (incl. Quotations),
 * upload (any file type), version history, and share/download links.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, RefreshControl, Share, ActivityIndicator, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Card, Button, SearchBar } from '../../src/components';
import { useAllDocuments, useDocumentVersions } from '../../src/hooks/useDocuments';
import { useDocumentUpload } from '../../src/hooks/useDocumentUpload';
import { useProjects } from '../../src/hooks/useProjects';
import { useAuthStore } from '../../src/stores/authStore';
import { createSignedMediaUrl } from '../../src/lib/mediaStorage';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import type { DocumentRow } from '../../src/types';

const CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: 'drawings', label: 'Drawings', icon: 'pencil-outline' },
  { key: 'boq', label: 'BOQ', icon: 'calculator-outline' },
  { key: 'quotation', label: 'Quotations', icon: 'pricetag-outline' },
  { key: 'work_orders', label: 'Work Orders', icon: 'briefcase-outline' },
  { key: 'contracts', label: 'Contracts', icon: 'document-lock-outline' },
  { key: 'invoices', label: 'Invoices', icon: 'receipt-outline' },
  { key: 'warranty', label: 'Warranty', icon: 'shield-checkmark-outline' },
  { key: 'safety', label: 'Safety', icon: 'medkit-outline' },
  { key: 'amc', label: 'AMC', icon: 'construct-outline' },
  { key: 'other', label: 'Other', icon: 'folder-outline' },
];

const categoryLabel = (key: string) =>
  CATEGORIES.find((c) => c.key === key)?.label || key;

export default function AdminDocumentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);

  const { data: documents = [], refetch, isRefetching } = useAllDocuments();
  const { data: projects = [] } = useProjects();
  const upload = useDocumentUpload();

  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<string>('all'); // all | company | <projectId>
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Upload modal
  const [uploadModal, setUploadModal] = useState(false);
  const [upScope, setUpScope] = useState<string>('company'); // company | <projectId>
  const [upCategory, setUpCategory] = useState('drawings');

  // Detail modal
  const [selectedDoc, setSelectedDoc] = useState<DocumentRow | null>(null);

  const projectNames = useMemo(() => new Map((projects || []).map((p: any) => [p.id, p.name])), [projects]);

  const filtered = useMemo(() => {
    let list = documents;
    if (scopeFilter === 'company') list = list.filter((d) => d.owner_type === 'company');
    else if (scopeFilter !== 'all') list = list.filter((d) => d.owner_type === 'project' && d.owner_id === scopeFilter);
    if (categoryFilter) list = list.filter((d) => d.category === categoryFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((d) => d.title.toLowerCase().includes(q));
    return list;
  }, [documents, scopeFilter, categoryFilter, search]);

  const byCategoryCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of documents) counts[d.category] = (counts[d.category] || 0) + 1;
    return counts;
  }, [documents]);

  const doUpload = async () => {
    if (!profile) return;
    try {
      await upload.mutateAsync({
        ownerType: upScope === 'company' ? 'company' : 'project',
        ownerId: upScope === 'company' ? profile.company_id : upScope,
        category: upCategory,
      });
      setUploadModal(false);
      refetch();
      Alert.alert('Uploaded ✅', 'Document saved to the vault.');
    } catch (e: any) {
      if (e?.message !== 'File selection cancelled') {
        Alert.alert('Upload failed', e?.message || 'Please try again.');
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Documents Vault</Text>
        <TouchableOpacity onPress={() => setUploadModal(true)} style={styles.addBtn}>
          <Ionicons name="add-circle" size={30} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search documents…" />

      {/* Scope filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scopeRow} contentContainerStyle={{ gap: spacing.sm }}>
        <ScopeChip label="All" active={scopeFilter === 'all'} onPress={() => setScopeFilter('all')} />
        <ScopeChip label="🏢 Company" active={scopeFilter === 'company'} onPress={() => setScopeFilter('company')} />
        {(projects || []).map((p: any) => (
          <ScopeChip key={p.id} label={p.name} active={scopeFilter === p.id} onPress={() => setScopeFilter(p.id)} />
        ))}
      </ScrollView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Category folders */}
        {!categoryFilter && !search && (
          <View style={styles.folderGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat.key} style={styles.folder} onPress={() => setCategoryFilter(cat.key)}>
                <Ionicons name={cat.icon as any} size={22} color={colors.primary} />
                <Text style={styles.folderLabel}>{cat.label}</Text>
                <Text style={styles.folderCount}>{byCategoryCount[cat.key] || 0} files</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {categoryFilter && (
          <TouchableOpacity style={styles.breadcrumb} onPress={() => setCategoryFilter(null)}>
            <Ionicons name="chevron-back" size={16} color={colors.primary} />
            <Text style={styles.breadcrumbText}>All folders</Text>
            <Text style={styles.breadcrumbCurrent}> / {categoryLabel(categoryFilter)}</Text>
          </TouchableOpacity>
        )}

        {/* Documents list */}
        <Text style={styles.sectionTitle}>
          {categoryFilter ? categoryLabel(categoryFilter) : 'All Documents'} ({filtered.length})
        </Text>
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={40} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>No documents here yet. Tap + to upload — PDF, Excel, Word, CAD, images, any file type.</Text>
          </View>
        )}
        {filtered.map((doc) => (
          <TouchableOpacity key={doc.id} onPress={() => setSelectedDoc(doc)}>
            <Card style={styles.docCard}>
              <View style={styles.docIcon}>
                <Ionicons name="document-text" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.docTitle} numberOfLines={1}>{doc.title}</Text>
                <Text style={styles.docMeta}>
                  {categoryLabel(doc.category)} • {doc.owner_type === 'company' ? 'Company' : (projectNames.get(doc.owner_id) || 'Project')}
                  {doc.created_at ? ` • ${new Date(doc.created_at).toLocaleDateString('en-IN')}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Upload modal ── */}
      <Modal visible={uploadModal} transparent animationType="slide" onRequestClose={() => setUploadModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Upload Document</Text>
              <TouchableOpacity onPress={() => setUploadModal(false)}>
                <Ionicons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.fieldLabel}>Where does it belong?</Text>
              <View style={styles.chips}>
                <FilterChip label="🏢 Company (internal)" active={upScope === 'company'} onPress={() => setUpScope('company')} />
                {(projects || []).map((p: any) => (
                  <FilterChip key={p.id} label={p.name} active={upScope === p.id} onPress={() => setUpScope(p.id)} />
                ))}
              </View>
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.chips}>
                {CATEGORIES.map((cat) => (
                  <FilterChip key={cat.key} label={cat.label} active={upCategory === cat.key} onPress={() => setUpCategory(cat.key)} />
                ))}
              </View>
              <Text style={styles.helpText}>All file types accepted — PDF, Excel, Word, CAD/DWG, images, videos, ZIP. Max 25 MB.</Text>
              <Button title="Choose File & Upload" onPress={doUpload} loading={upload.isPending} fullWidth />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Document detail modal ── */}
      <DocumentDetailModal
        doc={selectedDoc}
        projectName={selectedDoc ? (selectedDoc.owner_type === 'company' ? 'Company' : projectNames.get(selectedDoc.owner_id) || 'Project') : ''}
        onClose={() => setSelectedDoc(null)}
        onNewVersion={async (doc) => {
          try {
            await upload.mutateAsync({
              ownerType: doc.owner_type as any,
              ownerId: doc.owner_id,
              category: doc.category,
              existingDocumentId: doc.id,
            });
            refetch();
            Alert.alert('New version uploaded ✅');
          } catch (e: any) {
            if (e?.message !== 'File selection cancelled') Alert.alert('Upload failed', e?.message || 'Try again.');
          }
        }}
      />
    </View>
  );
}

function DocumentDetailModal({ doc, projectName, onClose, onNewVersion }: {
  doc: DocumentRow | null;
  projectName: string;
  onClose: () => void;
  onNewVersion: (doc: DocumentRow) => void;
}) {
  const insets = useSafeAreaInsets();
  const { data: versions = [], isLoading } = useDocumentVersions(doc?.id);
  const [sharing, setSharing] = useState(false);

  const openVersion = async (path: string) => {
    try { await Linking.openURL(await createSignedMediaUrl('documents', path, 3600)); }
    catch (e: any) { Alert.alert('Could not open document', e?.message || 'Try again.'); }
  };

  const shareVersion = async (path: string) => {
    setSharing(true);
    try {
      const url = await createSignedMediaUrl('documents', path, 7 * 24 * 3600);
      await Share.share({ message: `${doc?.title}\n${url}` });
    } catch (e: any) {
      Alert.alert('Could not create link', e?.message || 'Try again.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={!!doc} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle} numberOfLines={1}>{doc?.title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <Text style={styles.docMeta}>
            {doc ? `${categoryLabel(doc.category)} • ${projectName}` : ''}
          </Text>
          <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Version History</Text>
          {isLoading && <ActivityIndicator color={colors.primary} />}
          <ScrollView style={{ maxHeight: 280 }}>
            {versions.map((v: any) => (
              <View key={v.id} style={styles.versionRow}>
                <View style={[styles.versionDot, v.is_current && { backgroundColor: colors.success }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.versionTitle}>
                    v{v.rev_no}{v.is_current ? '  (Current)' : ''}
                  </Text>
                  <Text style={styles.docMeta}>{v.created_at ? new Date(v.created_at).toLocaleString('en-IN') : ''}</Text>
                </View>
                <TouchableOpacity onPress={() => openVersion(v.storage_path)} style={styles.versionShare}>
                  <Ionicons name="open-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => shareVersion(v.storage_path)} disabled={sharing} style={styles.versionShare}>
                  <Ionicons name="share-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
            {!isLoading && versions.length === 0 && (
              <Text style={styles.helpText}>No stored versions found for this document.</Text>
            )}
          </ScrollView>
          {doc && (
            <Button
              title="Upload New Version"
              variant="secondary"
              onPress={() => onNewVersion(doc)}
              fullWidth
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function ScopeChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.scopeChip, active && styles.scopeChipActive]} onPress={onPress}>
      <Text style={[styles.scopeChipText, active && styles.scopeChipTextActive]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  addBtn: { width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' },
  title: { ...typography.h4, color: colors.ink },
  scopeRow: { marginVertical: spacing.md, flexGrow: 0 },
  scopeChip: {
    paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.neutral[200], backgroundColor: colors.white, maxWidth: 180,
  },
  scopeChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  scopeChipText: { ...typography.bodySmall, color: colors.neutral[600] },
  scopeChipTextActive: { color: colors.white, fontFamily: fontFamily.semiBold },
  folderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  folder: {
    width: '31%', backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral[100],
    padding: spacing.md, alignItems: 'center', gap: 4,
  },
  folderLabel: { ...typography.caption, fontFamily: fontFamily.medium, color: colors.ink, textAlign: 'center' },
  folderCount: { ...typography.caption, color: colors.neutral[400], fontSize: 10 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  breadcrumbText: { ...typography.bodySmall, color: colors.primary },
  breadcrumbCurrent: { ...typography.bodySmall, color: colors.neutral[600], fontFamily: fontFamily.medium },
  sectionTitle: { ...typography.h5, color: colors.ink, marginBottom: spacing.sm },
  docCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, marginBottom: spacing.sm },
  docIcon: {
    width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primary + '12',
    alignItems: 'center', justifyContent: 'center',
  },
  docTitle: { ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },
  docMeta: { ...typography.caption, color: colors.neutral[400], marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm, paddingHorizontal: spacing.lg },
  emptyText: { ...typography.bodySmall, color: colors.neutral[400], textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(26,22,17,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: '85%' },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs, gap: spacing.md },
  modalTitle: { ...typography.h4, color: colors.ink, flex: 1 },
  fieldLabel: { ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.neutral[600], marginTop: spacing.md, marginBottom: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral[200], backgroundColor: colors.white },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  chipText: { ...typography.bodySmall, color: colors.neutral[600] },
  chipTextActive: { color: colors.primary, fontFamily: fontFamily.semiBold },
  helpText: { ...typography.caption, color: colors.neutral[400], marginVertical: spacing.md },
  versionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  versionDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.neutral[300] },
  versionTitle: { ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },
  versionShare: { padding: spacing.sm },
});
