import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '../../src/components';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

const ACTIONS: { icon: string; label: string; description: string; route: string; color: string }[] = [
  { icon: 'person-add', label: 'Add Employee', description: 'Create a new team member account', route: '/(admin)/add-employee', color: colors.info },
  { icon: 'business', label: 'New Project', description: 'Start a new project workspace', route: '/(admin)/create-project', color: colors.primary },
  { icon: 'list', label: 'Create Task', description: 'Assign a new task to a team member', route: '/(admin)/projects', color: colors.success },
  { icon: 'cube', label: 'Request Material', description: 'Submit a material request', route: '/(admin)/projects', color: colors.pending },
  { icon: 'document-text', label: 'Submit DPR', description: 'Create a daily progress report', route: '/(admin)/projects', color: colors.warning },
  { icon: 'cash', label: 'Add Payment', description: 'Record a payment milestone', route: '/(admin)/projects', color: colors.success },
];

export default function AdminAddScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing['6xl'] }}
    >
      <Text style={styles.title}>Quick Actions</Text>
      <Text style={styles.subtitle}>Create and manage from one place</Text>

      <View style={styles.grid}>
        {ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.actionWrap}
            onPress={() => router.push(action.route as any)}
          >
            <Card style={styles.actionCard}>
              <View style={[styles.iconWrap, { backgroundColor: action.color + '15' }]}>
                <Ionicons name={action.icon as any} size={28} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={styles.actionDesc}>{action.description}</Text>
            </Card>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  title: { ...typography.h3, color: colors.ink, marginBottom: spacing.xs },
  subtitle: { ...typography.bodyMedium, color: colors.neutral[500], marginBottom: spacing['2xl'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  actionWrap: { width: '47%' },
  actionCard: { padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  iconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { ...typography.h6, color: colors.ink, textAlign: 'center' },
  actionDesc: { ...typography.caption, color: colors.neutral[500], textAlign: 'center' },
});
