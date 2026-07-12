/**
 * Admin — Client Management
 * Client organisations with contacts, login accounts, and project links.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Card, Button, Input, Avatar, StatusChip } from '../../src/components';
import {
  useClientOrgs, useCreateClientOrg, useUpdateClientOrg,
  useSetProjectClient, useCreateClientUser, type ClientOrgFull,
} from '../../src/hooks/useClients';
import { useProjects } from '../../src/hooks/useProjects';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

export default function ClientsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: orgs = [], refetch, isRefetching } = useClientOrgs();
  const { data: projects = [] } = useProjects();
  const createOrg = useCreateClientOrg();
  const updateOrg = useUpdateClientOrg();
  const setProjectClient = useSetProjectClient();
  const createUser = useCreateClientUser();

  const [selected, setSelected] = useState<ClientOrgFull | null>(null);
  // keep selected in sync after refetch
  const selectedFresh = selected ? orgs.find((o) => o.id === selected.id) || selected : null;

  // Add org modal
  const [addModal, setAddModal] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Add user modal
  const [userModal, setUserModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');

  const saveOrg = async () => {
    if (!orgName.trim()) { Alert.alert('Missing info', 'Client name is required.'); return; }
    try {
      await createOrg.mutateAsync({ name: orgName, contact_name: contactName, contact_phone: contactPhone });
      setAddModal(false); setOrgName(''); setContactName(''); setContactPhone('');
    } catch (e: any) {
      Alert.alert('Could not add client', e?.message || 'Try again.');
    }
  };

  const addUser = async () => {
    if (!selectedFresh) return;
    if (!userName.trim() || userPhone.replace(/\D/g, '').length < 10) {
      Alert.alert('Missing info', 'Name and a valid 10-digit phone are required.');
      return;
    }
    try {
      const res = await createUser.mutateAsync({
        full_name: userName.trim(),
        phone: userPhone.trim(),
        client_org_id: selectedFresh.id,
      });
      setUserModal(false); setUserName(''); setUserPhone('');
      refetch();
      Alert.alert(
        'Client login created ✅',
        `Share these login details with the client:\n\nPhone: ${userPhone.trim()}\nTemporary password: ${res.temp_password}\n\nThis password is shown only once.`,
      );
    } catch (e: any) {
      Alert.alert('Could not create login', e?.message || 'Try again.');
    }
  };

  const toggleProject = (projectId: string, linked: boolean) => {
    if (!selectedFresh) return;
    setProjectClient.mutate(
      { projectId, clientOrgId: linked ? null : selectedFresh.id },
      { onError: (e: any) => Alert.alert('Failed', e?.message || 'Try again.') },
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Clients</Text>
        <TouchableOpacity onPress={() => setAddModal(true)} style={styles.addBtn}>
          <Ionicons name="add-circle" size={30} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {orgs.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="business-outline" size={40} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>No clients yet. Tap + to add your first client organisation.</Text>
          </View>
        )}
        {orgs.map((org) => (
          <TouchableOpacity key={org.id} onPress={() => setSelected(org)}>
            <Card style={styles.orgCard}>
              <View style={styles.orgIcon}>
                <Ionicons name="business" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.orgName}>{org.name}</Text>
                <Text style={styles.orgMeta}>
                  {org.contact_name || 'No contact'}{org.contact_phone ? ` • ${org.contact_phone}` : ''}
                </Text>
                <View style={styles.orgStats}>
                  <View style={styles.orgStat}>
                    <Ionicons name="business-outline" size={13} color={colors.neutral[400]} />
                    <Text style={styles.orgStatText}>{org.projects.length} project{org.projects.length !== 1 ? 's' : ''}</Text>
                  </View>
                  <View style={styles.orgStat}>
                    <Ionicons name="person-outline" size={13} color={colors.neutral[400]} />
                    <Text style={styles.orgStatText}>{org.users.length} login{org.users.length !== 1 ? 's' : ''}</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Add client org modal ── */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Add Client</Text>
              <TouchableOpacity onPress={() => setAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>
            <Input label="Client / Company Name *" value={orgName} onChangeText={setOrgName} placeholder="e.g. Buildwell Developers" />
            <View style={styles.gap} />
            <Input label="Contact Person" value={contactName} onChangeText={setContactName} placeholder="Name" />
            <View style={styles.gap} />
            <Input label="Contact Phone" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" placeholder="98XXXXXXXX" />
            <View style={styles.gap} />
            <Button title="Add Client" onPress={saveOrg} loading={createOrg.isPending} fullWidth />
          </View>
        </View>
      </Modal>

      {/* ── Client detail modal ── */}
      <Modal visible={!!selectedFresh} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>{selectedFresh?.name}</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Ionicons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.sectionLabel}>Contact</Text>
              <Text style={styles.contactText}>
                {selectedFresh?.contact_name || '—'}{selectedFresh?.contact_phone ? ` • ${selectedFresh.contact_phone}` : ''}
              </Text>

              <Text style={styles.sectionLabel}>Login Accounts ({selectedFresh?.users.length || 0})</Text>
              {(selectedFresh?.users || []).map((u) => (
                <View key={u.id} style={styles.userRow}>
                  <Avatar name={u.full_name} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{u.full_name}</Text>
                    <Text style={styles.orgMeta}>{u.phone}</Text>
                  </View>
                  <StatusChip status={u.status as any} size="sm" />
                </View>
              ))}
              <Button
                title="Add Client Login"
                variant="secondary"
                onPress={() => setUserModal(true)}
                fullWidth
              />

              <Text style={styles.sectionLabel}>Linked Projects — tap to link/unlink</Text>
              {(projects || []).map((p: any) => {
                const linked = p.client_org_id === selectedFresh?.id;
                const linkedElsewhere = p.client_org_id && !linked;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.projectRow, linked && styles.projectRowLinked]}
                    disabled={!!linkedElsewhere}
                    onPress={() => toggleProject(p.id, linked)}
                  >
                    <Ionicons
                      name={linked ? 'checkbox' : linkedElsewhere ? 'remove-circle-outline' : 'square-outline'}
                      size={20}
                      color={linked ? colors.primary : colors.neutral[300]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.projectName, linkedElsewhere && { color: colors.neutral[300] }]}>{p.name}</Text>
                      {linkedElsewhere ? <Text style={styles.orgMeta}>Linked to another client</Text> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Add client user modal ── */}
      <Modal visible={userModal} transparent animationType="slide" onRequestClose={() => setUserModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Add Client Login</Text>
              <TouchableOpacity onPress={() => setUserModal(false)}>
                <Ionicons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>
            <Text style={styles.helpText}>
              Creates a login for {selectedFresh?.name}. They'll sign in with this phone number and a temporary password.
            </Text>
            <Input label="Full Name *" value={userName} onChangeText={setUserName} placeholder="Person's name" />
            <View style={styles.gap} />
            <Input label="Phone *" value={userPhone} onChangeText={setUserPhone} keyboardType="phone-pad" placeholder="98XXXXXXXX" />
            <View style={styles.gap} />
            <Button title="Create Login" onPress={addUser} loading={createUser.isPending} fullWidth />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  addBtn: { width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' },
  title: { ...typography.h4, color: colors.ink },
  orgCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, marginBottom: spacing.sm },
  orgIcon: {
    width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primary + '12',
    alignItems: 'center', justifyContent: 'center',
  },
  orgName: { ...typography.bodyMedium, fontFamily: fontFamily.semiBold, color: colors.ink },
  orgMeta: { ...typography.caption, color: colors.neutral[400], marginTop: 2 },
  orgStats: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  orgStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  orgStatText: { ...typography.caption, color: colors.neutral[400] },
  empty: { alignItems: 'center', paddingVertical: spacing.xl * 2, gap: spacing.sm, paddingHorizontal: spacing.lg },
  emptyText: { ...typography.bodySmall, color: colors.neutral[400], textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(26,22,17,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: '88%' },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md, gap: spacing.md },
  modalTitle: { ...typography.h4, color: colors.ink, flex: 1 },
  sectionLabel: {
    ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.neutral[400],
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  contactText: { ...typography.bodyMedium, color: colors.ink },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  userName: { ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },
  projectRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral[100],
    backgroundColor: colors.white, marginBottom: spacing.sm,
  },
  projectRowLinked: { borderColor: colors.primary, backgroundColor: colors.primary + '08' },
  projectName: { ...typography.bodyMedium, color: colors.ink },
  helpText: { ...typography.bodySmall, color: colors.neutral[400], marginBottom: spacing.md },
  gap: { height: spacing.md },
});
