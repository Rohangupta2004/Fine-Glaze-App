import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

import { Button, GradientButton, Card, Input, SyncStatusBadge } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import { useOutboxStore } from '../../src/stores/outboxStore';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius, shadows } from '../../src/theme/spacing';
import { showAlert } from '../../src/utils/alert';

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
      setMedia((prev) => [...prev, ...selected].slice(0, 10));
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
      }].slice(0, 10));
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
      showAlert('DPR Queued', 'Your daily progress report has been saved and will sync automatically.');
      // Reset
      setStep('info');
      setWorkType('');
      setLevelZone('');
      setWorkDone('');
      setMedia([]);
    } catch (e: unknown) {
      setSubmitting(false);
      const msg = e instanceof Error ? e.message : 'Failed to submit report. Please try again.';
      showAlert('Error', msg);
    }
  };

  const canProceed = step === 'info' ? (workType && workDone) : step === 'media' ? true : true;

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={['#FFFFFF', '#F9F8F6', '#EAE6DF']} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }} 
        style={StyleSheet.absoluteFill} 
      />
      <View style={[styles.innerContent, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{t('worker.uploadDpr')}</Text>
          <SyncStatusBadge />
        </View>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <View style={styles.stepItem}>
                <View style={[
                  styles.stepCircle, 
                  i < stepIndex && styles.stepCompleted,
                  i === stepIndex && styles.stepActive
                ]}>
                  {i < stepIndex ? (
                    <Ionicons name="checkmark" size={14} color={colors.white} />
                  ) : (
                    <Text style={[
                      styles.stepNum, 
                      i <= stepIndex && styles.stepNumActive
                    ]}>
                      {i + 1}
                    </Text>
                  )}
                </View>
                <Text style={[
                  styles.stepLabel, 
                  i <= stepIndex && styles.stepLabelActive
                ]}>
                  {STEP_LABELS[s]}
                </Text>
              </View>
              {i < STEPS.length - 1 && (
                <View style={[
                  styles.stepLine, 
                  i < stepIndex && styles.stepLineActive
                ]} />
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
              <Text style={styles.mediaHint}>Add up to 10 photos or videos from site</Text>

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
                      hitSlop={8}
                    >
                      <Ionicons name="close-circle" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}

                {media.length < 10 && (
                  <View style={styles.addMediaRow}>
                    <TouchableOpacity style={styles.addMediaBtn} onPress={takePhoto} activeOpacity={0.7}>
                      <Ionicons name="camera" size={24} color={colors.primary} />
                      <Text style={styles.addMediaText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addMediaBtn} onPress={pickImages} activeOpacity={0.7}>
                      <Ionicons name="images" size={24} color={colors.primary} />
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
              <Card style={styles.previewCard} padding={spacing.xl}>
                <Text style={styles.previewLabel}>Project / Site</Text>
                <Text style={styles.previewValue}>{activeProject?.name || '—'}</Text>

                <Text style={styles.previewLabel}>Work Type</Text>
                <Text style={styles.previewValue}>{workType}</Text>

                <Text style={styles.previewLabel}>Level / Zone</Text>
                <Text style={styles.previewValue}>{levelZone || '—'}</Text>

                <Text style={styles.previewLabel}>Work Done</Text>
                <Text style={styles.previewValue}>{workDone}</Text>

                <Text style={styles.previewLabel}>Media Attachments</Text>
                <Text style={styles.previewValue}>{media.length} file(s) attached</Text>

                {media.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {media.map((item, i) => (
                      <View key={`${item.uri}-${i}`} style={{ marginRight: spacing.sm, position: 'relative' }}>
                        <Image source={{ uri: item.uri }} style={styles.previewThumb} />
                        {item.type === 'video' && (
                          <View style={[styles.videoBadge, { left: 4, bottom: 4 }]}>
                            <Ionicons name="play" size={10} color={colors.white} />
                          </View>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                )}
              </Card>
            </View>
          )}
        </ScrollView>

        {/* Navigation buttons */}
        <View style={[styles.navButtons, { paddingBottom: Math.max(insets.bottom, spacing.md) + 90 }]}>
          {stepIndex > 0 && (
            <Button
              title={t('common.back')}
              variant="secondary"
              onPress={() => setStep(STEPS[stepIndex - 1])}
              style={{ flex: 1 }}
            />
          )}
          {stepIndex < STEPS.length - 1 ? (
            <GradientButton
              title={t('common.next')}
              onPress={() => setStep(STEPS[stepIndex + 1])}
              disabled={!canProceed}
              style={{ flex: 1 }}
            />
          ) : (
            <GradientButton
              title={t('common.submit')}
              onPress={handleSubmit}
              loading={submitting}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.ink,
    fontFamily: fontFamily.bold,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E7E5E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {
    backgroundColor: colors.primary,
  },
  stepCompleted: {
    backgroundColor: colors.success,
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
    width: 80,
    textAlign: 'center',
    fontSize: 9,
    fontFamily: fontFamily.medium,
  },
  stepLabelActive: {
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E7E5E0',
    marginBottom: 16,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  stepContent: {
    marginTop: spacing.xs,
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
    backgroundColor: '#FFFDF9',
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
    fontFamily: fontFamily.medium,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  mediaThumb: {
    position: 'relative',
    width: 90,
    height: 90,
    borderRadius: radius.lg,
    overflow: 'hidden',
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
    borderRadius: 10,
  },
  videoBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
  addMediaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    marginTop: spacing.sm,
  },
  addMediaBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#C8B79C',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(200, 183, 156, 0.05)',
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  addMediaText: {
    ...typography.bodySmall,
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1.5,
    ...shadows.md,
  },
  previewLabel: {
    ...typography.caption,
    color: colors.neutral[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: fontFamily.bold,
    marginTop: spacing.md,
    marginBottom: 2,
  },
  previewValue: {
    ...typography.bodyMedium,
    color: colors.ink,
    fontFamily: fontFamily.medium,
    marginBottom: spacing.xs,
  },
  previewThumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
  },
  navButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    backgroundColor: 'transparent',
  },
});
