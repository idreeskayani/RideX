import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  Animated,
  PanResponder,
} from 'react-native';
import {
  Map as MapLibre,
  Camera,
  Marker,
  UserLocation,
} from '@maplibre/maplibre-react-native';
import Geolocation from '@react-native-community/geolocation';
import { getAvailableRides, acceptRide } from '../../api/ride';
import api from '../../api/axios';
import QuickLogoutButton from '../../components/QuickLogoutButton';
import { getDriverProfile } from '../../api/driver';

const ZOOM = 13;
const POLL_INTERVAL_MS = 8000;
const SWIPE_SKIP_THRESHOLD = 80;

function SwipeableRideCard({
  item, accepting, onAccept, onSkip,
}: {
  item: AvailableRide;
  accepting: string | null;
  onAccept: (ride: AvailableRide) => void;
  onSkip: (id: string) => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => { if (g.dx > 0) translateX.setValue(g.dx); },
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_SKIP_THRESHOLD) {
          Animated.timing(translateX, { toValue: 400, duration: 200, useNativeDriver: true }).start(() => onSkip(item.id));
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  return (
    <Animated.View style={[styles.rideCard, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
      <View style={styles.rideCardHeader}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{item.category}</Text>
        </View>
        <Text style={styles.fareText}>PKR {item.fare ?? '—'}</Text>
      </View>
      <View style={styles.tripRow}>
        <View style={[styles.dot, { backgroundColor: '#2563EB' }]} />
        <Text style={styles.tripText} numberOfLines={1}>{item.pickup}</Text>
      </View>
      <View style={styles.tripDivider} />
      <View style={styles.tripRow}>
        <View style={[styles.dot, { backgroundColor: '#111827' }]} />
        <Text style={styles.tripText} numberOfLines={1}>{item.destination}</Text>
      </View>
      <View style={styles.riderRow}>
        <Text style={styles.riderName}>🧑 {item.rider.fullName}</Text>
        <Text style={styles.skipHint}>Swipe → to skip</Text>
      </View>
      <TouchableOpacity
        style={[styles.acceptButton, accepting === item.id && styles.acceptButtonDisabled]}
        onPress={() => onAccept(item)}
        disabled={accepting !== null}
      >
        {accepting === item.id
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.acceptButtonText}>Accept Ride</Text>
        }
      </TouchableOpacity>
    </Animated.View>
  );
}

interface AvailableRide {
  id: string;
  pickup: string;
  destination: string;
  fare: number | null;
  category: string;
  pickupLat: number | null;
  pickupLng: number | null;
  destinationLat: number | null;
  destinationLng: number | null;
  rider: { id: string; fullName: string; email: string };
}

export default function DriverHomeScreen({ navigation }: any) {
  const [rides, setRides] = useState<AvailableRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [driverPos, setDriverPos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchId = useRef<number | null>(null);

  // ── Check driver profile ─────────────────────────────────────────────────

  useEffect(() => {
    getDriverProfile().catch(() => {
      navigation.replace('DriverRegister');
    });
  }, []);

  // ── GPS ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    watchId.current = Geolocation.watchPosition(
      pos => setDriverPos({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, distanceFilter: 10, interval: 5000 },
    );
    return () => {
      if (watchId.current !== null) Geolocation.clearWatch(watchId.current);
    };
  }, []);

  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());

  // ── Skip ride ─────────────────────────────────────────────────────────────

  const handleSkip = useCallback((id: string) => {
    setSkippedIds(prev => new Set(prev).add(id));
  }, []);

  // ── Load rides ────────────────────────────────────────────────────────────

  const loadRides = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getAvailableRides();
      setRides(data);
      // clear skipped ids that are no longer in the list
      setSkippedIds(prev => {
        const ids = new Set(data.map((r: AvailableRide) => r.id));
        return new Set([...prev].filter(id => ids.has(id)));
      });
    } catch {
      // silently ignore poll errors
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRides();
    pollRef.current = setInterval(() => loadRides(true), POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadRides]);

  // ── Toggle online ─────────────────────────────────────────────────────────

  const handleToggleOnline = useCallback(async () => {
    setTogglingOnline(true);
    try {
      await api.patch(isOnline ? '/driver/go-offline' : '/driver/go-online');
      setIsOnline(prev => !prev);
    } catch {
      Alert.alert('Error', 'Could not update online status.');
    } finally {
      setTogglingOnline(false);
    }
  }, []);

  // ── Accept ride ───────────────────────────────────────────────────────────

  const handleAccept = useCallback(async (ride: AvailableRide) => {
    if (!ride.pickupLat || !ride.pickupLng || !ride.destinationLat || !ride.destinationLng) {
      Alert.alert('Missing coordinates', 'This ride does not have location data.');
      return;
    }
    setAccepting(ride.id);
    try {
      await acceptRide(ride.id);
      if (pollRef.current) clearInterval(pollRef.current);
      navigation.replace('DriverRide', {
        rideId: ride.id,
        ride: {
          pickup: ride.pickup,
          destination: ride.destination,
          fare: ride.fare,
          pickupLat: ride.pickupLat,
          pickupLng: ride.pickupLng,
          destinationLat: ride.destinationLat,
          destinationLng: ride.destinationLng,
          rider: ride.rider,
        },
      });
    } catch {
      Alert.alert('Error', 'Could not accept this ride. It may have been taken.');
      loadRides(true);
    } finally {
      setAccepting(null);
    }
  }, [navigation, loadRides]);

  // ── Render ride card ──────────────────────────────────────────────────────

  const renderRide = useCallback(({ item }: { item: AvailableRide }) => (
    <SwipeableRideCard
      item={item}
      accepting={accepting}
      onAccept={handleAccept}
      onSkip={handleSkip}
    />
  ), [accepting, handleAccept, handleSkip]);

  return (
    <View style={styles.container}>
      {/* Map */}
      <View style={styles.mapContainer}>
        <MapLibre style={StyleSheet.absoluteFill} mapStyle="https://tiles.openfreemap.org/styles/liberty">
          <Camera
            zoom={ZOOM}
            center={driverPos ? [driverPos.longitude, driverPos.latitude] : [67.0011, 24.8607]}
          />
          <UserLocation />
          {rides.map(r =>
            r.pickupLat && r.pickupLng ? (
              <Marker key={r.id} id={`pickup-${r.id}`} lngLat={[r.pickupLng, r.pickupLat]}>
                <View style={styles.pickupDot}><View style={styles.pickupDotInner} /></View>
              </Marker>
            ) : null,
          )}
        </MapLibre>
      </View>

      <QuickLogoutButton />

      {/* Bottom panel */}
      <View style={styles.panel}>
        {/* Online toggle */}
        <View style={styles.onlineRow}>
          <View style={styles.onlineInfo}>
            <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#10B981' : '#9CA3AF' }]} />
            <Text style={styles.onlineLabel}>{isOnline ? 'Online' : 'Offline'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.toggleButton, isOnline && styles.toggleButtonOnline]}
            onPress={handleToggleOnline}
            disabled={togglingOnline}
          >
            {togglingOnline
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.toggleButtonText}>{isOnline ? 'Go Offline' : 'Go Online'}</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>
          {loading ? 'Loading rides…' : rides.length === 0 ? 'No rides available' : `${rides.length} ride${rides.length > 1 ? 's' : ''} nearby`}
        </Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color="#111827" />
        ) : (
          <FlatList
            data={rides.filter(r => !skippedIds.has(r.id))}
            keyExtractor={r => r.id}
            renderItem={renderRide}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRides(); }} />
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>Pull to refresh or wait for new requests.</Text>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { flex: 1 },
  panel: {
    height: '55%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  onlineInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },
  onlineLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  toggleButton: {
    backgroundColor: '#111827',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  toggleButtonOnline: { backgroundColor: '#EF4444' },
  toggleButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  sectionTitle: { fontSize: 13, color: '#6B7280', marginBottom: 10 },
  rideCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rideCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  categoryBadgeText: { fontSize: 12, fontWeight: '700', color: '#1D4ED8' },
  fareText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  tripRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  tripText: { fontSize: 14, color: '#374151', flex: 1 },
  tripDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 3, marginLeft: 18 },
  riderRow: { marginTop: 8, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  riderName: { fontSize: 13, color: '#6B7280' },
  skipHint: { fontSize: 11, color: '#9CA3AF' },
  acceptButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  acceptButtonDisabled: { opacity: 0.5 },
  acceptButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  emptyText: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, marginTop: 8 },
  pickupDot: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#2563EB',
  },
  pickupDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB' },
});
