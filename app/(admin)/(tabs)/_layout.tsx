import React, { useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Text, Modal, TouchableWithoutFeedback, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors } from '../../../src/theme/colors';
import { fontFamily, typography } from '../../../src/theme/typography';
import { spacing, radius, shadows } from '../../../src/theme/spacing';
import { useAuthStore } from '../../../src/stores/authStore';
import { useUnreadCount } from '../../../src/hooks/useNotifications';

const ACTIONS = [
  { icon: 'person-add-sharp', label: 'Add Employee', route: '/(admin)/add-employee', colors: ['#2563EB', '#3B82F6'] },
  { icon: 'business-sharp', label: 'New Project', route: '/(admin)/create-project', colors: ['#059669', '#10B981'] },
  { icon: 'checkbox-sharp', label: 'Create Task', route: '/create-task', colors: ['#D97706', '#F59E0B'] },
  { icon: 'cube-sharp', label: 'Request Material', route: '/(admin)/projects?intent=material', colors: ['#E11D48', '#F43F5E'] },
  { icon: 'wallet-sharp', label: 'Add Payment', route: '/(admin)/projects?intent=payment', colors: ['#7C3AED', '#8B5CF6'] },
];

function TabBarBackground() {
  return (
    <LinearGradient
      colors={['#FFFFFF', '#FDFBF7']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: 28,
        }
      ]}
    />
  );
}

function ActiveDot() {
  return (
    <View style={styles.activeDot} />
  );
}

export default function AdminTabsLayout() {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const { data: unreadCount } = useUnreadCount(profile?.id);
  const router = useRouter();
  
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const handleAction = (route: string) => {
    setIsAddMenuOpen(false);
    setTimeout(() => {
      router.push(route as any);
    }, 100);
  };

  return (
    <>
      <Tabs
        backBehavior="history"
        screenOptions={({ route }) => {
          return {
            headerShown: false,
            tabBarActiveTintColor: '#695030',
            tabBarInactiveTintColor: colors.neutral[400],
            tabBarBackground: () => <TabBarBackground />,
            tabBarStyle: {
              display: 'flex',
              position: 'absolute',
              bottom: 12,
              left: 12,
              right: 12,
              backgroundColor: 'transparent',
              borderTopWidth: 0,
              elevation: 18,
              height: 82,
              paddingBottom: 14,
              paddingTop: 10,
              borderRadius: 28,
              boxShadow: '0px 12px 36px rgba(139, 104, 64, 0.18)',
            } as any,
            tabBarLabelStyle: {
              fontFamily: fontFamily.semiBold,
              fontSize: 11.5,
              letterSpacing: 0.2,
            },
          };
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: t('admin.home'),
            tabBarIcon: ({ color, size, focused }) => (
              <View style={styles.iconWrap}>
                <Ionicons name={focused ? 'grid' : 'grid-outline'} size={24} color={color} />
              </View>
            ),
            tabBarLabel: ({ color, focused }) => (
              <View style={styles.labelWrap}>
                <Text style={[{ color }, styles.labelText]}>{t('admin.home')}</Text>
                {focused && <ActiveDot />}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="projects"
          options={{
            title: t('admin.projects'),
            tabBarIcon: ({ color, size, focused }) => (
              <View style={styles.iconWrap}>
                <Ionicons name={focused ? 'business-sharp' : 'business-outline'} size={24} color={color} />
              </View>
            ),
            tabBarLabel: ({ color, focused }) => (
              <View style={styles.labelWrap}>
                <Text style={[{ color }, styles.labelText]}>{t('admin.projects')}</Text>
                {focused && <ActiveDot />}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setIsAddMenuOpen(!isAddMenuOpen);
            },
          }}
          options={{
            title: '',
            tabBarIcon: ({ focused }) => (
              <LinearGradient 
                colors={isAddMenuOpen ? ['#F9F9F9', '#EAE6DF'] : ['#5B4122', '#8B6840', '#A88454']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addBtn}
              >
                <Ionicons name={isAddMenuOpen ? "close" : "add"} size={30} color={isAddMenuOpen ? "#695030" : "#FFFFFF"} />
              </LinearGradient>
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: t('admin.messages'),
            tabBarIcon: ({ color, size, focused }) => (
              <View style={styles.iconWrap}>
                <Ionicons name={focused ? 'chatbox-ellipses-sharp' : 'chatbox-ellipses-outline'} size={24} color={color} />
              </View>
            ),
            tabBarLabel: ({ color, focused }) => (
              <View style={styles.labelWrap}>
                <Text style={[{ color }, styles.labelText]}>{t('admin.messages')}</Text>
                {focused && <ActiveDot />}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: t('admin.more'),
            tabBarIcon: ({ color, size, focused }) => (
              <View style={styles.iconWrap}>
                <Ionicons name={focused ? 'apps-sharp' : 'apps-outline'} size={24} color={color} />
              </View>
            ),
            tabBarLabel: ({ color, focused }) => (
              <View style={styles.labelWrap}>
                <Text style={[{ color }, styles.labelText]}>{t('admin.more')}</Text>
                {focused && <ActiveDot />}
              </View>
            ),
          }}
        />
      </Tabs>

      {/* Add Menu Popup Overlay */}
      <Modal visible={isAddMenuOpen} transparent animationType="fade" onRequestClose={() => setIsAddMenuOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsAddMenuOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <LinearGradient
                colors={['rgba(255,255,255,0.98)', 'rgba(253,251,247,0.95)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.popupMenu}
              >
                <Text style={styles.popupTitle}>Quick Actions</Text>
                <View style={styles.popupGrid}>
                  {ACTIONS.map((action, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.popupAction}
                      onPress={() => handleAction(action.route)}
                      activeOpacity={0.75}
                    >
                      <LinearGradient 
                        colors={action.colors as [string, string]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.popupIcon, { boxShadow: '0px 6px 16px rgba(0,0,0,0.18)' } as any]}
                      >
                        <Ionicons name={action.icon as any} size={22} color="#FFFFFF" />
                      </LinearGradient>
                      <Text style={styles.popupLabel}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </LinearGradient>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  labelWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  labelText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11.5,
    letterSpacing: 0.2,
  },
  activeDot: {
    width: 18,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#695030',
    marginTop: 4,
    position: 'absolute',
    bottom: -9,
  },
  addBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#695030',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderWidth: 3.5,
    borderColor: '#FAF8F5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 24, 21, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 120,
  },
  popupMenu: {
    width: '92%',
    borderRadius: radius['2xl'],
    padding: spacing.xl,
    ...shadows.xl,
  },
  popupTitle: {
    ...typography.h5,
    color: colors.ink,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  popupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    justifyContent: 'space-between',
  },
  popupAction: {
    width: '30%',
    alignItems: 'center',
    gap: spacing.sm,
  },
  popupIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupLabel: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[800],
    textAlign: 'center',
  },
});
