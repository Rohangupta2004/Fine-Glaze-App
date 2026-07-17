import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, Button } from '../../src/components';
import { useProjects } from '../../src/hooks/useProjects';
import { useDocuments } from '../../src/hooks/useDocuments';
import { useDocumentUpload } from '../../src/hooks/useDocumentUpload';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import { showAlert } from '../../src/utils/alert';

const CATEGORY_ICON: Record<string, { icon: string; color: string }> = {
  drawings: { icon: 'map', color: colors.info },
  boq: { icon: 'calculator', color: colors.pending },
  contracts: { icon: 'document-lock', color: colors.primary },
  quotation: { icon: 'receipt', color: colors.warning },
  invoices: { icon: 'cash', color: colors.success },
  warranty: { icon: 'shield-checkmark', color: colors.success },
  safety: { icon: 'warning', color: colors.warning },
  amc: { icon: 'refresh-circle', color: colors.info },
  work_orders: { icon: 'clipboard', color: colors.primary },
  other: { icon: 'document', color: colors.neutral[500] },
};

export default function ClientDocumentsScreen() {
  const insets = useSafeAreaInsets();
  const { data: projects } = useProjects();
  const project = (projects || [])[0];
  const { data: documents, refetch, isRefetching } = useDocuments('project', project?.id);
  const upload = useDocumentUpload();
  const [uploadModal, setUploadModal] = useState(false);
  const [upCategory, setUpCategory] = useState('quotation');

  const CLIENT_CATEGORIES = [
    { key: 'quotation', label: 'Quotation' },
    { key: 'drawings', label: 'Drawing' },
    { key: 'contracts', label: 'Contract' },
    { key: 'invoices', label: 'Invoice' },
    { key: 'other', label: 'Other' },
  ];

  const doUpload = async () => {
    if (!project?.id) return;
    try {
      await upload.mutateAsync({ ownerType: 'project', ownerId: project.id, category: upCategory });
      setUploadModal(false);
      refetch();
      showAlert('Uploaded ✅', 'Your document has been shared with the Fine Glaze team.');
    } catch (e: any) {
      if (e?.message !== 'File selection cancelled') showAlert('Upload failed', e?.message || 'Try again.');
    }
  };

  // Group by category
  const grouped = (documents || []).reduce((acc, doc) => {
    const cat = doc.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {} as Record<string, typeof documents>);

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing['6xl'] }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={styles.title}>Documents</Text>
        {project ? (
          <TouchableOpacity onPress={() => setUploadModal(true)} hitSlop={12}>
            <Ionicons name="cloud-upload-outline" size={26} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>
      {project && <Text style={styles.subtitle}>{project.name}</Text>}

      {Object.entries(grouped).map(([category, docs]) => {
        const meta = CATEGORY_ICON[category] || CATEGORY_ICON.other;
        return (
          <View key={category}>
            <Text style={styles.categoryTitle}>{category.replace(/_/g, ' ')}</Text>
            {(docs || []).map((doc) => (
              <TouchableOpacity key={doc.id}>
                <Card style={styles.docCard} variant="interactive">
                  <View style={styles.docRow}>
                    <View style={[styles.docIcon, { backgroundColor: meta.color + '15' }]}>
                      <Ionicons name={meta.icon as any} size={22} color={meta.color} />
                    </View>
                    <View style={styles.docInfo}>
                      <Text style={styles.docTitle}>{doc.title}</Text>
                      <Text style={styles.docMeta}>{category.replace(/_/g, ' ')}</Text>
                    </View>
                    <Ionicons name="download-outline" size={20} color={colors.neutral[400]} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        );
      })}

      {(!documents || documents.length === 0) && (
        <View style={styles.empty}>
          <Ionicons name="folder-open-outline" size={56} color={colors.neutral[300]} />
          <Text style={styles.emptyTitle}>Documents Vault</Text>
          <Text style={styles.emptyText}>
            Drawings, contracts, warranties, and other project documents will appear here
          </Text>
        </View>
      )}
    </ScrollView>

      {/* Upload modal */}
      <Modal visible={uploadModal} transparent animationType="slide" onRequestClose={() => setUploadModal(false)}>
        <View style={styles.upBackdrop}>
          <View style={[styles.upSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.upHead}>
              <Text style={styles.upTitle}>Upload Document</Text>
              <TouchableOpacity onPress={() => setUploadModal(false)}>
                <Ionicons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>
            <Text style={styles.upHelp}>Share quotations, drawings, or any file with the Fine Glaze team. All file types accepted (max 25 MB).</Text>
            <View style={styles.upChips}>
              {CLIENT_CATEGORIES.map((c) => (
                <TouchableOpacity key={c.key} style={[styles.upChip, upCategory === c.key && styles.upChipActive]} onPress={() => setUpCategory(c.key)}>
                  <Text style={[styles.upChipText, upCategory === c.key && styles.upChipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button title="Choose File & Upload" onPress={doUpload} loading={upload.isPending} fullWidth />
          </View>
        </View>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  upBackdrop: { flex: 1, backgroundColor: 'rgba(26,22,17,0.4)', justifyContent: 'flex-end' },
  upSheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  upHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  upTitle: { ...typography.h4, color: colors.ink },
  upHelp: { ...typography.bodySmall, color: colors.neutral[400], marginBottom: spacing.md },
  upChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  upChip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral[200], backgroundColor: colors.white },
  upChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  upChipText: { ...typography.bodySmall, color: colors.neutral[600] },
  upChipTextActive: { color: colors.primary, fontFamily: fontFamily.semiBold },
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  title: { ...typography.h3, color: colors.ink },
  subtitle: { ...typography.bodyMedium, color: colors.neutral[500], marginBottom: spacing.xl },
  categoryTitle: {
    ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.neutral[400],
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.lg,
  },
  docCard: { padding: spacing.md, marginBottom: spacing.sm },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  docIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  docInfo: { flex: 1 },
  docTitle: { ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },
  docMeta: { ...typography.caption, color: colors.neutral[500], marginTop: 2, textTransform: 'capitalize' },
  empty: { alignItems: 'center', paddingVertical: spacing['5xl'], gap: spacing.sm },
  emptyTitle: { ...typography.h5, color: colors.neutral[400] },
  emptyText: { ...typography.bodySmall, color: colors.neutral[400], textAlign: 'center', paddingHorizontal: spacing['2xl'] },
});
