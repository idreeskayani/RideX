import api from './axios';

interface Coordinates {
  latitude: number;
  longitude: number;
}

export type RideCategory = 'MINI' | 'RIDE_AC' | 'PREMIUM';

export const requestRide = async (
  pickup: string,
  destination: string,
  fare: number,
  category: RideCategory,
) => {
  const response = await api.post('/ride/request', { pickup, destination, fare, category });
  return response.data;
};

export const getNearbyDrivers = async (
  coords: Coordinates,
  category: RideCategory,
) => {
  const response = await api.get('/ride/nearby-drivers', {
    params: {
      latitude: coords.latitude,
      longitude: coords.longitude,
      category,
    },
  });
  return response.data;
};

export const cancelRide = async (rideId: string) => {
  const response = await api.patch(`/ride/${rideId}/cancel`);
  return response.data;
};
