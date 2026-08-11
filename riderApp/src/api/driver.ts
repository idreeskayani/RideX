import api from './axios';

export const registerDriver = async (data: {
  cnic: string;
  licenseNumber: string;
  vehicleType: string;
  vehicleModel: string;
  vehicleNumber: string;
  licenseImage?: { uri: string; name: string; type: string };
  cnicImage?: { uri: string; name: string; type: string };
  selfieImage?: { uri: string; name: string; type: string };
}) => {
  const form = new FormData();
  form.append('cnic', data.cnic);
  form.append('licenseNumber', data.licenseNumber);
  form.append('vehicleType', data.vehicleType);
  form.append('vehicleModel', data.vehicleModel);
  form.append('vehicleNumber', data.vehicleNumber);
  if (data.licenseImage) form.append('licenseImage', data.licenseImage as any);
  if (data.cnicImage) form.append('cnicImage', data.cnicImage as any);
  if (data.selfieImage) form.append('selfieImage', data.selfieImage as any);
  const response = await api.post('/driver/register', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getDriverProfile = async () => {
  const response = await api.get('/driver/profile');
  return response.data;
};

export const hasDriverProfile = async (): Promise<boolean> => {
  try {
    await api.get('/driver/profile');
    return true;
  } catch {
    return false;
  }
};

export const updateDriverProfile = async (data: {
  vehicleType?: string;
  vehicleModel?: string;
  vehicleNumber?: string;
}) => {
  const response = await api.patch('/driver/profile', data);
  return response.data;
};
