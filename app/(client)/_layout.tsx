import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/typography';

export default function ClientLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      backBehavior="history"
      screenOptions={({ route }) => {
        return {
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.neutral[400],
          tabBarStyle: {
            display: 'flex',
            backgroundColor: colors.white,
            borderTopColor: colors.neutral[200],
            elevation: 18,
            height: 82,
            paddingBottom: 14,
            paddingTop: 10,
            borderRadius: 28,
            boxShadow: '0px 12px 36px rgba(139, 104, 64, 0.18)',
          },
          tabBarLabelStyle: {
            fontFamily: fontFamily.semiBold,
            fontSize: 11.5,
          },
        };
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('client.home'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="grid-outline" size={25} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="updates"
        options={{
          title: t('client.updates'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="images-outline" size={25} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: t('client.documents'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="folder-outline" size={25} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: t('client.payments'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="card-outline" size={25} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('client.more'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="menu-outline" size={25} color={color} />
          ),
        }}
      />

      <Tabs.Screen name="approvals" options={{ href: null, title: 'Approvals' }} />
      <Tabs.Screen name="chat" options={{ href: null, title: 'Project Chat' }} />
      <Tabs.Screen name="materials" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="new-message" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="conversation" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}
