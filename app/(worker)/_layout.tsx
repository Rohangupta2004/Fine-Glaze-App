import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/typography';
import { useOutboxSync } from '../../src/hooks/useOutboxSync';

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

/** Glowing active indicator pill under active tab */
function ActiveDot() {
  return (
    <View style={styles.activeDot} />
  );
}

export default function WorkerLayout() {
  const { t } = useTranslation();
  useOutboxSync();

  return (
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
            fontFamily: fontFamily.medium,
            fontSize: 10,
          },
          tabBarHideOnKeyboard: true,
        };
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('worker.home'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <View style={styles.labelWrap}>
              <Text style={[styles.labelText, { color }]}>{t('worker.home')}</Text>
              {focused && <ActiveDot />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: t('worker.myTasks'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'checkbox' : 'checkbox-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <View style={styles.labelWrap}>
              <Text style={[styles.labelText, { color }]}>{t('worker.myTasks')}</Text>
              {focused && <ActiveDot />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="dpr"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.dprBtn, focused && styles.dprBtnActive]}>
              <Ionicons name="document-text" size={24} color="#FFFFFF" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: t('worker.attendance'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <View style={styles.labelWrap}>
              <Text style={[styles.labelText, { color }]}>{t('worker.attendance')}</Text>
              {focused && <ActiveDot />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('worker.messages') || 'Messages',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <View style={styles.labelWrap}>
              <Text style={[styles.labelText, { color }]}>{t('worker.messages') || 'Messages'}</Text>
              {focused && <ActiveDot />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('worker.more'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <View style={styles.labelWrap}>
              <Text style={[styles.labelText, { color }]}>{t('worker.more')}</Text>
              {focused && <ActiveDot />}
            </View>
          ),
        }}
      />
      {['my-site', 'documents', 'leave-request', 'safety-checklist', 'profile', 'offline-sync', 'new-message', 'conversation', 'notifications'].map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null, tabBarStyle: { display: 'none' } }} />
      ))}
      <Tabs.Screen name="punch-in/index" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  labelWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  labelText: {
    fontFamily: fontFamily.medium,
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
  dprBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#695030',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16, // push up slightly
    shadowColor: '#695030',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 3,
    borderColor: '#F9F9F8', // matches background to look like it cuts into the bar
  },
  dprBtnActive: {
    backgroundColor: colors.ink,
    shadowColor: colors.ink,
  },
});
