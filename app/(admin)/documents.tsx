import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, RefreshControl, Share, ActivityIndicator, Linking, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { WebView } from 'react-native-webview';

import { useAllDocuments, useDocumentVersions } from '../../src/hooks/useDocuments';
import { useDocumentUpload } from '../../src/hooks/useDocumentUpload';
import { useProjects } from '../../src/hooks/useProjects';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase } from '../../src/lib/supabase';
import { createSignedMediaUrl } from '../../src/lib/mediaStorage';
import { colors } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import type { DocumentRow } from '../../src/types';
import { showAlert } from '../../src/utils/alert';

const CATEGORIES: { key: string; label: string; icon: string; color: string }[] = [
  { key: 'drawings', label: 'Drawings', icon: 'color-palette', color: '#2563EB' },
  { key: 'boq', label: 'BOQ', icon: 'calculator', color: '#059669' },
  { key: 'quotation', label: 'Quotations', icon: 'pricetag', color: '#D97706' },
  { key: 'work_orders', label: 'Work Orders', icon: 'briefcase', color: '#7C3AED' },
  { key: 'contracts', label: 'Contracts', icon: 'document-lock', color: '#E11D48' },
  { key: 'invoices', label: 'Invoices', icon: 'receipt', color: '#0284C7' },
  { key: 'warranty', label: 'Warranty', icon: 'shield-checkmark', color: '#16A34A' },
  { key: 'safety', label: 'Safety', icon: 'medkit', color: '#EA580C' },
  { key: 'amc', label: 'AMC', icon: 'construct', color: '#4F46E5' },
  { key: 'other', label: 'Other', icon: 'folder', color: '#695030' },
];

const categoryLabel = (key: string) => CATEGORIES.find((c) => c.key === key)?.label || key;
const categoryColor = (key: string) => CATEGORIES.find((c) => c.key === key)?.color || '#695030';

export default function AdminDocumentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);

  const { data: documents = [], refetch, isRefetching } = useAllDocuments();
  const { data: projects = [] } = useProjects();
  const upload = useDocumentUpload();

  const [scopeFilter, setScopeFilter] = useState<string>('all'); // all | company | <projectId>
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Upload modal
  const [uploadModal, setUploadModal] = useState(false);
  const [upScope, setUpScope] = useState<string>('company');
  const [upCategory, setUpCategory] = useState('drawings');

  // Detail modal
  const [selectedDoc, setSelectedDoc] = useState<DocumentRow | null>(null);
  
  // Direct image preview
  const [directPreviewUrl, setDirectPreviewUrl] = useState<string | null>(null);
  const [directPdfUrl, setDirectPdfUrl] = useState<string | null>(null);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

  const handleDocPress = async (doc: DocumentRow) => {
    const ext = doc.title.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) {
      setLoadingDocId(doc.id);
      try {
        const { data } = await supabase.from('document_versions').select('storage_path').eq('document_id', doc.id).eq('is_current', true).single();
        if (data?.storage_path) {
          const url = await createSignedMediaUrl('documents', data.storage_path, 3600);
          setDirectPreviewUrl(url);
          setLoadingDocId(null);
          return;
        }
      } catch (e) {
        // Silently fallback to modal if it fails
      }
      setLoadingDocId(null);
    } else {
      setLoadingDocId(doc.id);
      try {
        const { data } = await supabase.from('document_versions').select('storage_path').eq('document_id', doc.id).eq('is_current', true).single();
        if (data?.storage_path) {
          const url = await createSignedMediaUrl('documents', data.storage_path, 3600);
          setDirectPdfUrl(url);
          setLoadingDocId(null);
          return;
        }
      } catch (e) {
        // Silently fallback to modal if it fails
      }
      setLoadingDocId(null);
    }
    setSelectedDoc(doc);
  };

  const projectNames = useMemo(() => new Map((projects || []).map((p: any) => [p.id, p.name])), [projects]);

  const filtered = useMemo(() => {
    let list = documents;
    if (scopeFilter === 'company') list = list.filter((d) => d.owner_type === 'company');
    else if (scopeFilter !== 'all') list = list.filter((d) => d.owner_type === 'project' && d.owner_id === scopeFilter);
    if (categoryFilter) list = list.filter((d) => d.category === categoryFilter);
    return list;
  }, [documents, scopeFilter, categoryFilter]);

  const byCategoryCount = useMemo(() => {
    const counts: Record<string, number> = {};
    const scopeDocs = documents.filter(d => 
      scopeFilter === 'all' ? true : 
      scopeFilter === 'company' ? d.owner_type === 'company' : 
      (d.owner_type === 'project' && d.owner_id === scopeFilter)
    );
    for (const d of scopeDocs) counts[d.category] = (counts[d.category] || 0) + 1;
    return counts;
  }, [documents, scopeFilter]);

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
      showAlert('Uploaded ✅', 'Document saved to the vault.');
    } catch (e: any) {
      if (e?.message !== 'File selection cancelled') {
        showAlert('Upload failed', e?.message || 'Please try again.');
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Light Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#1E1815" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerLabel}>Vault</Text>
            <Text style={styles.headerTitle}>Documents</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setUploadModal(true)}>
            <Ionicons name="cloud-upload" size={20} color="#1E1815" />
          </TouchableOpacity>
        </View>

        {/* Stats Strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{documents.filter(d => d.owner_type === 'company').length}</Text>
            <Text style={styles.statLabel}>Internal</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{documents.filter(d => d.owner_type === 'project').length}</Text>
            <Text style={styles.statLabel}>Projects</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{documents.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      </View>

      {/* Scope filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scopeRow}
        contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
      >
        <ScopeChip label="All Vault" active={scopeFilter === 'all'} onPress={() => setScopeFilter('all')} />
        <ScopeChip label="🏢 Internal" active={scopeFilter === 'company'} onPress={() => setScopeFilter('company')} />
        {(projects || []).map((p: any) => (
          <ScopeChip key={p.id} label={p.name} active={scopeFilter === p.id} onPress={() => setScopeFilter(p.id)} />
        ))}
      </ScrollView>

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
                  style={styles.folder}
                  activeOpacity={0.7}
                  onPress={() => setCategoryFilter(cat.key)}
                >
                  <View style={[styles.folderIconBg, { backgroundColor: cat.color + '15' }]}>
                    <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                  </View>
                  <Text style={styles.folderLabel}>{cat.label}</Text>
                  <Text style={styles.folderCount}>{count} file{count !== 1 && 's'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* List View */}
        {categoryFilter && (
          <View style={{ marginBottom: spacing.sm }}>
            <TouchableOpacity style={styles.breadcrumb} onPress={() => setCategoryFilter(null)}>
              <View style={styles.breadcrumbIcon}>
                <Ionicons name="chevron-back" size={16} color={categoryColor(categoryFilter)} />
              </View>
              <Text style={[styles.breadcrumbText, { color: categoryColor(categoryFilter) }]}>
                Folders / <Text style={{ fontFamily: fontFamily.bold }}>{categoryLabel(categoryFilter)}</Text>
              </Text>
            </TouchableOpacity>

            {filtered.length === 0 && (
              <View style={styles.empty}>
                <View style={[styles.emptyIconBg, { backgroundColor: categoryColor(categoryFilter) + '15' }]}>
                  <Ionicons name="folder-open" size={40} color={categoryColor(categoryFilter)} />
                </View>
                <Text style={styles.emptyTitle}>Folder is empty</Text>
                <Text style={styles.emptyText}>Tap the upload button to add documents here.</Text>
              </View>
            )}

            {filtered.map((doc) => (
              <TouchableOpacity key={doc.id} activeOpacity={0.8} onPress={() => handleDocPress(doc)}>
                <View style={styles.docCard}>
                  <View style={[styles.docIcon, { backgroundColor: categoryColor(doc.category) }]}>
                    <Ionicons name="document-text" size={18} color="#fff" />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docTitle} numberOfLines={1}>{doc.title}</Text>
                    <Text style={styles.docMeta}>
                      {doc.owner_type === 'company' ? 'Internal' : (projectNames.get(doc.owner_id) || 'Project')}
                      {doc.created_at ? ` • ${new Date(doc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                    </Text>
                  </View>
                  {loadingDocId === doc.id ? (
                    <ActivityIndicator size="small" color={categoryColor(doc.category)} />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Upload Modal */}
      <Modal visible={uploadModal} transparent animationType="fade" onRequestClose={() => setUploadModal(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setUploadModal(false)}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Upload Document</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Save to</Text>
              <View style={styles.chipsRow}>
                <FilterChip label="🏢 Internal (Company)" active={upScope === 'company'} onPress={() => setUpScope('company')} />
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

              <TouchableOpacity style={styles.uploadBtn} activeOpacity={0.8} onPress={doUpload} disabled={upload.isPending}>
                <View style={styles.uploadBtnBg}>
                  {upload.isPending ? <ActivityIndicator color="#fff" /> : <Ionicons name="cloud-upload" size={20} color="#fff" />}
                  <Text style={styles.uploadBtnText}>{upload.isPending ? 'Uploading...' : 'Choose File & Upload'}</Text>
                </View>
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
        onNewVersion={async (doc: DocumentRow) => {
          try {
            await upload.mutateAsync({
              ownerType: doc.owner_type as any,
              ownerId: doc.owner_id,
              category: doc.category,
              existingDocumentId: doc.id,
            });
            refetch();
            showAlert('New version uploaded ✅');
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
    </View>
  );
}

function DocumentDetailModal({ doc, projectName, onClose, onNewVersion }: any) {
  const insets = useSafeAreaInsets();
  const { data: versions = [], isLoading } = useDocumentVersions(doc?.id);
  const [sharing, setSharing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  const openVersion = async (path: string) => {
    try { 
      const url = await createSignedMediaUrl('documents', path, 3600);
      const ext = path.split('.').pop()?.toLowerCase();
      if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) {
        setPreviewUrl(url);
      } else {
        setPdfPreviewUrl(url);
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

  return (
    <>
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
          <ScrollView style={{ maxHeight: 280, marginTop: 10 }}>
            {versions.map((v: any, idx: number) => (
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
              <Text style={styles.emptyText}>No stored versions found for this document.</Text>
            )}
          </ScrollView>

          {doc && (
            <TouchableOpacity style={[styles.uploadBtn, { marginTop: spacing.lg }]} activeOpacity={0.8} onPress={() => onNewVersion(doc)}>
              <View style={[styles.uploadBtnBg, { backgroundColor: '#F9F6F0' }]}>
                <Ionicons name="cloud-upload-outline" size={20} color="#695030" />
                <Text style={[styles.uploadBtnText, { color: '#695030' }]}>Upload New Version</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
    
    <Modal visible={!!previewUrl} transparent animationType="fade" onRequestClose={() => setPreviewUrl(null)}>
      <View style={styles.previewBackdrop}>
        <TouchableOpacity style={[styles.previewClose, { top: insets.top + spacing.md }]} onPress={() => setPreviewUrl(null)}>
          <Ionicons name="close" size={32} color="#fff" />
        </TouchableOpacity>
        {previewUrl && (
          <Image source={{ uri: previewUrl }} style={styles.previewImage} resizeMode="contain" />
        )}
      </View>
    </Modal>

    {/* Detail Document Preview Modal */}
    <Modal visible={!!pdfPreviewUrl} transparent animationType="slide" onRequestClose={() => setPdfPreviewUrl(null)}>
      <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
        <View style={{ height: insets.top + 60, backgroundColor: '#FAF8F5', flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }}>
          <TouchableOpacity onPress={() => setPdfPreviewUrl(null)} hitSlop={12} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(105,80,48,0.1)' }}>
            <Ionicons name="close" size={24} color="#1E1815" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: '#1E1815', marginLeft: spacing.md }}>Document Viewer</Text>
        </View>
        {pdfPreviewUrl && (
            Platform.OS === 'web' ? (
              <iframe src={pdfPreviewUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Document Viewer" />
            ) : (
              <WebView 
                source={{ uri: Platform.OS === 'android' ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfPreviewUrl)}` : pdfPreviewUrl }} 
                style={{ flex: 1 }}
                startInLoadingState={true}
                renderLoading={() => <ActivityIndicator size="large" color={colors.primary} style={{ position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -18 }, { translateY: -18 }] }} />}
              />
            )
        )}
      </View>
    </Modal>
    </>
  );
}

function ScopeChip({ label, active, onPress }: any) {
  return (
    <TouchableOpacity style={[styles.scopeChip, active && styles.scopeChipActive]} onPress={onPress}>
      <Text style={[styles.scopeText, active && styles.scopeTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function FilterChip({ label, active, onPress }: any) {
  return (
    <TouchableOpacity style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </TouchableOpacity>
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

  // Stats Strip
  statsStrip: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: 'rgba(105,80,48,0.1)', boxShadow: '0px 4px 12px rgba(0,0,0,0.03)' } as any,
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, color: '#1E1815', fontFamily: fontFamily.bold },
  statLabel: { fontSize: 10, color: '#666', fontFamily: fontFamily.medium, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(105,80,48,0.1)' },

  // Scopes
  scopeRow: { flexGrow: 0, paddingVertical: spacing.md },
  scopeChip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(105,80,48,0.15)', boxShadow: '0px 2px 6px rgba(0,0,0,0.03)' } as any,
  scopeChipActive: { backgroundColor: '#695030', borderColor: '#695030' },
  scopeText: { fontSize: 13, fontFamily: fontFamily.semiBold, color: colors.neutral[600] },
  scopeTextActive: { color: '#fff' },

  // List
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100, paddingTop: spacing.xs },

  // Folder Grid
  folderGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.md },
  folder: {
    width: '47.5%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(105,80,48,0.08)',
    boxShadow: '0px 4px 14px rgba(0,0,0,0.03)',
  } as any,
  folderIconBg: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  folderLabel: { fontSize: 14, fontFamily: fontFamily.bold, color: '#1E1815' },
  folderCount: { fontSize: 11, color: colors.neutral[400] },

  // Breadcrumb
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg, backgroundColor: '#fff', padding: spacing.md, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(105,80,48,0.08)' },
  breadcrumbIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.03)', alignItems: 'center', justifyContent: 'center' },
  breadcrumbText: { fontSize: 14, fontFamily: fontFamily.medium },

  // Doc Card
  docCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(105,80,48,0.08)',
    boxShadow: '0px 4px 12px rgba(0,0,0,0.03)',
  } as any,
  docIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  docInfo: { flex: 1 },
  docTitle: { fontSize: 15, fontFamily: fontFamily.semiBold, color: '#1E1815' },
  docMeta: { fontSize: 12, color: colors.neutral[400], marginTop: 2 },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 60, gap: spacing.md },
  emptyIconBg: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontFamily: fontFamily.bold, color: '#1E1815' },
  emptyText: { fontSize: 14, color: colors.neutral[400], textAlign: 'center', paddingHorizontal: 40 },

  // Modals
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(20,16,12,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.xl },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { fontSize: 20, fontFamily: fontFamily.bold, color: '#1E1815', marginBottom: spacing.lg },
  
  fieldLabel: { fontSize: 13, fontFamily: fontFamily.bold, color: colors.neutral[500], textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.md, marginBottom: spacing.sm },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  filterChip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], backgroundColor: '#F9FAFB' },
  filterChipActive: { borderColor: '#695030', backgroundColor: '#F9F6F0' },
  filterText: { fontSize: 13, fontFamily: fontFamily.medium, color: colors.neutral[600] },
  filterTextActive: { color: '#695030', fontFamily: fontFamily.bold },

  uploadBtn: { marginTop: spacing.xl, borderRadius: 16, overflow: 'hidden' },
  uploadBtnBg: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg, backgroundColor: '#695030' },
  uploadBtnText: { fontSize: 16, fontFamily: fontFamily.bold, color: '#fff' },

  // Detail Modal
  detailHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  detailIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  detailTitle: { fontSize: 18, fontFamily: fontFamily.bold, color: '#1E1815' },
  detailMeta: { fontSize: 13, color: colors.neutral[500], marginTop: 2 },
  
  versionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  versionInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  versionNum: { fontSize: 16, fontFamily: fontFamily.bold, color: '#1E1815', backgroundColor: colors.neutral[100], paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  versionDate: { fontSize: 13, fontFamily: fontFamily.medium, color: colors.neutral[600] },
  versionCurrent: { fontSize: 10, color: '#059669', fontFamily: fontFamily.bold, textTransform: 'uppercase', marginTop: 2 },
  versionActions: { flexDirection: 'row', gap: spacing.sm },
  vBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.neutral[500], alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.neutral[200] },
  
  previewBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  previewClose: { position: 'absolute', right: spacing.lg, zIndex: 10, padding: spacing.sm },
  previewImage: { width: '100%', height: '80%' },
});
