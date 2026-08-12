import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { getAdminUsers, blockUser, unblockUser, deleteUser } from '../../api/admin';

const ROLE_FILTERS = ['ALL', 'RIDER', 'DRIVER', 'ADMIN'];

export default function AdminUsersScreen() {
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [blockedFilter, setBlockedFilter] = useState<'ALL' | 'BLOCKED' | 'ACTIVE'>('ALL');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async (p = 1, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else if (p === 1) setLoading(true);
    try {
      const params: any = { page: p, limit: 15 };
      if (roleFilter !== 'ALL') params.role = roleFilter;
      if (blockedFilter === 'BLOCKED') params.isBlocked = 'true';
      if (blockedFilter === 'ACTIVE') params.isBlocked = 'false';
      if (search.trim()) params.search = search.trim();
      const res = await getAdminUsers(params);
      setUsers(p === 1 ? res.users : prev => [...prev, ...res.users]);
      setTotalPages(res.totalPages);
      setPage(p);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [roleFilter, blockedFilter, search]);

  useEffect(() => { load(1); }, [load]);

  const handleBlock = (id: string, name: string, isBlocked: boolean) => {
    const action = isBlocked ? 'Unblock' : 'Block';
    Alert.alert(`${action} User`, `${action} ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: action,
        style: isBlocked ? 'default' : 'destructive',
        onPress: async () => {
          setActionLoading(id);
          try {
            if (isBlocked) await unblockUser(id); else await blockUser(id);
            setUsers(prev => prev.map(u => u.id === id ? { ...u, isBlocked: !isBlocked } : u));
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message ?? 'Failed');
          }
          setActionLoading(null);
        },
      },
    ]);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete User', `Permanently delete ${name}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setActionLoading(id);
          try {
            await deleteUser(id);
            setUsers(prev => prev.filter(u => u.id !== id));
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message ?? 'Failed');
          }
          setActionLoading(null);
        },
      },
    ]);
  };

  const renderUser = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}><Text style={styles.avatarText}>👤</Text></View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.fullName}</Text>
          <Text style={styles.sub}>{item.email}</Text>
          <View style={styles.tagRow}>
            <View style={styles.roleTag}>
              <Text style={styles.roleTagText}>{item.role}</Text>
            </View>
            {item.isBlocked && (
              <View style={styles.blockedTag}>
                <Text style={styles.blockedTagText}>BLOCKED</Text>
              </View>
            )}
            {!item.isVerified && (
              <View style={styles.unverifiedTag}>
                <Text style={styles.unverifiedTagText}>UNVERIFIED</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {item.driver && (
        <Text style={styles.driverNote}>
          Driver status: <Text style={{ fontWeight: '700' }}>{item.driver.status}</Text>
          {' · '}{item.driver.isOnline ? '🟢 Online' : '⚫ Offline'}
        </Text>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, item.isBlocked ? styles.unblockBtn : styles.blockBtn]}
          disabled={actionLoading === item.id}
          onPress={() => handleBlock(item.id, item.fullName, item.isBlocked)}
        >
          {actionLoading === item.id
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.actionBtnText}>{item.isBlocked ? '🔓 Unblock' : '🔒 Block'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          disabled={actionLoading === item.id}
          onPress={() => handleDelete(item.id, item.fullName)}
        >
          <Text style={styles.actionBtnText}>🗑 Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Users</Text>
        <TextInput
          style={styles.search}
          placeholder="Search name or email..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => load(1)}
          returnKeyType="search"
        />
        <View style={styles.filters}>
          {ROLE_FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, roleFilter === f && styles.filterBtnActive]}
              onPress={() => setRoleFilter(f)}
            >
              <Text style={[styles.filterText, roleFilter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.filters, { marginTop: 8 }]}>
          {(['ALL', 'ACTIVE', 'BLOCKED'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, blockedFilter === f && styles.filterBtnActive]}
              onPress={() => setBlockedFilter(f)}
            >
              <Text style={[styles.filterText, blockedFilter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={i => i.id}
          renderItem={renderUser}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, true)} />}
          onEndReached={() => { if (page < totalPages) load(page + 1); }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<Text style={styles.empty}>No users found</Text>}
        />
      )}
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
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#374151' },
  filterBtnActive: { backgroundColor: '#2563EB' },
  filterText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  filterTextActive: { color: '#FFFFFF' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    marginBottom: 12, elevation: 2, shadowColor: '#000',
    shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  avatarText: { fontSize: 22 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  roleTag: { backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  roleTagText: { fontSize: 10, fontWeight: '700', color: '#2563EB' },
  blockedTag: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  blockedTagText: { fontSize: 10, fontWeight: '700', color: '#DC2626' },
  unverifiedTag: { backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  unverifiedTagText: { fontSize: 10, fontWeight: '700', color: '#D97706' },
  driverNote: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  blockBtn: { backgroundColor: '#F59E0B' },
  unblockBtn: { backgroundColor: '#10B981' },
  deleteBtn: { backgroundColor: '#EF4444' },
  actionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40, fontSize: 15 },
});
