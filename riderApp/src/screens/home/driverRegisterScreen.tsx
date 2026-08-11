import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, Alert, TouchableOpacity, Image,
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { registerDriver } from '../../api/driver';

const CATEGORIES = [
  { label: '🚗  Mini', value: 'MINI', desc: 'Affordable everyday rides' },
  { label: '❄️  Ride AC', value: 'RIDE_AC', desc: 'Air-conditioned comfort' },
  { label: '⭐  Premium', value: 'PREMIUM', desc: 'Luxury vehicles' },
];

interface ImageFile {
  uri: string;
  name: string;
  type: string;
}

function ImagePicker({
  label, hint, value, onPick,
}: {
  label: string; hint: string; value: ImageFile | null; onPick: (img: ImageFile) => void;
}) {
  const pick = () => {
    Alert.alert(label, 'Choose source', [
      {
        text: 'Camera', onPress: () =>
          launchCamera({ mediaType: 'photo', quality: 0.7 }, res => {
            const asset = res.assets?.[0];
            if (asset?.uri) onPick({ uri: asset.uri, name: asset.fileName ?? 'photo.jpg', type: asset.type ?? 'image/jpeg' });
          }),
      },
      {
        text: 'Gallery', onPress: () =>
          launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, res => {
            const asset = res.assets?.[0];
            if (asset?.uri) onPick({ uri: asset.uri, name: asset.fileName ?? 'photo.jpg', type: asset.type ?? 'image/jpeg' });
          }),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <TouchableOpacity style={[styles.imagePicker, value && styles.imagePickerDone]} onPress={pick} activeOpacity={0.8}>
      {value ? (
        <View style={styles.imagePreviewRow}>
          <Image source={{ uri: value.uri }} style={styles.imageThumb} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.imagePickerLabel}>{label}</Text>
            <Text style={styles.imagePickerDoneText}>✓ Photo selected</Text>
          </View>
          <Text style={styles.imageChangeText}>Change</Text>
        </View>
      ) : (
        <View style={styles.imagePickerEmpty}>
          <Text style={styles.imagePickerIcon}>📷</Text>
          <View>
            <Text style={styles.imagePickerLabel}>{label}</Text>
            <Text style={styles.imagePickerHint}>{hint}</Text>
          </View>
          <Text style={styles.imagePickerArrow}>›</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function DriverRegisterScreen({ navigation }: any) {
  const [cnic, setCnic] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [licenseImage, setLicenseImage] = useState<ImageFile | null>(null);
  const [cnicImage, setCnicImage] = useState<ImageFile | null>(null);
  const [selfieImage, setSelfieImage] = useState<ImageFile | null>(null);

  const selectedCategory = CATEGORIES.find(c => c.value === vehicleType);

  const onSubmit = async () => {
    if (!cnic.trim() || !licenseNumber.trim() || !vehicleModel.trim() || !vehicleNumber.trim() || !vehicleType) {
      Alert.alert('Error', 'Please fill all fields and select a vehicle category');
      return;
    }
    if (!licenseImage || !cnicImage || !selfieImage) {
      Alert.alert('Error', 'Please upload your license photo, CNIC photo, and selfie');
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
        licenseImage,
        cnicImage,
        selfieImage,
      });
      Alert.alert(
        'Application Submitted',
        'Your driver application is under review. Admin will verify your documents and notify you once approved.',
        [{ text: 'OK', onPress: () => navigation.replace('Tabs') }],
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

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

        {/* Document Photos */}
        <Text style={styles.sectionLabel}>Document Photos</Text>

        <ImagePicker
          label="License Photo"
          hint="Front side of your driving license"
          value={licenseImage}
          onPick={setLicenseImage}
        />

        <ImagePicker
          label="CNIC Photo"
          hint="Front side of your national ID card"
          value={cnicImage}
          onPick={setCnicImage}
        />

        <ImagePicker
          label="Selfie"
          hint="Clear photo of your face"
          value={selfieImage}
          onPick={setSelfieImage}
        />

        {/* Vehicle Info */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Vehicle Information</Text>

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
                {vehicleType === cat.value && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ marginTop: 24 }}>
          <CustomButton title="Submit Application" onPress={onSubmit} loading={loading} />
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: '#aaa', fontSize: 14, marginBottom: 32 },
  sectionLabel: {
    color: '#FFD60A', fontSize: 12, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, marginTop: 8,
  },
  fieldLabel: { color: '#fff', fontSize: 14, fontWeight: '500', marginBottom: 6 },
  imagePicker: {
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333',
    borderRadius: 12, padding: 14, marginBottom: 12,
  },
  imagePickerDone: { borderColor: '#FFD60A' },
  imagePickerEmpty: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  imagePreviewRow: { flexDirection: 'row', alignItems: 'center' },
  imageThumb: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#333' },
  imagePickerIcon: { fontSize: 24 },
  imagePickerLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  imagePickerHint: { color: '#666', fontSize: 12, marginTop: 2 },
  imagePickerDoneText: { color: '#FFD60A', fontSize: 12, marginTop: 2 },
  imagePickerArrow: { color: '#666', fontSize: 22, marginLeft: 'auto' },
  imageChangeText: { color: '#FFD60A', fontSize: 12, fontWeight: '600', marginLeft: 8 },
  dropdownTrigger: {
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dropdownTriggerOpen: { borderColor: '#FFD60A', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  dropdownPlaceholder: { color: '#888', fontSize: 16 },
  dropdownSelected: { color: '#fff', fontSize: 16 },
  dropdownArrow: { color: '#888', fontSize: 12 },
  dropdownList: {
    backgroundColor: '#1a1a1a', borderWidth: 1, borderTopWidth: 0,
    borderColor: '#FFD60A', borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
    overflow: 'hidden', marginBottom: 4,
  },
  dropdownItem: {
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  dropdownItemActive: { backgroundColor: '#222' },
  dropdownItemLabel: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  dropdownItemLabelActive: { color: '#FFD60A' },
  dropdownItemDesc: { color: '#666', fontSize: 12 },
  checkmark: { color: '#FFD60A', fontSize: 18, fontWeight: '700' },
});
