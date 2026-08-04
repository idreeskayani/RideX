import api from './axios';
import {
  getRefreshToken,
  removeTokens,
} from '../utils/storage';

export const login = async (
  email: string,
  password: string,
) => {
  const response = await api.post('/auth/login', {
    email,
    password,
  });

  return response.data;
};

export const register = async (data: any) => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

export const verifyEmail = async (email: string, otp: string) => {
  const response = await api.post('/auth/verify-email', { email, otp });
  return response.data;
};

export const resendOtp = async (email: string) => {
  const response = await api.post('/auth/resend-otp', { email });
  return response.data;
};

export const forgotPassword = async (email: string) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const verifyResetOtp = async (email: string, otp: string) => {
  const response = await api.post('/auth/verify-reset-otp', { email, otp });
  return response.data;
};

export const resetPassword = async (email: string, otp: string, newPassword: string) => {
  const response = await api.post('/auth/reset-password', { email, otp, newPassword });
  return response.data;
};

export const logout = async () => {
  const refreshToken = await getRefreshToken();

  await api.post('/auth/logout', {
    refreshToken,
  });

  await removeTokens();
};