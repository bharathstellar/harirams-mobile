import { getBookingForCheckout, submitCheckout } from '@/utils/api';
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
  actual_checkin_time: string;
  checkin_by: string;
  customer_name: string;
  customer_mobile: string;
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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutConfirmed, setCheckoutConfirmed] = useState(false);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [miscCharges, setMiscCharges] = useState('');
  const [pendingCollected, setPendingCollected] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card'>('upi');

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

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBookingForCheckout(bookingId);
      if (data.success && data.booking) {
        setBooking(data.booking);
        // Pre-fill pending collected with pending amount
        if (data.booking.pending_amount) {
          setPendingCollected(String(data.booking.pending_amount));
        }
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

  const handleConfirmCheckout = async () => {
    if (!bookingId) {
      Alert.alert('Error', 'Booking ID is missing.');
      return;
    }

    if (!pendingCollected.trim()) {
      Alert.alert('Required Field', 'Please enter pending collected amount.');
      return;
    }

    const pendingValue = parseFloat(pendingCollected);
    if (isNaN(pendingValue) || pendingValue < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid pending collected amount.');
      return;
    }

    setSubmitting(true);
    try {
      const checkoutData: any = {
        pending_collected: pendingValue,
        payment_mode: paymentMode,
      };

      // Add misc_charges only if provided
      if (miscCharges.trim()) {
        const miscValue = parseFloat(miscCharges);
        if (!isNaN(miscValue) && miscValue >= 0) {
          checkoutData.misc_charges = miscValue;
        }
      }

      const data = await submitCheckout(bookingId, checkoutData);

      if (!data?.success) {
        throw new Error(data?.message || 'Checkout failed');
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
      console.error('Checkout error:', error);
      Toast.show({
        type: 'error',
        text1: 'Checkout Failed',
        text2: error?.message || 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <PageHeader title="Checkout Summary" onBackPress={() => router.back()} />
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
        <PageHeader title="Checkout Summary" onBackPress={() => router.back()} />
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
      <PageHeader
        title="Checkout Summary"
        showBack={!checkoutConfirmed}
        onBackPress={checkoutConfirmed ? undefined : () => router.back()}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Image source={require('../assets/harirams_logo.png')} style={styles.logo} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Booking ID:</Text>
              <Text style={styles.infoValue}>{booking.BookingId}</Text>
            </View>
            {booking.rooms && Array.isArray(booking.rooms) && booking.rooms.length > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Room:</Text>
                <Text style={styles.infoValue}>
                  {booking.rooms.map((r: { room_id: string; room_number: string }) => r.room_number).join(', ')}
                </Text>
              </View>
            )}
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
            <Text style={styles.sectionTitle}>Payment Summary</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Amount:</Text>
              <Text style={styles.infoValue}>₹{booking.total_amount?.toLocaleString() || 0}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Advance Paid:</Text>
              <Text style={styles.infoValue}>₹{booking.advance_amount?.toLocaleString() || 0}</Text>
            </View>
            {booking.pending_amount > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Pending Amount:</Text>
                <Text style={[styles.infoValue, styles.pendingAmount]}>₹{booking.pending_amount?.toLocaleString() || 0}</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Checkout Details</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Miscellaneous Charges (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter miscellaneous charges"
                placeholderTextColor="#999"
                value={miscCharges}
                onChangeText={(value) => setMiscCharges(value.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Pending Collected *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#fff' }]}
                editable={false}
                placeholder="Enter pending collected amount"
                placeholderTextColor="#999"
                value={pendingCollected}
                onChangeText={(value) => setPendingCollected(value.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Total Calculation */}
            <View style={styles.totalContainer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Pending Amount:</Text>
                <Text style={styles.totalValue}>₹{booking.pending_amount?.toLocaleString() || 0}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Misc Charges:</Text>
                <Text style={styles.totalValue}>₹{miscCharges ? parseFloat(miscCharges).toLocaleString() : '0'}</Text>
              </View>
              <View style={[styles.totalRow, styles.totalFinalRow]}>
                <Text style={styles.totalFinalLabel}>Total to Collect:</Text>
                <Text style={styles.totalFinalValue}>
                  ₹{((booking.pending_amount || 0) + (miscCharges ? parseFloat(miscCharges) || 0 : 0)).toLocaleString()}
                </Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Payment Mode *</Text>
              <View style={styles.radioGroup}>
              <TouchableOpacity
                  style={[styles.radioOption, paymentMode === 'upi' && styles.radioOptionSelected]}
                  onPress={() => setPaymentMode('upi')}
                >
                  <Text style={[styles.radioText, paymentMode === 'upi' && styles.radioTextSelected]}>UPI</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioOption, paymentMode === 'cash' && styles.radioOptionSelected]}
                  onPress={() => setPaymentMode('cash')}
                >
                  <Text style={[styles.radioText, paymentMode === 'cash' && styles.radioTextSelected]}>Cash</Text>
                </TouchableOpacity>
           
                <TouchableOpacity
                  style={[styles.radioOption, paymentMode === 'card' && styles.radioOptionSelected]}
                  onPress={() => setPaymentMode('card')}
                >
                  <Text style={[styles.radioText, paymentMode === 'card' && styles.radioTextSelected]}>Card</Text>
                </TouchableOpacity>
              </View>
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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
  pendingAmount: {
    color: '#C62828',
  },
  formGroup: {
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
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
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
  totalContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  totalFinalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalFinalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
  },
  totalFinalValue: {
    fontSize: 18,
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
});

