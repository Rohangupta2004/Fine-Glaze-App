import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/typography';

export default function ClientLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => {
        return {
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.neutral[400],
          tabBarStyle: {
            display: 'flex',
            backgroundColor: colors.white,
            borderTopColor: colors.neutral[200],
            elevation: 15,
            height: 72,
            paddingBottom: 12,
            paddingTop: 10,
            borderRadius: 24,
            boxShadow: '0px 10px 30px rgba(139, 104, 64, 0.15)',
          },
          tabBarLabelStyle: {
            fontFamily: fontFamily.medium,
            fontSize: 11,
          },
        };
      }}
    >
      {/* ── Visible 5-tab structure ── */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="updates"
        options={{
          title: 'Updates',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="images-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documents',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="folder-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Payments',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card-outline" size={size} color={color} />
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

      {/* ── Stack-hidden routes (no tab bar entry) ── */}
      <Tabs.Screen
        name="approvals"
        options={{
          href: null, // hide from tab bar
          title: 'Approvals',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          href: null, // hide from tab bar
          title: 'Project Chat',
        }}
      />
      <Tabs.Screen name="materials" options={{ href: null }} />
      <Tabs.Screen name="new-message" options={{ href: null }} />
      <Tabs.Screen name="conversation" options={{ href: null }} />
    </Tabs>
  );
}
