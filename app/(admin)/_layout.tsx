import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/colors';
import { fontFamily, typography } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { usePushNotifications } from '../../src/hooks/usePushNotifications';
import { useOutboxSync } from '../../src/hooks/useOutboxSync';

/* Speed-dial items for the + button */
const SPEED_DIAL = [
  { icon: 'business-outline', label: 'New Project', route: '/(admin)/create-project', color: colors.primary },
  { icon: 'person-add-outline', label: 'Add Employee', route: '/(admin)/add-employee', color: '#6366F1' },
  { icon: 'document-text-outline', label: 'Submit DPR', route: '/(admin)/dpr-management', color: '#D97706' },
  { icon: 'people-outline', label: 'Add Client', route: '/(admin)/clients', color: '#EF4444' },
  { icon: 'chatbubble-outline', label: 'New Chat', route: '/(admin)/new-message', color: '#10B981' },
];

function SpeedDial({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <Pressable style={styles.dialOverlay} onPress={onClose}>
        <View style={[styles.dialMenu, { bottom: 80 + insets.bottom }]}>
          {SPEED_DIAL.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.dialItem}
              onPress={() => {
                onClose();
                router.push(item.route as any);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.dialIcon, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={styles.dialLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Floating close/X on the + position */}
        <View style={[styles.dialCloseWrap, { bottom: 20 + insets.bottom }]}>
          <View style={styles.dialCloseBtn}>
            <Ionicons name="close" size={28} color={colors.white} />
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

export default function AdminLayout() {
  usePushNotifications();
  useOutboxSync();
  const [speedDialOpen, setSpeedDialOpen] = useState(false);

  return (
    <ErrorBoundary label="Admin">
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.neutral[100],
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 4,
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
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarIcon: () => (
            <View style={styles.plusCircle}>
              <Ionicons name="add" size={28} color={colors.white} />
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            setSpeedDialOpen(true);
          },
        }}
      />
      <Tabs.Screen
        name="dpr-management"
        options={{
          title: 'DPR',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'apps' : 'apps-outline'} size={22} color={color} />
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
      <Tabs.Screen name="chat" options={{ href: null }} />
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
    <SpeedDial visible={speedDialOpen} onClose={() => setSpeedDialOpen(false)} />
    </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  plusCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  /* Speed Dial */
  dialOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  dialMenu: {
    position: 'absolute',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingRight: spacing.xl,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    minWidth: 180,
  },
  dialIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialLabel: {
    ...typography.bodyMedium,
    fontFamily: fontFamily.semiBold,
    color: colors.ink,
  },
  dialCloseWrap: {
    position: 'absolute',
    alignSelf: 'center',
  },
  dialCloseBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral[700],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
