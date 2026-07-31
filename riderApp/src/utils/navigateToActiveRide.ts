import { store } from '../redux/store';
import { setRideLocations, setRideId } from '../redux/rideSlice';

/**
 * Given an active ride object and the root navigation ref,
 * navigates to the correct screen and restores redux ride state.
 * Returns true if it navigated, false if no active ride.
 */
export function navigateToActiveRide(navigation: any, ride: any, role: string): boolean {
  if (!ride) return false;

  // Restore ride coords into redux so map screens work
  if (ride.pickupLat && ride.pickupLng) {
    store.dispatch(setRideLocations({
      pickup: { latitude: ride.pickupLat, longitude: ride.pickupLng },
      destination: ride.destinationLat && ride.destinationLng
        ? { latitude: ride.destinationLat, longitude: ride.destinationLng }
        : { latitude: 0, longitude: 0 },
    }));
  }
  store.dispatch(setRideId(ride.id));

  // Navigate to Main first, then to the right screen
  if (role === 'DRIVER') {
    switch (ride.status) {
      case 'ACCEPTED':
      case 'DRIVER_ARRIVED':
        navigation.replace('Main', { role: 'DRIVER', screen: 'DriverRide', params: {
          rideId: ride.id,
          rideStatus: ride.status,
          ride: {
            pickup: ride.pickup,
            destination: ride.destination,
            fare: ride.fare,
            pickupLat: ride.pickupLat,
            pickupLng: ride.pickupLng,
            destinationLat: ride.destinationLat,
            destinationLng: ride.destinationLng,
            rider: ride.rider,
          },
        }});
        return true;
      case 'STARTED':
        navigation.replace('Main', { role: 'DRIVER', screen: 'DriverStarted', params: {
          rideId: ride.id,
          ride: {
            pickup: ride.pickup,
            destination: ride.destination,
            fare: ride.fare,
            pickupLat: ride.pickupLat,
            pickupLng: ride.pickupLng,
            destinationLat: ride.destinationLat,
            destinationLng: ride.destinationLng,
            rider: ride.rider,
          },
        }});
        return true;
    }
  } else {
    // RIDER
    switch (ride.status) {
      case 'PENDING':
        navigation.replace('Main', { role: 'RIDER', screen: 'RideSearching', params: { rideId: ride.id } });
        return true;
      case 'ACCEPTED':
        navigation.replace('Main', { role: 'RIDER', screen: 'RideAccepted', params: { rideId: ride.id } });
        return true;
      case 'DRIVER_ARRIVED':
        navigation.replace('Main', { role: 'RIDER', screen: 'DriverArrived', params: { rideId: ride.id, ride } });
        return true;
      case 'STARTED':
        navigation.replace('Main', { role: 'RIDER', screen: 'RideStarted', params: { rideId: ride.id, ride } });
        return true;
    }
  }

  return false;
}
