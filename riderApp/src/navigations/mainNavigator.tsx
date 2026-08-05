import React, { useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import RiderTabNavigator from './riderTabNavigator';
import DriverTabNavigator from './driverTabNavigator';
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

  useEffect(() => {
    if (!initialScreen || initialScreen === 'Tabs' || didNavigate.current) return;
    didNavigate.current = true;
    const t = setTimeout(() => {
      stackRef.current?.navigate(initialScreen, initialParams);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <DriverStack.Navigator
      ref={stackRef}
      screenOptions={{ headerShown: false }}
    >
      <DriverStack.Screen name="Tabs"            component={DriverTabNavigator} />
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

  if (role === 'DRIVER') {
    return <DriverNavigator initialScreen={initialScreen} initialParams={initialParams} />;
  }
  return <RiderNavigator initialScreen={initialScreen} initialParams={initialParams} />;
};

export default MainNavigator;
