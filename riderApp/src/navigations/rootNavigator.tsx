import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens/auth/splashScreen';
import AuthNavigator from '../navigations/authNavigator';
import MainNavigator from '../navigations/mainNavigator';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  /**
   * Later replace this with Redux/AuthContext
   */
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
        }}>
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
        />

        <Stack.Screen
          name="Auth"
          component={AuthNavigator}
        />

        <Stack.Screen
          name="Main"
          component={MainNavigator}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;