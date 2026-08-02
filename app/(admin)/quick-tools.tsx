import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

const TOOLS = [
  {
    title: 'Personal To-Dos',
    desc: 'Manage individual priorities, site notes, and reminders',
    icon: 'checkbox-sharp',
    route: '/(admin)/personal-todos',
    gradient: ['#0369A1', '#0EA5E9'] as const,
  },
  {
    title: 'Quote & Estimation Calculator',
    desc: 'Calculate material costs, glazing quotes, and export to Excel',
    icon: 'calculator-sharp',
    route: '/(admin)/quote-calculator',
    gradient: ['#5B4122', '#8B6840'] as const,
  },
  {
    title: 'Project QR Generator',
    desc: 'Generate printable site QR codes for quick scan attendance',
    icon: 'qr-code-sharp',
    route: '/(admin)/project-qr',
    gradient: ['#15803D', '#22C55E'] as const,
  },
  {
    title: 'Import & Match BOQ',
    desc: 'Bulk import Excel BOQs and run AI material alias matching',
    icon: 'document-attach-sharp',
    route: '/(admin)/import-boq',
    gradient: ['#7E22CE', '#A855F7'] as const,
  },
  {
    title: 'Global Search',
    desc: 'Search across all projects, workers, DPRs, and clients',
    icon: 'search-sharp',
    route: '/(admin)/global-search',
    gradient: ['#C2410C', '#F97316'] as const,
  },
];

export default function QuickTools() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back-sharp" size={20} color="#1E1815" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quick Tools</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subTitle}>ADMIN UTILITIES & CALCULATORS</Text>
        <View style={styles.grid}>
          {TOOLS.map((tool) => (
            <TouchableOpacity
              key={tool.title}
              style={styles.card}
              onPress={() => router.push(tool.route as any)}
              activeOpacity={0.84}
            >
              <LinearGradient
                colors={[...tool.gradient]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconContainer}
              >
                <Ionicons name={tool.icon as any} size={22} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.textWrap}>
                <Text style={styles.toolTitle}>{tool.title}</Text>
                <Text style={styles.toolDesc}>{tool.desc}</Text>
              </View>
              <Ionicons name="chevron-forward-sharp" size={18} color="#C4B9A8" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
    borderBottomColor: '#EAE5DC',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F2EC',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fontFamily.bold,
    color: '#1E1815',
  },
  subTitle: {
    fontSize: 11,
    fontFamily: fontFamily.bold,
    color: '#8B7E74',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['5xl'],
  },
  grid: {
    gap: spacing.sm,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#EAE5DC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 15,
    fontFamily: fontFamily.bold,
    color: '#1E1815',
    marginBottom: 2,
  },
  toolDesc: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: '#8B7E74',
    lineHeight: 16,
  },
});