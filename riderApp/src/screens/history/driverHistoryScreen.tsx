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
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api/axios';
import { deleteRideHistory } from '../../api/ride';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  COMPLETED:           { bg: '#D1FAE5', text: '#065F46' },
  CANCELLED_BY_RIDER:  { bg: '#FEE2E2', text: '#991B1B' },
  CANCELLED_BY_DRIVER: { bg: '#FEE2E2', text: '#991B1B' },
  ACCEPTED:            { bg: '#DBEAFE', text: '#1D4ED8' },
  STARTED:             { bg: '#EDE9FE', text: '#5B21B6' },
  DRIVER_ARRIVED:      { bg: '#FEF3C7', text: '#92400E' },
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED:           'Completed',
  CANCELLED_BY_RIDER:  'Cancelled by Rider',
  CANCELLED_BY_DRIVER: 'Cancelled',
  ACCEPTED:            'Accepted',
  STARTED:             'In Progress',
  DRIVER_ARRIVED:      'Driver Arrived',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

const SWIPE_THRESHOLD = -80;

function SwipeableCard({ item, onDelete }: { item: any; onDelete: (id: string) => void }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const color = STATUS_COLORS[item.status] ?? { bg: '#F3F4F6', text: '#374151' };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(g.dx);
      },
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
    Alert.alert('Delete Trip', 'Remove this trip from history?', [
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
      <Animated.View style={[styles.card, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
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
          <Text style={styles.riderText}>🧑 {item.rider?.fullName ?? '—'}</Text>
          <Text style={styles.fareText}>PKR {item.fare ?? '—'}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

export default function DriverHistoryScreen() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/ride/my-trips');
      setTrips(res.data);
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteRideHistory(id);
      setTrips(prev => prev.filter(r => r.id !== id));
    } catch {
      Alert.alert('Error', 'Could not delete this trip.');
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Trip History</Text>
      <Text style={styles.hint}>← Swipe left to delete</Text>
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#111827" />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={r => r.id}
          renderItem={({ item }) => <SwipeableCard item={item} onDelete={handleDelete} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🚗</Text>
              <Text style={styles.emptyText}>No trips yet</Text>
              <Text style={styles.emptySubtext}>Your completed trips will appear here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

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
  dateText: { fontSize: 13, color: '#6B7280' },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },
  tripRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  tripText: { fontSize: 14, color: '#374151', flex: 1 },
  tripDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 3, marginLeft: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  riderText: { fontSize: 13, color: '#6B7280' },
  fareText: { fontSize: 14, fontWeight: '700', color: '#111827' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF' },
});
