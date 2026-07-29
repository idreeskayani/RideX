import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/home/homeScreen';
import RideSearchingScreen from '../screens/ride/rideSearchingScreen';
import RideAcceptedScreen from '../screens/ride/rideAcceptedScreen';
import DriverArrivedScreen from '../screens/ride/DriverArrivedScreen';
import RideStartedScreen from '../screens/ride/rideStartedScreen';
import RatingScreen from '../screens/rating/ratingScreen';

const Stack = createNativeStackNavigator();

const MainNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="RideSearching" component={RideSearchingScreen} />
      <Stack.Screen name="RideAccepted" component={RideAcceptedScreen} />
      <Stack.Screen name="DriverArrived" component={DriverArrivedScreen} />
      <Stack.Screen name="RideStarted" component={RideStartedScreen} />
      <Stack.Screen name="Rating" component={RatingScreen} />
    </Stack.Navigator>
  );
};

export default MainNavigator;
