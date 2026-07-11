import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import * as Sentry from '@sentry/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import '../src/i18n';
import { useAuthStore } from '../src/stores/authStore';
import { setupInactivityTracking, recordLogin, type LockAction } from '../src/lib/inactivityLock';
import { colors } from '../src/theme/colors';

// Keep splash visible while loading
SplashScreen.preventAutoHideAsync();

// Initialize Sentry
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  enabled: !__DEV__,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

function RootLayoutInner() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, userId, loading, hasPin, initialize, profile } =
    useAuthStore();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (fontsLoaded && !loading) {
      setAppReady(true);
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, loading]);

  // Inactivity lock — 30 min PIN, 7 day full re-auth
  useEffect(() => {
    if (!isAuthenticated) return;
    const cleanup = setupInactivityTracking((action: LockAction) => {
      if (action === 'full_reauth') {
        useAuthStore.getState().signOut();
        router.replace('/(auth)/welcome');
      } else if (action === 'pin') {
        useAuthStore.getState().setAuthenticated(false);
        router.replace('/(auth)/pin-unlock');
      }
    });
    return cleanup;
  }, [isAuthenticated]);

  // Auth routing guard
  useEffect(() => {
    if (!appReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!userId) {
      // Not logged in → auth flow
      if (!inAuthGroup) {
        router.replace('/(auth)/welcome');
      }
    } else if (!isAuthenticated) {
      // Logged in but hasn't passed PIN → PIN screen
      if (!inAuthGroup) {
        if (hasPin) {
          router.replace('/(auth)/pin-unlock');
        } else {
          router.replace('/(auth)/create-pin');
        }
      }
    } else if (inAuthGroup && profile) {
      // Authenticated → route to role-based home
      const experience = getRouteGroup(profile.role);
      router.replace(`/(${experience})/home` as any);
    }
  }, [appReady, userId, isAuthenticated, hasPin, segments, profile]);

  if (!appReady) {
    return <View style={styles.loading} />;
  }

  return <Slot />;
}

function getRouteGroup(role: string): string {
  switch (role) {
    case 'owner':
    case 'project_manager':
    case 'hr':
    case 'accounts':
      return 'admin';
    case 'supervisor':
      return 'supervisor';
    case 'client':
      return 'client';
    default:
      return 'worker';
  }
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutInner />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
