import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Button, Card, Input, SyncStatusBadge } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import { useOutboxStore } from '../../src/stores/outboxStore';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

type DprStep = 'info' | 'media' | 'preview';

const STEPS: DprStep[] = ['info', 'media', 'preview'];
const STEP_LABELS = { info: 'Report Info', media: 'Photos & Videos', preview: 'Preview & Submit' };

export default function DprScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const profile = useAuthStore((s) => s.profile);
  const { data: projects } = useProjects();
  const activeProject = projects?.[0]; // Single active project per worker in M1
  const enqueueDpr = useOutboxStore((s) => s.enqueueDpr);

  const [step, setStep] = useState<DprStep>('info');
  const [workType, setWorkType] = useState('');
  const [levelZone, setLevelZone] = useState('');
  const [workDone, setWorkDone] = useState('');
  const [media, setMedia] = useState<Array<{
    uri: string;
    type: 'photo' | 'video';
    durationS?: number | null;
    mimeType?: string | null;
    fileName?: string | null;
  }>>([]);
  const [submitting, setSubmitting] = useState(false);

  const stepIndex = STEPS.indexOf(step);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: 10 - media.length,
      quality: 0.8,
    });

    if (!result.canceled) {
      const selected = result.assets.map((asset) => ({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' as const : 'photo' as const,
        durationS: asset.duration ? Math.round(asset.duration / 1000) : null,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      }));
      setMedia((prev) => [...prev, ...selected].slice(0, 12));
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setMedia((prev) => [...prev, {
        uri: asset.uri,
        type: 'photo' as const,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      }].slice(0, 12));
    }
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!profile?.id || !activeProject?.id) return;
    setSubmitting(true);
    try {
      await enqueueDpr({
        projectId: activeProject.id,
        submittedBy: profile.id,
        workType,
        levelZone,
        workDone,
        reportDate: new Date().toISOString().slice(0, 10),
        media,
      });
      setSubmitting(false);
      Alert.alert('DPR Queued', 'Your daily progress report has been saved and will sync automatically.');
      // Reset
      setStep('info');
      setWorkType('');
      setLevelZone('');
      setWorkDone('');
      setMedia([]);
    } catch (e: unknown) {
      setSubmitting(false);
      const msg = e instanceof Error ? e.message : 'Failed to submit report. Please try again.';
      Alert.alert('Error', msg);
    }
  };

  const canProceed = step === 'info' ? (workType && workDone) : step === 'media' ? true : true;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('worker.uploadDpr')}</Text>
        <SyncStatusBadge />
      </View>

      {/* Step indicator */}
      <View style={styles.stepRow}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, i <= stepIndex && styles.stepActive]}>
                <Text style={[styles.stepNum, i <= stepIndex && styles.stepNumActive]}>
                  {i + 1}
                </Text>
              </View>
              <Text style={[styles.stepLabel, i <= stepIndex && styles.stepLabelActive]}>
                {STEP_LABELS[s]}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[styles.stepLine, i < stepIndex && styles.stepLineActive]} />
            )}
          </React.Fragment>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['6xl'] }}
      >
        {/* Step 1: Info */}
        {step === 'info' && (
          <View style={styles.stepContent}>
            <Input
              label={t('worker.workType')}
              placeholder="e.g. Glass Installation, Frame Fixing"
              value={workType}
              onChangeText={setWorkType}
              icon="construct-outline"
            />
            <Input
              label={t('worker.levelZone')}
              placeholder="e.g. Level 4 – Zone B"
              value={levelZone}
              onChangeText={setLevelZone}
              icon="layers-outline"
            />
            <View style={styles.textAreaContainer}>
              <Text style={styles.textAreaLabel}>{t('worker.workDone')}</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Describe work completed today..."
                placeholderTextColor={colors.neutral[400]}
                value={workDone}
                onChangeText={(text) => setWorkDone(text.slice(0, 300))}
                multiline
                numberOfLines={4}
                maxLength={300}
              />
              <Text style={styles.charCount}>{workDone.length}/300</Text>
            </View>
          </View>
        )}

        {/* Step 2: Media */}
        {step === 'media' && (
          <View style={styles.stepContent}>
            <Text style={styles.mediaHint}>Add up to 10 photos and 2 videos (max 60s each)</Text>

            <View style={styles.mediaGrid}>
              {media.map((item, index) => (
                <View key={`${item.uri}-${index}`} style={styles.mediaThumb}>
                  <Image source={{ uri: item.uri }} style={styles.thumbImage} />
                  {item.type === 'video' && (
                    <View style={styles.videoBadge}>
                      <Ionicons name="play" size={14} color={colors.white} />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeMedia(index)}
                  >
                    <Ionicons name="close-circle" size={22} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}

              {media.length < 10 && (
                <View style={styles.addMediaRow}>
                  <TouchableOpacity style={styles.addMediaBtn} onPress={takePhoto}>
                    <Ionicons name="camera-outline" size={28} color={colors.primary} />
                    <Text style={styles.addMediaText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addMediaBtn} onPress={pickImages}>
                    <Ionicons name="images-outline" size={28} color={colors.primary} />
                    <Text style={styles.addMediaText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && (
          <View style={styles.stepContent}>
            <Card style={styles.previewCard}>
              <Text style={styles.previewLabel}>Work Type</Text>
              <Text style={styles.previewValue}>{workType}</Text>

              <Text style={styles.previewLabel}>Level / Zone</Text>
              <Text style={styles.previewValue}>{levelZone || '—'}</Text>

              <Text style={styles.previewLabel}>Work Done</Text>
              <Text style={styles.previewValue}>{workDone}</Text>

              <Text style={styles.previewLabel}>Media</Text>
              <Text style={styles.previewValue}>{media.length} file(s) attached</Text>

              {media.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  {media.map((item, i) => (
                    <Image key={`${item.uri}-${i}`} source={{ uri: item.uri }} style={styles.previewThumb} />
                  ))}
                </ScrollView>
              )}
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Navigation buttons */}
      <View style={[styles.navButtons, { paddingBottom: insets.bottom + spacing.lg }]}>
        {stepIndex > 0 && (
          <Button
            title={t('common.back')}
            variant="secondary"
            onPress={() => setStep(STEPS[stepIndex - 1])}
            style={{ flex: 1 }}
          />
        )}
        {stepIndex < STEPS.length - 1 ? (
          <Button
            title={t('common.next')}
            onPress={() => setStep(STEPS[stepIndex + 1])}
            disabled={!canProceed}
            style={{ flex: 1 }}
          />
        ) : (
          <Button
            title={t('common.submit')}
            onPress={handleSubmit}
            loading={submitting}
            style={{ flex: 1 }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h3,
    color: colors.ink,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
    paddingHorizontal: spacing.sm,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {
    backgroundColor: colors.primary,
  },
  stepNum: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[500],
  },
  stepNumActive: {
    color: colors.white,
  },
  stepLabel: {
    ...typography.caption,
    color: colors.neutral[400],
    width: 70,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: colors.primary,
    fontFamily: fontFamily.medium,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.neutral[200],
    marginBottom: 18,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  stepContent: {
    marginTop: spacing.md,
  },
  textAreaContainer: {
    marginBottom: spacing.lg,
  },
  textAreaLabel: {
    ...typography.label,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  textArea: {
    ...typography.bodyMedium,
    fontFamily: fontFamily.regular,
    color: colors.ink,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    borderRadius: radius.md,
    padding: spacing.lg,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    ...typography.caption,
    color: colors.neutral[400],
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  mediaHint: {
    ...typography.bodySmall,
    color: colors.neutral[500],
    marginBottom: spacing.lg,
  },
  mediaGrid: {
    gap: spacing.md,
  },
  mediaThumb: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.white,
    borderRadius: 11,
  },
  videoBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
  addMediaRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  addMediaBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    paddingVertical: spacing['3xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  addMediaText: {
    ...typography.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.primary,
  },
  previewCard: {
    padding: spacing.xl,
  },
  previewLabel: {
    ...typography.caption,
    color: colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: 2,
  },
  previewValue: {
    ...typography.bodyMedium,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  previewThumb: {
    width: 80,
    height: 80,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
  },
  navButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
});
