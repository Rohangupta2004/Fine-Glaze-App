/**
 * usePushNotifications.ts
 *
 * Registers for Expo push notifications and stores the token
 * in the profiles table. Per PRD §10 notifications matrix.
 */

import { Platform } from 'react-native';
import { useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
  if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (e) {
  // Expo Go SDK 53 removes remote notifications from standard Expo Go client
}


async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications || !Device.isDevice) {
    console.log('Push notifications unavailable or require a physical device');
    return null;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance?.MAX || 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#695030',
        sound: 'default',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    // Get Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenData.data;
  } catch (error) {
    console.warn('Failed to get push token:', error);
    return null;
  }
}

/**
 * Hook that registers push notifications and stores the token.
 * Mount once in the authenticated app layout.
 */
export function usePushNotifications() {
  const profile = useAuthStore((s) => s.profile);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (!profile?.id || !Notifications) return;

    // Register and store token
    registerForPushNotifications().then(async (token) => {
      if (token) {
        await supabase
          .from('profiles')
          .update({ push_token: token })
          .eq('id', profile.id);
      }
    });

    // Listen for notifications received while app is foregrounded
    if (typeof Notifications.addNotificationReceivedListener === 'function') {
      notificationListener.current = Notifications.addNotificationReceivedListener(
        (notification: any) => {
          console.log('Notification received:', notification);
        }
      );
    }

    // Listen for notification taps (deep linking)
    if (typeof Notifications.addNotificationResponseReceivedListener === 'function') {
      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        (response: any) => {
          const data = response.notification.request.content.data;
          console.log('Notification tapped:', data);
        }
      );
    }

    return () => {
      if (notificationListener.current && typeof notificationListener.current.remove === 'function') {
        notificationListener.current.remove();
      }
      if (responseListener.current && typeof responseListener.current.remove === 'function') {
        responseListener.current.remove();
      }
    };
  }, [profile?.id]);
}

