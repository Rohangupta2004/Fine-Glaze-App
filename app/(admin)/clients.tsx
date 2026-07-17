import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Input, Avatar, StatusChip } from '../../src/components';
import {
  useClientOrgs, useCreateClientOrg, useUpdateClientOrg,
  useSetProjectClient, useCreateClientUser, type ClientOrgFull,
} from '../../src/hooks/useClients';
import { useProjects } from '../../src/hooks/useProjects';
import { colors } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { showAlert } from '../../src/utils/alert';

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
    if (!orgName.trim()) { showAlert('Missing info', 'Client name is required.'); return; }
    try {
      await createOrg.mutateAsync({ name: orgName, contact_name: contactName, contact_phone: contactPhone });
      setAddModal(false); setOrgName(''); setContactName(''); setContactPhone('');
    } catch (e: any) {
      showAlert('Could not add client', e?.message || 'Try again.');
    }
  };

  const addUser = async () => {
    if (!selectedFresh) return;
    if (!userName.trim() || userPhone.replace(/\D/g, '').length < 10) {
      showAlert('Missing info', 'Name and a valid 10-digit phone are required.');
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
      showAlert(
        'Client login created ✅',
        `Share these login details with the client:\n\nPhone: ${userPhone.trim()}\nTemporary password: ${res.temp_password}\n\nThis password is shown only once.`
      );
    } catch (e: any) {
      showAlert('Could not create login', e?.message || 'Try again.');
    }
  };

  const toggleProject = (projectId: string, linked: boolean) => {
    if (!selectedFresh) return;
    setProjectClient.mutate(
      { projectId, clientOrgId: linked ? null : selectedFresh.id },
      { onError: (e: any) => showAlert('Failed', e?.message || 'Try again.') }
    );
  };

  return (
    <View style={styles.container}>
      {/* Light Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#1E1815" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerLabel}>CRM</Text>
            <Text style={styles.headerTitle}>Clients</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setAddModal(true)}>
            <Ionicons name="add" size={24} color="#1E1815" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statValue}>{orgs.length}</Text>
            <Text style={styles.statLabel}>Orgs</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statValue}>{orgs.reduce((sum, o) => sum + o.users.length, 0)}</Text>
            <Text style={styles.statLabel}>Logins</Text>
          </View>
          <View style={[styles.statChip, { borderRightWidth: 0 }]}>
            <Text style={styles.statValue}>{orgs.reduce((sum, o) => sum + o.projects.length, 0)}</Text>
            <Text style={styles.statLabel}>Projects</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563EB" />}
      >
        {orgs.length === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="business" size={40} color="#2563EB" />
            </View>
            <Text style={styles.emptyTitle}>No Clients Found</Text>
            <Text style={styles.emptyText}>Tap + to add your first client organisation.</Text>
          </View>
        )}

        {orgs.map((org) => (
          <TouchableOpacity key={org.id} activeOpacity={0.8} onPress={() => setSelected(org)}>
            <View style={styles.card}>
              <View style={styles.cardIcon}>
                <Ionicons name="business" size={20} color="#695030" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{org.name}</Text>
                <Text style={styles.cardMeta}>{org.contact_name || 'No contact'}{org.contact_phone ? ` • ${org.contact_phone}` : ''}</Text>
                <View style={styles.cardStats}>
                  <View style={styles.cardStat}>
                    <Ionicons name="business-outline" size={13} color={colors.neutral[400]} />
                    <Text style={styles.cardStatText}>{org.projects.length} project{org.projects.length !== 1 ? 's' : ''}</Text>
                  </View>
                  <View style={styles.cardStat}>
                    <Ionicons name="person-outline" size={13} color={colors.neutral[400]} />
                    <Text style={styles.cardStatText}>{org.users.length} login{org.users.length !== 1 ? 's' : ''}</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Add Client Org Modal */}
      <Modal visible={addModal} transparent animationType="fade" onRequestClose={() => setAddModal(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setAddModal(false)}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.xl }]} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add Client</Text>
            
            {/* Minimal input implementation to avoid rewriting the whole form component architecture */}
            <Text style={styles.inputLabel}>Client / Company Name *</Text>
            <View style={styles.inputWrap}>
              <Text style={{ flex: 1, color: '#1E1815' }}>{orgName || 'e.g. Buildwell Developers'}</Text>
            </View>
            
            <Text style={styles.inputLabel}>Contact Person</Text>
            <View style={styles.inputWrap}>
              <Text style={{ flex: 1, color: '#1E1815' }}>{contactName || 'Name'}</Text>
            </View>

            <Text style={styles.inputLabel}>Contact Phone</Text>
            <View style={styles.inputWrap}>
              <Text style={{ flex: 1, color: '#1E1815' }}>{contactPhone || '98XXXXXXXX'}</Text>
            </View>

            <TouchableOpacity style={styles.saveBtn} activeOpacity={0.8} onPress={saveOrg} disabled={createOrg.isPending}>
              <View style={styles.saveBtnBg}>
                <Text style={styles.saveBtnText}>Add Client</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Client Detail Modal */}
      <Modal visible={!!selectedFresh} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSelected(null)}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.xl, maxHeight: '90%' }]} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <View style={styles.detailHead}>
              <View style={styles.detailIcon}>
                <Ionicons name="business" size={24} color="#695030" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailTitle}>{selectedFresh?.name}</Text>
                <Text style={styles.detailMeta}>{selectedFresh?.contact_name || 'No contact'} • {selectedFresh?.contact_phone || 'No phone'}</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionLabel}>Login Accounts</Text>
                <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>{selectedFresh?.users.length || 0}</Text></View>
              </View>
              
              {(selectedFresh?.users || []).map((u) => (
                <View key={u.id} style={styles.userRow}>
                  <Avatar name={u.full_name} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{u.full_name}</Text>
                    <Text style={styles.userPhone}>{u.phone}</Text>
                  </View>
                  <StatusChip status={u.status as any} size="sm" />
                </View>
              ))}
              
              <TouchableOpacity style={styles.outlineBtn} activeOpacity={0.7} onPress={() => setUserModal(true)}>
                <Ionicons name="person-add" size={16} color="#695030" />
                <Text style={styles.outlineBtnText}>Add Login Account</Text>
              </TouchableOpacity>

              <View style={[styles.sectionHead, { marginTop: spacing.xl }]}>
                <Text style={styles.sectionLabel}>Linked Projects</Text>
              </View>
              <Text style={styles.helpText}>Tap to link or unlink projects to this client.</Text>
              
              <View style={styles.projectsList}>
                {(projects || []).map((p: any) => {
                  const linked = p.client_org_id === selectedFresh?.id;
                  const linkedElsewhere = p.client_org_id && !linked;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.projectRow, linked && styles.projectRowLinked, linkedElsewhere && styles.projectRowDisabled]}
                      disabled={!!linkedElsewhere}
                      activeOpacity={0.7}
                      onPress={() => toggleProject(p.id, linked)}
                    >
                      <Ionicons
                        name={linked ? 'checkmark-circle' : linkedElsewhere ? 'close-circle' : 'ellipse-outline'}
                        size={22}
                        color={linked ? '#695030' : linkedElsewhere ? colors.neutral[300] : colors.neutral[400]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.projectName, linkedElsewhere && { color: colors.neutral[400] }]}>{p.name}</Text>
                        {linkedElsewhere ? <Text style={styles.projectMeta}>Linked to another client</Text> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Client User Modal */}
      <Modal visible={userModal} transparent animationType="fade" onRequestClose={() => setUserModal(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setUserModal(false)}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.xl }]} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add Login Account</Text>
            <Text style={styles.helpText}>
              Creates a login for {selectedFresh?.name}. They'll sign in with this phone number and a temporary password.
            </Text>
            
            <Text style={styles.inputLabel}>Full Name *</Text>
            <View style={styles.inputWrap}>
              <Text style={{ flex: 1, color: '#1E1815' }}>{userName || "Person's name"}</Text>
            </View>

            <Text style={styles.inputLabel}>Phone *</Text>
            <View style={styles.inputWrap}>
              <Text style={{ flex: 1, color: '#1E1815' }}>{userPhone || '98XXXXXXXX'}</Text>
            </View>

            <TouchableOpacity style={styles.saveBtn} activeOpacity={0.8} onPress={addUser} disabled={createUser.isPending}>
              <View style={styles.saveBtnBg}>
                <Text style={styles.saveBtnText}>Create Login</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },

  // Header
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 4px 12px rgba(0,0,0,0.05)' } as any,
  headerLabel: { fontSize: 13, color: '#666', fontFamily: fontFamily.medium, letterSpacing: 0.2 },
  headerTitle: { fontSize: 32, color: '#1E1815', fontFamily: fontFamily.bold, letterSpacing: -0.5, marginTop: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 4px 12px rgba(0,0,0,0.05)' } as any,

  statsRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, paddingVertical: spacing.md, borderWidth: 1, borderColor: 'rgba(105,80,48,0.1)', boxShadow: '0px 4px 12px rgba(0,0,0,0.03)' } as any,
  statChip: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: 'rgba(105,80,48,0.08)' },
  statValue: { fontSize: 18, color: '#1E1815', fontFamily: fontFamily.bold },
  statLabel: { fontSize: 10, color: '#666', fontFamily: fontFamily.medium, marginTop: 4, textTransform: 'uppercase' },

  // List
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100, gap: spacing.md, paddingTop: spacing.md },
  
  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(105,80,48,0.08)',
    boxShadow: '0px 4px 16px rgba(0,0,0,0.03)'
  } as any,
  cardIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#F9F6F0', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontFamily: fontFamily.bold, color: '#1E1815' },
  cardMeta: { fontSize: 12, color: colors.neutral[500], marginTop: 2 },
  cardStats: { flexDirection: 'row', gap: spacing.md, marginTop: 6 },
  cardStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardStatText: { fontSize: 11, color: colors.neutral[500] },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 80, gap: spacing.md },
  emptyIconBg: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(105,80,48,0.05)', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontFamily: fontFamily.bold, color: '#1E1815' },
  emptyText: { fontSize: 14, color: colors.neutral[400], textAlign: 'center', paddingHorizontal: 40 },

  // Modals
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(20,16,12,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.xl },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { fontSize: 20, fontFamily: fontFamily.bold, color: '#1E1815', marginBottom: spacing.sm },
  helpText: { fontSize: 13, color: colors.neutral[500], marginBottom: spacing.md, lineHeight: 19 },
  
  inputLabel: { fontSize: 12, fontFamily: fontFamily.bold, color: colors.neutral[500], marginTop: spacing.md, marginBottom: 8 },
  inputWrap: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: colors.neutral[200], borderRadius: 12, padding: spacing.md },
  
  saveBtn: { marginTop: spacing.xl, borderRadius: 16, overflow: 'hidden' },
  saveBtnBg: { backgroundColor: '#695030', paddingVertical: spacing.lg, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontFamily: fontFamily.bold, color: '#fff' },

  // Detail Modal
  detailHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  detailIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#F9F6F0', alignItems: 'center', justifyContent: 'center' },
  detailTitle: { fontSize: 20, fontFamily: fontFamily.bold, color: '#1E1815' },
  detailMeta: { fontSize: 13, color: colors.neutral[500], marginTop: 2 },
  
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  sectionLabel: { fontSize: 14, fontFamily: fontFamily.bold, color: colors.neutral[800], textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionBadge: { backgroundColor: '#F9F6F0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  sectionBadgeText: { fontSize: 11, fontFamily: fontFamily.bold, color: '#695030' },
  
  userRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  userName: { fontSize: 15, fontFamily: fontFamily.semiBold, color: '#1E1815' },
  userPhone: { fontSize: 12, color: colors.neutral[500], marginTop: 2 },
  
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(105,80,48,0.2)', backgroundColor: '#F9F6F0', marginTop: spacing.md },
  outlineBtnText: { fontSize: 14, fontFamily: fontFamily.bold, color: '#695030' },

  projectsList: { gap: spacing.sm },
  projectRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(105,80,48,0.08)', boxShadow: '0px 2px 8px rgba(0,0,0,0.02)' } as any,
  projectRowLinked: { backgroundColor: '#F9F6F0', borderColor: 'rgba(105,80,48,0.2)' },
  projectRowDisabled: { opacity: 0.6 },
  projectName: { fontSize: 14, fontFamily: fontFamily.semiBold, color: '#1E1815' },
  projectMeta: { fontSize: 11, color: colors.neutral[500], marginTop: 2 },
});
