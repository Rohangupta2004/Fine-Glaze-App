import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Avatar } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useUpdateEmployee } from '../../src/hooks/useEmployees';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { showAlert } from '../../src/utils/alert';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', project_manager: 'Project Manager', hr: 'HR',
  accounts: 'Accounts', supervisor: 'Supervisor', worker: 'Worker', client: 'Client',
};

export default function MyProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const loadProfile = useAuthStore((s) => (s as any).loadProfile);
  const update = useUpdateEmployee();

  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(profile?.phone || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [uploading, setUploading] = useState(false);

  const changePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Denied', 'We need photo library access to update your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !profile) return;

    setUploading(true);
    try {
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const bytes = await response.arrayBuffer();
      const path = `avatars/${profile.id}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', profile.id);
      if (dbError) throw dbError;

      useAuthStore.setState({ profile: { ...profile, avatar_url: publicUrl } });
      showAlert('Success ✅', 'Profile photo updated.');
    } catch (e: any) {
      showAlert('Upload failed', e?.message || 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!profile) return null;

  const save = async () => {
    try {
      await update.mutateAsync({ id: profile.id, updates: { phone: phone.trim(), address: address.trim() || null } as any });
      const { data } = await supabase.from('profiles').select('*').eq('id', profile.id).single();
      if (data) useAuthStore.setState({ profile: data as any });
      setEditing(false);
      showAlert('Saved ✅');
    } catch (e: any) {
      showAlert('Could not save', e?.message || 'Try again.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Light Header with Profile Overview */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#1E1815" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>My Profile</Text>
          </View>
          <TouchableOpacity onPress={() => setEditing(!editing)} style={styles.editBtn}>
            <Ionicons name={editing ? 'close' : 'create'} size={20} color="#1E1815" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileHero}>
          <TouchableOpacity onPress={changePhoto} style={styles.avatarTouchable} disabled={uploading}>
            <Avatar name={profile.full_name} uri={profile.avatar_url || undefined} size={88} />
            <View style={styles.cameraBadge}>
              {uploading
                ? <ActivityIndicator size={12} color="#fff" />
                : <Ionicons name="camera" size={14} color="#fff" />}
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{profile.full_name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{ROLE_LABELS[profile.role] || profile.role}</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {editing ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Edit Details</Text>
            <View style={styles.inputGap}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="call" size={18} color={colors.neutral[400]} />
                <TextInput
                  style={styles.inputText}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="Enter phone"
                />
              </View>
            </View>
            <View style={styles.inputGap}>
              <Text style={styles.inputLabel}>Address</Text>
              <View style={[styles.inputWrap, { alignItems: 'flex-start' }]}>
                <Ionicons name="location" size={18} color={colors.neutral[400]} style={{ marginTop: 2 }} />
                <TextInput
                  style={[styles.inputText, { minHeight: 80, textAlignVertical: 'top' }]}
                  value={address}
                  onChangeText={setAddress}
                  multiline
                  placeholder="Enter address"
                />
              </View>
            </View>
            
            <TouchableOpacity style={styles.saveBtn} activeOpacity={0.8} onPress={save} disabled={update.isPending}>
              <View style={styles.saveBtnBg}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <InfoRow icon="call" label="Phone" value={profile.phone} />
            <InfoRow icon="location" label="Address" value={profile.address || '—'} />
            <InfoRow icon="calendar" label="Joined" value={profile.joining_date ? new Date(profile.joining_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
            <InfoRow icon="id-card" label="Employee ID" value={profile.worker_id || '—'} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.card}>
      <View style={styles.infoRow}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon as any} size={20} color="#695030" />
        </View>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },

  // Header
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'] },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 4px 12px rgba(0,0,0,0.05)' } as any,
  headerTitle: { fontSize: 20, color: '#1E1815', fontFamily: fontFamily.bold, letterSpacing: -0.5, textAlign: 'center', marginLeft: -44 }, // -44 for centering
  editBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 4px 12px rgba(0,0,0,0.05)' } as any,
  
  profileHero: { alignItems: 'center', marginTop: spacing.md },
  avatarTouchable: { padding: 4, backgroundColor: 'rgba(105,80,48,0.05)', borderRadius: 50, marginBottom: spacing.md, position: 'relative' },
  cameraBadge: { position: 'absolute', bottom: spacing.md + 2, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: '#695030', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FAF8F5' },
  name: { fontSize: 28, fontFamily: fontFamily.bold, color: '#1E1815' },
  roleBadge: { backgroundColor: '#F9F6F0', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 16, marginTop: spacing.sm, borderWidth: 1, borderColor: 'rgba(105,80,48,0.1)' },
  roleText: { fontSize: 12, fontFamily: fontFamily.semiBold, color: '#695030', textTransform: 'uppercase', letterSpacing: 0.5 },

  // List
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100, gap: spacing.sm, paddingTop: spacing.xl },
  
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(105,80,48,0.08)',
    boxShadow: '0px 4px 14px rgba(0,0,0,0.03)'
  } as any,

  // Info Row
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F9F6F0', alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 12, color: colors.neutral[500], fontFamily: fontFamily.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 15, fontFamily: fontFamily.semiBold, color: '#1E1815', marginTop: 2 },

  // Edit Form
  sectionLabel: { fontSize: 18, fontFamily: fontFamily.bold, color: '#1E1815', marginBottom: spacing.lg },
  inputGap: { marginBottom: spacing.lg },
  inputLabel: { fontSize: 13, fontFamily: fontFamily.bold, color: colors.neutral[600], marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(105,80,48,0.1)', borderRadius: 14, paddingHorizontal: spacing.md, paddingVertical: 12 },
  inputText: { flex: 1, fontSize: 15, color: '#1E1815', fontFamily: fontFamily.medium, marginLeft: spacing.sm },
  
  saveBtn: { marginTop: spacing.md, borderRadius: 16, overflow: 'hidden' },
  saveBtnBg: { backgroundColor: '#695030', paddingVertical: spacing.lg, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontFamily: fontFamily.bold, color: '#fff' },
});
