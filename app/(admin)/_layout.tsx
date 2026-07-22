import React, { useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Text, Modal, TouchableWithoutFeedback, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors } from '../../src/theme/colors';
import { fontFamily, typography } from '../../src/theme/typography';
import { spacing, radius, shadows } from '../../src/theme/spacing';
import { useAuthStore } from '../../src/stores/authStore';
import { useUnreadCount } from '../../src/hooks/useNotifications';

const ACTIONS = [
  { icon: 'person-add', label: 'Add Employee', route: '/(admin)/add-employee' },
  { icon: 'business', label: 'New Project', route: '/(admin)/create-project' },
  { icon: 'list', label: 'Create Task', route: '/create-task' },
  { icon: 'cube', label: 'Request Material', route: '/(admin)/projects?intent=material' },
  { icon: 'document-text', label: 'Submit DPR', route: '/(admin)/projects?intent=dpr' },
  { icon: 'cash', label: 'Add Payment', route: '/(admin)/projects?intent=payment' },
];

/** Gradient background rendered behind the tab bar */
function TabBarBackground() {
  return (
    <LinearGradient
      colors={['#FFFFFF', '#FDFBF7']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: 24,
        }
      ]}
    />
  );
}

/** Glowing active indicator pill under the active tab icon */
function ActiveDot() {
  return (
    <View style={styles.activeDot} />
  );
}

export default function AdminLayout() {
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
        screenOptions={({ route }) => {
          return {
            headerShown: false,
            tabBarActiveTintColor: '#695030',
            tabBarInactiveTintColor: colors.neutral[400],
            tabBarBackground: () => <TabBarBackground />,
            tabBarStyle: {
              display: 'flex',
              position: 'absolute',
              bottom: 16,
              left: 16,
              right: 16,
              backgroundColor: 'transparent',
              borderTopWidth: 0,
              elevation: 15,
              height: 72,
              paddingBottom: 12,
              paddingTop: 10,
              borderRadius: 24,
              boxShadow: '0px 10px 30px rgba(139, 104, 64, 0.15)',
            } as any,
            tabBarLabelStyle: {
              fontFamily: fontFamily.semiBold,
              fontSize: 10,
              letterSpacing: 0.3,
            },
          };
        }}
      >
        {/* ── Visible tabs ── */}
        <Tabs.Screen
          name="home"
          options={{
            title: t('admin.home'),
            tabBarIcon: ({ color, size, focused }) => (
              <View style={styles.iconWrap}>
                <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
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
                <Ionicons name={focused ? 'business' : 'business-outline'} size={22} color={color} />
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
                colors={isAddMenuOpen ? ['#F9F9F9', '#F0F0F0'] : ['#FFFFFF', 'rgba(255,255,255,0.7)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addBtn}
              >
                <Ionicons name={isAddMenuOpen ? "close" : "add"} size={28} color="#6A4E36" />
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
                <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={22} color={color} />
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
                <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
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

        {/* ── Hidden screens — navigated to via router.push, not shown in tab bar ── */}
        <Tabs.Screen name="employees" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="employee-profile" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="add-employee" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="approvals" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="notifications" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="project-workspace" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="create-project" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="recurring-tasks" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="project-qr" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="assign-site" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="employee-requests" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="import-boq" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="global-search" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="calendar" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="dpr-management" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="analytics" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="attendance-report" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="audit-log" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="all-sites" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="roles-permissions" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="language-settings" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="notification-settings" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="conversation" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="backup-restore" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="legal" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="help-about" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="materials" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="documents" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="clients" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="my-profile" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="company-settings" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="new-message" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="new-group" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="quote-calculator" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="personal-todos" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="quick-tools" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      </Tabs>

      {/* Add Menu Popup Overlay */}
      <Modal visible={isAddMenuOpen} transparent animationType="fade" onRequestClose={() => setIsAddMenuOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsAddMenuOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
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
                      activeOpacity={0.7}
                    >
                      <LinearGradient 
                        colors={['rgba(255,255,255,1)', 'rgba(255,255,255,0.4)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.popupIcon, { borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' }]}
                      >
                        <Ionicons name={action.icon as any} size={20} color="#6A4E36" />
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
    width: 24,
    height: 24,
  },
  labelWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  labelText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  activeDot: {
    width: 16,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#695030',
    marginTop: 4,
    position: 'absolute',
    bottom: -8,
  },
  addBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16, // push up slightly
    shadowColor: '#695030',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 3,
    borderColor: '#F9F9F8', // matches brand background
  },
  addBtnActive: {
    shadowColor: colors.ink,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FAF8F5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 24, 21, 0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 110, // above tab bar
  },
  popupMenu: {
    width: '90%',
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
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupLabel: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    color: colors.neutral[700],
    textAlign: 'center',
  },
});
