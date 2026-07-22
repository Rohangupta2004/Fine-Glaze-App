/**
 * NewMessageScreen — shared "start a chat" screen for every role.
 * Lists company people (clients see staff; staff see everyone) with search;
 * tapping a person finds-or-creates the direct conversation and navigates
 * to the given conversation route.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Avatar, SearchBar } from '../components';
import { useChatContacts, useStartDirectConversation } from '../hooks/useConversations';
import { colors } from '../theme/colors';
import { typography, fontFamily } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import type { Profile } from '../types';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  project_manager: 'Project Manager',
  hr: 'HR',
  accounts: 'Accounts',
  supervisor: 'Supervisor',
  worker: 'Worker',
  client: 'Client',
};

interface NewMessageScreenProps {
  /** Route to push with `?id=<conversationId>` once the chat exists */
  conversationRoute: string;
}

export function NewMessageScreen({ conversationRoute }: NewMessageScreenProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data: contacts = [], isLoading } = useChatContacts();
  const startChat = useStartDirectConversation();
  const [startingId, setStartingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) => c.full_name.toLowerCase().includes(q) || (ROLE_LABELS[c.role] || '').toLowerCase().includes(q),
    );
  }, [contacts, search]);

  const grouped = useMemo(() => {
    const groups: { title: string; data: Profile[] }[] = [];

    const owners = filtered.filter((c) => c.role === 'owner');
    if (owners.length) groups.push({ title: 'Owners', data: owners });

    const admins = filtered.filter((c) => ['project_manager', 'hr', 'accounts'].includes(c.role));
    if (admins.length) groups.push({ title: 'Admins', data: admins });

    const supervisors = filtered.filter((c) => c.role === 'supervisor');
    if (supervisors.length) groups.push({ title: 'Supervisors', data: supervisors });

    const employees = filtered.filter((c) => c.role === 'worker');
    if (employees.length) groups.push({ title: 'Employees', data: employees });

    const clients = filtered.filter((c) => c.role === 'client');
    if (clients.length) groups.push({ title: 'Clients', data: clients });

    return groups;
  }, [filtered]);

  const onSelect = async (person: Profile) => {
    if (startingId) return;
    setStartingId(person.id);
    try {
      const conversationId = await startChat.mutateAsync({ otherProfileId: person.id });
      router.navigate({ pathname: conversationRoute as any, params: { conversationId, title: person.full_name } });
    } catch (e: any) {
      Alert.alert('Could not start chat', e?.message || 'Please try again.');
    } finally {
      setStartingId(null);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>New Message</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search people…" />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(g) => g.title}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={40} color={colors.neutral[300]} />
              <Text style={styles.emptyText}>No people found</Text>
            </View>
          }
          renderItem={({ item: group }) => (
            <View>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {group.data.map((person) => (
                <TouchableOpacity
                  key={person.id}
                  style={styles.row}
                  onPress={() => onSelect(person)}
                  disabled={!!startingId}
                >
                  <Avatar name={person.full_name} uri={person.avatar_url || undefined} size={44} />
                  <View style={styles.rowBody}>
                    <Text style={styles.rowName}>{person.full_name}</Text>
                    <Text style={styles.rowRole}>{ROLE_LABELS[person.role] || person.role}</Text>
                  </View>
                  {startingId === person.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  title: { ...typography.h4, color: colors.ink },
  searchWrap: { marginBottom: spacing.md },
  groupTitle: {
    ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.neutral[400],
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral[100],
    padding: spacing.md, marginBottom: spacing.sm,
  },
  rowBody: { flex: 1 },
  rowName: { ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },
  rowRole: { ...typography.caption, color: colors.neutral[400] },
  empty: { alignItems: 'center', marginTop: spacing.xl * 2, gap: spacing.sm },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400] },
});
