import { API_CONFIG } from '@/utils/api';
import { getBookingForCheckIn, submitCheckIn } from '@/utils/api';
import { clearAllStoredData, isAdmin } from '@/utils/userRole';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import LoadingButton from '../components/LoadingButton';
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
  total_amount: number;
  advance_amount: number;
  pending_amount: number;
  advance_payment_mode: string;
  status: string;
};

export default function CheckInSummary() {
  const insets = useSafeAreaInsets();
  const { bookingId, checkin_by, guest_name, guest_mobile, guest_address, guest_city, guest_state, guest_zip, hasGuestProof, guestProofName, guestProofUri, guestProofData, hasVehicleProof, vehicleProofName, vehicleProofUri, vehicleProofData } = useLocalSearchParams<{
    bookingId: string;
    checkin_by: string;
    guest_name?: string;
    guest_mobile?: string;
    guest_address?: string;
    guest_city?: string;
    guest_state?: string;
    guest_zip?: string;
    hasGuestProof?: string;
    guestProofName?: string;
    guestProofUri?: string;
    guestProofData?: string;
    hasVehicleProof: string;
    vehicleProofName?: string;
    vehicleProofUri?: string;
    vehicleProofData?: string;
  }>();
  const [submitting, setSubmitting] = useState(false);
  const [checkInConfirmed, setCheckInConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingDetail | null>(null);

  // Fetch booking details
  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  // Prevent back navigation after check-in is confirmed
  useEffect(() => {
    if (checkInConfirmed) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        return true;
      });
      return () => backHandler.remove();
    }
  }, [checkInConfirmed]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const data = await getBookingForCheckIn(bookingId);
      if (data.success && data.booking) {
        setBooking(data.booking);
      }
    } catch (e: any) {
      console.error('Error fetching booking details:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!bookingId) {
      Alert.alert('Error', 'Booking ID is missing.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('checkin_by', checkin_by || 'self');
      if (checkin_by === 'guest') {
        formData.append('guest_name', guest_name || '');
        formData.append('guest_mobile', guest_mobile || '');
        formData.append('guest_address', guest_address || '');
        formData.append('guest_city', guest_city || '');
        formData.append('guest_state', guest_state || '');
        formData.append('guest_zip', guest_zip || '');
        
        // Add guest proof if available
        if (hasGuestProof === 'true' && guestProofUri && guestProofData) {
          try {
            const proofBlob = JSON.parse(guestProofData);
            const file = {
              uri: `data:${proofBlob.contentType};base64,${proofBlob.dataBase64}`,
              name: proofBlob.name,
              type: proofBlob.contentType,
            } as any;
            formData.append('guest_proof', file);
          } catch (e) {
            console.error('Error parsing guest proof data:', e);
          }
        }
      }

      // Add vehicle proof if available
      if (hasVehicleProof === 'true' && vehicleProofUri && vehicleProofData) {
        try {
          const proofBlob = JSON.parse(vehicleProofData);
          const file = {
            uri: `data:${proofBlob.contentType};base64,${proofBlob.dataBase64}`,
            name: proofBlob.name,
            type: proofBlob.contentType,
          } as any;
          formData.append('vehicle_proof', file);
        } catch (e) {
          console.error('Error parsing vehicle proof data:', e);
        }
      }

      const response = await submitCheckIn(bookingId, formData);
      const responseText = await response.text();
      let data: any = null;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (e) {
        console.error('Error parsing response:', e);
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || `Check-in failed: ${response.status}`);
      }

      Toast.show({
        type: 'success',
        text1: 'Check-In Successful!',
        text2: `Booking ${bookingId} has been checked in.`,
      });

      setCheckInConfirmed(true);

      // Clear all stored values from AsyncStorage
      await clearAllStoredData();

      // Check if user is admin and navigate accordingly
      const userIsAdmin = await isAdmin();
      const targetRoute = userIsAdmin ? '/adminDashboard' : '/staffDashboard';

      // Navigate to appropriate dashboard
      setTimeout(() => {
        router.replace(targetRoute);
      }, 2000);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Check-In Failed',
        text2: error?.message || 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(10, insets.bottom) }]}>
      <PageHeader
        title="Check-In Summary"
        showBack={!checkInConfirmed}
        onBackPress={checkInConfirmed ? undefined : () => router.back()}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Image source={require('../assets/harirams_logo.png')} style={styles.logo} />

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#43A047" />
              <Text style={styles.loadingText}>Loading booking details...</Text>
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Booking Information</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Booking ID:</Text>
                  <Text style={styles.infoValue}>{booking?.BookingId || bookingId}</Text>
                </View>
                {booking?.rooms && Array.isArray(booking.rooms) && booking.rooms.length > 0 && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Room:</Text>
                    <Text style={styles.infoValue}>
                      {booking.rooms.map((r: { room_id: string; room_number: string }) => r.room_number).join(', ')}
                    </Text>
                  </View>
                )}
              </View>

              {booking && (
                <>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Booking Dates</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Check-in:</Text>
                      <Text style={styles.infoValue}>{new Date(booking.checkin_date).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Check-out:</Text>
                      <Text style={styles.infoValue}>{new Date(booking.checkout_date).toLocaleDateString()}</Text>
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Payment Details</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Total Amount:</Text>
                      <Text style={styles.infoValue}>₹{booking.total_amount?.toLocaleString() || 0}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Advance Paid:</Text>
                      <Text style={styles.infoValue}>₹{booking.advance_amount?.toLocaleString() || 0}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Payment Mode:</Text>
                      <Text style={styles.infoValue}>{booking.advance_payment_mode?.toUpperCase() || '-'}</Text>
                    </View>
                    {booking.pending_amount > 0 && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Pending Amount:</Text>
                        <Text style={[styles.infoValue, styles.pendingAmount]}>₹{booking.pending_amount?.toLocaleString() || 0}</Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Check-In Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Check-in By:</Text>
              <Text style={styles.infoValue}>{checkin_by === 'guest' ? 'Guest' : 'Self'}</Text>
            </View>
            {checkin_by === 'guest' && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Guest Name:</Text>
                  <Text style={styles.infoValue}>{guest_name || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Guest Mobile:</Text>
                  <Text style={styles.infoValue}>{guest_mobile || '-'}</Text>
                </View>
                {guest_address && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Guest Address:</Text>
                    <Text style={styles.infoValue}>{guest_address}</Text>
                  </View>
                )}
                {(guest_city || guest_state || guest_zip) && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Location:</Text>
                    <Text style={styles.infoValue}>
                      {[guest_city, guest_state, guest_zip].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Guest Proof:</Text>
                  <Text style={[styles.infoValue, hasGuestProof === 'true' ? styles.statusUploaded : styles.statusNotUploaded]}>
                    {hasGuestProof === 'true' ? 'Uploaded' : 'Not Uploaded'}
                  </Text>
                </View>
                {hasGuestProof === 'true' && guestProofName && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Proof File:</Text>
                    <Text style={styles.infoValue}>{guestProofName}</Text>
                  </View>
                )}
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle Proof</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={[styles.infoValue, hasVehicleProof === 'true' ? styles.statusUploaded : styles.statusNotUploaded]}>
                {hasVehicleProof === 'true' ? 'Uploaded' : 'Not Uploaded'}
              </Text>
            </View>
            {hasVehicleProof === 'true' && vehicleProofName && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>File Name:</Text>
                <Text style={styles.infoValue}>{vehicleProofName}</Text>
              </View>
            )}
          </View>

          {!checkInConfirmed && (
            <LoadingButton
              title="Confirm Check-In"
              onPress={handleConfirmCheckIn}
              loading={submitting}
              loadingText="Processing Check-In..."
              style={styles.confirmButton}
              textStyle={styles.confirmButtonText}
            />
          )}

          {checkInConfirmed && (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>Check-In Confirmed Successfully!</Text>
              <Text style={styles.successSubText}>Redirecting to dashboard...</Text>
            </View>
          )}
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
  statusUploaded: {
    color: '#4CAF50',
  },
  statusNotUploaded: {
    color: '#999',
  },
  confirmButton: {
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
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  successContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  successText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 8,
  },
  successSubText: {
    fontSize: 14,
    color: '#666',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  pendingAmount: {
    color: '#C62828',
  },
});

