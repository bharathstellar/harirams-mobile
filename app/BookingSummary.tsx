import { API_CONFIG } from '@/utils/api';
import { clearAllStoredData, isAdmin } from '@/utils/userRole';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useDispatch, useSelector } from 'react-redux';
import LoadingButton from '../components/LoadingButton';
import PageHeader from '../components/PageHeader';
import { RootState, store } from '../store';
import { resetBooking } from '../store/slices/bookingSlice';

export default function BookingSummary() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [proofImage, setProofImage] = useState<{ uri: string; name?: string } | null>(null);

  // Prevent back navigation after booking is confirmed
  useEffect(() => {
    if (bookingConfirmed) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // Prevent going back after booking confirmation
        return true;
      });
      
      return () => backHandler.remove();
    }
  }, [bookingConfirmed]);

  const selectedRooms = useSelector((state: RootState) => state.booking.selectedRooms);
  const selectedRoomIds = useSelector((state: RootState) => state.booking.selectedRoomIds);
  const customerPhone = useSelector((state: RootState) => state.booking.customerPhone);
  const customerDetails = useSelector((state: RootState) => state.booking.customerDetails);
  const totalAmount = useSelector((state: RootState) => state.booking.totalAmount);
  const advanceAmount = useSelector((state: RootState) => state.booking.advanceAmount);
  const paymentMode = useSelector((state: RootState) => state.booking.paymentMode);
  const checkInDate = useSelector((state: RootState) => state.booking.checkInDate);
  const checkOutDate = useSelector((state: RootState) => state.booking.checkOutDate);
  const reduxProof = useSelector((state: RootState) => state.booking.aadharProof);

  React.useEffect(() => {
    if (reduxProof) {
      setProofImage(reduxProof);
    }
  }, [reduxProof]);

  const handleConfirmBooking = async () => {
    // Proof is validated in CustomerDetails, so we just check if it exists
    const state = store.getState();
    const proofBlob = state.booking.aadharProofBlob;
    if (!proofBlob && !proofImage) {
      Alert.alert('Proof Required', 'Please go back and upload customer proof (Aadhar/ID).');
      return;
    }

    if (!selectedRooms || selectedRooms.length === 0) {
      Alert.alert('Error', 'No rooms selected.');
      return;
    }

    if (!checkInDate || !checkOutDate) {
      Alert.alert('Error', 'Check-in and check-out dates are required.');
      return;
    }

    setLoading(true);

    try {
      // Get room IDs from Redux
      const roomIds = selectedRoomIds.length > 0 ? selectedRoomIds : selectedRooms;

      // Create FormData
      const formData = new FormData();
      
      // Add all selected room IDs as an array (for multiple room booking)
      // Try without brackets first - some backends parse multiple fields with same name as array
      if (roomIds.length > 0) {
        roomIds.forEach((roomId: string) => {
          formData.append('room_id', roomId);
        });
      }

      // Required fields matching sample payload format
      formData.append('customer_mobile', customerPhone);
      formData.append('checkin_date', checkInDate); // Format: "2025-11-20"
      formData.append('checkout_date', checkOutDate); // Format: "2025-11-21"
      formData.append('total_amount', totalAmount?.toString() || '0'); // Number as string
      formData.append('advance_amount', advanceAmount?.toString() || '0'); // Number as string
      formData.append('advance_payment_mode', (paymentMode || 'UPI').toLowerCase()); // "upi"
      formData.append('customer_name', customerDetails?.name || '');
      formData.append('customer_city', customerDetails?.city || '');
      formData.append('customer_state', customerDetails?.state || '');
      formData.append('customer_zip', customerDetails?.pincode || '');
      formData.append('customer_address', customerDetails?.address || '');

      // Add proof file
      const state = store.getState();
      const proofBlob = state.booking.aadharProofBlob;
      if (proofBlob && proofImage?.uri) {
        // For React Native, FormData can accept file objects directly
        formData.append('customer_proof', {
          uri: proofImage.uri,
          type: proofBlob.contentType,
          name: proofBlob.name,
        } as any);
      }

      // Get auth token
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorage.getItem('userToken');

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CreateBooking}`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          // Don't set Content-Type, let FormData set it with boundary
        },
        body: formData as any,
      });

      const responseText = await response.text();
      let data: any = null;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (e) {
        console.error('Error parsing response:', e);
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || `Booking failed: ${response.status}`);
      }

      Toast.show({
        type: 'success',
        text1: 'Booking Successful!',
        text2: `Booking ID: ${data.booking?.BookingId || 'N/A'}`,
      });

      // Mark booking as confirmed to prevent back navigation
      setBookingConfirmed(true);

      // Reset booking state - clear all stored data
      setTimeout(() => {
        dispatch(resetBooking());
      }, 3000);

      // Clear all stored values from AsyncStorage
      await clearAllStoredData();

      // Check if user is admin and navigate accordingly
      const userIsAdmin = await isAdmin();
      const targetRoute = userIsAdmin ? '/adminDashboard' : '/staffDashboard';

      // Navigate to appropriate dashboard - replace to prevent going back
      setTimeout(() => {
        router.replace(targetRoute);
      }, 2000);

    } catch (error: any) {
      console.error('Booking error:', error);
      Toast.show({
        type: 'error',
        text1: 'Booking Failed',
        text2: error?.message || 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };


  const pendingAmount = (totalAmount || 0) - (advanceAmount || 0);

  return (
    <View style={[styles.container, { paddingBottom: Math.max(10, insets.bottom) }]}>
      <PageHeader 
        title="Booking Summary" 
        showBack={!bookingConfirmed}
        onBackPress={bookingConfirmed ? undefined : () => router.back()} 
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Image
            source={require('../assets/harirams_logo.png')}
            style={styles.logo}
          />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoValue}>{customerDetails?.name || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mobile:</Text>
              <Text style={styles.infoValue}>{customerPhone || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address:</Text>
              <Text style={styles.infoValue}>{customerDetails?.address || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>City:</Text>
              <Text style={styles.infoValue}>{customerDetails?.city || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>State:</Text>
              <Text style={styles.infoValue}>{customerDetails?.state || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Zip:</Text>
              <Text style={styles.infoValue}>{customerDetails?.pincode || '-'}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Rooms:</Text>
              <Text style={styles.infoValue}>{selectedRooms?.join(', ') || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Check-in:</Text>
              <Text style={styles.infoValue}>
                {checkInDate ? (() => {
                  const date = new Date(checkInDate);
                  const day = date.getDate();
                  const month = date.getMonth() + 1;
                  const year = date.getFullYear();
                  return `${day}/${month}/${year}`;
                })() : '-'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Check-out:</Text>
              <Text style={styles.infoValue}>
                {checkOutDate ? (() => {
                  const date = new Date(checkOutDate);
                  const day = date.getDate();
                  const month = date.getMonth() + 1;
                  const year = date.getFullYear();
                  return `${day}/${month}/${year}`;
                })() : '-'}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Amount:</Text>
              <Text style={styles.infoValue}>₹{totalAmount?.toLocaleString() || '0'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Advance Amount:</Text>
              <Text style={styles.infoValue}>₹{advanceAmount?.toLocaleString() || '0'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pending Amount:</Text>
              <Text style={[styles.infoValue, styles.pendingAmount]}>₹{pendingAmount.toLocaleString()}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment Mode:</Text>
              <Text style={styles.infoValue}>{paymentMode || '-'}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Proof</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={[styles.infoValue, proofImage ? styles.proofUploaded : styles.noProofText]}>
                {proofImage ? 'Uploaded' : 'Not Uploaded'}
              </Text>
            </View>
            {proofImage && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>File Name:</Text>
                <Text style={styles.infoValue}>{proofImage.name || '-'}</Text>
              </View>
            )}
          </View>

          <LoadingButton
            title="Confirm Booking"
            onPress={handleConfirmBooking}
            loading={loading}
            loadingText="Creating Booking..."
            style={styles.confirmButton}
            textStyle={styles.confirmButtonText}
          />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 30,
  },
  section: {
    width: '100%',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#000',
    flex: 2,
    textAlign: 'right',
  },
  pendingAmount: {
    color: '#C62828',
    fontWeight: 'bold',
  },
  proofUploaded: {
    color: '#4CAF50',
    fontWeight: '700',
  },
  noProofText: {
    color: '#C62828',
    fontWeight: '700',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

