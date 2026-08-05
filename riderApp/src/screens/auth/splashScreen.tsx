// src/screens/auth/splashScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getAccessToken } from '../../utils/storage';
import { jwtDecode } from 'jwt-decode';
import { getActiveRide } from '../../api/ride';
import { navigateToActiveRide } from '../../utils/navigateToActiveRide';

interface JwtPayload {
  exp: number;
  role?: string;
}

const SplashScreen = ({ navigation }: any) => {
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    await new Promise<void>(resolve => setTimeout(() => resolve(), 1800));

    try {
      const token = await getAccessToken();
      if (!token) { navigation.replace('Auth'); return; }

      const decoded = jwtDecode<JwtPayload>(token);
      const isExpired = decoded.exp * 1000 < Date.now();
      if (isExpired) { navigation.replace('Auth'); return; }

      const role = decoded.role ?? 'RIDER';
      try {
        const activeRide = await getActiveRide(role);
        if (!navigateToActiveRide(navigation, activeRide, role)) {
          navigation.replace('Main', { role });
        }
      } catch {
        navigation.replace('Main', { role });
      }
    } catch {
      navigation.replace('Auth');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>RideX 🚕</Text>
      <ActivityIndicator
        size="large"
        color="#FFD60A"
        style={{ marginTop: 24 }}
      />
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: 1,
  },
});