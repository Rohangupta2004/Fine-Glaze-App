/**
 * geofence.ts
 *
 * Geofencing utilities for attendance verification.
 * Uses Haversine formula for distance calculation.
 * Workers must be within the project's geofence_radius_m to verify attendance.
 *
 * Per PRD §6.1:
 * - Selfie + GPS geofence verification
 * - Haversine distance check ≤ geofence_radius_m (default 100m)
 * - location_verified=false rows still save but flagged red for admin
 */

import * as Location from 'expo-location';

/** Haversine distance in meters between two lat/lng points */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface GeofenceResult {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  distance: number;
  isWithinRadius: boolean;
}

/**
 * Check if the current device location is within a project's geofence.
 *
 * @param projectLat - Project site latitude
 * @param projectLng - Project site longitude
 * @param radiusM - Geofence radius in meters (default 100)
 * @returns GeofenceResult with distance and verification status
 */
export async function checkGeofence(
  projectLat: number,
  projectLng: number,
  radiusM: number = 100,
): Promise<GeofenceResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission is required for attendance verification.');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  const distance = haversineDistance(
    location.coords.latitude,
    location.coords.longitude,
    projectLat,
    projectLng,
  );

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    distance: Math.round(distance),
    isWithinRadius: distance <= radiusM,
  };
}

/**
 * Format distance for display.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}
