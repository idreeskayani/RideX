// src/screens/auth/loginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { login } from '../../api/auth';
import { saveTokens } from '../../utils/storage';
import { jwtDecode } from 'jwt-decode';
import { getActiveRide } from '../../api/ride';
import { navigateToActiveRide } from '../../utils/navigateToActiveRide';

interface JwtPayload { role?: string; }

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    setLoading(true);

    try {
      const data = await login(email, password);
      await saveTokens(data.accessToken, data.refreshToken);
      const decoded = jwtDecode<JwtPayload>(data.accessToken);
      const role = decoded.role ?? 'RIDER';

      if (role === 'ADMIN') {
        navigation.getParent()?.replace('Main', { role });
        return;
      }

      try {
        const activeRide = await getActiveRide(role);
        if (!navigateToActiveRide(navigation.getParent(), activeRide, role)) {
          navigation.getParent()?.replace('Main', { role });
        }
      } catch {
        navigation.getParent()?.replace('Main', { role });
      }
    } catch (error: any) {
      setLoading(false);
      const message: string = error.response?.data?.message ?? '';

      if (message.toLowerCase().includes('verify your email')) {
        navigation.navigate('VerifyEmail', { email: email.trim() });
        return;
      }

      Alert.alert('Login Failed', message || error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Login to RideX</Text>

        <CustomInput
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <CustomInput
          label="Password"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <CustomButton
          title="Login"
          onPress={onLogin}
          loading={loading}
          style={{ marginTop: 8 }}
        />

        <CustomButton
          title="Forgot Password?"
          variant="ghost"
          onPress={() => navigation.navigate('ForgotPassword')}
        />

        <CustomButton
          title="Create Account"
          variant="outline"
          onPress={() => navigation.navigate('Register')}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: '#aaa',
    fontSize: 16,
    marginBottom: 32,
  },
});