import React, { useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { logout as logoutApi } from '../api/auth';
import { logout as logoutAction } from '../redux/authSlice';
import { disconnectSocket } from '../services/socket';

export default function QuickLogoutButton() {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const handleLogout = useCallback(async () => {
    try { await logoutApi(); } catch {}
    disconnectSocket();
    dispatch(logoutAction());
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Auth' }] })
    );
  }, [dispatch, navigation]);

  return (
    <TouchableOpacity style={styles.btn} onPress={handleLogout}>
      <Text style={styles.txt}>⏻ Logout</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    top: 42,
    right: 12,
    zIndex: 999,
    backgroundColor: '#EF4444',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  txt: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
