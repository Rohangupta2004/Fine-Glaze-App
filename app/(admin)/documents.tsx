import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Share,
  ActivityIndicator,
  Image,
  Platform,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

import { useAllDocuments, useDocumentVersions, useDeleteDocument } from '../../src/hooks/useDocuments';
import { useDocumentUpload } from '../../src/hooks/useDocumentUpload';
import { useProjects } from '../../src/hooks/useProjects';
import { useAuthStore } from '../../src/stores/authStore';
import { createSignedMediaUrl } from '../../src/lib/mediaStorage';
import { colors } from '../../src/theme/colors';
import { fontFamily, typography } from '../../src/theme/typography';
import { spacing, radius, shadows } from '../../src/theme/spacing';
import type { DocumentRow } from '../../src/types';
import { showAlert } from '../../src/utils/alert';

import { CadViewerModal } from '../../src/components';

const CATEGORIES: { key: string; label: string; icon: string; color: string; bg: string }[] = [
  { key: 'cad_drawings', label: 'CAD & 3D Models', icon: 'cube-sharp', color: '#B89047', bg: 'rgba(184, 144, 71, 0.12)' },
  { key: 'drawings', label: 'Architectural Drawings', icon: 'color-palette-sharp', color: '#2563EB', bg: 'rgba(37, 99, 235, 0.12)' },
  { key: 'boq', label: 'BOQ & Estimates', icon: 'calculator-sharp', color: '#059669', bg: 'rgba(5, 150, 105, 0.12)' },
  { key: 'quotation', label: 'Quotations', icon: 'pricetag-sharp', color: '#D97706', bg: 'rgba(217, 119, 6, 0.12)' },
  { key: 'work_orders', label: 'Work Orders', icon: 'briefcase-sharp', color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.12)' },
  { key: 'contracts', label: 'Contracts & Agreements', icon: 'document-lock-sharp', color: '#E11D48', bg: 'rgba(225, 29, 72, 0.12)' },
  { key: 'invoices', label: 'Invoices & Receipts', icon: 'receipt-sharp', color: '#0284C7', bg: 'rgba(2, 132, 199, 0.12)' },
  { key: 'warranty', label: 'Warranty & Certs', icon: 'shield-checkmark-sharp', color: '#16A34A', bg: 'rgba(22, 163, 74, 0.12)' },
  { key: 'safety', label: 'Safety Guidelines', icon: 'medkit-sharp', color: '#EA580C', bg: 'rgba(234, 88, 12, 0.12)' },
  { key: 'amc', label: 'AMC Maintenance', icon: 'construct-sharp', color: '#4F46E5', bg: 'rgba(79, 70, 229, 0.12)' },
  { key: 'other', label: 'General / Other', icon: 'folder-sharp', color: '#695030', bg: 'rgba(105, 80, 48, 0.12)' },
];

const categoryLabel = (key: string) => CATEGORIES.find((c) => c.key === key)?.label || key;
const categoryColor = (key: string) => CATEGORIES.find((c) => c.key === key)?.color || '#695030';
const categoryBg = (key: string) => CATEGORIES.find((c) => c.key === key)?.bg || 'rgba(105, 80, 48, 0.12)';

function getFormatBadge(title: string, category: string) {
  const ext = title.split('.').pop()?.toLowerCase() || '';
  if (['step', 'stp', 'dxf', 'dwg', 'stl', '3mf', 'glb', 'gcode', 'obj'].includes(ext) || category === 'cad_drawings') {
    return { label: ext ? ext.toUpperCase() : 'CAD 3D', color: '#B89047', icon: 'cube' };
  }
  if (['pdf'].includes(ext)) {
    return { label: 'PDF', color: '#DC2626', icon: 'document-text' };
  }
  if (['xlsx', 'xls', 'csv'].includes(ext) || category === 'boq') {
    return { label: 'EXCEL', color: '#059669', icon: 'calculator' };
  }
  if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) {
    return { label: 'IMAGE', color: '#2563EB', icon: 'image' };
  }
  if (['doc', 'docx'].includes(ext) || category === 'contracts') {
    return { label: 'DOC', color: '#7C3AED', icon: 'document-lock' };
  }
  return { label: ext ? ext.toUpperCase() : 'DOC', color: '#695030', icon: 'document' };
}

export default function AdminDocumentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);

  const { data: documents = [], refetch, isRefetching } = useAllDocuments();
  const { data: projects = [] } = useProjects();
  const upload = useDocumentUpload();

  const [search, setSearch] = useState<string>('');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Upload modal
  const [uploadModal, setUploadModal] = useState(false);
  const [upScope, setUpScope] = useState<string>('company');
  const [upCategory, setUpCategory] = useState('drawings');

  // Detail modal
  const [selectedDoc, setSelectedDoc] = useState<DocumentRow | null>(null);

  // Direct preview states
  const [directPreviewUrl, setDirectPreviewUrl] = useState<string | null>(null);
  const [directPdfUrl, setDirectPdfUrl] = useState<string | null>(null);
  const [cadModalUrl, setCadModalUrl] = useState<string | null>(null);
  const [cadModalName, setCadModalName] = useState<string>('');
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

  const handleDocPress = async (doc: DocumentRow) => {
    setSelectedDoc(doc);
  };

  const projectNames = useMemo(() => new Map((projects || []).map((p: any) => [p.id, p.name])), [projects]);

  const filtered = useMemo(() => {
    let list = documents;
    if (scopeFilter === 'company') list = list.filter((d) => d.owner_type === 'company');
    else if (scopeFilter !== 'all') list = list.filter((d) => d.owner_type === 'project' && d.owner_id === scopeFilter);

    if (categoryFilter) list = list.filter((d) => d.category === categoryFilter);

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.owner_type === 'project' && projectNames.get(d.owner_id)?.toLowerCase().includes(q)) ||
          categoryLabel(d.category).toLowerCase().includes(q)
      );
    }
    return list;
  }, [documents, scopeFilter, categoryFilter, search, projectNames]);

  const byCategoryCount = useMemo(() => {
    const counts: Record<string, number> = {};
    const scopeDocs = documents.filter((d) => {
      const matchScope =
        scopeFilter === 'all'
          ? true
          : scopeFilter === 'company'
          ? d.owner_type === 'company'
          : d.owner_type === 'project' && d.owner_id === scopeFilter;

      const matchSearch = search.trim()
        ? d.title.toLowerCase().includes(search.toLowerCase().trim())
        : true;

      return matchScope && matchSearch;
    });

    for (const d of scopeDocs) counts[d.category] = (counts[d.category] || 0) + 1;
    return counts;
  }, [documents, scopeFilter, search]);

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
      showAlert('Uploaded ✅', 'Document saved to vault.');
    } catch (e: any) {
      if (e?.message !== 'File selection cancelled') {
        showAlert('Upload failed', e?.message || 'Please try again.');
      }
    }
  };

  const companyDocsCount = documents.filter((d) => d.owner_type === 'company').length;
  const projectDocsCount = documents.filter((d) => d.owner_type === 'project').length;
  const cadDocsCount = documents.filter((d) => d.category === 'cad_drawings').length;

  return (
    <View style={styles.container}>
      {/* Premium Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#1E1815" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={styles.headerLabel}>Company Vault</Text>
            <Text style={styles.headerTitle}>Document Vault</Text>
          </View>
          <TouchableOpacity style={styles.uploadTriggerBtn} onPress={() => setUploadModal(true)} activeOpacity={0.85}>
            <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
            <Text style={styles.uploadTriggerText}>Upload</Text>
          </TouchableOpacity>
        </View>

        {/* Storage Analytics Card */}
        <View style={styles.analyticsCard}>
          <View style={styles.analyticsRow}>
            <View style={styles.analyticsItem}>
              <View style={[styles.analyticsIconBg, { backgroundColor: 'rgba(105,80,48,0.12)' }]}>
                <Ionicons name="business" size={16} color="#695030" />
              </View>
              <View>
                <Text style={styles.analyticsValue}>{companyDocsCount}</Text>
                <Text style={styles.analyticsLabel}>Company Internal</Text>
              </View>
            </View>
            <View style={styles.analyticsDivider} />
            <View style={styles.analyticsItem}>
              <View style={[styles.analyticsIconBg, { backgroundColor: 'rgba(37, 99, 235, 0.12)' }]}>
                <Ionicons name="briefcase" size={16} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.analyticsValue}>{projectDocsCount}</Text>
                <Text style={styles.analyticsLabel}>Project Docs</Text>
              </View>
            </View>
            <View style={styles.analyticsDivider} />
            <View style={styles.analyticsItem}>
              <View style={[styles.analyticsIconBg, { backgroundColor: 'rgba(184, 144, 71, 0.12)' }]}>
                <Ionicons name="cube" size={16} color="#B89047" />
              </View>
              <View>
                <Text style={styles.analyticsValue}>{cadDocsCount}</Text>
                <Text style={styles.analyticsLabel}>CAD / 3D</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Live Search Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={18} color="#8B7E74" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search documents by name or project..."
            placeholderTextColor="#8B7E74"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#A09080" />
            </TouchableOpacity>
          ) : (
            <Ionicons name="options-outline" size={18} color="#8B7E74" />
          )}
        </View>
      </View>

      {/* Scope filter chips */}
      <View style={styles.scopeContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xs, paddingHorizontal: spacing.lg }}
        >
          <ScopeChip label="All Vault" active={scopeFilter === 'all'} onPress={() => setScopeFilter('all')} />
          <ScopeChip label="🏢 Company" active={scopeFilter === 'company'} onPress={() => setScopeFilter('company')} />
          {(projects || []).map((p: any) => (
            <ScopeChip key={p.id} label={p.name} active={scopeFilter === p.id} onPress={() => setScopeFilter(p.id)} />
          ))}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Folders View */}
        {!categoryFilter && (
          <View style={styles.folderGrid}>
            {CATEGORIES.map((cat) => {
              const count = byCategoryCount[cat.key] || 0;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={styles.folderCard}
                  activeOpacity={0.8}
                  onPress={() => setCategoryFilter(cat.key)}
                >
                  <View style={styles.folderTopRow}>
                    <View style={[styles.folderIconWrap, { backgroundColor: cat.bg }]}>
                      <Ionicons name={cat.icon as any} size={22} color={cat.color} />
                    </View>
                    <View style={[styles.folderBadge, { backgroundColor: cat.bg }]}>
                      <Text style={[styles.folderBadgeText, { color: cat.color }]}>{count} file{count !== 1 && 's'}</Text>
                    </View>
                  </View>
                  <Text style={styles.folderTitle} numberOfLines={1}>{cat.label}</Text>
                  <Text style={styles.folderSubtitle}>Tap to browse folder</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* List View */}
        {categoryFilter && (
          <View style={{ marginBottom: spacing.sm }}>
            <TouchableOpacity style={styles.breadcrumbCard} onPress={() => setCategoryFilter(null)} activeOpacity={0.8}>
              <View style={[styles.breadcrumbIcon, { backgroundColor: categoryBg(categoryFilter) }]}>
                <Ionicons name="chevron-back" size={16} color={categoryColor(categoryFilter)} />
              </View>
              <Text style={styles.breadcrumbText}>
                Folders / <Text style={{ fontFamily: fontFamily.bold, color: categoryColor(categoryFilter) }}>{categoryLabel(categoryFilter)}</Text>
              </Text>
            </TouchableOpacity>

            {filtered.length === 0 && (
              <View style={styles.empty}>
                <View style={[styles.emptyIconBg, { backgroundColor: categoryBg(categoryFilter) }]}>
                  <Ionicons name="folder-open" size={40} color={categoryColor(categoryFilter)} />
                </View>
                <Text style={styles.emptyTitle}>Folder is empty</Text>
                <Text style={styles.emptyText}>Tap the upload button to add documents to this folder.</Text>
              </View>
            )}

            {filtered.map((doc) => {
              const format = getFormatBadge(doc.title, doc.category);
              return (
                <TouchableOpacity key={doc.id} activeOpacity={0.85} onPress={() => handleDocPress(doc)}>
                  <View style={styles.docRowCard}>
                    <View style={[styles.formatBadge, { backgroundColor: format.color + '15' }]}>
                      <Ionicons name={format.icon as any} size={18} color={format.color} />
                      <Text style={[styles.formatLabel, { color: format.color }]}>{format.label}</Text>
                    </View>
                    <View style={styles.docInfo}>
                      <Text style={styles.docTitle} numberOfLines={1}>{doc.title}</Text>
                      <Text style={styles.docMeta}>
                        {doc.owner_type === 'company' ? 'Company Internal' : (projectNames.get(doc.owner_id) || 'Project')}
                        {doc.created_at ? ` • ${new Date(doc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                      </Text>
                    </View>
                    {loadingDocId === doc.id ? (
                      <ActivityIndicator size="small" color={format.color} />
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Upload Modal */}
      <Modal visible={uploadModal} transparent animationType="slide" onRequestClose={() => setUploadModal(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setUploadModal(false)}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Upload Document</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Save to</Text>
              <View style={styles.chipsRow}>
                <FilterChip label="🏢 Company Internal" active={upScope === 'company'} onPress={() => setUpScope('company')} />
                {(projects || []).map((p: any) => (
                  <FilterChip key={p.id} label={p.name} active={upScope === p.id} onPress={() => setUpScope(p.id)} />
                ))}
              </View>

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.chipsRow}>
                {CATEGORIES.map((cat) => (
                  <FilterChip key={cat.key} label={cat.label} active={upCategory === cat.key} onPress={() => setUpCategory(cat.key)} />
                ))}
              </View>

              <View style={{ height: spacing.lg }} />

              <TouchableOpacity style={styles.uploadActionBtn} activeOpacity={0.85} onPress={doUpload} disabled={upload.isPending}>
                {upload.isPending ? <ActivityIndicator color="#fff" /> : <Ionicons name="cloud-upload" size={20} color="#fff" />}
                <Text style={styles.uploadActionText}>{upload.isPending ? 'Uploading Document…' : 'Choose File & Upload'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Document Detail Modal */}
      <DocumentDetailModal
        doc={selectedDoc}
        projectName={selectedDoc ? (selectedDoc.owner_type === 'company' ? 'Company Internal' : projectNames.get(selectedDoc.owner_id) || 'Project') : ''}
        onClose={() => setSelectedDoc(null)}
        onRefetch={refetch}
        onOpenCad={(url: string, name: string) => { setCadModalUrl(url); setCadModalName(name); }}
        onOpenImage={(url: string) => setDirectPreviewUrl(url)}
        onOpenPdf={(url: string) => setDirectPdfUrl(url)}
        onNewVersion={async (doc: DocumentRow) => {
          try {
            await upload.mutateAsync({
              ownerType: doc.owner_type as any,
              ownerId: doc.owner_id,
              category: doc.category,
              existingDocumentId: doc.id,
            });
            refetch();
            showAlert('New Version Uploaded ✅');
          } catch (e: any) {
            if (e?.message !== 'File selection cancelled') showAlert('Upload failed', e?.message || 'Try again.');
          }
        }}
      />

      {/* Direct Image Preview Modal */}
      <Modal visible={!!directPreviewUrl} transparent animationType="fade" onRequestClose={() => setDirectPreviewUrl(null)}>
        <View style={styles.previewBackdrop}>
          <TouchableOpacity style={[styles.previewClose, { top: insets.top + spacing.md }]} onPress={() => setDirectPreviewUrl(null)}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {directPreviewUrl && (
            <Image source={{ uri: directPreviewUrl }} style={styles.previewImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* Direct Document Preview Modal */}
      <Modal visible={!!directPdfUrl} transparent animationType="slide" onRequestClose={() => setDirectPdfUrl(null)}>
        <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
          <View style={{ height: insets.top + 60, backgroundColor: '#FAF8F5', flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }}>
            <TouchableOpacity onPress={() => setDirectPdfUrl(null)} hitSlop={12} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(105,80,48,0.1)' }}>
              <Ionicons name="close" size={24} color="#1E1815" />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: '#1E1815', marginLeft: spacing.md }}>Document Viewer</Text>
          </View>
          {directPdfUrl && (
            Platform.OS === 'web' ? (
              <iframe src={directPdfUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Document Viewer" />
            ) : (
              <WebView 
                source={{ uri: Platform.OS === 'android' ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(directPdfUrl)}` : directPdfUrl }} 
                style={{ flex: 1 }}
                startInLoadingState={true}
                renderLoading={() => <ActivityIndicator size="large" color={colors.primary} style={{ position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -18 }, { translateY: -18 }] }} />}
              />
            )
          )}
        </View>
      </Modal>

      {/* Interactive CAD & 3D Model Viewer Modal */}
      <CadViewerModal
        visible={!!cadModalUrl}
        onClose={() => setCadModalUrl(null)}
        fileUrl={cadModalUrl}
        fileName={cadModalName}
      />
    </View>
  );
}

function DocumentDetailModal({ doc, projectName, onClose, onNewVersion, onRefetch, onOpenCad, onOpenImage, onOpenPdf }: any) {
  const insets = useSafeAreaInsets();
  const { data: versions = [], isLoading } = useDocumentVersions(doc?.id);
  const deleteDoc = useDeleteDocument();
  const [sharing, setSharing] = useState(false);

  const openVersion = async (path: string) => {
    try { 
      const url = await createSignedMediaUrl('documents', path, 3600);
      const ext = path.split('.').pop()?.toLowerCase();
      const CAD_EXTS = ['step', 'stp', 'dxf', 'dwg', 'stl', '3mf', 'glb', 'gcode', 'obj'];

      if (CAD_EXTS.includes(ext || '') || doc?.category === 'cad_drawings') {
        onClose();
        onOpenCad(url, doc?.title || 'CAD Model');
      } else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) {
        onClose();
        onOpenImage(url);
      } else {
        onClose();
        onOpenPdf(url);
      }
    }
    catch (e: any) { showAlert('Could not open document', e?.message || 'Try again.'); }
  };

  const shareVersion = async (path: string) => {
    setSharing(true);
    try {
      const url = await createSignedMediaUrl('documents', path, 7 * 24 * 3600);
      await Share.share({ message: `${doc?.title}\n${url}` });
    } catch (e: any) { showAlert('Could not create link', e?.message || 'Try again.'); }
    finally { setSharing(false); }
  };

  const handleDelete = async () => {
    if (!doc) return;
    showAlert(
      'Delete Document',
      `Are you sure you want to permanently delete "${doc.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Document',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc.mutateAsync(doc.id);
              onClose();
              if (onRefetch) onRefetch();
              showAlert('Document Deleted', `"${doc.title}" was deleted.`);
            } catch (err: any) {
              showAlert('Delete Failed', err?.message || 'Could not delete document.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={!!doc} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.sheetHandle} />
          
          <View style={styles.detailHead}>
            <View style={[styles.detailIcon, { backgroundColor: doc ? categoryColor(doc.category) : '#000' }]}>
              <Ionicons name="document-text" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailTitle}>{doc?.title}</Text>
              <Text style={styles.detailMeta}>{doc ? `${categoryLabel(doc.category)} • ${projectName}` : ''}</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Version History</Text>
          {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />}
          <ScrollView style={{ maxHeight: 240, marginTop: 10 }}>
            {versions.map((v: any) => (
              <View key={v.id} style={styles.versionRow}>
                <View style={styles.versionInfo}>
                  <Text style={styles.versionNum}>v{v.rev_no}</Text>
                  <View>
                    <Text style={styles.versionDate}>{v.created_at ? new Date(v.created_at).toLocaleString('en-IN') : ''}</Text>
                    {v.is_current && <Text style={styles.versionCurrent}>Current Version</Text>}
                  </View>
                </View>
                <View style={styles.versionActions}>
                  <TouchableOpacity onPress={() => openVersion(v.storage_path)} style={styles.vBtn}>
                    <Ionicons name="open-outline" size={18} color={doc ? categoryColor(doc.category) : colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => shareVersion(v.storage_path)} disabled={sharing} style={styles.vBtn}>
                    <Ionicons name="share-social-outline" size={18} color={doc ? categoryColor(doc.category) : colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {!isLoading && versions.length === 0 && (
              <Text style={styles.emptyVersionsText}>No stored versions found for this document.</Text>
            )}
          </ScrollView>

          {doc && (
            <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
              <TouchableOpacity style={styles.sheetBtn} activeOpacity={0.8} onPress={() => onNewVersion(doc)}>
                <View style={[styles.sheetBtnBg, { backgroundColor: '#F9F6F0' }]}>
                  <Ionicons name="cloud-upload-outline" size={20} color="#695030" />
                  <Text style={[styles.sheetBtnText, { color: '#695030' }]}>Upload New Version</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetBtn} activeOpacity={0.8} onPress={handleDelete}>
                <View style={[styles.sheetBtnBg, { backgroundColor: 'rgba(220, 38, 38, 0.1)' }]}>
                  <Ionicons name="trash-outline" size={20} color="#DC2626" />
                  <Text style={[styles.sheetBtnText, { color: '#DC2626' }]}>Delete Document</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function ScopeChip({ label, active, onPress }: any) {
  return (
    <TouchableOpacity style={[styles.scopeChip, active && styles.scopeChipActive]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.scopeText, active && styles.scopeTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function FilterChip({ label, active, onPress }: any) {
  return (
    <TouchableOpacity style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },

  // Header
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  headerLabel: { fontSize: 13, color: '#8B7E74', fontFamily: fontFamily.medium, letterSpacing: 0.2 },
  headerTitle: { fontSize: 30, color: '#1E1815', fontFamily: fontFamily.bold, letterSpacing: -0.5, marginTop: 2 },
  uploadTriggerBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: '#695030', paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: 22, shadowColor: '#695030', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  uploadTriggerText: { fontSize: 13, fontFamily: fontFamily.bold, color: '#FFFFFF' },

  // Analytics Card
  analyticsCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: 'rgba(105,80,48,0.08)', shadowColor: '#695030', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2 },
  analyticsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  analyticsItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  analyticsIconBg: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  analyticsValue: { fontSize: 18, fontFamily: fontFamily.bold, color: '#1E1815' },
  analyticsLabel: { fontSize: 10, fontFamily: fontFamily.medium, color: '#8B7E74' },
  analyticsDivider: { width: 1, height: 28, backgroundColor: 'rgba(105,80,48,0.1)' },

  // Search Bar
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: spacing.md, height: 46, gap: spacing.sm, borderWidth: 1, borderColor: 'rgba(105,80,48,0.1)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 },
  searchInput: { flex: 1, fontSize: 13, color: '#1E1815', fontFamily: fontFamily.regular, padding: 0 },

  // Scope Filter
  scopeContainer: { marginBottom: spacing.xs },
  scopeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F5EFE6', borderWidth: 1, borderColor: 'rgba(105,80,48,0.12)' },
  scopeChipActive: { backgroundColor: '#695030', borderColor: '#695030', shadowColor: '#695030', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 },
  scopeText: { fontSize: 12, fontFamily: fontFamily.semiBold, color: '#8B7E74' },
  scopeTextActive: { color: '#FFFFFF' },

  // List
  list: { paddingHorizontal: spacing.lg, paddingBottom: 120, paddingTop: spacing.xs },

  // Folder Grid
  folderGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.md },
  folderCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(105,80,48,0.08)',
    shadowColor: '#695030',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  folderTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  folderIconWrap: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  folderBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  folderBadgeText: { fontSize: 10, fontFamily: fontFamily.bold },
  folderTitle: { fontSize: 14, fontFamily: fontFamily.bold, color: '#1E1815', marginTop: 2 },
  folderSubtitle: { fontSize: 11, fontFamily: fontFamily.medium, color: '#8B7E74' },

  // Breadcrumb Card
  breadcrumbCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, backgroundColor: '#FFFFFF', padding: spacing.md, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(105,80,48,0.08)' },
  breadcrumbIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  breadcrumbText: { fontSize: 13, fontFamily: fontFamily.medium, color: '#1E1815' },

  // Doc Row Card
  docRowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(105,80,48,0.08)',
    shadowColor: '#695030',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  formatBadge: { width: 54, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 2 },
  formatLabel: { fontSize: 9, fontFamily: fontFamily.bold, marginTop: 2 },
  docInfo: { flex: 1 },
  docTitle: { fontSize: 14, fontFamily: fontFamily.bold, color: '#1E1815' },
  docMeta: { fontSize: 12, color: '#8B7E74', marginTop: 2, fontFamily: fontFamily.medium },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 60, gap: spacing.md },
  emptyIconBg: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontFamily: fontFamily.bold, color: '#1E1815' },
  emptyText: { fontSize: 13, color: '#8B7E74', textAlign: 'center', paddingHorizontal: 40 },

  // Modals
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(20,16,12,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.xl },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { fontSize: 20, fontFamily: fontFamily.bold, color: '#1E1815', marginBottom: spacing.lg },

  fieldLabel: { fontSize: 12, fontFamily: fontFamily.bold, color: '#8B7E74', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.md, marginBottom: spacing.sm },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  filterChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], backgroundColor: '#F9FAFB' },
  filterChipActive: { borderColor: '#695030', backgroundColor: '#F5EFE6' },
  filterText: { fontSize: 12, fontFamily: fontFamily.medium, color: colors.neutral[600] },
  filterTextActive: { color: '#695030', fontFamily: fontFamily.bold },

  uploadActionBtn: { borderRadius: 18, backgroundColor: '#695030', paddingVertical: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, shadowColor: '#695030', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  uploadActionText: { fontSize: 15, fontFamily: fontFamily.bold, color: '#FFFFFF' },

  // Detail Modal
  detailHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  detailIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  detailTitle: { fontSize: 18, fontFamily: fontFamily.bold, color: '#1E1815' },
  detailMeta: { fontSize: 13, color: '#8B7E74', marginTop: 2, fontFamily: fontFamily.medium },

  versionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  versionInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  versionNum: { fontSize: 15, fontFamily: fontFamily.bold, color: '#1E1815', backgroundColor: '#F5EFE6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  versionDate: { fontSize: 12, fontFamily: fontFamily.medium, color: colors.neutral[600] },
  versionCurrent: { fontSize: 10, color: '#059669', fontFamily: fontFamily.bold, textTransform: 'uppercase', marginTop: 2 },
  versionActions: { flexDirection: 'row', gap: spacing.sm },
  vBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F5EFE6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(105,80,48,0.1)' },

  sheetBtn: { borderRadius: 16, overflow: 'hidden' },
  sheetBtnBg: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  sheetBtnText: { fontSize: 14, fontFamily: fontFamily.bold },

  emptyVersionsText: { fontSize: 13, color: '#8B7E74', textAlign: 'center', paddingVertical: spacing.lg },

  previewBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  previewClose: { position: 'absolute', right: spacing.lg, zIndex: 10, padding: spacing.sm },
  previewImage: { width: '100%', height: '80%' },
});
