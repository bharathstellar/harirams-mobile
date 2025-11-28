import { getBookingForCheckout, submitCheckout } from '@/utils/api';
import { clearAllStoredData, isAdmin } from '@/utils/userRole';
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
  actual_checkin_time?: string;
  checkin_by?: string;
  customer_name: string;
  customer_mobile: string;
  customer_address?: string;
  customer_city?: string;
  customer_state?: string;
  customer_zip?: string;
  total_amount: number;
  advance_amount: number;
  pending_amount: number;
  advance_payment_mode: string;
  status: string;
  guest_name?: string;
  guest_mobile?: string;
};

export default function CheckoutSummary() {
  const insets = useSafeAreaInsets();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [checkoutConfirmed, setCheckoutConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [miscCharges, setMiscCharges] = useState('');
  const [pendingCollected, setPendingCollected] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');

  // Fetch booking details
  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  // Prevent back navigation after checkout is confirmed
  useEffect(() => {
    if (checkoutConfirmed) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        return true;
      });
      return () => backHandler.remove();
    }
  }, [checkoutConfirmed]);

  // Handle Android back button
  useEffect(() => {
    if (Platform.OS === 'android' && !checkoutConfirmed) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        router.back();
        return true;
      });
      return () => backHandler.remove();
    }
  }, [checkoutConfirmed]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const data = await getBookingForCheckout(bookingId);
      if (data.success && data.booking) {
        setBooking(data.booking);
        // Pre-fill pending collected with pending amount
        if (data.booking.pending_amount) {
          setPendingCollected(data.booking.pending_amount.toString());
        }
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: data.message || 'Failed to load booking details',
        });
      }
    } catch (e: any) {
      console.error('Error fetching booking details:', e);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: e?.message || 'Failed to load booking details',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCheckout = async () => {
    if (!bookingId) {
      Alert.alert('Error', 'Booking ID is missing.');
      return;
    }

    const miscChargesNum = parseFloat(miscCharges) || 0;
    const pendingCollectedNum = parseFloat(pendingCollected) || 0;

    if (pendingCollectedNum < 0) {
      Alert.alert('Error', 'Pending collected amount cannot be negative.');
      return;
    }

    setSubmitting(true);
    try {
      const checkoutData = {
        misc_charges: miscChargesNum,
        pending_collected: pendingCollectedNum,
        payment_mode: paymentMode.toLowerCase(),
      };

      const response = await submitCheckout(bookingId, checkoutData);
      const responseText = await response.text();
      let data: any = null;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (e) {
        console.error('Error parsing response:', e);
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || `Checkout failed: ${response.status}`);
      }

      Toast.show({
        type: 'success',
        text1: 'Checkout Successful!',
        text2: `Booking ${bookingId} has been checked out.`,
      });

      setCheckoutConfirmed(true);

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
        text1: 'Checkout Failed',
        text2: error?.message || 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getRoomNumbers = (): string => {
    if (!booking?.rooms) return '-';
    try {
      if (Array.isArray(booking.rooms) && booking.rooms.length > 0) {
        const roomNumbers: string[] = [];
        for (const r of booking.rooms) {
          if (r && typeof r === 'object' && 'room_number' in r && r.room_number != null) {
            const num = String(r.room_number).trim();
            if (num) roomNumbers.push(num);
          }
        }
        return roomNumbers.length > 0 ? roomNumbers.join(', ') : '-';
      }
      return '-';
    } catch {
      return '-';
    }
  };

  const totalToPay = (booking?.pending_amount || 0) + (parseFloat(miscCharges) || 0);
  const pendingCollectedNum = parseFloat(pendingCollected) || 0;

  return (
    <View style={[styles.container, { paddingBottom: Math.max(10, insets.bottom) }]}>
      <PageHeader
        title="Checkout Summary"
        showBack={!checkoutConfirmed}
        onBackPress={checkoutConfirmed ? undefined : () => router.back()}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Image source={require('../assets/harirams_logo.png')} style={styles.logo} />

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#43A047" />
              <Text style={styles.loadingText}>Loading booking details...</Text>
            </View>
          ) : booking ? (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Booking Information</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Booking ID:</Text>
                  <Text style={styles.infoValue}>{booking.BookingId}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Room:</Text>
                  <Text style={styles.infoValue}>{getRoomNumbers()}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Customer:</Text>
                  <Text style={styles.infoValue}>{booking.customer_name || booking.guest_name || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Mobile:</Text>
                  <Text style={styles.infoValue}>{booking.customer_mobile || booking.guest_mobile || '-'}</Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Booking Dates</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Check-in:</Text>
                  <Text style={styles.infoValue}>
                    {booking.checkin_date ? new Date(booking.checkin_date).toLocaleDateString() : '-'}
                  </Text>
                </View>
                {booking.actual_checkin_time && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Check-in Time:</Text>
                    <Text style={styles.infoValue}>
                      {new Date(booking.actual_checkin_time).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Check-out:</Text>
                  <Text style={styles.infoValue}>
                    {booking.checkout_date ? new Date(booking.checkout_date).toLocaleDateString() : '-'}
                  </Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Payment Details</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Total Amount:</Text>
                  <Text style={styles.infoValue}>₹{booking.total_amount?.toLocaleString() || '0'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Advance Paid:</Text>
                  <Text style={styles.infoValue}>₹{booking.advance_amount?.toLocaleString() || '0'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Payment Mode:</Text>
                  <Text style={styles.infoValue}>{booking.advance_payment_mode?.toUpperCase() || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Pending Amount:</Text>
                  <Text style={[styles.infoValue, styles.pendingAmount]}>
                    ₹{booking.pending_amount?.toLocaleString() || '0'}
                  </Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Checkout Details</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Miscellaneous Charges (₹):</Text>
                  <TextInput
                    style={styles.input}
                    value={miscCharges}
                    onChangeText={setMiscCharges}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Pending Amount Collected (₹):</Text>
                  <TextInput
                    style={styles.input}
                    value={pendingCollected}
                    onChangeText={setPendingCollected}
                    placeholder={booking.pending_amount?.toString() || '0'}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Payment Mode:</Text>
                  <View style={styles.paymentModeContainer}>
                    {['UPI', 'Cash', 'Card'].map((mode) => (
                      <TouchableOpacity
                        key={mode}
                        style={[styles.paymentModeButton, paymentMode === mode && styles.paymentModeButtonActive]}
                        onPress={() => setPaymentMode(mode)}
                      >
                        <Text
                          style={[
                            styles.paymentModeText,
                            paymentMode === mode && styles.paymentModeTextActive,
                          ]}
                        >
                          {mode}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total to Pay:</Text>
                  <Text style={styles.totalValue}>₹{totalToPay.toLocaleString()}</Text>
                </View>
              </View>

              {!checkoutConfirmed && (
                <LoadingButton
                  title="Confirm Checkout"
                  onPress={handleConfirmCheckout}
                  loading={submitting}
                  loadingText="Processing Checkout..."
                  style={styles.confirmButton}
                  textStyle={styles.confirmButtonText}
                />
              )}

              {checkoutConfirmed && (
                <View style={styles.successContainer}>
                  <Text style={styles.successText}>Checkout Confirmed Successfully!</Text>
                  <Text style={styles.successSubText}>Redirecting to dashboard...</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.center}>
              <Text style={styles.errorText}>Failed to load booking details</Text>
              <LoadingButton title="Retry" onPress={fetchBookingDetails} style={{ marginTop: 12 }} />
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
  pendingAmount: {
    color: '#C62828',
  },
  inputRow: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111',
  },
  paymentModeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentModeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  paymentModeButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  paymentModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  paymentModeTextActive: {
    color: '#fff',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E7D32',
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
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
    textAlign: 'center',
  },
});
