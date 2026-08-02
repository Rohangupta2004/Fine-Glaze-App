import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

import { useAuthStore } from '../../src/stores/authStore';
import { useMyAssignedProjects } from '../../src/hooks/useAssignedProjects';
import { useDocuments } from '../../src/hooks/useDocuments';
import { supabase } from '../../src/lib/supabase';
import { createSignedMediaUrl } from '../../src/lib/mediaStorage';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import type { DocumentCategory, DocumentRow } from '../../src/types';
import { showAlert } from '../../src/utils/alert';
import { CadViewerModal } from '../../src/components';

const CATEGORY_LABEL: Record<string, string> = {
  cad_drawings: 'CAD & 3D',
  drawings: 'Drawings',
  boq: 'BOQ',
  work_orders: 'Work Orders',
  warranty: 'Warranty',
  safety: 'Safety',
  invoices: 'Invoices',
  contracts: 'Contracts',
  quotation: 'Quotation',
  amc: 'AMC',
  other: 'Other',
};

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

export default function WorkerDocumentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);

  const { data: assignedProjects = [] } = useMyAssignedProjects(profile?.id);
  const activeProject = assignedProjects[0];

  const [docType, setDocType] = useState<'site' | 'personal'>('site');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [search, setSearch] = useState<string>('');

  // Preview modals
  const [cadUrl, setCadUrl] = useState<string | null>(null);
  const [cadName, setCadName] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const { data: siteDocs = [], isLoading: loadingSite } = useDocuments('project', activeProject?.id);
  const { data: personalDocs = [], isLoading: loadingPersonal } = useDocuments('profile', profile?.id);
  const isLoading = docType === 'site' ? loadingSite : loadingPersonal;

  const rawDocs = docType === 'site' ? siteDocs : personalDocs;

  const filteredDocs = useMemo(() => {
    let list = rawDocs;
    if (selectedCategory !== 'all') {
      list = list.filter((d) => d.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((d) => d.title.toLowerCase().includes(q) || (CATEGORY_LABEL[d.category] || d.category).toLowerCase().includes(q));
    }
    return list;
  }, [rawDocs, selectedCategory, search]);

  const handleOpenDoc = async (doc: DocumentRow) => {
    setOpeningId(doc.id);
    try {
      // Fetch latest version storage path or use fallback
      const { data: versions } = await (supabase as any)
        .from('document_versions')
        .select('storage_path')
        .eq('document_id', doc.id)
        .order('rev_no', { ascending: false })
        .limit(1);

      const path = versions?.[0]?.storage_path;
      if (!path) {
        showAlert('Not Found', 'No file version stored for this document.');
        return;
      }

      const signedUrl = await createSignedMediaUrl('documents', path, 3600);
      const ext = path.split('.').pop()?.toLowerCase() || '';
      const CAD_EXTS = ['step', 'stp', 'dxf', 'dwg', 'stl', '3mf', 'glb', 'gcode', 'obj'];

      if (CAD_EXTS.includes(ext) || doc.category === 'cad_drawings') {
        setCadName(doc.title);
        setCadUrl(signedUrl);
      } else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
        setImageUrl(signedUrl);
      } else {
        setPdfUrl(signedUrl);
      }
    } catch (e: any) {
      showAlert('Could not open file', e?.message || 'Try again.');
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#1E1815" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={styles.headerLabel}>Vault</Text>
          <Text style={styles.title}>Project Drawings & Docs</Text>
        </View>
      </View>

      {/* Main Scope Switcher */}
      <View style={styles.scopeSwitchRow}>
        <TouchableOpacity
          style={[styles.scopeBtn, docType === 'site' && styles.scopeBtnActive]}
          onPress={() => { setDocType('site'); setSelectedCategory('all'); }}
          activeOpacity={0.8}
        >
          <Ionicons name="business" size={16} color={docType === 'site' ? '#fff' : '#695030'} />
          <Text style={[styles.scopeBtnText, docType === 'site' && styles.scopeBtnTextActive]} numberOfLines={1}>
            Site Drawings ({activeProject?.name || 'Site'})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.scopeBtn, docType === 'personal' && styles.scopeBtnActive]}
          onPress={() => { setDocType('personal'); setSelectedCategory('all'); }}
          activeOpacity={0.8}
        >
          <Ionicons name="person" size={16} color={docType === 'personal' ? '#fff' : '#695030'} />
          <Text style={[styles.scopeBtnText, docType === 'personal' && styles.scopeBtnTextActive]}>
            My IDs & Contracts
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#8B7E74" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search drawings or files..."
          placeholderTextColor="#8B7E74"
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#A09080" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category filter */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, selectedCategory === 'all' && styles.filterChipActive]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={[styles.filterText, selectedCategory === 'all' && styles.filterTextActive]}>
            All ({rawDocs.length})
          </Text>
        </TouchableOpacity>
        {(Array.from(new Set(rawDocs.map(d => d.category))) as DocumentCategory[]).map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.filterText, selectedCategory === cat && styles.filterTextActive]}>
              {CATEGORY_LABEL[cat] || cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredDocs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const format = getFormatBadge(item.title, item.category);
          const isOpening = openingId === item.id;
          return (
            <TouchableOpacity onPress={() => handleOpenDoc(item)} activeOpacity={0.85}>
              <View style={styles.docCardRow}>
                <View style={[styles.formatBadge, { backgroundColor: format.color + '15' }]}>
                  <Ionicons name={format.icon as any} size={18} color={format.color} />
                  <Text style={[styles.formatText, { color: format.color }]}>{format.label}</Text>
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.docCat}>
                    {CATEGORY_LABEL[item.category] || item.category}
                    {item.created_at ? ` • ${new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                  </Text>
                </View>
                {isOpening ? (
                  <ActivityIndicator size="small" color="#695030" />
                ) : (
                  <View style={styles.openBtn}>
                    <Ionicons name="eye-outline" size={16} color="#695030" />
                    <Text style={styles.openBtnText}>View</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={56} color="#A09080" />
            <Text style={styles.emptyTitle}>No documents found</Text>
            <Text style={styles.emptyBody}>
              {isLoading ? 'Loading documents...' : 'Drawings & documents uploaded by your project team will appear here.'}
            </Text>
          </View>
        }
      />

      {/* Image Preview Modal */}
      <Modal visible={!!imageUrl} transparent animationType="fade" onRequestClose={() => setImageUrl(null)}>
        <View style={styles.previewBackdrop}>
          <TouchableOpacity style={[styles.previewClose, { top: insets.top + spacing.md }]} onPress={() => setImageUrl(null)}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {imageUrl && <Image source={{ uri: imageUrl }} style={styles.previewImage} resizeMode="contain" />}
        </View>
      </Modal>

      {/* PDF / Document Viewer Modal */}
      <Modal visible={!!pdfUrl} transparent animationType="slide" onRequestClose={() => setPdfUrl(null)}>
        <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
          <View style={{ height: insets.top + 60, backgroundColor: '#FAF8F5', flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }}>
            <TouchableOpacity onPress={() => setPdfUrl(null)} hitSlop={12} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(105,80,48,0.1)' }}>
              <Ionicons name="close" size={24} color="#1E1815" />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: '#1E1815', marginLeft: spacing.md }}>Document Viewer</Text>
          </View>
          {pdfUrl && (
            Platform.OS === 'web' ? (
              <iframe src={pdfUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Document Viewer" />
            ) : (
              <WebView
                source={{ uri: Platform.OS === 'android' ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUrl)}` : pdfUrl }}
                style={{ flex: 1 }}
                startInLoadingState={true}
                renderLoading={() => <ActivityIndicator size="large" color={colors.primary} style={{ position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -18 }, { translateY: -18 }] }} />}
              />
            )
          )}
        </View>
      </Modal>

      {/* CAD 3D Viewer */}
      <CadViewerModal
        visible={!!cadUrl}
        onClose={() => setCadUrl(null)}
        fileUrl={cadUrl}
        fileName={cadName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerLabel: {
    fontSize: 12,
    color: '#8B7E74',
    fontFamily: fontFamily.medium,
  },
  title: {
    fontSize: 24,
    color: '#1E1815',
    fontFamily: fontFamily.bold,
  },

  scopeSwitchRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  scopeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
    backgroundColor: '#F5EFE6',
    borderWidth: 1,
    borderColor: 'rgba(105,80,48,0.12)',
  },
  scopeBtnActive: {
    backgroundColor: '#695030',
    borderColor: '#695030',
    shadowColor: '#695030',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  scopeBtnText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: '#695030',
  },
  scopeBtnTextActive: {
    color: '#FFFFFF',
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(105,80,48,0.1)',
    marginBottom: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E1815',
    fontFamily: fontFamily.regular,
    padding: 0,
  },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5EFE6',
  },
  filterChipActive: {
    backgroundColor: '#695030',
  },
  filterText: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: '#8B7E74',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontFamily: fontFamily.semiBold,
  },

  list: {
    padding: spacing.lg,
    paddingBottom: 100,
    gap: spacing.sm,
  },
  docCardRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(105,80,48,0.08)',
    shadowColor: '#695030',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  formatBadge: {
    width: 52,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatText: {
    fontSize: 9,
    fontFamily: fontFamily.bold,
    marginTop: 2,
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    color: '#1E1815',
  },
  docCat: {
    fontSize: 11,
    color: '#8B7E74',
    marginTop: 2,
    fontFamily: fontFamily.medium,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5EFE6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  openBtnText: {
    fontSize: 11,
    fontFamily: fontFamily.bold,
    color: '#695030',
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fontFamily.bold,
    color: '#1E1815',
  },
  emptyBody: {
    fontSize: 13,
    color: '#8B7E74',
    textAlign: 'center',
    lineHeight: 18,
  },

  previewBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  previewClose: { position: 'absolute', right: spacing.lg, zIndex: 10, padding: spacing.sm },
  previewImage: { width: '100%', height: '80%' },
});
