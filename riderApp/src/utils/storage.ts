import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN = 'ACCESS_TOKEN';
const REFRESH_TOKEN = 'REFRESH_TOKEN';

export const saveTokens = async (
  accessToken: string,
  refreshToken: string,
) => {
  await AsyncStorage.setItem(ACCESS_TOKEN, accessToken);
  await AsyncStorage.setItem(REFRESH_TOKEN, refreshToken);
};

export const getAccessToken = async () => {
  return AsyncStorage.getItem(ACCESS_TOKEN);
};

export const getRefreshToken = async () => {
  return AsyncStorage.getItem(REFRESH_TOKEN);
};

export const removeTokens = async () => {
  await AsyncStorage.removeItem(ACCESS_TOKEN);
  await AsyncStorage.removeItem(REFRESH_TOKEN);
};