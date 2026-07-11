import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import { Button, Card } from '../../../src/components';
import { colors } from '../../../src/theme/colors';
import { typography, fontFamily } from '../../../src/theme/typography';
import { spacing, radius, shadows } from '../../../src/theme/spacing';

/** Haversine distance in meters */
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Demo site coordinates (Embassy Tower, Mumbai)
const SITE_LAT = 19.076;
const SITE_LNG = 72.8777;
const GEOFENCE_RADIUS = 100; // meters

export default function PunchInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationVerified, setLocationVerified] = useState<boolean | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location Required', 'Location access is needed for attendance verification.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    setLocation(loc);

    const dist = haversineDistance(
      loc.coords.latitude,
      loc.coords.longitude,
      SITE_LAT,
      SITE_LNG
    );
    setDistance(Math.round(dist));
    setLocationVerified(dist <= GEOFENCE_RADIUS);
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
    if (!selfieUri || !location) return;

    setSubmitting(true);
    // TODO: Save to offline outbox (expo-sqlite) → sync to Supabase
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert(
        'Punch In Recorded',
        locationVerified
          ? 'Your attendance has been recorded successfully.'
          : 'Attendance recorded but location is outside the site radius. This will be flagged for admin review.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }, 1500);
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
        <View style={{ width: 24 }} />
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
          <Text style={styles.infoValue}>Embassy Tower</Text>
        </View>

        {/* Location status */}
        <View style={styles.infoRow}>
          <Ionicons
            name={locationVerified ? 'checkmark-circle' : location ? 'warning' : 'navigate-outline'}
            size={18}
            color={
              locationVerified === null
                ? colors.neutral[400]
                : locationVerified
                ? colors.success
                : colors.warning
            }
          />
          <Text style={styles.infoLabel}>Location</Text>
          <Text
            style={[
              styles.infoValue,
              {
                color:
                  locationVerified === null
                    ? colors.neutral[400]
                    : locationVerified
                    ? colors.success
                    : colors.warning,
              },
            ]}
          >
            {locationVerified === null
              ? 'Checking...'
              : locationVerified
              ? t('worker.locationVerified')
              : `${t('worker.locationNotVerified')} (${distance}m away)`}
          </Text>
        </View>
      </Card>

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
              style={{ flex: 1 }}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    width: 60,
  },
  infoValue: {
    ...typography.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.ink,
    flex: 1,
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
