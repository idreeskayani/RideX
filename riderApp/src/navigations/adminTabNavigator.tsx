import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, StyleSheet } from 'react-native';

import AdminDashboardScreen from '../screens/admin/adminDashboardScreen';
import AdminDriversScreen from '../screens/admin/adminDriversScreen';
import AdminUsersScreen from '../screens/admin/adminUsersScreen';
import ProfileScreen from '../screens/profile/profileScreen';

const Tab = createBottomTabNavigator();
const DashStack = createNativeStackNavigator();

function DashboardStack() {
  return (
    <DashStack.Navigator screenOptions={{ headerShown: false }}>
      <DashStack.Screen name="AdminDashboardHome" component={AdminDashboardScreen} />
      <DashStack.Screen name="AdminDrivers" component={AdminDriversScreen} />
      <DashStack.Screen name="AdminUsers" component={AdminUsersScreen} />
    </DashStack.Navigator>
  );
}

const TABS = [
  { name: 'Dashboard', component: DashboardStack,      icon: '📊', label: 'Dashboard' },
  { name: 'Drivers',   component: AdminDriversScreen,  icon: '🚗', label: 'Drivers' },
  { name: 'Users',     component: AdminUsersScreen,    icon: '👥', label: 'Users' },
  { name: 'Profile',   component: ProfileScreen,       icon: '👤', label: 'Profile' },
];

export default function AdminTabNavigator() {
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
              <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{tab.label}</Text>
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
    backgroundColor: '#111827', borderTopWidth: 0,
    height: 64, paddingBottom: 8, paddingTop: 8,
    elevation: 12, shadowColor: '#000', shadowOpacity: 0.2,
    shadowRadius: 12, shadowOffset: { width: 0, height: -4 },
  },
  tabItem: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 12, minWidth: 60,
  },
  tabItemActive: { backgroundColor: '#1F2937' },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 10, color: '#6B7280', marginTop: 2, fontWeight: '500' },
  tabLabelActive: { color: '#FFFFFF', fontWeight: '700' },
});
