import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import {
  Map as MapLibre,
  Camera,
  type CameraRef,
  Marker,
  UserLocation,
} from '@maplibre/maplibre-react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux/store';
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

const ZOOM = 15;
const RECALC_DISTANCE_M = 20;
const RECALC_INTERVAL_MS = 12000;

export default function RideStartedScreen({ route, navigation }: any) {
  const { rideId, ride } = route.params;
  const cameraRef = useRef<CameraRef>(null);
  const pickup = useSelector((s: RootState) => s.ride.pickup);
  const destination = useSelector((s: RootState) => s.ride.destination);

  const [driverPos, setDriverPos] = useState<Coords | null>(pickup);
  const [fullRoute, setFullRoute] = useState<RouteResult | null>(null);
  const [remainingGeom, setRemainingGeom] = useState<any>(null);
  const [eta, setEta] = useState<string>('');
  const [distLeft, setDistLeft] = useState<string>('');

  const lastDriverPos = useRef<Coords | null>(pickup);
  const lastRecalcTime = useRef<number>(0);
  const routeCoords = useRef<[number, number][]>([]);

  // Fetch initial route pickup → destination
  useEffect(() => {
    if (!pickup || !destination) return;
    fetchOSRMRoute(pickup, destination).then(r => {
      if (!r) return;
      setFullRoute(r);
      routeCoords.current = r.coordinates;
      setRemainingGeom({ type: 'LineString', coordinates: r.coordinates });
      setEta(formatETA(r.durationSeconds));
      setDistLeft(formatDistance(r.distanceMeters));
    });
  }, []);

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

  const recalcRoute = useCallback(async (pos: Coords) => {
    if (!destination) return;
    lastRecalcTime.current = Date.now();
    const r = await fetchOSRMRoute(pos, destination);
    if (!r) return;
    setFullRoute(r);
    routeCoords.current = r.coordinates;
    setRemainingGeom({ type: 'LineString', coordinates: r.coordinates });
    setEta(formatETA(r.durationSeconds));
    setDistLeft(formatDistance(r.distanceMeters));
  }, [destination]);

  useEffect(() => {
    let mounted = true;
    connectSocket().then(socket => {
      if (!mounted) return;
      socket.emit('join-ride', { rideId });

      socket.on('ride', (data: { latitude: number; longitude: number }) => {
        const pos: Coords = { latitude: data.latitude, longitude: data.longitude };
        setDriverPos(pos);
        cameraRef.current?.easeTo({ center: [pos.longitude, pos.latitude], zoom: ZOOM, duration: 600 });

        const prev = lastDriverPos.current;
        const movedM = prev ? haversineMeters(prev, pos) : 999;
        const timeSinceRecalc = Date.now() - lastRecalcTime.current;
        const offRoute = routeCoords.current.length > 1 && isOffRoute(routeCoords.current, pos);

        if (movedM >= RECALC_DISTANCE_M || offRoute || timeSinceRecalc > RECALC_INTERVAL_MS) {
          lastDriverPos.current = pos;
          recalcRoute(pos);
        } else if (movedM > 5) {
          lastDriverPos.current = pos;
          updateRemaining(pos);
        }
      });

      socket.on('ride-completed', (data: any) => {
        if (data.rideId !== rideId) return;
        navigation.replace('Rating', { rideId });
      });

      socket.on('ride-cancelled', (data: any) => {
        if (data.rideId !== rideId) return;
        Alert.alert('Ride Cancelled', 'Your ride was cancelled.');
        navigation.replace('Tabs', { screen: 'Home' });
      });
    });
    return () => {
      mounted = false;
      connectSocket().then(socket => {
        socket.off('ride');
        socket.off('ride-completed');
        socket.off('ride-cancelled');
      });
    };
  }, [rideId, navigation, recalcRoute, updateRemaining]);

  return (
    <View style={styles.container}>
      <MapLibre style={StyleSheet.absoluteFill} mapStyle="https://tiles.openfreemap.org/styles/liberty">
        <Camera
          ref={cameraRef}
          zoom={ZOOM}
          center={driverPos ? [driverPos.longitude, driverPos.latitude] : pickup ? [pickup.longitude, pickup.latitude] : [0, 0]}
        />
        <UserLocation />

        {/* Progressive remaining route: driver → destination */}
        {remainingGeom && (
          <MapRoute geometry={remainingGeom} color="#111827" id="ride-route" width={5} />
        )}

        {/* Driver live marker */}
        {driverPos && (
          <Marker id="driver" lngLat={[driverPos.longitude, driverPos.latitude]}>
            <View style={styles.carMarker}><Text style={styles.carMarkerText}>🚗</Text></View>
          </Marker>
        )}

        {/* Destination marker */}
        {destination && (
          <Marker id="destination" lngLat={[destination.longitude, destination.latitude]}>
            <View style={styles.destMarker}><Text style={styles.destMarkerText}>📍</Text></View>
          </Marker>
        )}
      </MapLibre>

      <QuickLogoutButton />

      {/* ETA pill */}
      {(eta || distLeft) && (
        <View style={styles.etaPill}>
          <Text style={styles.etaText}>{eta}</Text>
          {distLeft ? <Text style={styles.distText}> · {distLeft}</Text> : null}
        </View>
      )}

      {/* Bottom sheet */}
      <View style={styles.sheet}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>🚀 Ride in Progress</Text>
        </View>
        <Text style={styles.title}>On the way to destination</Text>

        <View style={styles.tripRow}>
          <View style={[styles.dot, { backgroundColor: '#2563EB' }]} />
          <Text style={styles.tripText} numberOfLines={1}>{ride?.pickup ?? '—'}</Text>
        </View>
        <View style={styles.tripDivider} />
        <View style={styles.tripRow}>
          <View style={[styles.dot, { backgroundColor: '#111827' }]} />
          <Text style={styles.tripText} numberOfLines={1}>{ride?.destination ?? '—'}</Text>
        </View>

        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Total Fare</Text>
          <Text style={styles.fareValue}>PKR {ride?.fare ?? '—'}</Text>
        </View>
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
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 }, elevation: 10,
  },
  statusBadge: {
    alignSelf: 'flex-start', backgroundColor: '#EFF6FF',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 10,
  },
  statusBadgeText: { fontSize: 13, fontWeight: '700', color: '#1D4ED8' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 14 },
  tripRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  tripText: { fontSize: 14, color: '#374151', flex: 1 },
  tripDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 4, marginLeft: 18 },
  fareRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  fareLabel: { fontSize: 14, color: '#6B7280' },
  fareValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  carMarker: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  carMarkerText: { fontSize: 22 },
  destMarker: { alignItems: 'center', justifyContent: 'center' },
  destMarkerText: { fontSize: 28 },
});
