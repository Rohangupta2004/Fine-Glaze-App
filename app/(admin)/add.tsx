import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import { Card } from '../../src/components';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

const ACTIONS: { icon: string; label: string; description: string; route: string; color: string }[] = [
  { icon: 'person-add', label: 'Add Employee', description: 'Create a new team member account', route: '/(admin)/add-employee', color: colors.info },
  { icon: 'business', label: 'New Project', description: 'Start a new project workspace', route: '/(admin)/create-project', color: colors.primary },
  { icon: 'list', label: 'Create Task', description: 'Assign a new task to a team member', route: '/(admin)/create-task', color: colors.success },
  { icon: 'cube', label: 'Request Material', description: 'Submit a material request', route: '/(admin)/projects?intent=material', color: colors.pending },
  { icon: 'document-text', label: 'Submit DPR', description: 'Create a daily progress report', route: '/(admin)/projects?intent=dpr', color: colors.warning },
  { icon: 'cash', label: 'Add Payment', description: 'Record a payment milestone', route: '/(admin)/projects?intent=payment', color: colors.success },
];

export default function AdminAddScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleClose = () => {
    router.back();
  };

  const handleAction = (route: string) => {
    router.back();
    // Use a slight timeout to allow the modal to close before pushing new screen
    setTimeout(() => {
      router.push(route as any);
    }, 100);
  };

  return (
    <Modal visible={true} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill}>
        <View style={[styles.container, { paddingTop: insets.top + spacing['3xl'] }]}>
          
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Quick Actions</Text>
              <Text style={styles.subtitle}>Create and manage from one place</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              {ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  style={styles.actionWrap}
                  onPress={() => handleAction(action.route)}
                  activeOpacity={0.8}
                >
                  <Card style={styles.actionCard} variant="elevated">
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

        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.7)' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing['2xl'],
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  title: { ...typography.h2, color: colors.ink, marginBottom: spacing.xs },
  subtitle: { ...typography.bodyMedium, color: colors.neutral[600] },
  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing['6xl'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  actionWrap: { width: '47.5%' },
  actionCard: { padding: spacing.lg, alignItems: 'center', gap: spacing.md, minHeight: 180, justifyContent: 'center' },
  iconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { ...typography.h5, color: colors.ink, textAlign: 'center' },
  actionDesc: { ...typography.bodySmall, color: colors.neutral[500], textAlign: 'center', lineHeight: 18 },
});
