import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import {
  Map as MapLibre,
  Camera,
  type CameraRef,
  Marker,
  UserLocation,
} from '@maplibre/maplibre-react-native';
import Geolocation from '@react-native-community/geolocation';
import { connectSocket } from '../../services/socket';
import MapRoute from '../../components/MapRoute';
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
import { startRide, cancelRideByDriver } from '../../api/ride';
import QuickLogoutButton from '../../components/QuickLogoutButton';

const ZOOM = 15;
const RECALC_DISTANCE_M = 20;
const RECALC_INTERVAL_MS = 12000;
const LOCATION_EMIT_INTERVAL_MS = 2000;

export default function DriverRideScreen({ route, navigation }: any) {
  const { rideId, ride, rideStatus } = route.params as {
    rideId: string;
    rideStatus?: string;
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

  const pickup: Coords = { latitude: ride.pickupLat, longitude: ride.pickupLng };
  const destination: Coords = { latitude: ride.destinationLat, longitude: ride.destinationLng };

  const cameraRef = useRef<CameraRef>(null);
  const [driverPos, setDriverPos] = useState<Coords | null>(null);
  const [fullRoute, setFullRoute] = useState<RouteResult | null>(null);
  const [remainingGeom, setRemainingGeom] = useState<any>(null);
  const [eta, setEta] = useState('');
  const [distLeft, setDistLeft] = useState('');
  const [arrived, setArrived] = useState(rideStatus === 'DRIVER_ARRIVED');
  const [isStarting, setIsStarting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const lastDriverPos = useRef<Coords | null>(null);
  const lastRecalcTime = useRef(0);
  const routeCoords = useRef<[number, number][]>([]);
  const watchId = useRef<number | null>(null);
  const emitInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestPos = useRef<Coords | null>(null);
  const arrivedRef = useRef(rideStatus === 'DRIVER_ARRIVED');

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
    const speed = fullRoute && fullRoute.distanceMeters > 0
      ? fullRoute.distanceMeters / fullRoute.durationSeconds
      : 8;
    setDistLeft(formatDistance(dist));
    setEta(formatETA(dist / speed));
  }, [fullRoute]);

  const recalcRoute = useCallback(async (pos: Coords, toDestination = false) => {
    lastRecalcTime.current = Date.now();
    const target = toDestination ? destination : pickup;
    const r = await fetchOSRMRoute(pos, target);
    if (!r) return;
    setFullRoute(r);
    routeCoords.current = r.coordinates;
    setRemainingGeom({ type: 'LineString', coordinates: r.coordinates });
    setEta(formatETA(r.durationSeconds));
    setDistLeft(formatDistance(r.distanceMeters));
  }, [pickup.latitude, pickup.longitude, destination.latitude, destination.longitude]);

  // ── GPS tracking ─────────────────────────────────────────────────────────

  useEffect(() => {
    watchId.current = Geolocation.watchPosition(
      pos => {
        const coords: Coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        latestPos.current = coords;
        setDriverPos(coords);
        cameraRef.current?.easeTo({
          center: [coords.longitude, coords.latitude],
          zoom: ZOOM,
          duration: 600,
        });

        const prev = lastDriverPos.current;
        const movedM = prev ? haversineMeters(prev, coords) : 999;
        const timeSinceRecalc = Date.now() - lastRecalcTime.current;
        const offRoute = routeCoords.current.length > 1 && isOffRoute(routeCoords.current, coords);

        if (movedM >= RECALC_DISTANCE_M || offRoute || timeSinceRecalc > RECALC_INTERVAL_MS) {
          lastDriverPos.current = coords;
          recalcRoute(coords, arrivedRef.current);
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

  // ── Emit driver-location to socket every 2s ───────────────────────────────

  useEffect(() => {
    let socket: any;
    connectSocket().then(s => {
      socket = s;
      s.emit('join-ride', { rideId });
      emitInterval.current = setInterval(() => {
        if (latestPos.current) {
          s.emit('driver-location', {
            rideId,
            latitude: latestPos.current.latitude,
            longitude: latestPos.current.longitude,
          });
        }
      }, LOCATION_EMIT_INTERVAL_MS);

      s.on('ride-arrived', (data: any) => {
        if (data.rideId !== rideId) return;
        arrivedRef.current = true;
        setArrived(true);
        if (emitInterval.current) clearInterval(emitInterval.current);
        if (latestPos.current) recalcRoute(latestPos.current, true);
      });

      s.on('ride-cancelled', (data: any) => {
        if (data.rideId !== rideId) return;
        Alert.alert('Ride Cancelled', 'The rider cancelled the ride.');
        navigation.replace('Tabs');
      });
    });

    return () => {
      if (emitInterval.current) clearInterval(emitInterval.current);
      connectSocket().then(s => {
        s.off('ride-arrived');
        s.off('ride-cancelled');
      });
    };
  }, [rideId, navigation]);

  // ── Fetch initial route once we have GPS ─────────────────────────────────

  useEffect(() => {
    if (!driverPos || fullRoute) return;
    recalcRoute(driverPos, arrivedRef.current);
  }, [driverPos, fullRoute, recalcRoute]);

  // ── Start ride ────────────────────────────────────────────────────────────

  const handleCancelRide = useCallback(() => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              await cancelRideByDriver(rideId);
              navigation.replace('Tabs');
            } catch {
              Alert.alert('Error', 'Could not cancel the ride. Please try again.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ],
    );
  }, [rideId, navigation]);

  const handleStartRide = useCallback(async () => {
    setIsStarting(true);
    try {
      await startRide(rideId);
      navigation.replace('DriverStarted', { rideId, ride });
    } catch {
      Alert.alert('Error', 'Could not start the ride. Please try again.');
    } finally {
      setIsStarting(false);
    }
  }, [rideId, ride, navigation]);

  return (
    <View style={styles.container}>
      <MapLibre style={StyleSheet.absoluteFill} mapStyle="https://tiles.openfreemap.org/styles/liberty">
        <Camera
          ref={cameraRef}
          zoom={ZOOM}
          center={driverPos ? [driverPos.longitude, driverPos.latitude] : [pickup.longitude, pickup.latitude]}
        />
        <UserLocation />

        {/* Route: blue → pickup, dark → destination after arrival */}
        {remainingGeom && (
          <MapRoute
            geometry={remainingGeom}
            color={arrived ? '#111827' : '#2563EB'}
            id="driver-route"
            width={5}
          />
        )}

        {driverPos && (
          <Marker id="driver" lngLat={[driverPos.longitude, driverPos.latitude]}>
            <View style={styles.carMarker}><Text style={styles.carMarkerText}>🚗</Text></View>
          </Marker>
        )}

        <Marker id="pickup" lngLat={[pickup.longitude, pickup.latitude]}>
          <View style={styles.pickupDot}><View style={styles.pickupDotInner} /></View>
        </Marker>

        {arrived && (
          <Marker id="destination" lngLat={[destination.longitude, destination.latitude]}>
            <View style={styles.destMarker}><Text style={styles.destMarkerText}>📍</Text></View>
          </Marker>
        )}
      </MapLibre>

      <QuickLogoutButton />

      {(eta || distLeft) && (
        <View style={styles.etaPill}>
          <Text style={styles.etaText}>{eta}</Text>
          {distLeft ? <Text style={styles.distText}> · {distLeft}</Text> : null}
        </View>
      )}

      <View style={styles.sheet}>
        {arrived ? (
          <>
            <View style={styles.arrivedBadge}>
              <Text style={styles.arrivedBadgeText}>📍 You've Arrived</Text>
            </View>
            <Text style={styles.title}>At pickup location</Text>
            <Text style={styles.subtitle}>
              Waiting for {ride.rider?.fullName ?? 'the rider'} to board.
            </Text>
            <TouchableOpacity
              style={[styles.actionButton, isStarting && styles.actionButtonDisabled]}
              onPress={handleStartRide}
              disabled={isStarting}
            >
              <Text style={styles.actionButtonText}>
                {isStarting ? 'Starting…' : 'Start Ride 🚀'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>🚗 Heading to Pickup</Text>
            </View>
            <View style={styles.riderRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>🧑</Text></View>
              <View style={styles.riderInfo}>
                <Text style={styles.riderName}>{ride.rider?.fullName ?? 'Rider'}</Text>
                <Text style={styles.pickupText} numberOfLines={1}>{ride.pickup}</Text>
              </View>
              <View style={styles.fareBox}>
                <Text style={styles.fareLabel}>Fare</Text>
                <Text style={styles.fareValue}>PKR {ride.fare ?? '—'}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.cancelButton, isCancelling && styles.actionButtonDisabled]}
              onPress={handleCancelRide}
              disabled={isCancelling}
            >
              <Text style={styles.cancelButtonText}>
                {isCancelling ? 'Cancelling…' : 'Cancel Ride'}
              </Text>
            </TouchableOpacity>
          </>
        )}
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
    alignSelf: 'flex-start', backgroundColor: '#DBEAFE',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 14,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '700', color: '#1D4ED8' },
  arrivedBadge: {
    alignSelf: 'flex-start', backgroundColor: '#FEF3C7',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 10,
  },
  arrivedBadgeText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
  riderRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 24 },
  riderInfo: { flex: 1 },
  riderName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  pickupText: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  fareBox: { alignItems: 'flex-end' },
  fareLabel: { fontSize: 11, color: '#9CA3AF' },
  fareValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  actionButton: {
    backgroundColor: '#111827', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  actionButtonDisabled: { opacity: 0.6 },
  actionButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  cancelButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: { fontSize: 15, fontWeight: '700', color: '#DC2626' },
  carMarker: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  carMarkerText: { fontSize: 22 },
  destMarker: { alignItems: 'center', justifyContent: 'center' },
  destMarkerText: { fontSize: 28 },
  pickupDot: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#2563EB',
  },
  pickupDotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB' },
});
