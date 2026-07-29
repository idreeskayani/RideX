import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { connectSocket } from '../../services/socket';
import { cancelRide } from '../../api/ride';
import api from '../../api/axios';

export default function RideAcceptedScreen({ route, navigation }: any) {
  const { rideId } = route.params;
  const [ride, setRide] = React.useState<any>(null);

  useEffect(() => {
    api.get(`/ride/my-rides`).then(res => {
      const found = res.data.find((r: any) => r.id === rideId);
      if (found) setRide(found);
    }).catch(() => {});
  }, [rideId]);

  useEffect(() => {
    let mounted = true;
    connectSocket().then(socket => {
      if (!mounted) return;

      socket.on('ride-arrived', data => {
        if (data.rideId !== rideId) return;
        navigation.replace('DriverArrived', { rideId });
      });

      socket.on('ride-cancelled', data => {
        if (data.rideId !== rideId) return;
        Alert.alert('Ride Cancelled', 'Driver cancelled the ride.');
        navigation.replace('Home');
      });
    });

    return () => {
      mounted = false;
      connectSocket().then(socket => {
        socket.off('ride-arrived');
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
      <View style={styles.header}>
        <Text style={styles.statusBadge}>Driver Accepted</Text>
        <Text style={styles.title}>Your driver is on the way</Text>
      </View>

      <View style={styles.driverCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>🧑</Text>
        </View>
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>
            {ride?.driver?.user?.fullName ?? 'Your Driver'}
          </Text>
          <Text style={styles.vehicleText}>
            {ride?.driver?.vehicleModel ?? '—'} · {ride?.driver?.vehicleNumber ?? '—'}
          </Text>
        </View>
        <View style={styles.fareBox}>
          <Text style={styles.fareLabel}>Fare</Text>
          <Text style={styles.fareValue}>PKR {ride?.fare ?? '—'}</Text>
        </View>
      </View>

      <View style={styles.tripCard}>
        <View style={styles.tripRow}>
          <View style={[styles.dot, { backgroundColor: '#2563EB' }]} />
          <Text style={styles.tripText} numberOfLines={1}>{ride?.pickup ?? '—'}</Text>
        </View>
        <View style={styles.tripDivider} />
        <View style={styles.tripRow}>
          <View style={[styles.dot, { backgroundColor: '#111827' }]} />
          <Text style={styles.tripText} numberOfLines={1}>{ride?.destination ?? '—'}</Text>
        </View>
      </View>

      <View style={styles.waitingRow}>
        <Text style={styles.waitingText}>⏳ Waiting for driver to arrive…</Text>
      </View>

      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelButtonText}>Cancel Ride</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 20 },
  header: { marginTop: 32, marginBottom: 24 },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
    overflow: 'hidden',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 26 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  vehicleText: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  fareBox: { alignItems: 'flex-end' },
  fareLabel: { fontSize: 11, color: '#9CA3AF' },
  fareValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  tripCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  tripRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  tripText: { fontSize: 14, color: '#374151', flex: 1 },
  tripDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 10, marginLeft: 18 },
  waitingRow: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  waitingText: { fontSize: 14, color: '#6B7280' },
  cancelButton: {
    position: 'absolute',
    bottom: 32,
    left: 20,
    right: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 16, color: '#EF4444', fontWeight: '600' },
});
