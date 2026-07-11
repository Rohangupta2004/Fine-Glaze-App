import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '../../src/components';
import { useProjects } from '../../src/hooks/useProjects';
import { useDocuments } from '../../src/hooks/useDocuments';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

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

  // Group by category
  const grouped = (documents || []).reduce((acc, doc) => {
    const cat = doc.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {} as Record<string, typeof documents>);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing['6xl'] }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <Text style={styles.title}>Documents</Text>
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
  );
}

const styles = StyleSheet.create({
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
