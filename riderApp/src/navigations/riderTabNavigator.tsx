import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';

import HomeScreen from '../screens/home/homeScreen';
import HistoryScreen from '../screens/history/historyScreen';
import NotificationScreen from '../screens/notification/notificationScreen';
import ProfileScreen from '../screens/profile/profileScreen';

const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'Home',          component: HomeScreen,         icon: '🏠', label: 'Home' },
  { name: 'History',       component: HistoryScreen,      icon: '🕐', label: 'History' },
  { name: 'Notifications', component: NotificationScreen, icon: '🔔', label: 'Alerts' },
  { name: 'Profile',       component: ProfileScreen,      icon: '👤', label: 'Profile' },
];

export default function RiderTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) => {
          const tab = TABS.find(t => t.name === route.name)!;
          return (
            <View style={[styles.tabItem, focused && styles.tabItemActive]}>
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </View>
          );
        },
      })}
    >
      {TABS.map(tab => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
  },
  tabItemActive: {
    backgroundColor: '#F3F4F6',
  },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 2, fontWeight: '500' },
  tabLabelActive: { color: '#111827', fontWeight: '700' },
});
