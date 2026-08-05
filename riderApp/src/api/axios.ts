import axios from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  removeTokens,
} from '../utils/storage';

const api = axios.create({
  baseURL: 'http://192.168.100.22:3000',
});

api.interceptors.request.use(async config => {
  const token = await getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  response => response,

  async error => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = await getRefreshToken();

       const response = await axios.post(
  'http://192.168.100.22:3000/auth/refresh',
  {
    refreshToken,
  },
);

        await saveTokens(
          response.data.accessToken,
          response.data.refreshToken,
        );

        originalRequest.headers.Authorization =
          `Bearer ${response.data.accessToken}`;

        return api(originalRequest);
      } catch (e) {
        await removeTokens();

        return Promise.reject(e);
      }
    }

    return Promise.reject(error);
  },
);

export default api;