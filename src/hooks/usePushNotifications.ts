/**
 * usePushNotifications.ts
 *
 * Registers for Expo push notifications and stores the token
 * in the profiles table. Per PRD §10 notifications matrix.
 */

import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

// Set notification handler for foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
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
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenData.data;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

/**
 * Hook that registers push notifications and stores the token.
 * Mount once in the authenticated app layout.
 */
export function usePushNotifications() {
  const profile = useAuthStore((s) => s.profile);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!profile?.id) return;

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
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
      }
    );

    // Listen for notification taps (deep linking)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log('Notification tapped:', data);
        // Navigate based on notification kind
        try {
          const kind = data?.kind as string | undefined;
          const role = profile?.role || 'worker';
          const group = ['owner','project_manager','hr','accounts'].includes(role)
            ? 'admin' : role === 'supervisor' ? 'supervisor' : role === 'client' ? 'client' : 'worker';

          if (kind === 'chat' || kind === 'message') {
            const { router } = require('expo-router');
            if (data?.conversationId) {
              router.push({ pathname: `/(${group})/conversation`, params: { id: data.conversationId } });
            } else {
              router.push(`/(${group})/chat`);
            }
          } else if (kind === 'material_request' || kind === 'material_approve') {
            const { router } = require('expo-router');
            router.push(`/(${group})/materials`);
          } else if (kind === 'dpr_submit' || kind === 'dpr_approve' || kind === 'dpr_reject') {
            const { router } = require('expo-router');
            if (group === 'admin') router.push('/(admin)/dpr-management');
            else router.push(`/(${group})/dpr`);
          } else if (kind === 'leave_request' || kind === 'leave_approve') {
            const { router } = require('expo-router');
            if (group === 'admin') router.push('/(admin)/approvals');
            else router.push(`/(${group})/more`);
          } else if (kind === 'attendance') {
            const { router } = require('expo-router');
            if (group === 'admin') router.push('/(admin)/attendance-report');
            else router.push(`/(${group})/attendance`);
          } else if (kind === 'document') {
            const { router } = require('expo-router');
            router.push(`/(${group})/documents`);
          }
        } catch (navError) {
          console.error('Notification navigation error:', navError);
        }
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [profile?.id]);
}
