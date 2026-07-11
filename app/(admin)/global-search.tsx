/**
 * Global Search — Admin
 * PRD §29a — One search box across employees, projects, materials, documents, tasks.
 * Results grouped by type; tap → opens the record.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, Avatar, StatusChip } from '../../src/components';
import { useGlobalSearch } from '../../src/hooks/useGlobalSearch';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

export default function GlobalSearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { data: results, isLoading } = useGlobalSearch(query);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employees, projects, materials..."
            placeholderTextColor={colors.neutral[400]}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.neutral[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading && query.length >= 2 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {query.length < 2 && (
        <View style={styles.hintContainer}>
          <Ionicons name="search-outline" size={48} color={colors.neutral[300]} />
          <Text style={styles.hintText}>Type at least 2 characters to search</Text>
        </View>
      )}

      {results && results.totalCount === 0 && query.length >= 2 && (
        <View style={styles.hintContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.neutral[300]} />
          <Text style={styles.hintText}>No results found for "{query}"</Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['6xl'] }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Employees */}
        {results && results.employees.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Employees ({results.employees.length})</Text>
            </View>
            {results.employees.map((emp) => (
              <TouchableOpacity
                key={emp.id}
                onPress={() => router.push({ pathname: '/(admin)/employee-profile' as any, params: { id: emp.id } })}
              >
                <Card style={styles.resultCard} variant="interactive">
                  <View style={styles.resultRow}>
                    <Avatar name={emp.full_name} uri={emp.avatar_url} size={40} />
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultTitle}>{emp.full_name}</Text>
                      <Text style={styles.resultSub}>{emp.role} · {emp.phone}</Text>
                    </View>
                    <StatusChip status={emp.status} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Projects */}
        {results && results.projects.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business" size={18} color={colors.info} />
              <Text style={styles.sectionTitle}>Projects ({results.projects.length})</Text>
            </View>
            {results.projects.map((proj) => (
              <TouchableOpacity
                key={proj.id}
                onPress={() => router.push({ pathname: '/(admin)/project-workspace' as any, params: { id: proj.id } })}
              >
                <Card style={styles.resultCard} variant="interactive">
                  <View style={styles.resultRow}>
                    <View style={[styles.typeIcon, { backgroundColor: colors.infoBg }]}>
                      <Ionicons name="business" size={18} color={colors.info} />
                    </View>
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultTitle}>{proj.name}</Text>
                      <Text style={styles.resultSub}>{proj.city} · {proj.progress_pct}%</Text>
                    </View>
                    <StatusChip status={proj.status} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tasks */}
        {results && results.tasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle" size={18} color={colors.warning} />
              <Text style={styles.sectionTitle}>Tasks ({results.tasks.length})</Text>
            </View>
            {results.tasks.map((task) => (
              <Card key={task.id} style={styles.resultCard} variant="interactive">
                <View style={styles.resultRow}>
                  <View style={[styles.typeIcon, { backgroundColor: colors.warningBg }]}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.warning} />
                  </View>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultTitle}>{task.title}</Text>
                    <Text style={styles.resultSub}>{task.level_zone} · {task.priority} · {task.status}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Materials */}
        {results && results.materials.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cube" size={18} color={colors.pending} />
              <Text style={styles.sectionTitle}>Materials ({results.materials.length})</Text>
            </View>
            {results.materials.map((mat) => (
              <Card key={mat.id} style={styles.resultCard} variant="interactive">
                <View style={styles.resultRow}>
                  <View style={[styles.typeIcon, { backgroundColor: colors.pendingBg }]}>
                    <Ionicons name="cube" size={18} color={colors.pending} />
                  </View>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultTitle}>{mat.material_name}</Text>
                    <Text style={styles.resultSub}>Qty: {mat.qty} · {mat.status}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Documents */}
        {results && results.documents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={18} color={colors.success} />
              <Text style={styles.sectionTitle}>Documents ({results.documents.length})</Text>
            </View>
            {results.documents.map((doc) => (
              <Card key={doc.id} style={styles.resultCard} variant="interactive">
                <View style={styles.resultRow}>
                  <View style={[styles.typeIcon, { backgroundColor: colors.successBg }]}>
                    <Ionicons name="document-text" size={18} color={colors.success} />
                  </View>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultTitle}>{doc.title}</Text>
                    <Text style={styles.resultSub}>{doc.category}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    height: 44,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMedium,
    fontFamily: fontFamily.regular,
    color: colors.ink,
  },
  loadingContainer: { alignItems: 'center', paddingVertical: spacing['3xl'] },
  hintContainer: { alignItems: 'center', paddingVertical: spacing['5xl'], gap: spacing.md },
  hintText: { ...typography.bodyMedium, color: colors.neutral[400] },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.h6, color: colors.ink },
  resultCard: { padding: spacing.md, marginBottom: spacing.sm },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: { flex: 1 },
  resultTitle: { ...typography.h6, color: colors.ink },
  resultSub: { ...typography.caption, color: colors.neutral[500], marginTop: 2, textTransform: 'capitalize' },
});
