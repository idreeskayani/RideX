import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import {
  Map as MapLibre,
  Camera,
  type CameraRef,
  Marker,
} from '@maplibre/maplibre-react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux/store';
import { connectSocket } from '../../services/socket';
import { cancelRide, getNearbyDrivers, type RideCategory } from '../../api/ride';
import QuickLogoutButton from '../../components/QuickLogoutButton';

const DEFAULT_ZOOM = 14;

export default function RideSearchingScreen({ route, navigation }: any) {
  const { rideId, category } = route.params;
  const cameraRef = useRef<CameraRef>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pickup = useSelector((s: RootState) => s.ride.pickup);

  const [nearbyDrivers, setNearbyDrivers] = useState<any[]>([]);

  // Poll nearby drivers every 5s while searching
  useEffect(() => {
    if (!pickup) return;
    const load = () =>
      getNearbyDrivers(pickup, (category ?? 'MINI') as RideCategory)
        .then(setNearbyDrivers)
        .catch(() => {});
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [pickup]);

  // Pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulseAnim]);

  // Socket listeners
  useEffect(() => {
    let mounted = true;
    connectSocket().then(socket => {
      if (!mounted) return;
      socket.emit('join-ride', { rideId });

      socket.on('ride-accepted', data => {
        if (data.rideId !== rideId) return;
        navigation.replace('RideAccepted', { rideId });
      });
      socket.on('ride-cancelled', data => {
        if (data.rideId !== rideId) return;
        Alert.alert('Ride Cancelled', 'Your ride was cancelled.');
        navigation.replace('Tabs', { screen: 'Home' });
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
    try { await cancelRide(rideId); } catch {}
    navigation.replace('Tabs', { screen: 'Home' });
  }, [rideId, navigation]);

  return (
    <View style={styles.container}>
      <MapLibre style={StyleSheet.absoluteFill} mapStyle="https://tiles.openfreemap.org/styles/bright">
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: pickup ? [pickup.longitude, pickup.latitude] : [0, 0],
            zoom: DEFAULT_ZOOM,
          }}
        />
        {nearbyDrivers.map(driver => (
          <Marker key={driver.id} id={`d-${driver.id}`} lngLat={[driver.longitude, driver.latitude]}>
            <View style={styles.carMarker}>
              <Text style={styles.carMarkerText}>🚗</Text>
            </View>
          </Marker>
        ))}

        {pickup && (
          <Marker id="pickup" lngLat={[pickup.longitude, pickup.latitude]}>
            <View style={styles.pickupDot}><View style={styles.pickupDotInner} /></View>
          </Marker>
        )}
      </MapLibre>

      <QuickLogoutButton />

      {/* Bottom sheet */}
      <View style={styles.sheet}>
        <View style={styles.searchingRow}>
          <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>🔍</Text>
          </View>
          <View style={styles.searchingText}>
            <Text style={styles.title}>Finding your driver</Text>
            <Text style={styles.subtitle}>Looking for nearby drivers…</Text>
          </View>
        </View>

        <View style={styles.dotsRow}>
          {[0, 1, 2].map(i => (
            <BounceDot key={i} delay={i * 200} />
          ))}
        </View>

        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel Ride</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function BounceDot({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: -8, duration: 400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.delay(600 - delay),
      ]),
    ).start();
  }, [anim, delay]);
  return <Animated.View style={[styles.dot, { transform: [{ translateY: anim }] }]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  searchingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  pulseRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DBEAFE',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  icon: { fontSize: 22 },
  searchingText: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 24 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#111827' },
  cancelButton: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 16, color: '#EF4444', fontWeight: '600' },
  carMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  carMarkerText: { fontSize: 20 },
  pickupDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  pickupDotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB' },
});
