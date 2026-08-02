import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../../src/theme/colors';
import { fontFamily } from '../../../src/theme/typography';
import { useOutboxSync } from '../../../src/hooks/useOutboxSync';

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

export default function WorkerTabsLayout() {
  const { t } = useTranslation();
  useOutboxSync();

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
          tabBarHideOnKeyboard: true,
        };
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <View style={styles.labelWrap}>
              <Text style={[styles.labelText, { color }]} numberOfLines={1}>Home</Text>
              {focused && <ActiveDot />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'checkbox' : 'checkbox-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <View style={styles.labelWrap}>
              <Text style={[styles.labelText, { color }]} numberOfLines={1}>Tasks</Text>
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
          title: 'Logs',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <View style={styles.labelWrap}>
              <Text style={[styles.labelText, { color }]} numberOfLines={1}>Logs</Text>
              {focused && <ActiveDot />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <View style={styles.labelWrap}>
              <Text style={[styles.labelText, { color }]} numberOfLines={1}>Chat</Text>
              {focused && <ActiveDot />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <View style={styles.labelWrap}>
              <Text style={[styles.labelText, { color }]} numberOfLines={1}>More</Text>
              {focused && <ActiveDot />}
            </View>
          ),
        }}
      />
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
    fontSize: 10,
    letterSpacing: 0,
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
  dprBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#695030',
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
  dprBtnActive: {
    backgroundColor: colors.ink,
    shadowColor: colors.ink,
  },
});
