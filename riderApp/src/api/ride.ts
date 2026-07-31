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
  pickupCoords?: Coordinates,
  destinationCoords?: Coordinates,
) => {
  const response = await api.post('/ride/request', {
    pickup,
    destination,
    fare,
    category,
    pickupLat: pickupCoords?.latitude,
    pickupLng: pickupCoords?.longitude,
    destinationLat: destinationCoords?.latitude,
    destinationLng: destinationCoords?.longitude,
  });
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

export const acceptRide = async (rideId: string) => {
  const response = await api.patch(`/ride/${rideId}/accept`);
  return response.data;
};

export const startRide = async (rideId: string) => {
  const response = await api.patch(`/ride/${rideId}/start`);
  return response.data;
};

export const getAvailableRides = async () => {
  const response = await api.get('/ride/available');
  return response.data;
};

export const cancelRideByDriver = async (rideId: string) => {
  const response = await api.patch(`/ride/${rideId}/driver-cancel`);
  return response.data;
};

export const deleteRideHistory = async (rideId: string) => {
  const response = await api.delete(`/ride/${rideId}`);
  return response.data;
};

export const getActiveRide = async (role: string) => {
  if (role === 'DRIVER') {
    const response = await api.get('/ride/my-trips');
    const rides: any[] = response.data;
    return rides.find(r =>
      ['ACCEPTED', 'DRIVER_ARRIVED', 'STARTED'].includes(r.status)
    ) ?? null;
  } else {
    const response = await api.get('/ride/my-rides');
    const rides: any[] = response.data;
    return rides.find(r =>
      ['PENDING', 'ACCEPTED', 'DRIVER_ARRIVED', 'STARTED'].includes(r.status)
    ) ?? null;
  }
};
