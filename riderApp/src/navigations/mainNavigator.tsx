import React, { useEffect, useRef, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Geolocation from '@react-native-community/geolocation';
import { connectSocket } from '../services/socket';
import { getDriverProfile } from '../api/driver';

import RiderTabNavigator from './riderTabNavigator';
import DriverTabNavigator from './driverTabNavigator';
import AdminTabNavigator from './adminTabNavigator';
import RideSearchingScreen from '../screens/ride/rideSearchingScreen';
import RideAcceptedScreen from '../screens/ride/rideAcceptedScreen';
import DriverArrivedScreen from '../screens/ride/DriverArrivedScreen';
import RideStartedScreen from '../screens/ride/rideStartedScreen';
import RatingScreen from '../screens/rating/ratingScreen';
import DriverRideScreen from '../screens/ride/DriverRideScreen';
import DriverStartedScreen from '../screens/ride/DriverStartedScreen';
import DriverRegisterScreen from '../screens/home/driverRegisterScreen';
import ChatScreen from '../screens/ride/chatScreen';

const RiderStack = createNativeStackNavigator();
const DriverStack = createNativeStackNavigator();

function RiderNavigator({ initialScreen, initialParams }: { initialScreen?: string; initialParams?: any }) {
  const stackRef = useRef<any>(null);
  const didNavigate = useRef(false);

  useEffect(() => {
    if (!initialScreen || initialScreen === 'Tabs' || didNavigate.current) return;
    didNavigate.current = true;
    // Wait one frame for the stack to mount before navigating
    const t = setTimeout(() => {
      stackRef.current?.navigate(initialScreen, initialParams);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <RiderStack.Navigator
      ref={stackRef}
      screenOptions={{ headerShown: false }}
    >
      <RiderStack.Screen name="Tabs"          component={RiderTabNavigator} />
      <RiderStack.Screen name="RideSearching" component={RideSearchingScreen} />
      <RiderStack.Screen name="RideAccepted"  component={RideAcceptedScreen} />
      <RiderStack.Screen name="DriverArrived" component={DriverArrivedScreen} />
      <RiderStack.Screen name="RideStarted"   component={RideStartedScreen} />
      <RiderStack.Screen name="Rating"        component={RatingScreen} />
      <RiderStack.Screen name="Chat"          component={ChatScreen} />
    </RiderStack.Navigator>
  );
}

function DriverNavigator({ initialScreen, initialParams }: { initialScreen?: string; initialParams?: any }) {
  const stackRef = useRef<any>(null);
  const didNavigate = useRef(false);
  const [isOnline, setIsOnline] = useState(false);
  const latestPos = useRef<{ latitude: number; longitude: number } | null>(null);
  const watchId = useRef<number | null>(null);
  const emitRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!initialScreen || initialScreen === 'Tabs' || didNavigate.current) return;
    didNavigate.current = true;
    const t = setTimeout(() => {
      stackRef.current?.navigate(initialScreen, initialParams);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Track GPS position persistently
  useEffect(() => {
    watchId.current = Geolocation.watchPosition(
      pos => { latestPos.current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }; },
      () => {},
      { enableHighAccuracy: true, distanceFilter: 10, interval: 5000 },
    );
    return () => { if (watchId.current !== null) Geolocation.clearWatch(watchId.current); };
  }, []);

  // Sync online status once on mount
  useEffect(() => {
    getDriverProfile().then(p => setIsOnline(p.isOnline ?? false)).catch(() => {});
  }, []);

  // Emit location every 5s while online, stop when offline
  useEffect(() => {
    if (emitRef.current) clearInterval(emitRef.current);
    if (!isOnline) return;
    connectSocket().then(socket => {
      emitRef.current = setInterval(() => {
        if (latestPos.current) {
          socket.emit('update-location', latestPos.current);
        }
      }, 5000);
    });
    return () => { if (emitRef.current) clearInterval(emitRef.current); };
  }, [isOnline]);

  return (
    <DriverStack.Navigator
      ref={stackRef}
      screenOptions={{ headerShown: false }}
    >
      <DriverStack.Screen
        name="Tabs"
        children={() => <DriverTabNavigator onOnlineChange={setIsOnline} />}
      />
      <DriverStack.Screen name="DriverRegister"  component={DriverRegisterScreen} />
      <DriverStack.Screen name="DriverRide"      component={DriverRideScreen} />
      <DriverStack.Screen name="DriverStarted"   component={DriverStartedScreen} />
      <DriverStack.Screen name="Chat"            component={ChatScreen} />
    </DriverStack.Navigator>
  );
}

const MainNavigator = ({ route }: any) => {
  const role = route?.params?.role ?? 'RIDER';
  const initialScreen = route?.params?.screen;
  const initialParams = route?.params?.params;

  if (role === 'ADMIN') {
    return <AdminTabNavigator />;
  }
  if (role === 'DRIVER') {
    return <DriverNavigator initialScreen={initialScreen} initialParams={initialParams} />;
  }
  return <RiderNavigator initialScreen={initialScreen} initialParams={initialParams} />;
};

export default MainNavigator;
