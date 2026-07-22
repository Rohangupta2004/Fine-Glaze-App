import React, { useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAuthStore } from '../stores/authStore';
import { useMessages, useSendMessage, useConversationMembers, useChatContacts } from '../hooks/useConversations';
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/imageCompression';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { typography, fontFamily } from '../theme/typography';
import { SignedImage } from '../components/SignedImage';
import { Avatar } from '../components/Avatar';
import type { Profile } from '../types';

const ADMIN_ROLES = ['owner', 'project_manager', 'hr', 'accounts', 'supervisor'];

export function ConversationScreenShared() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { conversationId, title } = useLocalSearchParams<{ conversationId: string; title?: string }>();
  const profile = useAuthStore(s => s.profile);
  const { data: messages = [], refetch } = useMessages(conversationId);
  const send = useSendMessage();
  const [draft, setDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Members & Info Modal State
  const [showInfo, setShowInfo] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const { data: membersMap = {}, refetch: refetchMembers } = useConversationMembers(conversationId ? [conversationId] : []);
  const { data: contacts = [] } = useChatContacts();
  
  // Fetch conversation to identify creator
  const [groupCreatorId, setGroupCreatorId] = useState<string | null>(null);
  useEffect(() => {
    if (!conversationId) return;
    supabase.from('conversations').select('created_by').eq('id', conversationId).single().then(({ data }) => {
      if (data?.created_by) setGroupCreatorId(data.created_by);
    });
  }, [conversationId]);
  
  const members = conversationId ? membersMap[conversationId] || [] : [];
  // Creator is Group Admin; fallback to Company Admin if creator is not set
  const isGroupAdmin = profile?.id && (profile.id === groupCreatorId || (!groupCreatorId && ADMIN_ROLES.includes(profile.role)));

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase.channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, () => refetch())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, refetch]);

  const sendText = () => {
    const body = draft.trim();
    if (!body || !profile?.id) return;
    setDraft('');
    send.mutate({ conversationId, senderId: profile.id, body });
  };

  const attach = async () => {
    if (!profile?.id) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      const uri = asset.type === 'image' ? (await compressImage(asset.uri)).uri : asset.uri;
      const response = await fetch(uri);
      const bytes = await response.arrayBuffer();
      const ext = asset.fileName?.split('.').pop() || (asset.type === 'video' ? 'mp4' : 'jpg');
      const path = `${conversationId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('chat-attachments').upload(path, bytes, {
        contentType: asset.mimeType || `${asset.type}/jpeg`,
      });
      if (error) throw error;
      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: profile.id,
        body: asset.type === 'video' ? 'Video attachment' : 'Photo attachment',
        attachment_path: path,
      });
      if (msgError) throw msgError;
      refetch();
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddMember = async (person: Profile) => {
    if (!conversationId) return;
    try {
      const { error } = await supabase
        .from('conversation_members')
        .insert({ conversation_id: conversationId, profile_id: person.id });
      if (error) throw error;
      Alert.alert('Success', `${person.full_name} added to conversation`);
      refetchMembers();
      setShowAddMember(false);
    } catch (e: any) {
      Alert.alert('Could not add member', e?.message || 'Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top, height: insets.top + 56 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowInfo(true)}>
          <Text style={styles.title} numberOfLines={1}>{title || 'Conversation'}</Text>
          <Text style={styles.online}>{members.length > 0 ? `${members.length} members · Tap for info` : 'Tap for info'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowInfo(true)}>
          <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {messages.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubble-ellipses-outline" size={42} color={colors.neutral[300]} />
          <Text style={styles.emptyText}>Start the conversation</Text>
        </View>
      ) : (
        <FlatList
          data={[...messages].reverse()}
          inverted
          keyExtractor={m => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const mine = item.sender_id === profile?.id;
            return (
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                {item.attachment_path && (
                  <SignedImage bucket="chat-attachments" storagePath={item.attachment_path} style={styles.image} />
                )}
                {!!item.body && (
                  <Text style={[styles.body, mine && styles.mineText]}>{item.body}</Text>
                )}
                <Text style={[styles.time, mine && styles.mineTime]}>
                  {new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          }}
        />
      )}

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <TouchableOpacity style={styles.attach} onPress={attach} disabled={uploading}>
          <Ionicons name={uploading ? 'hourglass' : 'attach'} size={23} color={colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message…"
          placeholderTextColor={colors.neutral[400]}
          multiline
        />
        <TouchableOpacity 
          style={[styles.send, (!draft.trim() || send.isPending) && { opacity: 0.5 }]} 
          onPress={sendText} 
          disabled={!draft.trim() || send.isPending}
        >
          <Ionicons name="send" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* ── Group / Chat Info Modal ── */}
      <Modal visible={showInfo} animationType="slide" transparent={false} onRequestClose={() => setShowInfo(false)}>
        <View style={[styles.modalContainer, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowInfo(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Group Details</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.groupHero}>
            <Avatar name={title || 'Group'} size={72} />
            <Text style={styles.groupTitleText}>{title || 'Conversation'}</Text>
            <Text style={styles.groupSubtext}>{members.length} Members</Text>
          </View>

          <View style={styles.membersSectionHeader}>
            <Text style={styles.membersSectionTitle}>Members ({members.length})</Text>
            {isGroupAdmin && (
              <TouchableOpacity style={styles.addMemberBtn} onPress={() => setShowAddMember(true)}>
                <Ionicons name="person-add" size={16} color={colors.white} />
                <Text style={styles.addMemberBtnText}>Add Member</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={members}
            keyExtractor={m => m.id}
            contentContainerStyle={styles.membersList}
            renderItem={({ item: member }) => {
              const isGroupAdminMember = member.id === groupCreatorId || (!groupCreatorId && member.role === 'owner');
              return (
                <View style={styles.memberRow}>
                  <Avatar name={member.full_name} uri={member.avatar_url || undefined} size={44} />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.full_name}</Text>
                    <Text style={styles.memberRole}>{member.role.replace('_', ' ')}</Text>
                  </View>
                  {isGroupAdminMember ? (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>Group Admin</Text>
                    </View>
                  ) : (
                    <View style={styles.memberBadge}>
                      <Text style={styles.memberBadgeText}>Member</Text>
                    </View>
                  )}
                </View>
              );
            }}
          />
        </View>
      </Modal>

      {/* ── Add Member Modal ── */}
      <Modal visible={showAddMember} animationType="slide" transparent={false} onRequestClose={() => setShowAddMember(false)}>
        <View style={[styles.modalContainer, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddMember(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Member</Text>
            <View style={{ width: 40 }} />
          </View>

          <FlatList
            data={contacts.filter(c => !members.some(m => m.id === c.id))}
            keyExtractor={c => c.id}
            contentContainerStyle={styles.membersList}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>All contacts are already in this group</Text>
              </View>
            }
            renderItem={({ item: contact }) => (
              <TouchableOpacity style={styles.memberRow} onPress={() => handleAddMember(contact)}>
                <Avatar name={contact.full_name} uri={contact.avatar_url || undefined} size={44} />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{contact.full_name}</Text>
                  <Text style={styles.memberRole}>{contact.role.replace('_', ' ')}</Text>
                </View>
                <Ionicons name="add-circle" size={24} color={colors.primary} />
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.divider },
  title: { ...typography.h6, color: colors.ink },
  online: { ...typography.caption, color: colors.primary },
  list: { padding: spacing.lg, paddingBottom: spacing['3xl'], flexGrow: 1 },
  bubble: { maxWidth: '82%', padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.sm },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  body: { ...typography.bodySmall, color: colors.ink },
  mineText: { color: colors.white },
  time: { ...typography.caption, fontSize: 9, color: colors.neutral[400], alignSelf: 'flex-end', marginTop: 4 },
  mineTime: { color: colors.tertiary },
  image: { width: 220, height: 150, borderRadius: radius.md, marginBottom: spacing.sm, backgroundColor: colors.neutral[200] },
  composer: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.divider, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  attach: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' } as any,
  input: { flex: 1, minHeight: 44, maxHeight: 100, backgroundColor: colors.neutral[100], borderRadius: 22, paddingHorizontal: spacing.lg, paddingVertical: 11, ...typography.bodySmall, color: colors.ink },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingTop: 40 },
  emptyText: { ...typography.bodySmall, color: colors.neutral[400] },

  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  closeBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  modalTitle: { ...typography.h4, color: colors.ink },
  groupHero: { alignItems: 'center', paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.neutral[200], marginBottom: spacing.lg },
  groupTitleText: { ...typography.h5, fontFamily: fontFamily.bold, color: colors.ink, marginTop: spacing.md },
  groupSubtext: { ...typography.caption, color: colors.neutral[400], marginTop: 2 },
  membersSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  membersSectionTitle: { ...typography.caption, fontFamily: fontFamily.bold, color: colors.neutral[500], textTransform: 'uppercase', letterSpacing: 0.8 },
  addMemberBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  addMemberBtnText: { ...typography.caption, fontFamily: fontFamily.medium, color: colors.white },
  membersList: { paddingBottom: 40 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  memberInfo: { flex: 1 },
  memberName: { ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },
  memberRole: { ...typography.caption, color: colors.neutral[400], textTransform: 'capitalize' },
  adminBadge: { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  adminBadgeText: { fontSize: 10, fontFamily: fontFamily.bold, color: colors.white },
  memberBadge: { backgroundColor: colors.neutral[200], paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  memberBadgeText: { fontSize: 10, fontFamily: fontFamily.bold, color: colors.neutral[600] },
});
