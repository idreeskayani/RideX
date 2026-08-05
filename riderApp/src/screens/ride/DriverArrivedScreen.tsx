import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import {
  Map as MapLibre,
  Camera,
  Marker,
  UserLocation,
} from '@maplibre/maplibre-react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux/store';
import { connectSocket } from '../../services/socket';
import QuickLogoutButton from '../../components/QuickLogoutButton';

const DEFAULT_ZOOM = 15;

export default function DriverArrivedScreen({ route, navigation }: any) {
  const { rideId, ride } = route.params;
  const pickup = useSelector((s: RootState) => s.ride.pickup);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    let mounted = true;
    connectSocket().then(socket => {
      if (!mounted) return;
      socket.emit('join-ride', { rideId });

      socket.on('ride-started', data => {
        if (data.rideId !== rideId) return;
        navigation.replace('RideStarted', { rideId, ride });
      });

      socket.on('ride-cancelled', data => {
        if (data.rideId !== rideId) return;
        Alert.alert('Ride Cancelled', 'Driver cancelled the ride.');
        navigation.replace('Tabs', { screen: 'Home' });
      });
    });
    return () => {
      mounted = false;
      connectSocket().then(socket => {
        socket.off('ride-started');
        socket.off('ride-cancelled');
      });
    };
  }, [rideId, navigation, ride]);

  return (
    <View style={styles.container}>
      <MapLibre style={StyleSheet.absoluteFill} mapStyle="https://tiles.openfreemap.org/styles/liberty">
        <Camera
          zoom={DEFAULT_ZOOM}
          center={pickup ? [pickup.longitude, pickup.latitude] : [0, 0]}
        />
        <UserLocation />

        {pickup && (
          <Marker id="pickup" lngLat={[pickup.longitude, pickup.latitude]}>
            <View style={styles.pickupDot}><View style={styles.pickupDotInner} /></View>
          </Marker>
        )}

        {/* Driver is at pickup */}
        {pickup && (
          <Marker id="driver-arrived" lngLat={[pickup.longitude + 0.0003, pickup.latitude + 0.0003]}>
            <View style={styles.carMarker}>
              <Text style={styles.carMarkerText}>🚗</Text>
            </View>
          </Marker>
        )}
      </MapLibre>

      <QuickLogoutButton />

      {/* Bottom sheet */}
      <View style={styles.sheet}>
        <View style={styles.arrivedBadge}>
          <Text style={styles.arrivedBadgeText}>📍 Driver Arrived</Text>
        </View>

        <Text style={styles.title}>Your driver is here!</Text>
        <Text style={styles.subtitle}>
          {ride?.driver?.user?.fullName ?? 'Your driver'} is waiting at your pickup location.
        </Text>

        <View style={styles.driverRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>🧑</Text>
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{ride?.driver?.user?.fullName ?? 'Driver'}</Text>
            <Text style={styles.vehicleText}>
              {ride?.driver?.vehicleModel ?? '—'} · {ride?.driver?.vehicleNumber ?? '—'}
            </Text>
          </View>
        </View>

        {!acknowledged ? (
          <TouchableOpacity
            style={styles.ackButton}
            onPress={() => setAcknowledged(true)}
          >
            <Text style={styles.ackButtonText}>I'm on my way 👋</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.ackConfirmed}>
            <Text style={styles.ackConfirmedText}>✅ Driver notified — heading to you!</Text>
          </View>
        )}
      </View>
    </View>
  );
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  arrivedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 12,
  },
  arrivedBadgeText: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  driverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 24 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  vehicleText: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  ackButton: {
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ackButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  ackConfirmed: {
    backgroundColor: '#D1FAE5',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ackConfirmedText: { fontSize: 15, fontWeight: '600', color: '#065F46' },
  carMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  carMarkerText: { fontSize: 22 },
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
