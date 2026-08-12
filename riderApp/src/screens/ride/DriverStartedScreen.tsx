import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import {
  Map as MapLibre,
  Camera,
  type CameraRef,
  Marker,
} from '@maplibre/maplibre-react-native';
import { MAP_STYLE } from '../../constants/map';
import Geolocation from '@react-native-community/geolocation';
import { connectSocket } from '../../services/socket';
import MapRoute from '../../components/MapRoute';
import QuickLogoutButton from '../../components/QuickLogoutButton';
import {
  fetchOSRMRoute,
  remainingRouteGeometry,
  isOffRoute,
  haversineMeters,
  formatETA,
  formatDistance,
  type Coords,
  type RouteResult,
} from '../../utils/navigation';
import api from '../../api/axios';
import { Linking } from 'react-native';

const ZOOM = 15;
const RECALC_DISTANCE_M = 20;
const RECALC_INTERVAL_MS = 12000;
const LOCATION_EMIT_INTERVAL_MS = 2000;

export default function DriverStartedScreen({ route, navigation }: any) {
  const { rideId, ride } = route.params as {
    rideId: string;
    ride: {
      pickup: string;
      destination: string;
      fare: number;
      pickupLat: number;
      pickupLng: number;
      destinationLat: number;
      destinationLng: number;
      rider?: { fullName?: string };
    };
  };

  // stable ref so recalcRoute doesn't change identity on every render
  const destinationRef = useRef<Coords>({ latitude: ride.destinationLat, longitude: ride.destinationLng });

  const cameraRef = useRef<CameraRef>(null);
  const [driverPos, setDriverPos] = useState<Coords | null>(null);
  const [fullRoute, setFullRoute] = useState<RouteResult | null>(null);
  const [remainingGeom, setRemainingGeom] = useState<any>(null);
  const [eta, setEta] = useState('');
  const [distLeft, setDistLeft] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  const lastDriverPos = useRef<Coords | null>(null);
  const lastRecalcTime = useRef(0);
  const routeCoords = useRef<[number, number][]>([]);
  const watchId = useRef<number | null>(null);
  const emitInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestPos = useRef<Coords | null>(null);
  const fullRouteRef = useRef<RouteResult | null>(null);

  // ── helpers ──────────────────────────────────────────────────────────────

  const updateRemaining = useCallback((pos: Coords) => {
    if (routeCoords.current.length < 2) return;
    const geom = remainingRouteGeometry(routeCoords.current, pos);
    if (!geom) return;
    setRemainingGeom(geom);
    let dist = 0;
    for (let i = 0; i < geom.coordinates.length - 1; i++) {
      dist += haversineMeters(
        { latitude: geom.coordinates[i][1], longitude: geom.coordinates[i][0] },
        { latitude: geom.coordinates[i + 1][1], longitude: geom.coordinates[i + 1][0] },
      );
    }
    const speed = fullRouteRef.current && fullRouteRef.current.distanceMeters > 0
      ? fullRouteRef.current.distanceMeters / fullRouteRef.current.durationSeconds
      : 8;
    setDistLeft(formatDistance(dist));
    setEta(formatETA(dist / speed));
  }, []);

  const recalcRoute = useCallback(async (pos: Coords) => {
    lastRecalcTime.current = Date.now();
    const r = await fetchOSRMRoute(pos, destinationRef.current);
    if (!r) return;
    fullRouteRef.current = r;
    setFullRoute(r);
    routeCoords.current = r.coordinates;
    setRemainingGeom({ type: 'LineString', coordinates: r.coordinates });
    setEta(formatETA(r.durationSeconds));
    setDistLeft(formatDistance(r.distanceMeters));
  }, []); // no deps — uses stable refs only

  // ── GPS tracking ─────────────────────────────────────────────────────────

  useEffect(() => {
    // Get one-shot position immediately so route loads without waiting for movement
    Geolocation.getCurrentPosition(
      pos => {
        const coords: Coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        latestPos.current = coords;
        setDriverPos(coords);
        if (!fullRouteRef.current) recalcRoute(coords);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    );

    watchId.current = Geolocation.watchPosition(
      pos => {
        const coords: Coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        latestPos.current = coords;
        setDriverPos(coords);
        cameraRef.current?.easeTo({ center: [coords.longitude, coords.latitude], zoom: ZOOM, duration: 600 });

        const prev = lastDriverPos.current;
        const movedM = prev ? haversineMeters(prev, coords) : 999;
        const timeSinceRecalc = Date.now() - lastRecalcTime.current;
        const offRoute = routeCoords.current.length > 1 && isOffRoute(routeCoords.current, coords);

        if (movedM >= RECALC_DISTANCE_M || offRoute || timeSinceRecalc > RECALC_INTERVAL_MS) {
          lastDriverPos.current = coords;
          recalcRoute(coords);
        } else if (movedM > 5) {
          lastDriverPos.current = coords;
          updateRemaining(coords);
        }
      },
      () => {},
      { enableHighAccuracy: true, distanceFilter: 5, interval: 2000, fastestInterval: 1000 },
    );

    return () => {
      if (watchId.current !== null) Geolocation.clearWatch(watchId.current);
    };
  }, [recalcRoute, updateRemaining]);

  // ── Socket ────────────────────────────────────────────────────────────────

  useEffect(() => {
    connectSocket().then(socket => {
      socket.emit('join-ride', { rideId });

      emitInterval.current = setInterval(() => {
        if (latestPos.current) {
          socket.emit('driver-location', {
            rideId,
            latitude: latestPos.current.latitude,
            longitude: latestPos.current.longitude,
          });
        }
      }, LOCATION_EMIT_INTERVAL_MS);

      socket.on('ride-completed', (data: any) => {
        if (data.rideId !== rideId) return;
        if (emitInterval.current) clearInterval(emitInterval.current);
        if (watchId.current !== null) Geolocation.clearWatch(watchId.current);
        setRemainingGeom(null);
        navigation.replace('Tabs');
      });

      socket.on('ride-cancelled', (data: any) => {
        if (data.rideId !== rideId) return;
        Alert.alert('Ride Cancelled', 'The rider cancelled the ride.');
        navigation.replace('Tabs');
      });
    });

    return () => {
      if (emitInterval.current) clearInterval(emitInterval.current);
      connectSocket().then(socket => {
        socket.off('ride-completed');
        socket.off('ride-cancelled');
      });
    };
  }, [rideId, navigation]);

  // ── Manual complete ───────────────────────────────────────────────────────

  const handleCompleteRide = useCallback(() => {
    Alert.alert(
      'Complete Ride',
      'Are you sure you want to complete this ride?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            setIsCompleting(true);
            try {
              await api.patch(`/ride/complete/${rideId}`);
              if (emitInterval.current) clearInterval(emitInterval.current);
              if (watchId.current !== null) Geolocation.clearWatch(watchId.current);
              navigation.replace('Tabs');
            } catch {
              Alert.alert('Error', 'Could not complete the ride. Please try again.');
            } finally {
              setIsCompleting(false);
            }
          },
        },
      ],
    );
  }, [rideId, navigation]);

  const handleNavigate = useCallback(() => {
    const { latitude, longitude } = destinationRef.current;
    const url = `google.navigation:q=${latitude},${longitude}`;
    Linking.canOpenURL(url).then(supported => {
      const fallback = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
      Linking.openURL(supported ? url : fallback);
    });
  }, []);

  const destination = destinationRef.current;

  return (
    <View style={styles.container}>
      <MapLibre style={StyleSheet.absoluteFill} mapStyle={MAP_STYLE}>
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: driverPos ? [driverPos.longitude, driverPos.latitude] : [destination.longitude, destination.latitude],
            zoom: ZOOM,
          }}
        />
        {remainingGeom && (
          <MapRoute geometry={remainingGeom} color="#111827" id="driver-to-dest" width={5} />
        )}

        {driverPos && (
          <Marker id="driver" lngLat={[driverPos.longitude, driverPos.latitude]}>
            <View style={styles.carMarker}><Text style={styles.carMarkerText}>🚗</Text></View>
          </Marker>
        )}

        <Marker id="destination" lngLat={[destination.longitude, destination.latitude]}>
          <View style={styles.destMarker}><Text style={styles.destMarkerText}>📍</Text></View>
        </Marker>
      </MapLibre>

      <QuickLogoutButton />

      <TouchableOpacity style={styles.navBtn} onPress={handleNavigate}>
        <Text style={styles.navBtnIcon}>🧭</Text>
        <Text style={styles.navBtnText}>Navigate</Text>
      </TouchableOpacity>

      {(eta || distLeft) && (
        <View style={styles.etaPill}>
          <Text style={styles.etaText}>{eta}</Text>
          {distLeft ? <Text style={styles.distText}> · {distLeft}</Text> : null}
        </View>
      )}

      <View style={styles.sheet}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>🚀 Ride in Progress</Text>
        </View>

        <View style={styles.riderRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>🧑</Text></View>
          <View style={styles.riderInfo}>
            <Text style={styles.riderName}>{ride.rider?.fullName ?? 'Rider'}</Text>
            <Text style={styles.destText} numberOfLines={1}>{ride.destination}</Text>
          </View>
          <View style={styles.fareBox}>
            <Text style={styles.fareLabel}>Fare</Text>
            <Text style={styles.fareValue}>PKR {ride.fare ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.tripRow}>
          <View style={[styles.dot, { backgroundColor: '#2563EB' }]} />
          <Text style={styles.tripText} numberOfLines={1}>{ride.pickup}</Text>
        </View>
        <View style={styles.tripDivider} />
        <View style={styles.tripRow}>
          <View style={[styles.dot, { backgroundColor: '#111827' }]} />
          <Text style={styles.tripText} numberOfLines={1}>{ride.destination}</Text>
        </View>

        <TouchableOpacity
          style={[styles.completeButton, isCompleting && styles.completeButtonDisabled]}
          onPress={handleCompleteRide}
          disabled={isCompleting}
        >
          {isCompleting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.completeButtonText}>Complete Ride ✅</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => navigation.navigate('Chat', { rideId, otherName: ride.rider?.fullName ?? 'Rider' })}>
          <Text style={styles.chatButtonText}>💬 Chat with Rider</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  etaPill: {
    position: 'absolute', top: 16, alignSelf: 'center',
    flexDirection: 'row', backgroundColor: '#111827',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 6,
  },
  etaText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  distText: { color: '#9CA3AF', fontSize: 14 },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 }, elevation: 10,
  },
  statusBadge: {
    alignSelf: 'flex-start', backgroundColor: '#EFF6FF',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 14,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '700', color: '#1D4ED8' },
  riderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 24 },
  riderInfo: { flex: 1 },
  riderName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  destText: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  fareBox: { alignItems: 'flex-end' },
  fareLabel: { fontSize: 11, color: '#9CA3AF' },
  fareValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  tripRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  tripText: { fontSize: 14, color: '#374151', flex: 1 },
  tripDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 4, marginLeft: 18 },
  completeButton: {
    backgroundColor: '#111827', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 14,
  },
  completeButtonDisabled: { opacity: 0.6 },
  completeButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  chatButton: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  chatButtonText: { fontSize: 15, color: '#2563EB', fontWeight: '600' },
  navBtn: {
    position: 'absolute',
    bottom: 320,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  navBtnIcon: { fontSize: 20 },
  navBtnText: { fontSize: 11, fontWeight: '700', color: '#111827', marginTop: 2 },
});
