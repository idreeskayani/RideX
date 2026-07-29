import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { connectSocket } from '../../services/socket';

export default function RideStartedScreen({ route, navigation }: any) {
  const { rideId } = route.params;

  useEffect(() => {
    let mounted = true;
    connectSocket().then(socket => {
      if (!mounted) return;

      socket.on('ride-completed', data => {
        if (data.rideId !== rideId) return;
        navigation.replace('Rating', { rideId });
      });

      socket.on('ride-cancelled', data => {
        if (data.rideId !== rideId) return;
        Alert.alert('Ride Cancelled', 'Your ride was cancelled.');
        navigation.replace('Home');
      });
    });

    return () => {
      mounted = false;
      connectSocket().then(socket => {
        socket.off('ride-completed');
        socket.off('ride-cancelled');
      });
    };
  }, [rideId, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>🚀</Text>
        </View>
        <Text style={styles.title}>Ride in progress</Text>
        <Text style={styles.subtitle}>
          Sit back and relax.{'\n'}You'll be notified when you arrive.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>🛣️ On the way to destination…</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  icon: { fontSize: 44 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  infoText: { fontSize: 14, color: '#1D4ED8', fontWeight: '500' },
});
