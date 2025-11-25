import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { API_CONFIG } from '@/utils/api';
import { getBookingForCheckIn } from '@/utils/api';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import PageHeader from '../components/PageHeader';

type BookingDetail = {
  _id: string;
  BookingId: string;
  rooms: Array<{
    room_id: string;
    room_number: string;
  }>;
  checkin_date: string;
  checkout_date: string;
  customer_name: string;
  customer_mobile: string;
  customer_address: string;
  customer_city: string;
  customer_state: string;
  customer_zip: string;
  total_amount: number;
  advance_amount: number;
  pending_amount: number;
  advance_payment_mode: string;
  status: string;
};

export default function BookingDetail() {
  const insets = useSafeAreaInsets();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkinBy, setCheckinBy] = useState<'self' | 'guest'>('self');
  const [guestForm, setGuestForm] = useState({
    guest_name: '',
    guest_mobile: '',
    guest_address: '',
    guest_city: '',
    guest_state: '',
    guest_zip: '',
  });
  const [guestProof, setGuestProof] = useState<{ uri: string; name?: string; type?: 'image' | 'pdf'; dataBase64?: string } | null>(null);
  const [cityStateLocked, setCityStateLocked] = useState(false);

  // Handle Android back button
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        router.back();
        return true;
      });
      return () => backHandler.remove();
    }
  }, []);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBookingForCheckIn(bookingId);
      if (data.success && data.booking) {
        setBooking(data.booking);
      } else {
        setError(data.message || 'Failed to load booking details');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load booking details');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: e?.message || 'Failed to load booking details',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setGuestForm(prev => ({ ...prev, [field]: value }));
  };

  // Auto-fill city/state by pincode
  const fetchCityState = async (pincode: string) => {
    if (pincode.length !== 6) {
      setCityStateLocked(false);
      handleInputChange('guest_city', '');
      handleInputChange('guest_state', '');
      return;
    }

    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();
      if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
        const postOffice = data[0].PostOffice[0];
        handleInputChange('guest_city', postOffice.District || '');
        handleInputChange('guest_state', postOffice.State || '');
        setCityStateLocked(true);
      } else {
        setCityStateLocked(false);
      }
    } catch (error) {
      setCityStateLocked(false);
    }
  };

  // Compress image to under 5MB
  const getCompressedBase64 = async (uri: string, targetWidth = 800, quality = 0.5, maxSize = 3900000) => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: targetWidth } }],
        { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!result.base64) return null;

      if (result.base64.length > maxSize && targetWidth > 400) {
        return getCompressedBase64(
          uri,
          Math.floor(targetWidth * 0.8),
          Math.max(0.2, quality - 0.1),
          maxSize
        );
      }

      return { base64: result.base64, contentType: 'image/jpeg', uri: result.uri };
    } catch (error) {
      console.error('Compression error:', error);
      return null;
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera permission is needed to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: false,
        base64: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      if (!asset?.uri) {
        Alert.alert('Error', 'No image captured');
        return;
      }

      const compressed = await getCompressedBase64(asset.uri);
      if (!compressed) {
        Alert.alert('Error', 'Failed to process image');
        return;
      }

      const timestamp = Date.now().toString().slice(-8);
      const fileName = `g${timestamp}.jpg`;

      setGuestProof({ uri: compressed.uri || asset.uri, name: fileName, type: 'image', dataBase64: compressed.base64 });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to take photo');
    }
  };

  const selectFile = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.fileName || asset.uri.split('/').pop() || `guest_${Date.now()}`;
        const isPdf = fileName.toLowerCase().endsWith('.pdf');
        
        if (isPdf) {
          setGuestProof({ uri: asset.uri, name: fileName, type: 'pdf' });
        } else {
          const compressed = await getCompressedBase64(asset.uri);
          if (compressed) {
            const timestamp = Date.now().toString().slice(-8);
            const shortFileName = `g${timestamp}.jpg`;
            setGuestProof({ uri: compressed.uri || asset.uri, name: shortFileName, type: 'image', dataBase64: compressed.base64 });
          } else {
            setGuestProof({ uri: asset.uri, name: fileName, type: 'image' });
          }
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to select file');
    }
  };

  const handleProceedToCheckIn = () => {
    if (!booking) return;

    // Validate guest fields if guest is selected
    if (checkinBy === 'guest') {
      if (!guestForm.guest_name.trim()) {
        Alert.alert('Required Field', 'Please enter guest name.');
        return;
      }
      if (!guestForm.guest_mobile.trim()) {
        Alert.alert('Required Field', 'Please enter guest mobile number.');
        return;
      }
      if (guestForm.guest_mobile.length !== 10) {
        Alert.alert('Invalid Mobile', 'Mobile number must be exactly 10 digits.');
        return;
      }
    }

    // Validate guest proof if guest is selected
    if (checkinBy === 'guest' && !guestProof) {
      Alert.alert('Required Field', 'Please upload guest proof (Aadhar/ID).');
      return;
    }

    // Navigate to vehicle proof screen
    router.push({
      pathname: '/CheckInVehicleProof',
      params: {
        bookingId: booking.BookingId,
        checkin_by: checkinBy,
        guest_name: checkinBy === 'guest' ? guestForm.guest_name : '',
        guest_mobile: checkinBy === 'guest' ? guestForm.guest_mobile : '',
        guest_address: checkinBy === 'guest' ? guestForm.guest_address : '',
        guest_city: checkinBy === 'guest' ? guestForm.guest_city : '',
        guest_state: checkinBy === 'guest' ? guestForm.guest_state : '',
        guest_zip: checkinBy === 'guest' ? guestForm.guest_zip : '',
        hasGuestProof: guestProof ? 'true' : 'false',
        guestProofName: guestProof?.name || '',
        guestProofUri: guestProof?.uri || '',
        guestProofData: guestProof?.dataBase64 ? JSON.stringify({ name: guestProof.name, dataBase64: guestProof.dataBase64, contentType: 'image/jpeg' }) : '',
      },
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <PageHeader title="Booking Details" onBackPress={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#43A047" />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </View>
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={[styles.container, styles.center]}>
        <PageHeader title="Booking Details" onBackPress={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'Booking not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchBookingDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(10, insets.bottom) }]}>
      <PageHeader title="Booking Details" onBackPress={() => router.back()} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Image source={require('../assets/harirams_logo.png')} style={styles.logo} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Booking ID:</Text>
              <Text style={styles.infoValue}>{booking.BookingId}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Room:</Text>
              <Text style={styles.infoValue}>
                {Array.isArray(booking.rooms) && booking.rooms.length > 0
                  ? booking.rooms.map((r: { room_id: string; room_number: string }) => r.room_number).join(', ') 
                  : '-'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={[styles.infoValue, styles.statusText]}>{booking.status || 'future'}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoValue}>{booking.customer_name || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mobile:</Text>
              <Text style={styles.infoValue}>{booking.customer_mobile}</Text>
            </View>
            {booking.customer_address && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address:</Text>
                <Text style={styles.infoValue}>{booking.customer_address}</Text>
              </View>
            )}
            {(booking.customer_city || booking.customer_state || booking.customer_zip) && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Location:</Text>
                <Text style={styles.infoValue}>
                  {[booking.customer_city, booking.customer_state, booking.customer_zip].filter(Boolean).join(', ')}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Check-In Type</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[styles.radioOption, checkinBy === 'self' && styles.radioOptionSelected]}
                onPress={() => setCheckinBy('self')}
              >
                <Text style={[styles.radioText, checkinBy === 'self' && styles.radioTextSelected]}>Self</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioOption, checkinBy === 'guest' && styles.radioOptionSelected]}
                onPress={() => setCheckinBy('guest')}
              >
                <Text style={[styles.radioText, checkinBy === 'guest' && styles.radioTextSelected]}>Guest</Text>
              </TouchableOpacity>
            </View>

            {checkinBy === 'guest' && (
              <View style={styles.guestForm}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Guest Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter guest name"
                    placeholderTextColor="#999"
                    value={guestForm.guest_name}
                    onChangeText={(value) => {
                      const onlyAlpha = value.replace(/[^A-Za-z ]/g, "");
                      handleInputChange('guest_name', onlyAlpha);
                    }}
                    maxLength={150}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Guest Mobile *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter guest mobile number"
                    placeholderTextColor="#999"
                    value={guestForm.guest_mobile}
                    onChangeText={(value) => handleInputChange('guest_mobile', value.replace(/[^0-9]/g, ''))}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Zip Code</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter zip code"
                    placeholderTextColor="#999"
                    value={guestForm.guest_zip}
                    onChangeText={(value) => {
                      const cleaned = value.replace(/[^0-9]/g, '').slice(0, 6);
                      handleInputChange('guest_zip', cleaned);
                      if (cleaned.length === 6) {
                        fetchCityState(cleaned);
                      } else {
                        setCityStateLocked(false);
                        handleInputChange('guest_city', '');
                        handleInputChange('guest_state', '');
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>City</Text>
                    <TextInput
                      style={[styles.input, cityStateLocked && styles.inputDisabled]}
                      placeholder="City"
                      placeholderTextColor="#999"
                      value={guestForm.guest_city}
                      onChangeText={(value) => handleInputChange('guest_city', value)}
                      editable={!cityStateLocked}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>State</Text>
                    <TextInput
                      style={[styles.input, cityStateLocked && styles.inputDisabled]}
                      placeholder="State"
                      placeholderTextColor="#999"
                      value={guestForm.guest_state}
                      onChangeText={(value) => handleInputChange('guest_state', value)}
                      editable={!cityStateLocked}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Guest Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter guest address"
                    placeholderTextColor="#999"
                    value={guestForm.guest_address}
                    onChangeText={(value) => handleInputChange('guest_address', value)}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.uploadTitle}>Upload Guest Proof (Aadhar/ID) *</Text>
                  {guestProof ? (
                    <View>
                      <View style={styles.uploadBox}>
                        <View style={styles.filePreviewContainer}>
                          {guestProof.type === 'image' ? (
                            <>
                              <Image source={{ uri: guestProof.uri }} style={styles.previewImage} resizeMode="contain" />
                              <Text style={styles.fileName}>{guestProof.name}</Text>
                            </>
                          ) : (
                            <View style={styles.pdfContainer}>
                              <MaterialCommunityIcons name="file-pdf-box" size={50} color="red" />
                              <Text style={styles.fileName}>{guestProof.name}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <TouchableOpacity style={styles.removeButton} onPress={() => setGuestProof(null)}>
                        <Text style={styles.removeText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.uploadBox} onPress={selectFile} activeOpacity={0.7}>
                      <View style={styles.placeholderContainer}>
                        <Image source={require('../assets/upload-icon.png')} style={styles.uploadIcon} />
                        <Text style={styles.placeholderText}>Drag and Drop (or) click to Upload</Text>
                        <Text style={styles.supportText}>Supported Format : Jpg, Png or Pdf</Text>
                        <Text style={styles.orText}>or</Text>
                        <TouchableOpacity style={styles.takePhotoButton} onPress={takePhoto}>
                          <Text style={styles.takePhotoText}>Take a Photo</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.proceedButton} onPress={handleProceedToCheckIn}>
            <Text style={styles.proceedButtonText}>Proceed to Vehicle Proof</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  content: {
    padding: 16,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 24,
    resizeMode: 'contain',
  },
  section: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    flex: 1,
    textAlign: 'right',
  },
  statusText: {
    color: '#4CAF50',
    textTransform: 'capitalize',
  },
  pendingAmount: {
    color: '#C62828',
  },
  proceedButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4CAF50',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  radioOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  radioOptionSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  radioText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  radioTextSelected: {
    color: '#4CAF50',
  },
  guestForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#111',
  },
  inputDisabled: {
    backgroundColor: '#f0f0f0',
    color: '#666',
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    backgroundColor: '#fafafa',
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContainer: {
    alignItems: 'center',
  },
  uploadIcon: {
    width: 60,
    height: 60,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  supportText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  orText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  takePhotoButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  takePhotoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  filePreviewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  pdfContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  fileName: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  removeButton: {
    backgroundColor: '#f44336',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  removeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

