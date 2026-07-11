/**
 * Client — Materials (read-only view of requests & deliveries on their project)
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, StatusChip } from '../../src/components';
import { useProjects } from '../../src/hooks/useProjects';
import { useMaterialRequests, useDeliveries } from '../../src/hooks/useMaterials';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

export default function ClientMaterialsScreen() {
  const insets = useSafeAreaInsets();
  const { data: projects } = useProjects();
  const project = (projects || [])[0];
  const { data: requests = [], refetch: r1, isRefetching: f1 } = useMaterialRequests(project?.id);
  const { data: deliveries = [], refetch: r2, isRefetching: f2 } = useDeliveries();

  const projectDeliveries = deliveries.filter((d: any) => d.project_id === project?.id);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.title}>Materials</Text>
      {project && <Text style={styles.subtitle}>{project.name}</Text>}
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        refreshControl={<RefreshControl refreshing={f1 || f2} onRefresh={() => { r1(); r2(); }} tintColor={colors.primary} />}
      >
        <Text style={styles.sectionLabel}>Material Requests ({requests.length})</Text>
        {requests.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={36} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>No material activity yet on your project.</Text>
          </View>
        )}
        {requests.map((req) => (
          <Card key={req.id} style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{req.material_name}</Text>
                <Text style={styles.itemMeta}>
                  Qty {req.qty}{req.spec ? ` • ${req.spec}` : ''}{req.needed_by ? ` • Needed by ${req.needed_by}` : ''}
                </Text>
              </View>
              <StatusChip status={req.status === 'ordered' ? 'in_progress' : (req.status as any)} label={req.status === 'ordered' ? 'Ordered' : undefined} size="sm" />
            </View>
          </Card>
        ))}

        <Text style={styles.sectionLabel}>Deliveries ({projectDeliveries.length})</Text>
        {projectDeliveries.map((d: any) => (
          <Card key={d.id} style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{d.delivery_code || 'Delivery'}</Text>
                <Text style={styles.itemMeta}>
                  {d.delivered_at ? new Date(d.delivered_at).toLocaleDateString('en-IN') : 'In transit'}
                </Text>
              </View>
              <StatusChip
                status={d.status === 'delivered' ? 'completed' : 'in_progress'}
                label={d.status === 'delivered' ? 'Delivered' : 'In Transit'}
                size="sm"
              />
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  title: { ...typography.h3, color: colors.ink },
  subtitle: { ...typography.bodyMedium, color: colors.neutral[500], marginBottom: spacing.lg },
  sectionLabel: {
    ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.neutral[400],
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  card: { padding: spacing.md, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemTitle: { ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },
  itemMeta: { ...typography.caption, color: colors.neutral[400], marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.neutral[400], textAlign: 'center' },
});
