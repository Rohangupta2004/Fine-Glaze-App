import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/typography';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { usePushNotifications } from '../../src/hooks/usePushNotifications';
import { useOutboxSync } from '../../src/hooks/useOutboxSync';

export default function SupervisorLayout() {
  usePushNotifications();
  useOutboxSync();

  return (
    <ErrorBoundary label="Supervisor">
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.neutral[200],
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily.medium,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="materials"
        options={{
          title: 'Materials',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Sub-screens (no tab bar) */}
      <Tabs.Screen
        name="team-attendance"
        options={{
          href: null, // not in tab bar
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="dpr"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="new-message" options={{ href: null }} />
      <Tabs.Screen name="conversation" options={{ href: null }} />
    </Tabs>
    </ErrorBoundary>
  );
}
