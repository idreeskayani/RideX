import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { submitRating } from '../../api/rating';

export default function RatingScreen({ route, navigation }: any) {
  const { rideId } = route.params;
  const [stars, setStars] = useState(0);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (stars === 0) {
      Alert.alert('Please select a rating');
      return;
    }
    setLoading(true);
    try {
      await submitRating(rideId, stars, review.trim() || undefined);
      navigation.replace('Home');
    } catch {
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [rideId, stars, review, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>⭐</Text>
        </View>

        <Text style={styles.title}>Rate your ride</Text>
        <Text style={styles.subtitle}>How was your experience?</Text>

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity key={n} onPress={() => setStars(n)}>
              <Text style={[styles.star, n <= stars && styles.starActive]}>
                ★
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.reviewInput}
          placeholder="Leave a comment (optional)"
          placeholderTextColor="#9CA3AF"
          value={review}
          onChangeText={setReview}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Rating</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.replace('Home')}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
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
    marginBottom: 24,
  },
  icon: { fontSize: 44 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6B7280', marginBottom: 28 },
  starsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  star: { fontSize: 44, color: '#E5E7EB' },
  starActive: { color: '#F59E0B' },
  reviewInput: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 90,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 32, gap: 10 },
  submitButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  skipButton: { alignItems: 'center', paddingVertical: 10 },
  skipButtonText: { fontSize: 15, color: '#9CA3AF' },
});
