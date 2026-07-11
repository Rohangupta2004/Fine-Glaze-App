import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/typography';
import { useOutboxSync } from '../../src/hooks/useOutboxSync';

export default function WorkerLayout() {
  const { t } = useTranslation();
  useOutboxSync();

  return (
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
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('worker.home'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: t('worker.myTasks'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkbox-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dpr"
        options={{
          title: t('worker.dpr'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={32} color={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: t('worker.attendance'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('worker.more'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu-outline" size={size} color={color} />
          ),
        }}
      />
      {['my-site', 'documents', 'leave-request', 'safety-checklist', 'messages', 'profile', 'offline-sync'].map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
      <Tabs.Screen name="punch-in/index" options={{ href: null }} />
    </Tabs>
  );
}
