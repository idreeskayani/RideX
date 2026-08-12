import React, { useEffect, useCallback, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import {
  Map as MapLibre,
  Camera,
  type CameraRef,
  Marker,
} from '@maplibre/maplibre-react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux/store';
import { connectSocket } from '../../services/socket';
import { cancelRide } from '../../api/ride';
import api from '../../api/axios';
import MapRoute from '../../components/MapRoute';
import QuickLogoutButton from '../../components/QuickLogoutButton';
import { Linking } from 'react-native';
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
const ARRIVAL_THRESHOLD_M = 30;

export default function RideAcceptedScreen({ route, navigation }: any) {
  const { rideId } = route.params;
  const cameraRef = useRef<CameraRef>(null);
  const pickup = useSelector((s: RootState) => s.ride.pickup);

  const [ride, setRide] = useState<any>(null);
  const [driverPos, setDriverPos] = useState<Coords | null>(null);
  const [fullRoute, setFullRoute] = useState<RouteResult | null>(null);
  const [remainingGeom, setRemainingGeom] = useState<any>(null);
  const [eta, setEta] = useState<string>('');
  const [distLeft, setDistLeft] = useState<string>('');

  const lastDriverPos = useRef<Coords | null>(null);
  const lastRecalcTime = useRef<number>(0);
  const routeCoords = useRef<[number, number][]>([]);

  // Load ride info
  useEffect(() => {
    api.get('/ride/my-rides').then(res => {
      const found = res.data.find((r: any) => r.id === rideId);
      if (found) {
        setRide(found);
        if (found.driver?.latitude && found.driver?.longitude) {
          const pos = { latitude: found.driver.latitude, longitude: found.driver.longitude };
          setDriverPos(pos);
          lastDriverPos.current = pos;
        }
      }
    }).catch(() => {});
  }, [rideId]);

  // Fetch initial route once we have driver position + pickup
  useEffect(() => {
    if (!driverPos || !pickup || fullRoute) return;
    fetchOSRMRoute(driverPos, pickup).then(r => {
      if (!r) return;
      setFullRoute(r);
      routeCoords.current = r.coordinates;
      setRemainingGeom({ type: 'LineString', coordinates: r.coordinates });
      setEta(formatETA(r.durationSeconds));
      setDistLeft(formatDistance(r.distanceMeters));
    });
  }, [driverPos, pickup, fullRoute]);

  // Update remaining route when driver moves
  const updateRemaining = useCallback((pos: Coords) => {
    if (routeCoords.current.length < 2 || !pickup) return;

    const geom = remainingRouteGeometry(routeCoords.current, pos);
    if (geom) {
      setRemainingGeom(geom);
      // Estimate remaining distance by summing segment lengths
      let dist = 0;
      for (let i = 0; i < geom.coordinates.length - 1; i++) {
        dist += haversineMeters(
          { latitude: geom.coordinates[i][1], longitude: geom.coordinates[i][0] },
          { latitude: geom.coordinates[i + 1][1], longitude: geom.coordinates[i + 1][0] },
        );
      }
      const speed = fullRoute && fullRoute.distanceMeters > 0
        ? fullRoute.distanceMeters / fullRoute.durationSeconds
        : 8; // ~30 km/h default
      setDistLeft(formatDistance(dist));
      setEta(formatETA(dist / speed));
    }
  }, [pickup, fullRoute]);

  // Recalculate full route from driver's current position
  const recalcRoute = useCallback(async (pos: Coords) => {
    if (!pickup) return;
    lastRecalcTime.current = Date.now();
    const r = await fetchOSRMRoute(pos, pickup);
    if (!r) return;
    setFullRoute(r);
    routeCoords.current = r.coordinates;
    setRemainingGeom({ type: 'LineString', coordinates: r.coordinates });
    setEta(formatETA(r.durationSeconds));
    setDistLeft(formatDistance(r.distanceMeters));
  }, [pickup]);

  // Socket: driver location updates
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

      socket.on('ride-arrived', (data: any) => {
        if (data.rideId !== rideId) return;
        navigation.replace('DriverArrived', { rideId, ride });
      });

      socket.on('ride-cancelled', (data: any) => {
        if (data.rideId !== rideId) return;
        Alert.alert('Ride Cancelled', 'Driver cancelled the ride.');
        navigation.replace('Tabs', { screen: 'Home' });
      });
    });
    return () => {
      mounted = false;
      connectSocket().then(socket => {
        socket.off('ride');
        socket.off('ride-arrived');
        socket.off('ride-cancelled');
      });
    };
  }, [rideId, navigation, ride, recalcRoute, updateRemaining]);

  const handleCancel = useCallback(async () => {
    try { await cancelRide(rideId); } catch {}
    navigation.replace('Tabs', { screen: 'Home' });
  }, [rideId, navigation]);

  const handleNavigate = useCallback(() => {
    if (!pickup) return;
    const url = `google.navigation:q=${pickup.latitude},${pickup.longitude}`;
    Linking.canOpenURL(url).then(supported => {
      const fallback = `https://www.google.com/maps/dir/?api=1&destination=${pickup.latitude},${pickup.longitude}&travelmode=driving`;
      Linking.openURL(supported ? url : fallback);
    });
  }, [pickup]);

  const center = driverPos ?? pickup;

  return (
    <View style={styles.container}>
      <MapLibre style={StyleSheet.absoluteFill} mapStyle="https://tiles.openfreemap.org/styles/liberty">
        <Camera
          ref={cameraRef}
          zoom={ZOOM}
          center={center ? [center.longitude, center.latitude] : [0, 0]}
        />
        {/* Progressive remaining route: driver → pickup */}
        {remainingGeom && (
          <MapRoute geometry={remainingGeom} color="#2563EB" id="driver-to-pickup" width={5} />
        )}

        {/* Driver marker */}
        {driverPos && (
          <Marker id="driver" lngLat={[driverPos.longitude, driverPos.latitude]}>
            <View style={styles.carMarker}><Text style={styles.carMarkerText}>🚗</Text></View>
          </Marker>
        )}

        {/* Pickup marker */}
        {pickup && (
          <Marker id="pickup" lngLat={[pickup.longitude, pickup.latitude]}>
            <View style={styles.pickupDot}><View style={styles.pickupDotInner} /></View>
          </Marker>
        )}
      </MapLibre>

      <QuickLogoutButton />

      <TouchableOpacity style={styles.navBtn} onPress={handleNavigate}>
        <Text style={styles.navBtnIcon}>🧭</Text>
        <Text style={styles.navBtnText}>Navigate</Text>
      </TouchableOpacity>

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
          <Text style={styles.statusBadgeText}>🚗 Driver on the way</Text>
        </View>

        <View style={styles.driverRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>🧑</Text></View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{ride?.driver?.user?.fullName ?? 'Your Driver'}</Text>
            <Text style={styles.vehicleText}>
              {ride?.driver?.vehicleModel ?? '—'} · {ride?.driver?.vehicleNumber ?? '—'}
            </Text>
          </View>
          <View style={styles.fareBox}>
            <Text style={styles.fareLabel}>Fare</Text>
            <Text style={styles.fareValue}>PKR {ride?.fare ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.tripRow}>
          <View style={[styles.dot, { backgroundColor: '#2563EB' }]} />
          <Text style={styles.tripText} numberOfLines={1}>{ride?.pickup ?? '—'}</Text>
        </View>
        <View style={styles.tripDivider} />
        <View style={styles.tripRow}>
          <View style={[styles.dot, { backgroundColor: '#111827' }]} />
          <Text style={styles.tripText} numberOfLines={1}>{ride?.destination ?? '—'}</Text>
        </View>

        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel Ride</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => navigation.navigate('Chat', { rideId, otherName: ride?.driver?.user?.fullName ?? 'Driver' })}>
          <Text style={styles.chatButtonText}>💬 Chat with Driver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  etaPill: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  etaText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  distText: { color: '#9CA3AF', fontSize: 14 },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 }, elevation: 10,
  },
  statusBadge: {
    alignSelf: 'flex-start', backgroundColor: '#D1FAE5',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 14,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '700', color: '#065F46' },
  driverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 24 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  vehicleText: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  fareBox: { alignItems: 'flex-end' },
  fareLabel: { fontSize: 11, color: '#9CA3AF' },
  fareValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  tripRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  tripText: { fontSize: 14, color: '#374151', flex: 1 },
  tripDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 4, marginLeft: 18 },
  cancelButton: {
    marginTop: 16, borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  cancelButtonText: { fontSize: 15, color: '#EF4444', fontWeight: '600' },
  chatButton: {
    marginTop: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  chatButtonText: { fontSize: 15, color: '#2563EB', fontWeight: '600' },
  carMarker: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  carMarkerText: { fontSize: 22 },
  pickupDot: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#2563EB',
  },
  pickupDotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB' },
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
