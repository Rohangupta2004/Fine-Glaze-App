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

import { Picker } from '@react-native-picker/picker';

import { Button, GradientButton, Card, Input, SyncStatusBadge } from '../../../src/components';
import { useAuthStore } from '../../../src/stores/authStore';
import { useProjects } from '../../../src/hooks/useProjects';
import { useMyAssignedProjects } from '../../../src/hooks/useAssignedProjects';
import { useTodayAttendance } from '../../../src/hooks/useAttendance';
import { useProjectBOQ } from '../../../src/hooks/useBOQ';
import { useSubmitDpr } from '../../../src/hooks/useDpr';
import { useProjectTasks } from '../../../src/hooks/useTasks';
import { useOutboxStore } from '../../../src/stores/outboxStore';
import { supabase } from '../../../src/lib/supabase';
import { colors } from '../../../src/theme/colors';
import { typography, fontFamily } from '../../../src/theme/typography';
import { spacing, radius, shadows } from '../../../src/theme/spacing';
import { showAlert } from '../../../src/utils/alert';

type DprStep = 'info' | 'media' | 'preview';

const STEPS: DprStep[] = ['info', 'media', 'preview'];
const STEP_LABELS = { info: 'Report Info', media: 'Photos & Videos', preview: 'Preview & Submit' };

export default function DprScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const profile = useAuthStore((s) => s.profile);
  const { data: assignedProjects = [] } = useMyAssignedProjects(profile?.id);
  const { data: todayAttendance } = useTodayAttendance(profile?.id);
  const availableProjects = assignedProjects;

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const punchedInSite = todayAttendance?.project_id ? availableProjects.find(p => p.id === todayAttendance.project_id) : null;
  const activeProject = selectedProjectId
    ? (availableProjects.find(p => p.id === selectedProjectId) || availableProjects[0])
    : (punchedInSite || availableProjects[0]);

  const { data: boqItems = [] } = useProjectBOQ(activeProject?.id);
  const { data: projectTasks = [] } = useProjectTasks(activeProject?.id);
  const submitDpr = useSubmitDpr();
  const enqueueDpr = useOutboxStore((s) => s.enqueueDpr);

  const [step, setStep] = useState<DprStep>('info');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [quantityCompleted, setQuantityCompleted] = useState<string>('');
  const [workType, setWorkType] = useState('');
  const [levelZone, setLevelZone] = useState('');
  const [workDone, setWorkDone] = useState('');
  const [reportedQuantities, setReportedQuantities] = useState<Record<string, string>>({});
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
      // 1. Submit DPR online first
      const dpr = await submitDpr.mutateAsync({
        projectId: activeProject.id,
        submittedBy: profile.id,
        workType,
        levelZone,
        workDone,
        taskId: selectedTaskId || null,
        quantityCompleted: parseFloat(quantityCompleted) || 0,
      });

      // 2. Insert reported BOQ scope quantities
      const boqPayload = Object.entries(reportedQuantities)
        .map(([itemId, qtyStr]) => ({
          dpr_id: dpr.id,
          project_boq_item_id: itemId,
          quantity_reported: parseFloat(qtyStr),
        }))
        .filter((item) => !isNaN(item.quantity_reported) && item.quantity_reported > 0);

      if (boqPayload.length > 0) {
        await supabase.from('dpr_boq_items').insert(boqPayload);
      }

      setSubmitting(false);
      showAlert('DPR Submitted', 'Your daily progress report has been submitted for review.');
      setStep('info');
      setSelectedTaskId('');
      setQuantityCompleted('');
      setWorkType('');
      setLevelZone('');
      setWorkDone('');
      setReportedQuantities({});
      setMedia([]);
    } catch (onlineErr) {
      console.warn('[WorkerDPR] Online submit failed, queuing offline:', onlineErr);
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
        showAlert('DPR Saved Offline', 'Report queued offline and will sync automatically once online.');
        setStep('info');
        setSelectedTaskId('');
        setQuantityCompleted('');
        setWorkType('');
        setLevelZone('');
        setWorkDone('');
        setReportedQuantities({});
        setMedia([]);
      } catch (e: any) {
        setSubmitting(false);
        showAlert('Error', e?.message || 'Failed to submit report. Please try again.');
      }
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
      <View style={[styles.innerContent, { paddingTop: insets.top + spacing.md }]}>
        {/* Header */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>Submit Daily Progress Report</Text>
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

        {/* Form Body */}
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing['6xl'] }}
        >
          {/* Step 1: Info */}
          {step === 'info' && (
            <View style={styles.stepContent}>
              {/* Site Selector */}
              {availableProjects.length > 0 && (
                <View style={{ marginBottom: spacing.md }}>
                  <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: colors.ink, marginBottom: 6 }}>
                    Select Assigned Site / Project
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {availableProjects.map((p) => {
                      const isSel = p.id === activeProject?.id;
                      const displayName = p.name === 're' ? 'Sun Tower Facade Site' : p.name;
                      return (
                        <TouchableOpacity
                          key={p.id}
                          onPress={() => setSelectedProjectId(p.id)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 9,
                            borderRadius: radius.md,
                            backgroundColor: isSel ? '#4A3820' : '#FFFFFF',
                            borderWidth: 1.5,
                            borderColor: isSel ? '#4A3820' : colors.neutral[300],
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <Ionicons name="business" size={16} color={isSel ? '#F3E8C4' : colors.neutral[500]} />
                          <View>
                            <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: isSel ? '#FFFFFF' : colors.ink }}>
                              {displayName}
                            </Text>
                            <Text style={{ fontSize: 10, color: isSel ? 'rgba(255,255,255,0.7)' : colors.neutral[500] }}>
                              {p.city || 'Active Site'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Task / Subtask Link Picker */}
              {projectTasks.length > 0 && (
                <View style={{ marginBottom: spacing.md }}>
                  <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: colors.ink, marginBottom: 6 }}>
                    Link to Assigned Task / Subtask (Recommended)
                  </Text>
                  <View style={{ backgroundColor: '#FAF8F5', borderRadius: radius.md, overflow: 'hidden', borderWidth: 0 }}>
                    <Picker
                      selectedValue={selectedTaskId}
                      onValueChange={(val: string) => {
                        setSelectedTaskId(val);
                        const sel = projectTasks.find(t => t.id === val);
                        if (sel?.level_zone && !levelZone) setLevelZone(sel.level_zone);
                      }}
                      mode="dropdown"
                      dropdownIconColor="#4A3820"
                      style={[{ height: 48, color: '#1E1815', backgroundColor: '#FAF8F5', borderWidth: 0, outlineStyle: 'none' } as any]}
                    >
                      <Picker.Item label="-- Select Task / Subtask --" value="" color="#71717A" style={{ backgroundColor: '#FAF8F5' }} />
                      {projectTasks.map((t) => (
                        <Picker.Item 
                          key={t.id} 
                          label={`${t.title}${t.planned_quantity ? ` (Target: ${t.planned_quantity} ${t.unit || 'units'} | Done: ${t.completed_quantity || 0})` : ' (General Task)'}`} 
                          value={t.id} 
                          color="#1E1815" 
                          style={{ backgroundColor: '#FAF8F5' }}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
              )}

              {selectedTaskId !== '' && (
                <Input
                  label="Work Quantity Completed Today (for selected task)"
                  placeholder="e.g. 50"
                  keyboardType="numeric"
                  value={quantityCompleted}
                  onChangeText={setQuantityCompleted}
                  icon="calculator-outline"
                />
              )}

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

              {/* BOQ Scope Quantities */}
              {boqItems.length > 0 && (
                <View style={{ marginTop: spacing.md }}>
                  <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: colors.ink, marginBottom: 8 }}>
                    Today's Completed BOQ Progress Scope
                  </Text>
                  {boqItems.map((item) => (
                    <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, backgroundColor: '#F8FAF9', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.neutral[200] }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 13, fontFamily: fontFamily.semiBold, color: colors.ink }}>{item.item_name}</Text>
                        <Text style={{ fontSize: 11, color: colors.neutral[500] }}>Scope: {item.quantity} {item.unit} | Completed: {item.completed_quantity || 0} {item.unit}</Text>
                      </View>
                      <TextInput
                        style={{ width: 80, height: 38, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 6, paddingHorizontal: 8, fontSize: 13, textAlign: 'center', fontFamily: fontFamily.bold }}
                        placeholder="0.0"
                        keyboardType="numeric"
                        value={reportedQuantities[item.id] || ''}
                        onChangeText={(v) => setReportedQuantities(prev => ({ ...prev, [item.id]: v }))}
                      />
                    </View>
                  ))}
                </View>
              )}
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
    outlineStyle: 'none',
    outlineWidth: 0,
  } as any,
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
