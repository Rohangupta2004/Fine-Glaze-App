import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/typography';

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

export default function SupervisorLayout() {
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
            shadowColor: '#8B6840',
            shadowOpacity: 0.15,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 6 },
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
              <Text style={[styles.labelText, { color }]}>Home</Text>
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
            <Ionicons name={focused ? 'list' : 'list-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <View style={styles.labelWrap}>
              <Text style={[styles.labelText, { color }]}>Tasks</Text>
              {focused && <ActiveDot />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="materials"
        options={{
          title: 'Materials',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'cube' : 'cube-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <View style={styles.labelWrap}>
              <Text style={[styles.labelText, { color }]}>Materials</Text>
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
              <Text style={[styles.labelText, { color }]}>More</Text>
              {focused && <ActiveDot />}
            </View>
          ),
        }}
      />
      {/* Sub-screens (no tab bar) */}
      <Tabs.Screen
        name="team-attendance"
        options={{
          href: null, // not in tab bar
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="dpr"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="new-message" options={{ href: null }} />
      <Tabs.Screen name="conversation" options={{ href: null }} />
      <Tabs.Screen name="request-employee" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
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
});
