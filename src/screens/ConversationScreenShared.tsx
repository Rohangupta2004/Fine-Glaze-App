import React, { useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAuthStore } from '../stores/authStore';
import { useMessages, useSendMessage } from '../hooks/useConversations';
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/imageCompression';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { typography, fontFamily } from '../theme/typography';
import { SignedImage } from '../components/SignedImage';

export function ConversationScreenShared() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { conversationId, title } = useLocalSearchParams<{ conversationId: string; title?: string }>();
  const profile = useAuthStore(s => s.profile);
  const { data: messages = [], refetch } = useMessages(conversationId);
  const send = useSendMessage();
  const [draft, setDraft] = useState('');
  const [uploading, setUploading] = useState(false);

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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top, height: insets.top + 56 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title || 'Conversation'}</Text>
          <Text style={styles.online}>Fine Glaze COS chat</Text>
        </View>
        <TouchableOpacity>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.divider },
  title: { ...typography.h6, color: colors.ink },
  online: { ...typography.caption, color: colors.success },
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
  attach: { width: 44, height: 44, alignItems: 'center', justify: 'center', justifyContent: 'center' } as any,
  input: { flex: 1, minHeight: 44, maxHeight: 100, backgroundColor: colors.neutral[100], borderRadius: 22, paddingHorizontal: spacing.lg, paddingVertical: 11, ...typography.bodySmall, color: colors.ink },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.neutral[400] }
});
