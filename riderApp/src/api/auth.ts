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

export const logout = async () => {
  const refreshToken = await getRefreshToken();

  await api.post('/auth/logout', {
    refreshToken,
  });

  await removeTokens();
};