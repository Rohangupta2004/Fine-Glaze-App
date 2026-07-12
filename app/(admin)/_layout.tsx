import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/typography';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { usePushNotifications } from '../../src/hooks/usePushNotifications';
import { useOutboxSync } from '../../src/hooks/useOutboxSync';

export default function AdminLayout() {
  const { t } = useTranslation();
  usePushNotifications();
  useOutboxSync();

  return (
    <ErrorBoundary label="Admin">
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
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarIcon: () => (
            <Ionicons name="add-circle" size={32} color={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
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
      {/* Hidden detail screens — accessible via router.push, not shown in tab bar */}
      <Tabs.Screen name="employees" options={{ href: null }} />
      <Tabs.Screen name="employee-profile" options={{ href: null }} />
      <Tabs.Screen name="add-employee" options={{ href: null }} />
      <Tabs.Screen name="approvals" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="project-workspace" options={{ href: null }} />
      <Tabs.Screen name="create-project" options={{ href: null }} />
      <Tabs.Screen name="recurring-tasks" options={{ href: null }} />
      <Tabs.Screen name="project-qr" options={{ href: null }} />
      <Tabs.Screen name="assign-site" options={{ href: null }} />
      <Tabs.Screen name="global-search" options={{ href: null }} />
      <Tabs.Screen name="calendar" options={{ href: null }} />
      <Tabs.Screen name="dpr-management" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="attendance-report" options={{ href: null }} />
      <Tabs.Screen name="audit-log" options={{ href: null }} />
      <Tabs.Screen name="all-sites" options={{ href: null }} />
      <Tabs.Screen name="roles-permissions" options={{ href: null }} />
      <Tabs.Screen name="language-settings" options={{ href: null }} />
      <Tabs.Screen name="notification-settings" options={{ href: null }} />
      <Tabs.Screen name="conversation" options={{ href: null }} />
      <Tabs.Screen name="backup-restore" options={{ href: null }} />
      <Tabs.Screen name="legal" options={{ href: null }} />
      <Tabs.Screen name="help-about" options={{ href: null }} />
      <Tabs.Screen name="materials" options={{ href: null }} />
      <Tabs.Screen name="documents" options={{ href: null }} />
      <Tabs.Screen name="clients" options={{ href: null }} />
      <Tabs.Screen name="my-profile" options={{ href: null }} />
      <Tabs.Screen name="company-settings" options={{ href: null }} />
      <Tabs.Screen name="new-message" options={{ href: null }} />
    </Tabs>
    </ErrorBoundary>
  );
}
