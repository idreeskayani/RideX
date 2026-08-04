import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { registerDriver } from '../../api/driver';

const CATEGORIES = [
  { label: '🚗  Mini', value: 'MINI', desc: 'Affordable everyday rides' },
  { label: '❄️  Ride AC', value: 'RIDE_AC', desc: 'Air-conditioned comfort' },
  { label: '⭐  Premium', value: 'PREMIUM', desc: 'Luxury vehicles' },
];

export default function DriverRegisterScreen({ navigation }: any) {
  const [cnic, setCnic] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedCategory = CATEGORIES.find(c => c.value === vehicleType);

  const onSubmit = async () => {
    if (!cnic.trim() || !licenseNumber.trim() || !vehicleModel.trim() || !vehicleNumber.trim() || !vehicleType) {
      Alert.alert('Error', 'Please fill all fields and select a vehicle category');
      return;
    }
    setLoading(true);
    try {
      await registerDriver({
        cnic: cnic.trim(),
        licenseNumber: licenseNumber.trim(),
        vehicleModel: vehicleModel.trim(),
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        vehicleType,
      });
      Alert.alert(
        'Application Submitted',
        'Your driver application is under review. You will be notified once approved.',
        [{ text: 'OK', onPress: () => navigation.replace('Tabs') }],
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <Text style={styles.title}>Register Your Vehicle</Text>
        <Text style={styles.subtitle}>Complete your driver profile to start accepting rides</Text>

        {/* Personal Documents */}
        <Text style={styles.sectionLabel}>Personal Documents</Text>

        <CustomInput
          label="CNIC Number"
          placeholder="42101-1234567-1"
          value={cnic}
          onChangeText={setCnic}
          keyboardType="number-pad"
          maxLength={15}
        />

        <CustomInput
          label="License Number"
          placeholder="LHR-123456"
          value={licenseNumber}
          onChangeText={setLicenseNumber}
          autoCapitalize="characters"
        />

        {/* Vehicle Info */}
        <Text style={styles.sectionLabel}>Vehicle Information</Text>

        <CustomInput
          label="Vehicle Model"
          placeholder="Toyota Corolla 2020"
          value={vehicleModel}
          onChangeText={setVehicleModel}
        />

        <CustomInput
          label="Vehicle Number Plate"
          placeholder="ABC-123"
          value={vehicleNumber}
          onChangeText={setVehicleNumber}
          autoCapitalize="characters"
        />

        {/* Category Dropdown */}
        <Text style={styles.fieldLabel}>Vehicle Category</Text>
        <TouchableOpacity
          style={[styles.dropdownTrigger, dropdownOpen && styles.dropdownTriggerOpen]}
          onPress={() => setDropdownOpen(prev => !prev)}
          activeOpacity={0.8}>
          <Text style={selectedCategory ? styles.dropdownSelected : styles.dropdownPlaceholder}>
            {selectedCategory ? selectedCategory.label : 'Select a category'}
          </Text>
          <Text style={styles.dropdownArrow}>{dropdownOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {dropdownOpen && (
          <View style={styles.dropdownList}>
            {CATEGORIES.map((cat, index) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.dropdownItem,
                  vehicleType === cat.value && styles.dropdownItemActive,
                  index < CATEGORIES.length - 1 && styles.dropdownItemBorder,
                ]}
                onPress={() => { setVehicleType(cat.value); setDropdownOpen(false); }}
                activeOpacity={0.7}>
                <View>
                  <Text style={[styles.dropdownItemLabel, vehicleType === cat.value && styles.dropdownItemLabelActive]}>
                    {cat.label}
                  </Text>
                  <Text style={styles.dropdownItemDesc}>{cat.desc}</Text>
                </View>
                {vehicleType === cat.value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ marginTop: 24 }}>
          <CustomButton
            title="Submit Application"
            onPress={onSubmit}
            loading={loading}
          />
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: '#aaa', fontSize: 14, marginBottom: 32 },
  sectionLabel: {
    color: '#FFD60A',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
  },
  fieldLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  dropdownTrigger: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownTriggerOpen: {
    borderColor: '#FFD60A',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dropdownPlaceholder: { color: '#888', fontSize: 16 },
  dropdownSelected: { color: '#fff', fontSize: 16 },
  dropdownArrow: { color: '#888', fontSize: 12 },
  dropdownList: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#FFD60A',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  dropdownItemActive: { backgroundColor: '#222' },
  dropdownItemLabel: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  dropdownItemLabelActive: { color: '#FFD60A' },
  dropdownItemDesc: { color: '#666', fontSize: 12 },
  checkmark: { color: '#FFD60A', fontSize: 18, fontWeight: '700' },
});
