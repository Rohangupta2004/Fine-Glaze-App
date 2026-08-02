/**
 * backgroundGeofence.ts
 *
 * Ultra-low power OS-native Geofence Monitoring.
 * Uses Android Google Play Services Geofencing & iOS CoreLocation CLCircularRegion.
 * Wakes phone CPU only for 1 second when crossing site boundary (< 1% battery / day).
 */

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { supabase } from './supabase';

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  // Expo Go SDK 53 removes remote notifications from standard Expo Go client
}

export const GEOFENCE_TASK_NAME = 'FINE_GLAZE_BACKGROUND_GEOFENCE';

// Register OS native geofence task at root module level
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.warn('[BackgroundGeofence] Task error:', error.message);
    return;
  }
  if (!data) return;

  const { eventType, region } = data;

  if (eventType === Location.GeofencingEventType.Exit) {
    console.log('[BackgroundGeofence] Exited site boundary:', region?.identifier);

    // 1. Alert worker via local notification if available
    try {
      if (Notifications && typeof Notifications.scheduleNotificationAsync === 'function') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⚠️ Site Boundary Exit Alert',
            body: 'You have moved outside the active site boundary while punched in.',
            sound: true,
          },
          trigger: null,
        });
      }
    } catch (e) {
      console.warn('[BackgroundGeofence] Notification error:', e);
    }


    // 2. Audit log boundary exit event to Supabase
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (userId) {
        await supabase.from('audit_logs').insert({
          profile_id: userId,
          action: 'geofence_boundary_exit',
          details: {
            identifier: region?.identifier,
            lat: region?.latitude,
            lng: region?.longitude,
            radius: region?.radius,
            exited_at: new Date().toISOString(),
          },
        });
      }
    } catch (e) {
      console.warn('[BackgroundGeofence] Audit log error:', e);
    }
  } else if (eventType === Location.GeofencingEventType.Enter) {
    console.log('[BackgroundGeofence] Re-entered site boundary:', region?.identifier);

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Re-entered Site Boundary',
          body: 'You are back within the active site boundary.',
          sound: true,
        },
        trigger: null,
      });
    } catch (e) {
      console.warn('[BackgroundGeofence] Notification error:', e);
    }
  }
});

/**
 * Start low-power OS background geofencing for active site
 */
export async function startShiftGeofence(
  projectId: string,
  siteName: string,
  latitude: number,
  longitude: number,
  radiusMeters: number = 100
): Promise<boolean> {
  try {
    const isAvailable = await TaskManager.isAvailableAsync();
    if (!isAvailable) return false;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return false;

    // Best effort background location permission for native OS geofence
    try {
      await Location.requestBackgroundPermissionsAsync();
    } catch {}

    const isRunning = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME);
    if (isRunning) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    }

    await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, [
      {
        identifier: `${projectId}_${siteName}`,
        latitude,
        longitude,
        radius: radiusMeters,
        notifyOnEnter: true,
        notifyOnExit: true,
      },
    ]);
    console.log(`[BackgroundGeofence] Native geofencing active for ${siteName} (${radiusMeters}m radius)`);
    return true;
  } catch (e) {
    console.warn('[BackgroundGeofence] Could not start native geofence:', e);
    return false;
  }
}


/**
 * Stop background OS geofencing on shift completion
 */
export async function stopShiftGeofence(): Promise<void> {
  try {
    const isAvailable = await TaskManager.isAvailableAsync();
    if (!isAvailable) return;
    const isRunning = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME);
    if (isRunning) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
      console.log('[BackgroundGeofence] Native geofencing stopped.');
    }
  } catch (e) {
    console.warn('[BackgroundGeofence] Error stopping geofence:', e);
  }
}
