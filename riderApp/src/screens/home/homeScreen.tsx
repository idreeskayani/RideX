import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Animated,
  ScrollView,
  Keyboard,
  PermissionsAndroid,
} from 'react-native';
import {
  Map as MapLibre,
  Camera,
  type CameraRef,
  Marker,
  UserLocation,
} from '@maplibre/maplibre-react-native';
import Geolocation from '@react-native-community/geolocation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { setRideLocations } from '../../redux/rideSlice';
import { requestRide, getNearbyDrivers, type RideCategory } from '../../api/ride';

// ---------- Geolocation config (required for @react-native-community/geolocation) ----------
Geolocation.setRNConfiguration({
  skipPermissionRequests: false,
  authorizationLevel: 'whenInUse',
  enableBackgroundLocationUpdates: false,
});

// ---------- Permission helper ----------

async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

// ---------- Nominatim place search ----------

interface PlaceResult {
  id: string;
  title: string;
  subtitle: string;
  coordinates: Coordinates;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

async function searchPlaces(
  query: string,
  near: Coordinates,
): Promise<PlaceResult[]> {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(query)}` +
    `&format=json&limit=5&addressdetails=1` +
    `&viewbox=${near.longitude - 0.5},${near.latitude + 0.5},${near.longitude + 0.5},${near.latitude - 0.5}` +
    `&bounded=1`;

  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'RideXApp/1.0' },
  });
  const data = await res.json();

  return data.map((item: any) => ({
    id: item.place_id.toString(),
    title: item.name || item.display_name.split(',')[0],
    subtitle: item.display_name,
    coordinates: {
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    },
  }));
}

// ---------- Fare estimate (simple distance-based) ----------

function estimateFare(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const distKm = R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return Math.max(50, Math.round(distKm * 25)); // base PKR 50, PKR 25/km
}

interface NearbyDriver {
  id: string;
  latitude: number;
  longitude: number;
  vehicleType: RideCategory;
  vehicleModel: string;
  user: { fullName: string };
}

// ---------- Ride categories ----------

const CATEGORIES: {
  key: RideCategory;
  label: string;
  icon: string;
  multiplier: number;
  desc: string;
}[] = [
  { key: 'MINI',     label: 'Mini',     icon: '🚗', multiplier: 1.0, desc: 'Affordable rides' },
  { key: 'RIDE_AC',  label: 'Ride AC',  icon: '❄️', multiplier: 1.4, desc: 'AC comfort' },
  { key: 'PREMIUM',  label: 'Premium',  icon: '🚙', multiplier: 1.8, desc: 'Luxury experience' },
];

type ActiveField = 'pickup' | 'destination' | null;

const DEFAULT_ZOOM = 14;
const SHEET_COLLAPSED_HEIGHT = 160;

// ---------- Component ----------

export default function HomeScreen({ navigation }: any): React.JSX.Element {
  const dispatch = useDispatch();
  const cameraRef = useRef<CameraRef>(null);

  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [pickup, setPickup] = useState<Coordinates | null>(null);
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [pickupText, setPickupText] = useState('');
  const [destinationText, setDestinationText] = useState('');

  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<RideCategory>('MINI');
  const [nearbyDrivers, setNearbyDrivers] = useState<NearbyDriver[]>([]);

  const [isLocating, setIsLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const panelAnim = useRef(new Animated.Value(0)).current;
  const sheetBottom = useRef(new Animated.Value(0)).current;
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------- Fetch nearby drivers when category or userLocation changes ----------

  useEffect(() => {
    if (!userLocation) return;
    getNearbyDrivers(userLocation, selectedCategory)
      .then(setNearbyDrivers)
      .catch(() => setNearbyDrivers([]));
  }, [selectedCategory, userLocation]);

  // ---------- Keyboard listeners ----------

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => {
        Animated.timing(sheetBottom, {
          toValue: e.endCoordinates.height,
          duration: Platform.OS === 'ios' ? e.duration : 150,
          useNativeDriver: false,
        }).start();
      },
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      e => {
        Animated.timing(sheetBottom, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? e.duration : 150,
          useNativeDriver: false,
        }).start();
      },
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [sheetBottom]);

  // ---------- Get current location ----------

  useEffect(() => {
    (async () => {
      const granted = await requestLocationPermission();
      if (!granted) {
        setLocationError('Location permission denied');
        setIsLocating(false);
        return;
      }

      // Try high accuracy first, fall back to low accuracy on error
      Geolocation.getCurrentPosition(
        position => {
          const coords: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setUserLocation(coords);
          setPickup(coords);
          setPickupText('Your location');
          setIsLocating(false);
        },
        () => {
          // Fallback: retry without high accuracy
          Geolocation.getCurrentPosition(
            position => {
              const coords: Coordinates = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              };
              setUserLocation(coords);
              setPickup(coords);
              setPickupText('Your location');
              setIsLocating(false);
            },
            () => {
              setLocationError('Could not fetch your location');
              setIsLocating(false);
            },
            { enableHighAccuracy: false, timeout: 20000, maximumAge: 30000 },
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
      );
    })();
  }, []);

  // ---------- Debounced Nominatim search ----------

  const handleSearch = useCallback(
    (text: string, field: ActiveField) => {
      if (field === 'pickup') {
        setPickupText(text);
        // clear coordinates only when user edits — fare recalculates when new place selected
        if (text !== pickupText) setPickup(null);
      }
      if (field === 'destination') {
        setDestinationText(text);
        if (text !== destinationText) setDestination(null);
      }

      if (searchTimer.current) clearTimeout(searchTimer.current);

      if (text.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      searchTimer.current = setTimeout(async () => {
        try {
          const results = await searchPlaces(
            text,
            userLocation ?? { latitude: 0, longitude: 0 },
          );
          setSuggestions(results);
        } catch {
          setSuggestions([]);
        } finally {
          setIsSearching(false);
        }
      }, 400);
    },
    [userLocation],
  );

  const handleSelectSuggestion = useCallback(
    (place: PlaceResult) => {
      if (activeField === 'pickup') {
        setPickup(place.coordinates);
        setPickupText(place.title);
      } else {
        setDestination(place.coordinates);
        setDestinationText(place.title);
      }
      setSuggestions([]);
      setActiveField(null);
      cameraRef.current?.easeTo({
        center: [place.coordinates.longitude, place.coordinates.latitude],
        zoom: DEFAULT_ZOOM,
        duration: 400,
      });
    },
    [activeField],
  );

  const handleUseCurrentLocation = useCallback(() => {
    if (!userLocation) return;
    setPickup(userLocation);
    setPickupText('Your location');
    setSuggestions([]);
    setActiveField(null);
    cameraRef.current?.easeTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: DEFAULT_ZOOM,
      duration: 400,
    });
  }, [userLocation]);

  // ---------- Fare with category multiplier ----------

  const getFare = useCallback(
    (category: RideCategory) => {
      if (!pickup || !destination) return 0;
      const base = estimateFare(pickup, destination);
      const multiplier = CATEGORIES.find(c => c.key === category)?.multiplier ?? 1;
      return Math.round(base * multiplier);
    },
    [pickup, destination],
  );

  // ---------- Confirm ride → backend ----------

  const handleConfirmRide = useCallback(async () => {
    if (!pickup || !destination) return;
    setIsRequesting(true);
    try {
      dispatch(setRideLocations({ pickup, destination }));
      const fare = getFare(selectedCategory);
      const res = await requestRide(pickupText, destinationText, fare, selectedCategory);
      navigation.navigate('RideSearching', { rideId: res.ride.id });
    } catch {
      setLocationError('Failed to request ride. Try again.');
    } finally {
      setIsRequesting(false);
    }
  }, [pickup, destination, pickupText, destinationText, dispatch, navigation]);

  const showSuggestionsPanel = activeField !== null;
  const showCategoryPanel = !showSuggestionsPanel && !!pickup && !!destination;

  useEffect(() => {
    Animated.timing(panelAnim, {
      toValue: showSuggestionsPanel ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showSuggestionsPanel, panelAnim]);

  // ---------- Render ----------

  if (isLocating) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.loadingText}>Finding your location…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Map fills the whole screen */}
      <MapLibre
        style={StyleSheet.absoluteFill}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
      >
        <Camera
          ref={cameraRef}
          zoom={DEFAULT_ZOOM}
          center={
            userLocation
              ? [userLocation.longitude, userLocation.latitude]
              : [0, 0]
          }
        />

        <UserLocation />

        {nearbyDrivers.map(driver => (
          <Marker
            key={driver.id}
            id={`driver-${driver.id}`}
            lngLat={[driver.longitude, driver.latitude]}
          >
            <View style={styles.driverMarker}>
              <Text style={styles.driverMarkerText}>🚗</Text>
            </View>
          </Marker>
        ))}

        {pickup && (
          <Marker id="pickup" lngLat={[pickup.longitude, pickup.latitude]}>
            <View style={styles.pickupMarker}>
              <View style={styles.pickupMarkerDot} />
            </View>
          </Marker>
        )}

        {destination && (
          <Marker
            id="destination"
            lngLat={[destination.longitude, destination.latitude]}
          >
            <View style={styles.destinationMarker}>
              <Text style={styles.destinationMarkerText}>📍</Text>
            </View>
          </Marker>
        )}
      </MapLibre>

      {locationError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{locationError}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.recenterButton}
        onPress={() =>
          userLocation &&
          cameraRef.current?.easeTo({
            center: [userLocation.longitude, userLocation.latitude],
            zoom: DEFAULT_ZOOM,
            duration: 400,
          })
        }
      >
        <Text style={styles.recenterButtonText}>◎</Text>
      </TouchableOpacity>

      {/* Bottom sheet — sits on top of the map */}
      <Animated.View style={[styles.sheetWrapper, { bottom: sheetBottom }]}>
        <View style={styles.sheet}>
          <View style={styles.inputsCard}>
            <View style={styles.inputRow}>
              <View style={[styles.dot, styles.dotPickup]} />
              <TextInput
                style={styles.input}
                placeholder="Pickup location"
                placeholderTextColor="#9CA3AF"
                value={pickupText}
                onFocus={() => setActiveField('pickup')}
                onChangeText={text => handleSearch(text, 'pickup')}
              />
            </View>

            <View style={styles.inputDivider} />

            <View style={styles.inputRow}>
              <View style={[styles.dot, styles.dotDestination]} />
              <TextInput
                style={styles.input}
                placeholder="Where to?"
                placeholderTextColor="#9CA3AF"
                value={destinationText}
                onFocus={() => setActiveField('destination')}
                onChangeText={text => handleSearch(text, 'destination')}
              />
            </View>
          </View>

          {showSuggestionsPanel && (
            <Animated.View
              style={[
                styles.suggestionsPanel,
                {
                  opacity: panelAnim,
                  transform: [
                    {
                      translateY: panelAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [12, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {activeField === 'pickup' && userLocation && (
                  <TouchableOpacity
                    style={styles.suggestionRow}
                    onPress={handleUseCurrentLocation}
                  >
                    <Text style={styles.suggestionIcon}>◎</Text>
                    <Text style={styles.suggestionTitle}>
                      Use your current location
                    </Text>
                  </TouchableOpacity>
                )}

                {isSearching ? (
                  <ActivityIndicator
                    style={{ paddingVertical: 16 }}
                    color="#6B7280"
                  />
                ) : (
                  suggestions.map(place => (
                    <TouchableOpacity
                      key={place.id}
                      style={styles.suggestionRow}
                      onPress={() => handleSelectSuggestion(place)}
                    >
                      <Text style={styles.suggestionIcon}>📍</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionTitle}>
                          {place.title}
                        </Text>
                        <Text
                          style={styles.suggestionSubtitle}
                          numberOfLines={1}
                        >
                          {place.subtitle}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </Animated.View>
          )}

          {showCategoryPanel && (
            <View style={styles.categoryContainer}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryCard,
                    selectedCategory === cat.key && styles.categoryCardActive,
                  ]}
                  onPress={() => setSelectedCategory(cat.key)}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text
                    style={[
                      styles.categoryLabel,
                      selectedCategory === cat.key && styles.categoryLabelActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                  <Text
                    style={[
                      styles.categoryFare,
                      selectedCategory === cat.key && styles.categoryFareActive,
                    ]}
                  >
                    PKR {getFare(cat.key)}
                  </Text>
                  <Text style={styles.categoryDesc}>{cat.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!showSuggestionsPanel && pickup && destination && (
            <TouchableOpacity
              style={[
                styles.confirmButton,
                isRequesting && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirmRide}
              disabled={isRequesting}
            >
              {isRequesting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  Confirm {CATEGORIES.find(c => c.key === selectedCategory)?.label} · PKR {getFare(selectedCategory)}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 14 },
  pickupMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  pickupMarkerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  destinationMarker: { alignItems: 'center', justifyContent: 'center' },
  destinationMarkerText: { fontSize: 28 },
  errorBanner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  errorBannerText: { color: '#B91C1C', fontSize: 13 },
  recenterButton: {
    position: 'absolute',
    // sits just above the sheet
    bottom: SHEET_COLLAPSED_HEIGHT + 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  recenterButtonText: { fontSize: 20, color: '#111827' },
  // KeyboardAvoidingView wraps only the sheet, positioned at the bottom
  sheetWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  inputsCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  inputDivider: { height: 1, backgroundColor: '#E5E7EB', marginLeft: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  dotPickup: { backgroundColor: '#2563EB' },
  dotDestination: { backgroundColor: '#111827' },
  input: { flex: 1, fontSize: 15, color: '#111827', paddingVertical: 0 },
  suggestionsPanel: { marginTop: 10, maxHeight: 220 },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  suggestionIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  suggestionTitle: { fontSize: 15, color: '#111827', fontWeight: '500' },
  suggestionSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  confirmButton: {
    marginTop: 12,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  confirmButtonDisabled: { opacity: 0.6 },
  confirmButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  driverMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  driverMarkerText: { fontSize: 20 },
  categoryContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  categoryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  categoryCardActive: {
    borderColor: '#111827',
    backgroundColor: '#111827',
  },
  categoryIcon: { fontSize: 22, marginBottom: 4 },
  categoryLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  categoryLabelActive: { color: '#FFFFFF' },
  categoryFare: { fontSize: 12, fontWeight: '700', color: '#111827', marginTop: 2 },
  categoryFareActive: { color: '#FFFFFF' },
  categoryDesc: { fontSize: 10, color: '#9CA3AF', marginTop: 2, textAlign: 'center' },
});
