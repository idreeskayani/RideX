import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Alert,
  Modal,
  ScrollView,
  PanResponder,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import api from '../../api/axios';
import { deleteRideHistory, cancelRide } from '../../api/ride';
import { store } from '../../redux/store';
import { setRideLocations, setRideId } from '../../redux/rideSlice';

const ACTIVE_STATUSES = ['PENDING', 'ACCEPTED', 'DRIVER_ARRIVED', 'STARTED'];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  COMPLETED:           { bg: '#D1FAE5', text: '#065F46' },
  CANCELLED_BY_RIDER:  { bg: '#FEE2E2', text: '#991B1B' },
  CANCELLED_BY_DRIVER: { bg: '#FEE2E2', text: '#991B1B' },
  PENDING:             { bg: '#FEF3C7', text: '#92400E' },
  ACCEPTED:            { bg: '#DBEAFE', text: '#1D4ED8' },
  STARTED:             { bg: '#EDE9FE', text: '#5B21B6' },
  DRIVER_ARRIVED:      { bg: '#FEF3C7', text: '#92400E' },
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED:           'Completed',
  CANCELLED_BY_RIDER:  'Cancelled by You',
  CANCELLED_BY_DRIVER: 'Cancelled by Driver',
  PENDING:             'Searching Driver',
  ACCEPTED:            'Driver on the Way',
  STARTED:             'In Progress',
  DRIVER_ARRIVED:      'Driver Arrived',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const SWIPE_THRESHOLD = -80;

// ── Ride Detail Modal (for completed / cancelled) ─────────────────────────────

function RideDetailModal({ ride, onClose }: { ride: any; onClose: () => void }) {
  const color = STATUS_COLORS[ride.status] ?? { bg: '#F3F4F6', text: '#374151' };
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.handle} />

          <View style={modal.headerRow}>
            <Text style={modal.title}>Ride Details</Text>
            <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
              <Text style={modal.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Status */}
            <View style={[modal.statusBadge, { backgroundColor: color.bg }]}>
              <Text style={[modal.statusText, { color: color.text }]}>
                {STATUS_LABELS[ride.status] ?? ride.status}
              </Text>
            </View>

            {/* Route */}
            <View style={modal.section}>
              <View style={modal.tripRow}>
                <View style={[modal.dot, { backgroundColor: '#2563EB' }]} />
                <View style={modal.tripTexts}>
                  <Text style={modal.tripLabel}>Pickup</Text>
                  <Text style={modal.tripValue}>{ride.pickup}</Text>
                </View>
              </View>
              <View style={modal.tripLine} />
              <View style={modal.tripRow}>
                <View style={[modal.dot, { backgroundColor: '#111827' }]} />
                <View style={modal.tripTexts}>
                  <Text style={modal.tripLabel}>Destination</Text>
                  <Text style={modal.tripValue}>{ride.destination}</Text>
                </View>
              </View>
            </View>

            {/* Info grid */}
            <View style={modal.grid}>
              <View style={modal.gridItem}>
                <Text style={modal.gridLabel}>Fare</Text>
                <Text style={modal.gridValue}>PKR {ride.fare ?? '—'}</Text>
              </View>
              <View style={modal.gridItem}>
                <Text style={modal.gridLabel}>Category</Text>
                <Text style={modal.gridValue}>{ride.category}</Text>
              </View>
              <View style={modal.gridItem}>
                <Text style={modal.gridLabel}>Date</Text>
                <Text style={modal.gridValue}>{formatDate(ride.createdAt)}</Text>
              </View>
              {ride.driver && (
                <View style={modal.gridItem}>
                  <Text style={modal.gridLabel}>Driver</Text>
                  <Text style={modal.gridValue}>{ride.driver?.user?.fullName ?? '—'}</Text>
                </View>
              )}
              {ride.driver?.vehicleModel && (
                <View style={modal.gridItem}>
                  <Text style={modal.gridLabel}>Vehicle</Text>
                  <Text style={modal.gridValue}>{ride.driver.vehicleModel} · {ride.driver.vehicleNumber}</Text>
                </View>
              )}
            </View>
          </ScrollView>

          <TouchableOpacity style={modal.closeButton} onPress={onClose}>
            <Text style={modal.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Active Ride Modal (for pending / accepted / started) ──────────────────────

function ActiveRideModal({ ride, onClose, onContinue, onCancel, cancelling }:
  { ride: any; onClose: () => void; onContinue: () => void; onCancel: () => void; cancelling: boolean }) {
  const color = STATUS_COLORS[ride.status] ?? { bg: '#F3F4F6', text: '#374151' };
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.handle} />

          <View style={modal.headerRow}>
            <Text style={modal.title}>Active Ride</Text>
            <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
              <Text style={modal.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={[modal.statusBadge, { backgroundColor: color.bg }]}>
            <Text style={[modal.statusText, { color: color.text }]}>
              {STATUS_LABELS[ride.status] ?? ride.status}
            </Text>
          </View>

          <View style={modal.section}>
            <View style={modal.tripRow}>
              <View style={[modal.dot, { backgroundColor: '#2563EB' }]} />
              <View style={modal.tripTexts}>
                <Text style={modal.tripLabel}>Pickup</Text>
                <Text style={modal.tripValue}>{ride.pickup}</Text>
              </View>
            </View>
            <View style={modal.tripLine} />
            <View style={modal.tripRow}>
              <View style={[modal.dot, { backgroundColor: '#111827' }]} />
              <View style={modal.tripTexts}>
                <Text style={modal.tripLabel}>Destination</Text>
                <Text style={modal.tripValue}>{ride.destination}</Text>
              </View>
            </View>
          </View>

          <View style={modal.grid}>
            <View style={modal.gridItem}>
              <Text style={modal.gridLabel}>Fare</Text>
              <Text style={modal.gridValue}>PKR {ride.fare ?? '—'}</Text>
            </View>
            <View style={modal.gridItem}>
              <Text style={modal.gridLabel}>Category</Text>
              <Text style={modal.gridValue}>{ride.category}</Text>
            </View>
            {ride.driver && (
              <View style={modal.gridItem}>
                <Text style={modal.gridLabel}>Driver</Text>
                <Text style={modal.gridValue}>{ride.driver?.user?.fullName ?? '—'}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={modal.continueButton} onPress={onContinue}>
            <Text style={modal.continueButtonText}>Continue Ride →</Text>
          </TouchableOpacity>

          {(ride.status === 'PENDING' || ride.status === 'ACCEPTED' || ride.status === 'DRIVER_ARRIVED') && (
            <TouchableOpacity
              style={[modal.cancelButton, cancelling && { opacity: 0.6 }]}
              onPress={onCancel}
              disabled={cancelling}
            >
              {cancelling
                ? <ActivityIndicator color="#DC2626" />
                : <Text style={modal.cancelButtonText}>Cancel Ride</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Swipeable card ────────────────────────────────────────────────────────────

function SwipeableCard({ item, onDelete, onPress }: {
  item: any;
  onDelete: (id: string) => void;
  onPress: (item: any) => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const color = STATUS_COLORS[item.status] ?? { bg: '#F3F4F6', text: '#374151' };
  const isActive = ACTIVE_STATUSES.includes(item.status);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => { if (g.dx < 0) translateX.setValue(g.dx); },
      onPanResponderRelease: (_, g) => {
        if (g.dx < SWIPE_THRESHOLD) {
          Animated.timing(translateX, { toValue: -100, duration: 150, useNativeDriver: true }).start();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  const handleDelete = () => {
    Alert.alert('Delete Ride', 'Remove this ride from history?', [
      { text: 'Cancel', style: 'cancel', onPress: () => Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start() },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
    ]);
  };

  return (
    <View style={styles.swipeContainer}>
      <TouchableOpacity style={styles.deleteAction} onPress={handleDelete}>
        <Text style={styles.deleteActionText}>🗑️</Text>
        <Text style={styles.deleteActionLabel}>Delete</Text>
      </TouchableOpacity>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.8}>
          <View style={styles.cardHeader}>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: color.bg }]}>
              <Text style={[styles.statusText, { color: color.text }]}>
                {STATUS_LABELS[item.status] ?? item.status}
              </Text>
            </View>
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
          <View style={styles.cardFooter}>
            <Text style={styles.categoryText}>{item.category}</Text>
            <View style={styles.footerRight}>
              <Text style={styles.fareText}>PKR {item.fare ?? '—'}</Text>
              {isActive && <Text style={styles.tapHint}>Tap to open →</Text>}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/ride/my-rides');
      setRides(res.data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteRideHistory(id);
      setRides(prev => prev.filter(r => r.id !== id));
    } catch {
      Alert.alert('Error', 'Could not delete this ride.');
    }
  }, []);

  const handlePress = useCallback((item: any) => {
    setSelectedRide(item);
  }, []);

  const handleContinue = useCallback(() => {
    if (!selectedRide) return;
    const ride = selectedRide;
    setSelectedRide(null);

    // Restore redux state so map screens work
    if (ride.pickupLat && ride.pickupLng) {
      store.dispatch(setRideLocations({
        pickup: { latitude: ride.pickupLat, longitude: ride.pickupLng },
        destination: ride.destinationLat && ride.destinationLng
          ? { latitude: ride.destinationLat, longitude: ride.destinationLng }
          : { latitude: 0, longitude: 0 },
      }));
    }
    store.dispatch(setRideId(ride.id));

    switch (ride.status) {
      case 'PENDING':
        navigation.navigate('RideSearching', { rideId: ride.id });
        break;
      case 'ACCEPTED':
        navigation.navigate('RideAccepted', { rideId: ride.id });
        break;
      case 'DRIVER_ARRIVED':
        navigation.navigate('DriverArrived', { rideId: ride.id, ride });
        break;
      case 'STARTED':
        navigation.navigate('RideStarted', { rideId: ride.id, ride });
        break;
    }
  }, [selectedRide, navigation]);

  const handleCancel = useCallback(async () => {
    if (!selectedRide) return;
    setCancelling(true);
    try {
      await cancelRide(selectedRide.id);
      setRides(prev => prev.map(r => r.id === selectedRide.id ? { ...r, status: 'CANCELLED_BY_RIDER' } : r));
      setSelectedRide(null);
    } catch {
      Alert.alert('Error', 'Could not cancel this ride.');
    } finally {
      setCancelling(false);
    }
  }, [selectedRide]);

  const isActive = selectedRide && ACTIVE_STATUSES.includes(selectedRide.status);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Ride History</Text>
      <Text style={styles.hint}>← Swipe left to delete  ·  Tap to view details</Text>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#111827" />
      ) : (
        <FlatList
          data={rides}
          keyExtractor={r => r.id}
          renderItem={({ item }) => (
            <SwipeableCard item={item} onDelete={handleDelete} onPress={handlePress} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🚗</Text>
              <Text style={styles.emptyText}>No rides yet</Text>
              <Text style={styles.emptySubtext}>Your completed rides will appear here.</Text>
            </View>
          }
        />
      )}

      {selectedRide && !isActive && (
        <RideDetailModal ride={selectedRide} onClose={() => setSelectedRide(null)} />
      )}

      {selectedRide && isActive && (
        <ActiveRideModal
          ride={selectedRide}
          onClose={() => setSelectedRide(null)}
          onContinue={handleContinue}
          onCancel={handleCancel}
          cancelling={cancelling}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  hint: { fontSize: 12, color: '#9CA3AF', paddingHorizontal: 20, marginBottom: 10 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  swipeContainer: { marginBottom: 10, borderRadius: 16, overflow: 'hidden' },
  deleteAction: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: 100,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', borderRadius: 16,
  },
  deleteActionText: { fontSize: 20 },
  deleteActionLabel: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dateText: { fontSize: 12, color: '#6B7280' },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },
  tripRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  tripText: { fontSize: 14, color: '#374151', flex: 1 },
  tripDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 3, marginLeft: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  footerRight: { alignItems: 'flex-end' },
  categoryText: { fontSize: 13, color: '#6B7280' },
  fareText: { fontSize: 14, fontWeight: '700', color: '#111827' },
  tapHint: { fontSize: 11, color: '#2563EB', marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF' },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    maxHeight: '85%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 12, color: '#6B7280', fontWeight: '700' },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 16 },
  statusText: { fontSize: 13, fontWeight: '700' },
  section: { marginBottom: 16 },
  tripRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12, marginTop: 4 },
  tripTexts: { flex: 1 },
  tripLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  tripValue: { fontSize: 14, color: '#111827', fontWeight: '500' },
  tripLine: { height: 16, width: 1, backgroundColor: '#E5E7EB', marginLeft: 4, marginVertical: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  gridItem: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, minWidth: '45%', flex: 1 },
  gridLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  gridValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  closeButton: { backgroundColor: '#111827', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  closeButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  continueButton: { backgroundColor: '#111827', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  continueButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  cancelButton: { borderWidth: 1.5, borderColor: '#FEE2E2', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  cancelButtonText: { fontSize: 15, fontWeight: '600', color: '#DC2626' },
});
