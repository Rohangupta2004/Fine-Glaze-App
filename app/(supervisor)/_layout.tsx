import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/typography';

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

export default function SupervisorLayout() {
  const { t } = useTranslation();
  return (
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
          },
        };
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('supervisor.home'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={25} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <View style={styles.labelWrap}>
              <Text style={[styles.labelText, { color }]}>{t('supervisor.home')}</Text>
              {focused && <ActiveDot />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: t('supervisor.tasks'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'list' : 'list-outline'} size={25} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <View style={styles.labelWrap}>
              <Text style={[styles.labelText, { color }]}>{t('supervisor.tasks')}</Text>
              {focused && <ActiveDot />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="materials"
        options={{
          title: t('supervisor.materials'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'cube' : 'cube-outline'} size={25} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <View style={styles.labelWrap}>
              <Text style={[styles.labelText, { color }]}>{t('supervisor.materials')}</Text>
              {focused && <ActiveDot />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('supervisor.messages'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={25} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <View style={styles.labelWrap}>
              <Text style={[styles.labelText, { color }]}>{t('supervisor.messages')}</Text>
              {focused && <ActiveDot />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('supervisor.more'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={25} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <View style={styles.labelWrap}>
              <Text style={[styles.labelText, { color }]}>{t('supervisor.more')}</Text>
              {focused && <ActiveDot />}
            </View>
          ),
        }}
      />
      {/* Sub-screens (no tab bar) */}
      <Tabs.Screen name="team-attendance" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="dpr" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="new-message" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="new-group" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="conversation" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="request-employee" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="notifications" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
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
});
