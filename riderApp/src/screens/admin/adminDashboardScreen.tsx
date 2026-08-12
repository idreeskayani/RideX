import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { getAdminDashboard } from '../../api/admin';

const StatCard = ({ label, value, color }: { label: string; value: number | string; color: string }) => (
  <View style={[styles.card, { borderLeftColor: color }]}>
    <Text style={styles.cardValue}>{value}</Text>
    <Text style={styles.cardLabel}>{label}</Text>
  </View>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.cardGrid}>{children}</View>
  </View>
);

export default function AdminDashboardScreen({ navigation }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getAdminDashboard();
      setData(res);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  }

  const d = data?.drivers ?? {};
  const r = data?.rides ?? {};
  const e = data?.earnings ?? {};

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSub}>RideX Overview</Text>
      </View>

      <Section title="👥 Users">
        <StatCard label="Total Users" value={data?.users?.totalUsers ?? 0} color="#2563EB" />
      </Section>

      <Section title="🚗 Drivers">
        <StatCard label="Total" value={d.totalDrivers ?? 0} color="#2563EB" />
        <StatCard label="Approved" value={d.approvedDrivers ?? 0} color="#10B981" />
        <StatCard label="Pending" value={d.pendingDrivers ?? 0} color="#F59E0B" />
        <StatCard label="Rejected" value={d.rejectedDrivers ?? 0} color="#EF4444" />
        <StatCard label="Online" value={d.onlineDrivers ?? 0} color="#06B6D4" />
        <StatCard label="Offline" value={d.offlineDrivers ?? 0} color="#6B7280" />
      </Section>

      <Section title="🛣️ Rides">
        <StatCard label="Total" value={r.totalRides ?? 0} color="#2563EB" />
        <StatCard label="Pending" value={r.pendingRides ?? 0} color="#F59E0B" />
        <StatCard label="Accepted" value={r.acceptedRides ?? 0} color="#06B6D4" />
        <StatCard label="Started" value={r.startedRides ?? 0} color="#8B5CF6" />
        <StatCard label="Completed" value={r.completedRides ?? 0} color="#10B981" />
        <StatCard label="Cancelled" value={r.cancelledRides ?? 0} color="#EF4444" />
      </Section>

      <Section title="💰 Earnings">
        <StatCard label="Total Revenue" value={`PKR ${(e.totalRevenue ?? 0).toFixed(0)}`} color="#10B981" />
        <StatCard label="Avg Fare" value={`PKR ${(e.averageFare ?? 0).toFixed(0)}`} color="#2563EB" />
      </Section>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AdminDrivers', { filter: 'PENDING' })}>
          <Text style={styles.actionBtnText}>Review Pending Drivers ({d.pendingDrivers ?? 0})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F0FDF4', borderColor: '#10B981' }]} onPress={() => navigation.navigate('AdminDrivers')}>
          <Text style={[styles.actionBtnText, { color: '#065F46' }]}>Manage All Drivers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EFF6FF', borderColor: '#2563EB' }]} onPress={() => navigation.navigate('AdminUsers')}>
          <Text style={[styles.actionBtnText, { color: '#1E40AF' }]}>Manage Users</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#111827', paddingTop: 56, paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    borderLeftWidth: 4, minWidth: '45%', flex: 1,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
  cardLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  quickActions: { paddingHorizontal: 16, marginTop: 20, marginBottom: 32 },
  actionBtn: {
    backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B',
    borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16,
    marginBottom: 10,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: '#92400E' },
});
