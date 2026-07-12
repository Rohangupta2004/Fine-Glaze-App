import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

import { Button, Card } from '../../../src/components';
import { useAuthStore } from '../../../src/stores/authStore';
import { useProjects } from '../../../src/hooks/useProjects';
import { useOutboxStore } from '../../../src/stores/outboxStore';
import { SyncStatusBadge } from '../../../src/components/SyncStatusBadge';
import { checkGeofence, formatDistance, type GeofenceResult } from '../../../src/lib/geofence';
import { useTodaySafetyCheck, useSubmitSafetyCheck } from '../../../src/hooks/useSafetyChecks';
import { colors } from '../../../src/theme/colors';
import { typography, fontFamily } from '../../../src/theme/typography';
import { spacing, radius, shadows } from '../../../src/theme/spacing';

// Must match the keys used on the standalone Daily Safety Checklist screen.
const PPE_ITEMS = [
  { key: 'helmet', label: 'Hard Hat / Helmet' },
  { key: 'safety_shoes', label: 'Safety Shoes' },
  { key: 'vest', label: 'High-Visibility Vest' },
  { key: 'harness', label: 'Safety Harness (if at height)' },
  { key: 'gloves', label: 'Gloves' },
  { key: 'eye_protection', label: 'Eye Protection / Goggles' },
];

export default function PunchInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const cameraRef = useRef<CameraView>(null);
  const profile = useAuthStore((s) => s.profile);
  const { data: projects } = useProjects();
  const activeProject = projects?.[0];
  const enqueuePunchIn = useOutboxStore((s) => s.enqueuePunchIn);

  const [permission, requestPermission] = useCameraPermissions();
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [geoResult, setGeoResult] = useState<GeofenceResult | null>(null);
  const [geoLoading, setGeoLoading] = useState(true);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: todaySafetyCheck } = useTodaySafetyCheck(profile?.id);
  const submitSafetyCheck = useSubmitSafetyCheck();
  const [ppeChecked, setPpeChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(PPE_ITEMS.map((p) => [p.key, false])),
  );
  const [concern, setConcern] = useState('');
  const safetyDone = !!todaySafetyCheck;
  const allPpeChecked = PPE_ITEMS.every((p) => ppeChecked[p.key]);

  const togglePpe = (key: string) => {
    setPpeChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    getLocation();
  }, [activeProject]);

  const getLocation = async () => {
    setGeoLoading(true);
    setGeoError(null);
    try {
      if (!activeProject?.lat || !activeProject?.lng) {
        setGeoError('No site coordinates configured for this project.');
        setGeoLoading(false);
        return;
      }
      const result = await checkGeofence(
        activeProject.lat,
        activeProject.lng,
        activeProject.geofence_radius_m ?? 100,
      );
      setGeoResult(result);
    } catch (e: any) {
      setGeoError(e.message || 'Failed to get location');
    } finally {
      setGeoLoading(false);
    }
  };

  const takeSelfie = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
      });
      if (photo) {
        setSelfieUri(photo.uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const retakeSelfie = () => {
    setSelfieUri(null);
  };

  const handleConfirm = async () => {
    if (!selfieUri || !geoResult || !profile?.id || !activeProject?.id) return;
    if (!safetyDone && !allPpeChecked) {
      Alert.alert('Safety Checklist', 'Please confirm every PPE item before punching in.');
      return;
    }

    setSubmitting(true);
    try {
      if (!safetyDone) {
        await submitSafetyCheck.mutateAsync({
          profileId: profile.id,
          projectId: activeProject.id,
          items: ppeChecked,
          concernReported: concern.trim() || null,
        });
      }
      await enqueuePunchIn({
        profileId: profile.id,
        projectId: activeProject.id,
        lat: geoResult.latitude,
        lng: geoResult.longitude,
        selfieUri,
        locationVerified: geoResult.isWithinRadius,
        capturedAt: new Date().toISOString(),
      });
      setSubmitting(false);
      Alert.alert(
        'Punch In Recorded',
        geoResult.isWithinRadius
          ? 'Your attendance has been saved and will sync automatically.'
          : `Attendance saved but you are ${formatDistance(geoResult.distance)} from the site. It will be flagged for admin review.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e: unknown) {
      setSubmitting(false);
      const msg = e instanceof Error ? e.message : 'Failed to record attendance.';
      Alert.alert('Error', msg);
    }
  };

  if (!permission?.granted) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="camera-outline" size={64} color={colors.neutral[300]} />
        <Text style={styles.permText}>Camera access is required for attendance selfie</Text>
        <Button title="Grant Camera Access" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('worker.punchIn')}</Text>
        <SyncStatusBadge />
      </View>

      {/* Camera / Selfie preview */}
      <View style={styles.cameraContainer}>
        {selfieUri ? (
          <Image source={{ uri: selfieUri }} style={styles.selfiePreview} />
        ) : (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
          >
            <View style={styles.cameraOverlay}>
              <View style={styles.faceGuide} />
              <Text style={styles.faceGuideText}>Position your face within the circle</Text>
            </View>
          </CameraView>
        )}
      </View>

      {/* Info card */}
      <Card style={styles.infoCard}>
        {/* Timestamp */}
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={18} color={colors.neutral[500]} />
          <Text style={styles.infoLabel}>Time</Text>
          <Text style={styles.infoValue}>
            {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {/* Site */}
        <View style={styles.infoRow}>
          <Ionicons name="business-outline" size={18} color={colors.neutral[500]} />
          <Text style={styles.infoLabel}>Site</Text>
          <Text style={styles.infoValue}>{activeProject?.name || 'No project assigned'}</Text>
        </View>

        {/* Location status */}
        <View style={styles.infoRow}>
          <Ionicons
            name={
              geoLoading
                ? 'navigate-outline'
                : geoError
                ? 'alert-circle'
                : geoResult?.isWithinRadius
                ? 'checkmark-circle'
                : 'warning'
            }
            size={18}
            color={
              geoLoading
                ? colors.neutral[400]
                : geoError
                ? colors.error
                : geoResult?.isWithinRadius
                ? colors.success
                : colors.warning
            }
          />
          <Text style={styles.infoLabel}>Location</Text>
          {geoLoading ? (
            <View style={styles.locationLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.infoValue, { color: colors.neutral[400] }]}>Verifying...</Text>
            </View>
          ) : geoError ? (
            <TouchableOpacity onPress={getLocation} style={{ flex: 1 }}>
              <Text style={[styles.infoValue, { color: colors.error }]}>{geoError}</Text>
              <Text style={[styles.retryText]}>Tap to retry</Text>
            </TouchableOpacity>
          ) : (
            <Text
              style={[
                styles.infoValue,
                { color: geoResult?.isWithinRadius ? colors.success : colors.warning },
              ]}
            >
              {geoResult?.isWithinRadius
                ? `${t('worker.locationVerified')} (${formatDistance(geoResult.distance)})`
                : `${t('worker.locationNotVerified')} (${formatDistance(geoResult?.distance ?? 0)} away)`}
            </Text>
          )}
        </View>

        {/* Accuracy indicator */}
        {geoResult?.accuracy && (
          <View style={styles.infoRow}>
            <Ionicons name="radio-outline" size={18} color={colors.neutral[400]} />
            <Text style={styles.infoLabel}>Accuracy</Text>
            <Text style={[styles.infoValue, { color: colors.neutral[500] }]}>
              ±{Math.round(geoResult.accuracy)}m
            </Text>
          </View>
        )}
      </Card>

      {/* Daily Safety Checklist — required before punch-in confirmation */}
      {selfieUri && (
        <Card style={styles.safetyCard}>
          {safetyDone ? (
            <View style={styles.safetyDoneRow}>
              <Ionicons name="shield-checkmark" size={20} color={colors.success} />
              <Text style={styles.safetyDoneText}>Safety checklist already completed today</Text>
            </View>
          ) : (
            <>
              <View style={styles.safetyHeaderRow}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.warning} />
                <Text style={styles.safetyCardTitle}>Confirm PPE before punching in</Text>
              </View>
              {PPE_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.ppeRow}
                  onPress={() => togglePpe(item.key)}
                  accessibilityLabel={`Toggle ${item.label}`}
                >
                  <Ionicons
                    name={ppeChecked[item.key] ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={ppeChecked[item.key] ? colors.success : colors.neutral[400]}
                  />
                  <Text style={styles.ppeLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
              {!allPpeChecked && (
                <Text style={styles.safetyHint}>Check every item to enable punch-in</Text>
              )}
            </>
          )}
        </Card>
      )}

      {/* Actions */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.lg }]}>
        {!selfieUri ? (
          <TouchableOpacity style={styles.captureBtn} onPress={takeSelfie}>
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>
        ) : (
          <View style={styles.actionButtons}>
            <Button
              title="Retake"
              variant="secondary"
              onPress={retakeSelfie}
              style={{ flex: 1 }}
            />
            <Button
              title={t('common.confirm')}
              onPress={handleConfirm}
              loading={submitting}
              disabled={geoLoading || !!geoError || (!safetyDone && !allPpeChecked)}
              style={{ flex: 1 }}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safetyCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  safetyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  safetyCardTitle: {
    ...typography.bodyMedium,
    fontFamily: fontFamily.semiBold,
    color: colors.ink,
  },
  ppeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  ppeLabel: {
    ...typography.bodySmall,
    color: colors.ink,
  },
  safetyHint: {
    ...typography.caption,
    color: colors.warning,
    marginTop: spacing.xs,
  },
  safetyDoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  safetyDoneText: {
    ...typography.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.success,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing['2xl'],
  },
  permText: {
    ...typography.bodyMedium,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.h5,
    color: colors.ink,
  },
  cameraContainer: {
    marginHorizontal: spacing.lg,
    height: 320,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.neutral[900],
    marginBottom: spacing.xl,
  },
  camera: {
    flex: 1,
  },
  selfiePreview: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceGuide: {
    width: 200,
    height: 240,
    borderRadius: 120,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    borderStyle: 'dashed',
  },
  faceGuideText: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.6)',
    marginTop: spacing.sm,
  },
  infoCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoLabel: {
    ...typography.bodySmall,
    color: colors.neutral[500],
    width: 70,
  },
  infoValue: {
    ...typography.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.ink,
    flex: 1,
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  retryText: {
    ...typography.caption,
    color: colors.primary,
    marginTop: 2,
  },
  actions: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
});
