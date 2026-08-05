import api from './axios';

export const registerDriver = async (data: {
  cnic: string;
  licenseNumber: string;
  vehicleType: string;
  vehicleModel: string;
  vehicleNumber: string;
}) => {
  const response = await api.post('/driver/register', data);
  return response.data;
};

export const getDriverProfile = async () => {
  const response = await api.get('/driver/profile');
  return response.data;
};
