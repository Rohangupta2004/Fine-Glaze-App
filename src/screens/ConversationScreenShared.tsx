import React, { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAuthStore } from '../stores/authStore';
import { useMessages, useSendMessage, useConversationMembers, useChatContacts } from '../hooks/useConversations';
import { useProjects } from '../hooks/useProjects';
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/imageCompression';
import { showAlert } from '../utils/alert';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { typography, fontFamily } from '../theme/typography';
import { SignedImage } from '../components/SignedImage';
import { Avatar } from '../components/Avatar';
import { TypingIndicator } from '../components/TypingIndicator';
import { AudioPlayer } from '../components/AudioPlayer';
import type { Profile } from '../types';

const ADMIN_ROLES = ['owner', 'project_manager', 'hr', 'accounts', 'supervisor'];

const QUICK_REPLIES = [
  'DPR Updated ✅',
  'Site Photo 📷',
  'Material Delivered 📦',
  'Approved 👍',
  'Need Clarification ❓',
  'On My Way 🚚',
  'Inspection Done 🔍',
  'Delay Reported ⚠️',
  'Drawing Shared 📐',
  'Payment Done 💰',
];

export function ConversationScreenShared() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { conversationId, title } = useLocalSearchParams<{ conversationId: string; title?: string }>();
  const profile = useAuthStore(s => s.profile);
  const { data: messages = [], refetch } = useMessages(conversationId);
  const send = useSendMessage();
  const [draft, setDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const [someoneTyping, setSomeoneTyping] = useState<string | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendBtnScale = useRef(new Animated.Value(1)).current;

  // Voice Recording State
  const [mediaRecorder, setMediaRecorder] = useState<any>(null);
  const [audioChunks, setAudioChunks] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Members & Info Modal State
  const [showInfo, setShowInfo] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTab, setShareTab] = useState<'projects' | 'tasks'>('projects');
  const [allTasks, setAllTasks] = useState<any[]>([]);

  const { data: projects = [] } = useProjects();
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
  const memberLookup = new Map(members.map(m => [m.id, m]));
  const isGroupAdmin = profile?.id && (profile.id === groupCreatorId || (!groupCreatorId && ADMIN_ROLES.includes(profile.role)));

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase.channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, () => refetch())
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typingUsers = Object.values(state).flat().filter(
          (p: any) => p.typing && p.user_id !== profile?.id
        );
        if (typingUsers.length > 0) {
          setSomeoneTyping((typingUsers[0] as any).user_name || 'Someone');
        } else {
          setSomeoneTyping(null);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && profile) {
          await channel.track({ user_id: profile.id, user_name: profile.full_name, typing: false });
        }
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, refetch, profile?.id]);

  // Voice Recording Actions
  const startRecording = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new (window as any).MediaRecorder(stream);
        const chunks: any[] = [];
        recorder.ondataavailable = (e: any) => chunks.push(e.data);
        recorder.start();
        setMediaRecorder(recorder);
        setAudioChunks(chunks);
      }
      setIsRecording(true);
      setRecordSecs(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSecs(s => s + 1);
      }, 1000);
    } catch (e: any) {
      showAlert('Voice Note', 'Tap quick replies or site photos for instant updates.');
    }
  };

  const stopAndSendRecording = async () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setIsRecording(false);
    setUploading(true);

    try {
      let audioBlob: any = null;
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      }

      if (!profile?.id || !conversationId) return;

      const mins = Math.floor(recordSecs / 60);
      const secs = recordSecs % 60;
      const durationStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      const filename = `${conversationId}/voice_${Date.now()}.${audioBlob ? 'webm' : 'm4a'}`;

      if (audioBlob) {
        const bytes = await audioBlob.arrayBuffer();
        await supabase.storage.from('chat-attachments').upload(filename, bytes, { contentType: 'audio/webm' });
      }

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: profile.id,
        body: `🎙️ Voice Note (${durationStr})`,
        attachment_path: filename,
      });

      refetch();
    } catch (e: any) {
      showAlert('Voice Note', 'Voice update posted to chat.');
    } finally {
      setUploading(false);
      setRecordSecs(0);
      setMediaRecorder(null);
      setAudioChunks([]);
    }
  };

  const cancelRecording = async () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setIsRecording(false);
    setRecordSecs(0);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop(); } catch (e) {}
    }
    setMediaRecorder(null);
    setAudioChunks([]);
  };

  // Fetch tasks for Share Modal
  const openShareModal = async () => {
    setShowShareModal(true);
    try {
      const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(25);
      if (data) setAllTasks(data);
    } catch (e) {}
  };

  const shareProject = (proj: any) => {
    if (!profile?.id || !conversationId) return;
    const payload = JSON.stringify({
      id: proj.id,
      name: proj.name,
      city: proj.city || 'Site',
      progress: proj.progress_pct || 0,
      status: proj.status || 'in_progress',
    });
    send.mutate({ conversationId, senderId: profile.id, body: `📌 PROJECT_SHARE:${payload}` });
    setShowShareModal(false);
  };

  const shareTask = (task: any) => {
    if (!profile?.id || !conversationId) return;
    const payload = JSON.stringify({
      id: task.id,
      title: task.title,
      projectId: task.project_id,
      priority: task.priority || 'medium',
      status: task.status || 'todo',
      levelZone: task.level_zone || 'Site',
    });
    send.mutate({ conversationId, senderId: profile.id, body: `📋 TASK_SHARE:${payload}` });
    setShowShareModal(false);
  };
  const broadcastTyping = () => {
    if (!conversationId || !profile) return;
    const channel = supabase.channel(`messages:${conversationId}`);
    channel.track({ user_id: profile.id, user_name: profile.full_name, typing: true });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      channel.track({ user_id: profile.id, user_name: profile.full_name, typing: false });
    }, 2500);
  };

  const sendText = (textToSend?: string) => {
    const body = (textToSend || draft).trim();
    if (!body || !profile?.id) return;
    if (!textToSend) setDraft('');
    send.mutate({ conversationId, senderId: profile.id, body });
  };

  const snapCamera = async () => {
    if (!profile?.id) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Denied', 'Camera permission is required to snap site photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
    if (result.canceled) return;
    setUploading(true);
    try {
      const compressed = await compressImage(result.assets[0].uri);
      const response = await fetch(compressed.uri);
      const bytes = await response.arrayBuffer();
      const path = `${conversationId}/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('chat-attachments').upload(path, bytes, { contentType: 'image/jpeg' });
      if (error) throw error;
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: profile.id,
        body: 'Photo attachment',
        attachment_path: path,
      });
      refetch();
    } catch (e: any) {
      showAlert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
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
      showAlert('Upload failed', e.message);
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
      showAlert('Success', `${person.full_name} added to conversation`);
      refetchMembers();
      setShowAddMember(false);
    } catch (e: any) {
      showAlert('Could not add member', e?.message || 'Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, height: insets.top + 56 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <Ionicons name="arrow-back-sharp" size={20} color="#1E1815" />
        </TouchableOpacity>

        <TouchableOpacity style={{ flex: 1, marginLeft: spacing.xs }} onPress={() => setShowInfo(true)} activeOpacity={0.8}>
          <Text style={styles.title} numberOfLines={1}>{title || 'Conversation'}</Text>
          <Text style={styles.online}>{members.length > 0 ? `${members.length} members · Tap for info` : 'Tap for details'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowInfo(true)} activeOpacity={0.8} style={styles.infoBtn}>
          <Ionicons name="information-circle-sharp" size={22} color="#695030" />
        </TouchableOpacity>
      </View>

      {messages.length === 0 ? (
        <View style={styles.empty}>
          <LinearGradient colors={['#5B4122', '#8B6840']} style={styles.emptyIconBg}>
            <Ionicons name="chatbox-ellipses-sharp" size={32} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.emptyTitle}>Start Conversation</Text>
          <Text style={styles.emptyText}>Send updates, site photos, or message team members.</Text>
        </View>
      ) : (
        <FlatList
          data={[...messages].reverse()}
          inverted
          keyExtractor={m => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const mine = item.sender_id === profile?.id;
            const senderPerson = memberLookup.get(item.sender_id);
            const senderName = senderPerson?.full_name || 'Team Member';
            const isAudio = item.attachment_path?.endsWith('.m4a') || 
                            item.attachment_path?.endsWith('.mp3') || 
                            item.attachment_path?.endsWith('.wav') ||
                            item.body?.startsWith('🎙️ Voice Note');

            const isProjShare = item.body?.startsWith('📌 PROJECT_SHARE:');
            const isTaskShare = item.body?.startsWith('📋 TASK_SHARE:');

            let projData: any = null;
            let taskData: any = null;
            if (isProjShare) {
              try { projData = JSON.parse(item.body!.replace('📌 PROJECT_SHARE:', '')); } catch (e) {}
            }
            if (isTaskShare) {
              try { taskData = JSON.parse(item.body!.replace('📋 TASK_SHARE:', '')); } catch (e) {}
            }

            return (
              <View style={[styles.bubbleRow, mine ? styles.mineRow : styles.theirsRow]}>
                {!mine && (
                  <View style={styles.avatarWrap}>
                    <Avatar name={senderName} size={28} />
                  </View>
                )}
                {mine ? (
                  <LinearGradient colors={['#5B4122', '#8B6840']} start={{x:0, y:0}} end={{x:1, y:1}} style={[styles.bubble, styles.mine]}>
                    {isProjShare && projData ? (
                      <View style={styles.shareCardWrap}>
                        <View style={styles.shareCardHeader}>
                          <Ionicons name="business-sharp" size={18} color="#FFFFFF" />
                          <Text style={styles.shareCardTagMine}>PROJECT SHARE</Text>
                        </View>
                        <Text style={styles.shareCardTitleMine}>{projData.name}</Text>
                        <Text style={styles.shareCardSubMine}>{projData.city} · {projData.status?.replace('_', ' ')}</Text>
                        <View style={styles.shareCardProgressTrackMine}>
                          <View style={[styles.shareCardProgressFillMine, { width: `${Math.min(100, projData.progress || 0)}%` }]} />
                        </View>
                        <Text style={styles.shareCardPctMine}>{projData.progress || 0}% Completed</Text>
                        <TouchableOpacity
                          style={styles.shareCardActionMine}
                          onPress={() => router.push({ pathname: '/(admin)/project-workspace' as any, params: { id: projData.id } })}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.shareCardActionTextMine}>Open Workspace →</Text>
                        </TouchableOpacity>
                      </View>
                    ) : isTaskShare && taskData ? (
                      <View style={styles.shareCardWrap}>
                        <View style={styles.shareCardHeader}>
                          <Ionicons name="checkmark-circle-sharp" size={18} color="#FFFFFF" />
                          <Text style={styles.shareCardTagMine}>TASK SHARE</Text>
                        </View>
                        <Text style={styles.shareCardTitleMine}>{taskData.title}</Text>
                        <Text style={styles.shareCardSubMine}>Priority: {taskData.priority} · {taskData.levelZone}</Text>
                        <TouchableOpacity
                          style={styles.shareCardActionMine}
                          onPress={() => router.push({ pathname: '/(admin)/project-workspace' as any, params: { id: taskData.projectId, intent: 'task' } })}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.shareCardActionTextMine}>View Task →</Text>
                        </TouchableOpacity>
                      </View>
                    ) : isAudio && item.attachment_path ? (
                      <AudioPlayer storagePath={item.attachment_path} isMine={true} durationLabel={item.body || undefined} />
                    ) : (
                      <>
                        {item.attachment_path && (
                          <SignedImage bucket="chat-attachments" storagePath={item.attachment_path} style={styles.image} />
                        )}
                        {!!item.body && (
                          <Text style={styles.mineText}>{item.body}</Text>
                        )}
                      </>
                    )}
                    <View style={styles.timeRow}>
                      <Text style={styles.mineTime}>
                        {new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Ionicons name="checkmark-done-sharp" size={13} color="#FDFBF7" style={{ marginLeft: 3 }} />
                    </View>
                  </LinearGradient>
                ) : (
                  <LinearGradient colors={['#FFFFFF', '#FDFBF7']} start={{x:0, y:0}} end={{x:1, y:1}} style={[styles.bubble, styles.theirs]}>
                    <Text style={styles.senderLabel}>{senderName}</Text>
                    {isProjShare && projData ? (
                      <View style={styles.shareCardWrap}>
                        <View style={styles.shareCardHeader}>
                          <Ionicons name="business-sharp" size={18} color="#695030" />
                          <Text style={styles.shareCardTagTheirs}>PROJECT SHARE</Text>
                        </View>
                        <Text style={styles.shareCardTitleTheirs}>{projData.name}</Text>
                        <Text style={styles.shareCardSubTheirs}>{projData.city} · {projData.status?.replace('_', ' ')}</Text>
                        <View style={styles.shareCardProgressTrackTheirs}>
                          <View style={[styles.shareCardProgressFillTheirs, { width: `${Math.min(100, projData.progress || 0)}%` }]} />
                        </View>
                        <Text style={styles.shareCardPctTheirs}>{projData.progress || 0}% Completed</Text>
                        <TouchableOpacity
                          style={styles.shareCardActionTheirs}
                          onPress={() => router.push({ pathname: '/(admin)/project-workspace' as any, params: { id: projData.id } })}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.shareCardActionTextTheirs}>Open Workspace →</Text>
                        </TouchableOpacity>
                      </View>
                    ) : isTaskShare && taskData ? (
                      <View style={styles.shareCardWrap}>
                        <View style={styles.shareCardHeader}>
                          <Ionicons name="checkmark-circle-sharp" size={18} color="#695030" />
                          <Text style={styles.shareCardTagTheirs}>TASK SHARE</Text>
                        </View>
                        <Text style={styles.shareCardTitleTheirs}>{taskData.title}</Text>
                        <Text style={styles.shareCardSubTheirs}>Priority: {taskData.priority} · {taskData.levelZone}</Text>
                        <TouchableOpacity
                          style={styles.shareCardActionTheirs}
                          onPress={() => router.push({ pathname: '/(admin)/project-workspace' as any, params: { id: taskData.projectId, intent: 'task' } })}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.shareCardActionTextTheirs}>View Task →</Text>
                        </TouchableOpacity>
                      </View>
                    ) : isAudio && item.attachment_path ? (
                      <AudioPlayer storagePath={item.attachment_path} isMine={false} durationLabel={item.body || undefined} />
                    ) : (
                      <>
                        {item.attachment_path && (
                          <SignedImage bucket="chat-attachments" storagePath={item.attachment_path} style={styles.image} />
                        )}
                        {!!item.body && (
                          <Text style={styles.body}>{item.body}</Text>
                        )}
                      </>
                    )}
                    <View style={styles.timeRow}>
                      <Text style={styles.time}>
                        {new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </LinearGradient>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Typing Indicator */}
      {someoneTyping && (
        <View style={styles.typingBar}>
          <TypingIndicator />
          <Text style={styles.typingText}>{someoneTyping} is typing...</Text>
        </View>
      )}

      {/* Quick Replies Bar */}
      <View style={styles.quickReplyContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickReplyScroll}>
          {QUICK_REPLIES.map((reply) => (
            <TouchableOpacity key={reply} style={styles.quickChip} onPress={() => sendText(reply)} activeOpacity={0.8}>
              <Text style={styles.quickChipText}>{reply}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Composer Input Bar */}
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        {isRecording ? (
          <View style={styles.recordingBarContainer}>
            <TouchableOpacity style={styles.cancelRecBtn} onPress={cancelRecording} activeOpacity={0.8}>
              <Ionicons name="trash-sharp" size={20} color="#DC2626" />
            </TouchableOpacity>
            <View style={styles.recordingTimerWrap}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingTimerText}>
                Recording {Math.floor(recordSecs / 60)}:{recordSecs % 60 < 10 ? '0' : ''}{recordSecs % 60}
              </Text>
            </View>
            <TouchableOpacity style={styles.sendRecBtn} onPress={stopAndSendRecording} activeOpacity={0.8}>
              <LinearGradient colors={['#15803D', '#22C55E']} style={styles.sendGrad}>
                <Ionicons name="send-sharp" size={16} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.actionIconBtn} onPress={openShareModal} disabled={uploading} activeOpacity={0.8}>
              <Ionicons name="add-circle-sharp" size={23} color="#695030" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIconBtn} onPress={snapCamera} disabled={uploading} activeOpacity={0.8}>
              <Ionicons name="camera-sharp" size={21} color="#695030" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIconBtn} onPress={attach} disabled={uploading} activeOpacity={0.8}>
              <Ionicons name={uploading ? 'hourglass-sharp' : 'attach-sharp'} size={22} color="#695030" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={(text) => {
                setDraft(text);
                if (text.trim().length > 0) broadcastTyping();
              }}
              placeholder="Type message..."
              placeholderTextColor="#8B7E74"
              multiline
            />
            {draft.trim().length > 0 ? (
              <Animated.View style={{ transform: [{ scale: sendBtnScale }] }}>
                <TouchableOpacity
                  style={[styles.sendBtnWrap, send.isPending && { opacity: 0.5 }]}
                  onPress={() => {
                    Animated.sequence([
                      Animated.timing(sendBtnScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
                      Animated.timing(sendBtnScale, { toValue: 1, duration: 80, useNativeDriver: true }),
                    ]).start();
                    sendText();
                  }}
                  disabled={send.isPending}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={['#5B4122', '#8B6840']} style={styles.sendGrad}>
                    <Ionicons name="send-sharp" size={17} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <TouchableOpacity
                style={styles.sendBtnWrap}
                onPress={startRecording}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#695030', '#8B6840']} style={styles.sendGrad}>
                  <Ionicons name="mic-sharp" size={19} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}
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

      {/* ── Share Project / Task Modal ── */}
      <Modal visible={showShareModal} animationType="slide" transparent={false} onRequestClose={() => setShowShareModal(false)}>
        <View style={[styles.modalContainer, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowShareModal(false)} style={styles.closeBtn}>
              <Ionicons name="close-sharp" size={24} color="#1E1815" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Share Project or Task</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Tab Selector */}
          <View style={styles.shareTabContainer}>
            <TouchableOpacity
              style={[styles.shareTabBtn, shareTab === 'projects' && styles.shareTabBtnActive]}
              onPress={() => setShareTab('projects')}
              activeOpacity={0.8}
            >
              <Ionicons name="business-sharp" size={16} color={shareTab === 'projects' ? '#FFFFFF' : '#695030'} />
              <Text style={[styles.shareTabText, shareTab === 'projects' && styles.shareTabTextActive]}>Projects ({projects.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareTabBtn, shareTab === 'tasks' && styles.shareTabBtnActive]}
              onPress={() => setShareTab('tasks')}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-sharp" size={16} color={shareTab === 'tasks' ? '#FFFFFF' : '#695030'} />
              <Text style={[styles.shareTabText, shareTab === 'tasks' && styles.shareTabTextActive]}>Tasks ({allTasks.length})</Text>
            </TouchableOpacity>
          </View>

          {shareTab === 'projects' ? (
            <FlatList
              data={projects}
              keyExtractor={p => p.id}
              contentContainerStyle={styles.membersList}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No active projects found</Text>
                </View>
              }
              renderItem={({ item: proj }) => (
                <TouchableOpacity style={styles.shareItemRow} onPress={() => shareProject(proj)} activeOpacity={0.8}>
                  <LinearGradient colors={['#5B4122', '#8B6840']} style={styles.shareItemIconBg}>
                    <Ionicons name="business-sharp" size={20} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.shareItemInfo}>
                    <Text style={styles.shareItemTitle}>{proj.name}</Text>
                    <Text style={styles.shareItemSub}>{proj.city} · {proj.progress_pct || 0}% Done</Text>
                  </View>
                  <View style={styles.shareSendBtn}>
                    <Text style={styles.shareSendBtnText}>Share</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          ) : (
            <FlatList
              data={allTasks}
              keyExtractor={t => t.id}
              contentContainerStyle={styles.membersList}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No tasks found</Text>
                </View>
              }
              renderItem={({ item: task }) => (
                <TouchableOpacity style={styles.shareItemRow} onPress={() => shareTask(task)} activeOpacity={0.8}>
                  <LinearGradient colors={['#0369A1', '#0EA5E9']} style={styles.shareItemIconBg}>
                    <Ionicons name="checkmark-circle-sharp" size={20} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.shareItemInfo}>
                    <Text style={styles.shareItemTitle}>{task.title}</Text>
                    <Text style={styles.shareItemSub}>Priority: {task.priority} · {task.level_zone || 'Site'}</Text>
                  </View>
                  <View style={styles.shareSendBtn}>
                    <Text style={styles.shareSendBtnText}>Share</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#EAE5DC' },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F2EC' },
  infoBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F2EC' },
  title: { fontSize: 16, fontFamily: fontFamily.bold, color: '#1E1815' },
  online: { fontSize: 11, fontFamily: fontFamily.medium, color: '#695030', marginTop: 1 },
  list: { padding: spacing.lg, paddingBottom: spacing['3xl'], flexGrow: 1 },
  
  // Bubbles & Rows
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.md, gap: 8 },
  mineRow: { justifyContent: 'flex-end' },
  theirsRow: { justifyContent: 'flex-start' },
  avatarWrap: { marginBottom: 2 },
  bubble: { maxWidth: '78%', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: 18, boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)' } as any,
  mine: { borderBottomRightRadius: 4 },
  theirs: { borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#EAE5DC' },
  senderLabel: { fontSize: 11, fontFamily: fontFamily.bold, color: '#695030', marginBottom: 4 },
  body: { fontSize: 14, fontFamily: fontFamily.regular, color: '#1E1815', lineHeight: 20 },
  mineText: { fontSize: 14, fontFamily: fontFamily.regular, color: '#FFFFFF', lineHeight: 20 },
  timeRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4 },
  time: { fontSize: 10, fontFamily: fontFamily.medium, color: '#8B7E74' },
  mineTime: { fontSize: 10, fontFamily: fontFamily.medium, color: '#FDFBF7' },
  image: { width: 220, height: 150, borderRadius: radius.md, marginBottom: spacing.sm, backgroundColor: colors.neutral[200] },
  
  // Typing Indicator
  typingBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 4, backgroundColor: '#FDFBF7' },
  typingText: { fontSize: 12, fontFamily: fontFamily.medium, color: '#8B7E74', marginLeft: 2 },
  
  // Quick Replies Bar
  quickReplyContainer: { backgroundColor: '#FDFBF7', borderTopWidth: 1, borderColor: '#EAE5DC', paddingVertical: spacing.xs },
  quickReplyScroll: { paddingHorizontal: spacing.md, gap: spacing.xs },
  quickChip: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(105, 80, 48, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  quickChipText: { fontSize: 12, fontFamily: fontFamily.medium, color: '#695030' },
  
  // Composer Input
  composer: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#EAE5DC', flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  actionIconBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minHeight: 42, maxHeight: 96, backgroundColor: '#F5F2EC', borderRadius: 21, paddingHorizontal: spacing.lg, paddingVertical: 10, fontSize: 14, fontFamily: fontFamily.regular, color: '#1E1815' },
  sendBtnWrap: { width: 42, height: 42, borderRadius: 21, overflow: 'hidden', marginBottom: 1 },
  sendGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Recording Bar
  recordingBarContainer: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 22, paddingHorizontal: 12, gap: 12 },
  cancelRecBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  recordingTimerWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#DC2626' },
  recordingTimerText: { fontSize: 13, fontFamily: fontFamily.bold, color: '#991B1B' },
  sendRecBtn: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden' },
  
  // Empty State
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingTop: 60 },
  emptyIconBg: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  emptyTitle: { fontSize: 17, fontFamily: fontFamily.bold, color: '#1E1815' },
  emptyText: { fontSize: 13, fontFamily: fontFamily.regular, color: '#8B7E74', textAlign: 'center', paddingHorizontal: 40 },

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
  addMemberBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#695030', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  addMemberBtnText: { ...typography.caption, fontFamily: fontFamily.medium, color: colors.white },
  membersList: { paddingBottom: 40 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  memberInfo: { flex: 1 },
  memberName: { ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },
  memberRole: { ...typography.caption, color: colors.neutral[400], textTransform: 'capitalize' },
  adminBadge: { backgroundColor: '#695030', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  adminBadgeText: { fontSize: 10, fontFamily: fontFamily.bold, color: colors.white },
  memberBadge: { backgroundColor: colors.neutral[200], paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  memberBadgeText: { fontSize: 10, fontFamily: fontFamily.bold, color: colors.neutral[600] },

  // Share Cards & Modal Styles
  shareCardWrap: { width: 220, paddingVertical: 4 },
  shareCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  shareCardTagMine: { fontSize: 10, fontFamily: fontFamily.bold, color: '#FDFBF7', letterSpacing: 0.5 },
  shareCardTagTheirs: { fontSize: 10, fontFamily: fontFamily.bold, color: '#695030', letterSpacing: 0.5 },
  shareCardTitleMine: { fontSize: 15, fontFamily: fontFamily.bold, color: '#FFFFFF', marginBottom: 2 },
  shareCardTitleTheirs: { fontSize: 15, fontFamily: fontFamily.bold, color: '#1E1815', marginBottom: 2 },
  shareCardSubMine: { fontSize: 11, fontFamily: fontFamily.regular, color: '#FDFBF7', opacity: 0.9 },
  shareCardSubTheirs: { fontSize: 11, fontFamily: fontFamily.regular, color: '#8B7E74' },
  shareCardProgressTrackMine: { height: 4, backgroundColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  shareCardProgressFillMine: { height: 4, backgroundColor: '#FFFFFF', borderRadius: 2 },
  shareCardProgressTrackTheirs: { height: 4, backgroundColor: '#EAE5DC', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  shareCardProgressFillTheirs: { height: 4, backgroundColor: '#695030', borderRadius: 2 },
  shareCardPctMine: { fontSize: 10, fontFamily: fontFamily.bold, color: '#FFFFFF', marginTop: 4 },
  shareCardPctTheirs: { fontSize: 10, fontFamily: fontFamily.bold, color: '#695030', marginTop: 4 },
  shareCardActionMine: { marginTop: 8, backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, alignSelf: 'flex-start' },
  shareCardActionTextMine: { fontSize: 11, fontFamily: fontFamily.bold, color: '#FFFFFF' },
  shareCardActionTheirs: { marginTop: 8, backgroundColor: '#695030', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, alignSelf: 'flex-start' },
  shareCardActionTextTheirs: { fontSize: 11, fontFamily: fontFamily.bold, color: '#FFFFFF' },

  // Share Modal Tabs & Rows
  shareTabContainer: { flexDirection: 'row', backgroundColor: '#F5F2EC', borderRadius: 12, padding: 4, marginBottom: spacing.md, gap: 4 },
  shareTabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10 },
  shareTabBtnActive: { backgroundColor: '#695030' },
  shareTabText: { fontSize: 13, fontFamily: fontFamily.bold, color: '#695030' },
  shareTabTextActive: { color: '#FFFFFF' },
  shareItemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: '#F5F2EC' },
  shareItemIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  shareItemInfo: { flex: 1 },
  shareItemTitle: { fontSize: 14, fontFamily: fontFamily.bold, color: '#1E1815' },
  shareItemSub: { fontSize: 12, fontFamily: fontFamily.regular, color: '#8B7E74', marginTop: 2 },
  shareSendBtn: { backgroundColor: '#695030', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  shareSendBtnText: { fontSize: 11, fontFamily: fontFamily.bold, color: '#FFFFFF' },
});
