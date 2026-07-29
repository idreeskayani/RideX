import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { connectSocket, disconnectSocket } from '../../services/socket';
import { cancelRide } from '../../api/ride';

export default function RideSearchingScreen({ route, navigation }: any) {
  const { rideId } = route.params;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  // Socket listeners
  useEffect(() => {
    let mounted = true;

    connectSocket().then(socket => {
      if (!mounted) return;

      socket.on('ride-accepted', data => {
        if (data.rideId !== rideId) return;
        navigation.replace('RideAccepted', { rideId });
      });

      socket.on('ride-cancelled', data => {
        if (data.rideId !== rideId) return;
        Alert.alert('Ride Cancelled', 'Your ride was cancelled.');
        navigation.replace('Home');
      });
    });

    return () => {
      mounted = false;
      connectSocket().then(socket => {
        socket.off('ride-accepted');
        socket.off('ride-cancelled');
      });
    };
  }, [rideId, navigation]);

  const handleCancel = useCallback(async () => {
    try {
      await cancelRide(rideId);
    } catch {}
    navigation.replace('Home');
  }, [rideId, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]}
        />
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>🚗</Text>
        </View>

        <Text style={styles.title}>Finding your driver</Text>
        <Text style={styles.subtitle}>
          Looking for nearby drivers…
        </Text>

        <View style={styles.rideInfo}>
          <Text style={styles.rideInfoLabel}>Ride ID</Text>
          <Text style={styles.rideInfoValue} numberOfLines={1}>
            {rideId}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelButtonText}>Cancel Ride</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#E0E7FF',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  icon: { fontSize: 44 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6B7280', marginBottom: 32 },
  rideInfo: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '80%',
  },
  rideInfoLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  rideInfoValue: { fontSize: 13, color: '#374151', fontWeight: '600' },
  cancelButton: {
    margin: 24,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 16, color: '#EF4444', fontWeight: '600' },
});
