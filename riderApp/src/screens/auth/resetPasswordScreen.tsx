import React, { useState } from 'react';
import {
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { verifyResetOtp, resetPassword, forgotPassword } from '../../api/auth';

const ResetPasswordScreen = ({ route, navigation }: any) => {
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const onVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await verifyResetOtp(email, otp);
      setOtpVerified(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const onResetPassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email, otp, newPassword);
      Alert.alert('Success', 'Password reset successfully! Please login.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setResending(true);
    try {
      await forgotPassword(email);
      setOtp('');
      setOtpVerified(false);
      Alert.alert('Sent', 'A new reset code has been sent to your email.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Code sent to <Text style={styles.email}>{email}</Text>
        </Text>

        <CustomInput
          label="Verification Code"
          placeholder="123456"
          value={otp}
          onChangeText={(v: string) => { setOtp(v); setOtpVerified(false); }}
          keyboardType="number-pad"
          maxLength={6}
          editable={!otpVerified}
        />

        {!otpVerified ? (
          <>
            <CustomButton
              title="Verify Code"
              onPress={onVerifyOtp}
              loading={loading}
              style={{ marginTop: 8 }}
            />
            <CustomButton
              title="Resend Code"
              variant="ghost"
              onPress={onResend}
              loading={resending}
            />
          </>
        ) : (
          <>
            <CustomInput
              label="New Password"
              placeholder="••••••••"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <CustomInput
              label="Confirm Password"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <CustomButton
              title="Reset Password"
              onPress={onResetPassword}
              loading={loading}
              style={{ marginTop: 8 }}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ResetPasswordScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: '#aaa', fontSize: 16, marginBottom: 32 },
  email: { color: '#2563eb', fontWeight: '600' },
});
