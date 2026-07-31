import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../redux/store';
import { logout as logoutApi } from '../../api/auth';
import { logout as logoutAction } from '../../redux/authSlice';
import { disconnectSocket } from '../../services/socket';
import { CommonActions } from '@react-navigation/native';
import api from '../../api/axios';

export default function ProfileScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const authUser = useSelector((s: RootState) => s.auth.user);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    api.get('/users/me')
      .then(res => setProfile(res.data))
      .catch(() => setProfile(authUser))
      .finally(() => setLoading(false));
  }, [authUser]);

  const handleLogout = useCallback(() => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try { await logoutApi(); } catch {}
          disconnectSocket();
          dispatch(logoutAction());
          navigation.dispatch(
            CommonActions.reset({ index: 0, routes: [{ name: 'Auth' }] })
          );
        },
      },
    ]);
  }, [dispatch, navigation]);

  const user = profile ?? authUser;
  const initials = user?.fullName
    ? user.fullName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} color="#111827" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <Text style={styles.name}>{user?.fullName ?? '—'}</Text>
        <Text style={styles.email}>{user?.email ?? '—'}</Text>

        {user?.role && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{user.role}</Text>
          </View>
        )}

        {/* Info cards */}
        <View style={styles.card}>
          <InfoRow label="Full Name" value={user?.fullName ?? '—'} />
          <Divider />
          <InfoRow label="Email" value={user?.email ?? '—'} />
          <Divider />
          <InfoRow label="Phone" value={user?.phoneNumber ?? 'Not set'} />
          <Divider />
          <InfoRow label="Account Status" value={user?.isVerified ? '✅ Verified' : '⏳ Unverified'} />
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutButton, loggingOut && styles.logoutButtonDisabled]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.logoutButtonText}>Log Out</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 40, paddingTop: 32 },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#FFFFFF' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  email: { fontSize: 14, color: '#6B7280', marginBottom: 10 },
  roleBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 28,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '700', color: '#1D4ED8' },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  infoLabel: { fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#111827', maxWidth: '60%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
  logoutButton: {
    width: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  logoutButtonDisabled: { opacity: 0.6 },
  logoutButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
