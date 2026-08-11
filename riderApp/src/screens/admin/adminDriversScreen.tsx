import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, RefreshControl,
  Modal, ScrollView, Image,
} from 'react-native';
import {
  getAdminDrivers, approveDriver, rejectDriver,
  blockDriver, unblockDriver,
} from '../../api/admin';

const BASE_URL = 'http://192.168.100.22:3000';

const STATUS_FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'];

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B', APPROVED: '#10B981', REJECTED: '#EF4444',
};

function DriverDetailModal({
  driver, visible, onClose, onUpdate,
}: {
  driver: any; visible: boolean; onClose: () => void; onUpdate: (updated: any) => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const act = async (label: string, fn: () => Promise<any>, patch: Partial<any>) => {
    Alert.alert(label, `${label} ${driver?.user?.fullName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: label,
        style: label.toLowerCase().includes('reject') || label.toLowerCase().includes('block') ? 'destructive' : 'default',
        onPress: async () => {
          setLoading(label);
          try {
            await fn();
            onUpdate({ ...driver, ...patch });
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message ?? 'Failed');
          }
          setLoading(null);
        },
      },
    ]);
  };

  if (!driver) return null;

  const isBlocked = driver.user?.isBlocked;
  const status = driver.status;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modal.container}>
        <View style={modal.header}>
          <Text style={modal.title}>Driver Details</Text>
          <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
            <Text style={modal.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={modal.body}>
          {/* Avatar + name */}
          <View style={modal.avatarRow}>
            <View style={modal.avatar}><Text style={modal.avatarText}>🧑</Text></View>
            <View>
              <Text style={modal.name}>{driver.user?.fullName ?? '—'}</Text>
              <Text style={modal.sub}>{driver.user?.email ?? '—'}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                <View style={[modal.badge, { backgroundColor: (STATUS_COLORS[status] ?? '#9CA3AF') + '20' }]}>
                  <Text style={[modal.badgeText, { color: STATUS_COLORS[status] ?? '#9CA3AF' }]}>{status}</Text>
                </View>
                {isBlocked && (
                  <View style={[modal.badge, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[modal.badgeText, { color: '#DC2626' }]}>BLOCKED</Text>
                  </View>
                )}
                <View style={[modal.badge, { backgroundColor: driver.isOnline ? '#D1FAE5' : '#F3F4F6' }]}>
                  <Text style={[modal.badgeText, { color: driver.isOnline ? '#065F46' : '#6B7280' }]}>
                    {driver.isOnline ? '🟢 Online' : '⚫ Offline'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Details */}
          <View style={modal.card}>
            {[
              ['Phone', driver.user?.phoneNumber ?? 'N/A'],
              ['CNIC', driver.cnic ?? '—'],
              ['License No.', driver.licenseNumber ?? '—'],
              ['Vehicle Model', driver.vehicleModel ?? '—'],
              ['Vehicle Number', driver.vehicleNumber ?? '—'],
              ['Vehicle Type', driver.vehicleType ?? '—'],
              ['Rating', driver.rating != null ? `${Number(driver.rating).toFixed(1)} ⭐` : 'N/A'],
              ['Total Rides', driver.totalRides ?? 0],
              ['Joined', driver.user?.createdAt ? new Date(driver.user.createdAt).toLocaleDateString() : '—'],
            ].map(([label, value]) => (
              <View key={label as string} style={modal.row}>
                <Text style={modal.rowLabel}>{label}</Text>
                <Text style={modal.rowValue}>{String(value)}</Text>
              </View>
            ))}
          </View>

          {/* Document Images */}
          {(driver.licenseImage || driver.cnicImage || driver.selfieImage) && (
            <View style={modal.card}>
              <Text style={modal.docsTitle}>📎 Submitted Documents</Text>
              <View style={modal.docsRow}>
                {driver.licenseImage && (
                  <View style={modal.docItem}>
                    <Image source={{ uri: `${BASE_URL}/uploads/drivers/${driver.licenseImage}` }} style={modal.docImage} />
                    <Text style={modal.docLabel}>License</Text>
                  </View>
                )}
                {driver.cnicImage && (
                  <View style={modal.docItem}>
                    <Image source={{ uri: `${BASE_URL}/uploads/drivers/${driver.cnicImage}` }} style={modal.docImage} />
                    <Text style={modal.docLabel}>CNIC</Text>
                  </View>
                )}
                {driver.selfieImage && (
                  <View style={modal.docItem}>
                    <Image source={{ uri: `${BASE_URL}/uploads/drivers/${driver.selfieImage}` }} style={modal.docImage} />
                    <Text style={modal.docLabel}>Selfie</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={modal.actions}>
            {status === 'PENDING' && (
              <>
                <ActionBtn
                  label="✓ Approve"
                  color="#10B981"
                  loading={loading === '✓ Approve'}
                  onPress={() => act('✓ Approve', () => approveDriver(driver.id), { status: 'APPROVED' })}
                />
                <ActionBtn
                  label="✕ Reject"
                  color="#EF4444"
                  loading={loading === '✕ Reject'}
                  onPress={() => act('✕ Reject', () => rejectDriver(driver.id), { status: 'REJECTED' })}
                />
              </>
            )}
            {status === 'APPROVED' && (
              <ActionBtn
                label="✕ Reject"
                color="#EF4444"
                loading={loading === '✕ Reject'}
                onPress={() => act('✕ Reject', () => rejectDriver(driver.id), { status: 'REJECTED' })}
              />
            )}
            {status === 'REJECTED' && (
              <ActionBtn
                label="✓ Approve"
                color="#10B981"
                loading={loading === '✓ Approve'}
                onPress={() => act('✓ Approve', () => approveDriver(driver.id), { status: 'APPROVED' })}
              />
            )}
            <ActionBtn
              label={isBlocked ? '🔓 Unblock' : '🔒 Block'}
              color={isBlocked ? '#10B981' : '#F59E0B'}
              loading={loading === (isBlocked ? '🔓 Unblock' : '🔒 Block')}
              onPress={() => {
                const lbl = isBlocked ? '🔓 Unblock' : '🔒 Block';
                act(lbl,
                  () => isBlocked ? unblockDriver(driver.user.id) : blockDriver(driver.user.id),
                  { user: { ...driver.user, isBlocked: !isBlocked } },
                );
              }}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function ActionBtn({ label, color, loading, onPress }: any) {
  return (
    <TouchableOpacity
      style={[modal.actionBtn, { backgroundColor: color }]}
      disabled={!!loading}
      onPress={onPress}
    >
      {loading
        ? <ActivityIndicator size="small" color="#fff" />
        : <Text style={modal.actionBtnText}>{label}</Text>}
    </TouchableOpacity>
  );
}

export default function AdminDriversScreen({ route }: any) {
  const initialFilter = route?.params?.filter ?? 'ALL';
  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState('');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<any>(null);

  const load = useCallback(async (p = 1, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else if (p === 1) setLoading(true);
    try {
      const params: any = { page: p, limit: 15 };
      if (filter !== 'ALL') params.status = filter;
      if (search.trim()) params.search = search.trim();
      const res = await getAdminDrivers(params);
      setDrivers(p === 1 ? res.drivers : prev => [...prev, ...res.drivers]);
      setTotalPages(res.totalPages);
      setPage(p);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [filter, search]);

  useEffect(() => { load(1); }, [load]);

  const handleUpdate = (updated: any) => {
    setDrivers(prev => prev.map(d => d.id === updated.id ? updated : d));
    setSelected(updated);
  };

  const renderDriver = ({ item }: any) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.75}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}><Text style={styles.avatarText}>🧑</Text></View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.user?.fullName ?? '—'}</Text>
          <Text style={styles.sub}>{item.user?.email ?? '—'}</Text>
          <Text style={styles.sub}>{item.vehicleModel} · {item.vehicleNumber}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
            <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
          </View>
          {item.user?.isBlocked && (
            <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.badgeText, { color: '#DC2626' }]}>BLOCKED</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detail}>CNIC: {item.cnic}</Text>
        <Text style={styles.detail}>License: {item.licenseNumber}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detail}>Type: {item.vehicleType}</Text>
        <View style={[styles.onlineDot, { backgroundColor: item.isOnline ? '#10B981' : '#9CA3AF' }]} />
        <Text style={styles.detail}>{item.isOnline ? 'Online' : 'Offline'}</Text>
        <Text style={[styles.detail, { marginLeft: 'auto' }]}>Tap for details →</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Drivers</Text>
        <TextInput
          style={styles.search}
          placeholder="Search name, vehicle, CNIC..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => load(1)}
          returnKeyType="search"
        />
        <View style={styles.filters}>
          {STATUS_FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={i => i.id}
          renderItem={renderDriver}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, true)} />}
          onEndReached={() => { if (page < totalPages) load(page + 1); }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<Text style={styles.empty}>No drivers found</Text>}
        />
      )}

      <DriverDetailModal
        driver={selected}
        visible={!!selected}
        onClose={() => setSelected(null)}
        onUpdate={handleUpdate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#111827', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 12 },
  search: {
    backgroundColor: '#1F2937', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, color: '#FFFFFF', fontSize: 14, marginBottom: 12,
  },
  filters: { flexDirection: 'row', gap: 8 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#374151' },
  filterBtnActive: { backgroundColor: '#2563EB' },
  filterText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  filterTextActive: { color: '#FFFFFF' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    marginBottom: 12, elevation: 2, shadowColor: '#000',
    shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  avatarText: { fontSize: 22 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  detail: { fontSize: 12, color: '#374151' },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40, fontSize: 15 },
});

const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#111827', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  closeBtn: { padding: 6 },
  closeText: { fontSize: 18, color: '#9CA3AF' },
  body: { padding: 20, paddingBottom: 40 },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 20 },
  avatar: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 30 },
  name: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 16,
    marginBottom: 20, elevation: 2, shadowColor: '#000',
    shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  rowLabel: { fontSize: 13, color: '#6B7280' },
  rowValue: { fontSize: 13, fontWeight: '600', color: '#111827', maxWidth: '55%', textAlign: 'right' },
  docsTitle: { fontSize: 13, fontWeight: '700', color: '#111827', paddingVertical: 12 },
  docsRow: { flexDirection: 'row', gap: 10, paddingBottom: 14 },
  docItem: { flex: 1, alignItems: 'center' },
  docImage: { width: '100%', aspectRatio: 1.4, borderRadius: 8, backgroundColor: '#F3F4F6' },
  docLabel: { fontSize: 11, color: '#6B7280', marginTop: 4, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { flex: 1, minWidth: '45%', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  actionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
