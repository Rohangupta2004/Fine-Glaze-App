/**
 * ConversationScreenShared — Beautified chat UI with message bubbles,
 * timestamps, image viewing, typing indicator, and polished design.
 */
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAuthStore } from '../stores/authStore';
import { useMessages, useSendMessage } from '../hooks/useConversations';
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/imageCompression';
import { ImageViewer } from '../components/ImageViewer';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { typography, fontFamily } from '../theme/typography';

export function ConversationScreenShared() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { conversationId, title } = useLocalSearchParams<{ conversationId: string; title?: string }>();
  const profile = useAuthStore((s) => s.profile);
  const { data: messages = [], refetch } = useMessages(conversationId);
  const send = useSendMessage();
  const [draft, setDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
      const path = `chat/${conversationId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('documents').upload(path, bytes, {
        contentType: asset.mimeType || `${asset.type}/jpeg`,
      });
      if (error) throw error;
      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: profile.id,
        body: asset.type === 'video' ? '📹 Video' : '📷 Photo',
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

  const attachmentUrl = (path: string) =>
    supabase.storage.from('documents').getPublicUrl(path).data.publicUrl;

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const formatDateSeparator = (ts: string) =>
    new Date(ts).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  // Group messages by date for date separators
  const getDateKey = (ts: string) => ts.slice(0, 10);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, height: insets.top + 60 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.headerAvatar}>
          <Ionicons name="person" size={18} color={colors.neutral[400]} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Conversation'}</Text>
          <Text style={styles.headerSubtitle}>Fine Glaze COS</Text>
        </View>
        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="call-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Messages ────────────────────────────────────────── */}
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const mine = item.sender_id === profile?.id;
          const prevMsg = index > 0 ? messages[index - 1] : null;
          const showDate = !prevMsg || getDateKey(item.created_at) !== getDateKey(prevMsg.created_at);
          const showTail = !prevMsg || prevMsg.sender_id !== item.sender_id;

          return (
            <>
              {showDate && (
                <View style={styles.dateSeparator}>
                  <View style={styles.dateLine} />
                  <Text style={styles.dateText}>{formatDateSeparator(item.created_at)}</Text>
                  <View style={styles.dateLine} />
                </View>
              )}
              <View style={[
                styles.bubbleRow,
                mine ? styles.bubbleRowMine : styles.bubbleRowTheirs,
                !showTail && { marginTop: -4 },
              ]}>
                <View style={[
                  styles.bubble,
                  mine ? styles.bubbleMine : styles.bubbleTheirs,
                  showTail && (mine ? styles.bubbleTailMine : styles.bubbleTailTheirs),
                ]}>
                  {item.attachment_path && (
                    <TouchableOpacity
                      onPress={() => setViewImage(attachmentUrl(item.attachment_path!))}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={{ uri: attachmentUrl(item.attachment_path) }}
                        style={styles.image}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  )}
                  {!!item.body && (
                    <Text style={[styles.body, mine && styles.bodyMine]}>{item.body}</Text>
                  )}
                  <Text style={[styles.time, mine && styles.timeMine]}>
                    {formatTime(item.created_at)}
                    {mine && (
                      <Text> {send.isPending ? ' ⏳' : ' ✓'}</Text>
                    )}
                  </Text>
                </View>
              </View>
            </>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.neutral[300]} />
            </View>
            <Text style={styles.emptyTitle}>Start the conversation</Text>
            <Text style={styles.emptyText}>Send a message or share a photo</Text>
          </View>
        }
      />

      {/* ── Composer ────────────────────────────────────────── */}
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <TouchableOpacity style={styles.attachBtn} onPress={attach} disabled={uploading}>
          <Ionicons name={uploading ? 'hourglass' : 'add-circle'} size={28} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message…"
            placeholderTextColor={colors.neutral[400]}
            multiline
            maxLength={2000}
          />
        </View>
        <TouchableOpacity
          style={[styles.sendBtn, (!draft.trim() || send.isPending) && styles.sendBtnDisabled]}
          onPress={sendText}
          disabled={!draft.trim() || send.isPending}
        >
          <Ionicons name="send" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* ── Image Viewer ────────────────────────────────────── */}
      <ImageViewer
        images={viewImage ? [{ uri: viewImage }] : []}
        visible={!!viewImage}
        onClose={() => setViewImage(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3EF' },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral[100],
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1 },
  headerTitle: { ...typography.h6, color: colors.ink },
  headerSubtitle: { ...typography.caption, color: colors.success, fontSize: 10 },
  headerAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Messages */
  list: { padding: spacing.md, paddingBottom: spacing['3xl'], flexGrow: 1 },

  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.sm,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: colors.neutral[200] },
  dateText: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    color: colors.neutral[400],
    paddingHorizontal: spacing.sm,
  },

  bubbleRow: { marginBottom: spacing.xs },
  bubbleRowMine: { alignItems: 'flex-end' },
  bubbleRowTheirs: { alignItems: 'flex-start' },

  bubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleTailMine: { borderTopRightRadius: 18 },
  bubbleTailTheirs: { borderTopLeftRadius: 18 },

  body: { ...typography.bodySmall, color: colors.ink, lineHeight: 20 },
  bodyMine: { color: colors.white },
  time: { ...typography.caption, fontSize: 9, color: colors.neutral[400], alignSelf: 'flex-end', marginTop: 3 },
  timeMine: { color: 'rgba(255,255,255,0.7)' },

  image: {
    width: 220,
    height: 160,
    borderRadius: 12,
    marginBottom: spacing.xs,
    backgroundColor: colors.neutral[200],
  },

  /* Empty */
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingTop: 80 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: { ...typography.h6, color: colors.neutral[500] },
  emptyText: { ...typography.caption, color: colors.neutral[400] },

  /* Composer */
  composer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderColor: colors.neutral[100],
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  attachBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
    backgroundColor: colors.neutral[100],
    borderRadius: 22,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
    maxHeight: 100,
    justifyContent: 'center',
  },
  input: {
    ...typography.bodySmall,
    color: colors.ink,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.neutral[300] },
});
