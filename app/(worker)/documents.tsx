import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useDocuments } from '../../src/hooks/useDocuments';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import type { DocumentCategory } from '../../src/types';

const CATEGORY_ICON: Record<DocumentCategory, React.ComponentProps<typeof Ionicons>['name']> = {
  cad_drawings: 'cube-outline',
  drawings: 'document-outline',
  boq: 'list-outline',
  work_orders: 'clipboard-outline',
  warranty: 'shield-checkmark-outline',
  safety: 'shield-outline',
  invoices: 'receipt-outline',
  contracts: 'document-text-outline',
  quotation: 'pricetag-outline',
  amc: 'refresh-outline',
  other: 'attach-outline',
};

const CATEGORY_LABEL: Record<DocumentCategory, string> = {
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

// Worker document categories (personal documents)
const WORKER_CATEGORIES: DocumentCategory[] = [
  'safety',
  'contracts',
  'other',
];

const WORKER_DOC_LABELS: Partial<Record<DocumentCategory, string>> = {
  safety: 'Safety Certificate',
  contracts: 'Work Order / Agreement',
  other: 'Other Documents',
};

export default function WorkerDocumentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');

  const { data: docs, isLoading } = useDocuments('profile', profile?.id);

  const filteredDocs =
    selectedCategory === 'all'
      ? (docs ?? [])
      : (docs ?? []).filter((d) => d.category === selectedCategory);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>My Documents</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Category filter */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, selectedCategory === 'all' && styles.filterChipActive]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={[styles.filterText, selectedCategory === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {WORKER_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.filterText, selectedCategory === cat && styles.filterTextActive]}>
              {WORKER_DOC_LABELS[cat] ?? CATEGORY_LABEL[cat]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredDocs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Card style={styles.docCard} variant="interactive">
            <View style={styles.docRow}>
              <View style={styles.docIconWrap}>
                <Ionicons
                  name={CATEGORY_ICON[item.category] ?? 'document-outline'}
                  size={22}
                  color={colors.primary}
                />
              </View>
              <View style={styles.docInfo}>
                <Text style={styles.docTitle}>{item.title}</Text>
                <Text style={styles.docCat}>{CATEGORY_LABEL[item.category]}</Text>
              </View>
              <Ionicons name="download-outline" size={20} color={colors.neutral[400]} />
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={64} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No documents</Text>
            <Text style={styles.emptyBody}>
              {isLoading ? 'Loading…' : 'Your documents will appear here once uploaded by admin.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.white,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h5,
    color: colors.ink,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[100],
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    color: colors.neutral[600],
  },
  filterTextActive: {
    color: colors.white,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing['5xl'],
    gap: spacing.sm,
  },
  docCard: {
    padding: spacing.lg,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  docIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    ...typography.h6,
    color: colors.ink,
    marginBottom: 2,
  },
  docCat: {
    ...typography.caption,
    color: colors.neutral[500],
    textTransform: 'capitalize',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing['5xl'],
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h5,
    color: colors.neutral[400],
  },
  emptyBody: {
    ...typography.bodySmall,
    color: colors.neutral[400],
    textAlign: 'center',
  },
});
