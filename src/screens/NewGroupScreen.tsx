import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Avatar, SearchBar, Button } from '../components';
import { useChatContacts, useStartGroupConversation } from '../hooks/useConversations';
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

interface NewGroupScreenProps {
  conversationRoute: string;
}

export function NewGroupScreen({ conversationRoute }: NewGroupScreenProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const { data: contacts = [], isLoading } = useChatContacts();
  const startGroup = useStartGroupConversation();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) => c.full_name.toLowerCase().includes(q) || (ROLE_LABELS[c.role] || '').toLowerCase().includes(q),
    );
  }, [contacts, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onCreateGroup = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Name', 'Please enter a group name.');
      return;
    }
    if (selectedIds.size === 0) {
      Alert.alert('Missing Members', 'Please select at least one member.');
      return;
    }
    
    try {
      const conversationId = await startGroup.mutateAsync({ 
        title: title.trim(), 
        participantIds: Array.from(selectedIds) 
      });
      router.push({ pathname: conversationRoute as any, params: { conversationId, title: title.trim() } });
    } catch (e: any) {
      console.error('Create group failed:', e);
      Alert.alert('Could not start group chat', e?.message || 'Please try again.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>New Group</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.formWrap}>
        <Text style={styles.label}>Group Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Site Alpha Crew"
          value={title}
          onChangeText={setTitle}
          placeholderTextColor={colors.neutral[400]}
        />
      </View>

      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search members…" />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={40} color={colors.neutral[300]} />
              <Text style={styles.emptyText}>No people found</Text>
            </View>
          }
          renderItem={({ item: person }) => {
            const isSelected = selectedIds.has(person.id);
            return (
              <TouchableOpacity
                style={[styles.row, isSelected && styles.rowSelected]}
                onPress={() => toggleSelect(person.id)}
                activeOpacity={0.7}
              >
                <Avatar name={person.full_name} uri={person.avatar_url || undefined} size={44} />
                <View style={styles.rowBody}>
                  <Text style={styles.rowName}>{person.full_name}</Text>
                  <Text style={styles.rowRole}>{ROLE_LABELS[person.role] || person.role}</Text>
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color={colors.white} />}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom || spacing.md }]}>
        <Button 
          title={`Create Group (${selectedIds.size})`} 
          onPress={onCreateGroup} 
          loading={startGroup.isPending} 
          disabled={!title.trim() || selectedIds.size === 0}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md, paddingHorizontal: spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  title: { ...typography.h4, color: colors.ink },
  formWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  label: { ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.neutral[500], marginBottom: 4 },
  input: {
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral[200],
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: 15, fontFamily: fontFamily.medium, color: colors.ink
  },
  searchWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.neutral[100],
    padding: spacing.md, paddingHorizontal: spacing.lg,
  },
  rowSelected: { backgroundColor: colors.primary + '08' },
  rowBody: { flex: 1 },
  rowName: { ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },
  rowRole: { ...typography.caption, color: colors.neutral[400] },
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.neutral[300],
    alignItems: 'center', justifyContent: 'center'
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  empty: { alignItems: 'center', marginTop: spacing.xl * 2, gap: spacing.sm },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400] },
  footer: { padding: spacing.lg, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.neutral[200] },
});
