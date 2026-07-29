// src/screens/auth/splashScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getAccessToken } from '../../utils/storage';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  exp: number;
}

const SplashScreen = ({ navigation }: any) => {
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // minimum splash time
    await new Promise<void>(resolve => setTimeout(() => resolve(), 1800));

    try {
      const token = await getAccessToken();

      if (!token) {
        navigation.replace('Auth');
        return;
      }

      const decoded = jwtDecode<JwtPayload>(token);
      const isExpired = decoded.exp * 1000 < Date.now();

      navigation.replace(isExpired ? 'Auth' : 'Main');
    } catch (e) {
      // invalid token
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