import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
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
import { useDispatch, useSelector } from 'react-redux';
import PageHeader from '../components/PageHeader';
import { RootState } from '../store';
import { setAdvanceAmount, setPaymentMode, setTotalAmount } from '../store/slices/bookingSlice';

export default function TotalAmount() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const reduxTotalAmount = useSelector((state: RootState) => state.booking.totalAmount);
  const reduxAdvanceAmount = useSelector((state: RootState) => state.booking.advanceAmount);
  const reduxPaymentMode = useSelector((state: RootState) => state.booking.paymentMode);

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

  const [totalAmount, setTotalAmountLocal] = useState(reduxTotalAmount?.toString() || '');
  const [advanceAmount, setAdvanceAmountLocal] = useState(reduxAdvanceAmount?.toString() || '');
  const [paymentMode, setPaymentModeLocal] = useState<'UPI' | 'Cash' | 'Card'>(reduxPaymentMode as 'UPI' | 'Cash' | 'Card' || 'UPI');
  const [advanceError, setAdvanceError] = useState<string>('');

  const handleNext = () => {
    // Validation
    if (!totalAmount.trim()) {
      Alert.alert('Error', 'Please enter total amount.');
      return;
    }
    const total = parseFloat(totalAmount);
    if (isNaN(total) || total <= 0) {
      Alert.alert('Error', 'Please enter a valid total amount.');
      return;
    }

    if (!advanceAmount.trim()) {
      Alert.alert('Error', 'Please enter advance amount.');
      return;
    }
    const advance = parseFloat(advanceAmount);
    if (isNaN(advance) || advance < 0) {
      Alert.alert('Error', 'Please enter a valid advance amount.');
      return;
    }

    if (advance > total) {
      Alert.alert('Error', 'Advance amount cannot be greater than total amount.');
      return;
    }

    // Save to Redux
    dispatch(setTotalAmount(total));
    dispatch(setAdvanceAmount(advance));
    dispatch(setPaymentMode(paymentMode));

    router.push('/BookingSummary');
  };

  const pendingAmount = () => {
    const total = parseFloat(totalAmount) || 0;
    const advance = parseFloat(advanceAmount) || 0;
    return Math.max(0, total - advance);
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(10, insets.bottom) }]}>
      <PageHeader title="Total Amount" onBackPress={() => router.back()} />

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

          <View style={styles.formGroup}>
            <Text style={styles.label}>Total Amount *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Total Amount"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={totalAmount}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9.]/g, '');
                setTotalAmountLocal(cleaned);
                // Re-validate advance amount when total changes
                if (advanceAmount) {
                  const total = parseFloat(cleaned) || 0;
                  const advance = parseFloat(advanceAmount) || 0;
                  if (advance > total && total > 0) {
                    setAdvanceError('Advance amount cannot exceed total amount');
                  } else {
                    setAdvanceError('');
                  }
                }
              }}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Advance Amount *</Text>
            <TextInput
              style={[styles.input, advanceError ? styles.inputError : null]}
              placeholder="Enter Advance Amount"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={advanceAmount}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9.]/g, '');
                const total = parseFloat(totalAmount) || 0;
                const advance = parseFloat(cleaned) || 0;
                
                // Prevent entering values that exceed total amount
                if (total > 0 && advance > total) {
                  setAdvanceError('Advance amount cannot exceed total amount');
                  // Don't update the value if it exceeds total
                  return;
                } else {
                  setAdvanceError('');
                  setAdvanceAmountLocal(cleaned);
                }
              }}
            />
            {advanceError ? (
              <Text style={styles.errorText}>{advanceError}</Text>
            ) : null}
          </View>

          {totalAmount && advanceAmount && (
            <View style={styles.pendingContainer}>
              <Text style={styles.pendingLabel}>Pending Amount:</Text>
              <Text style={styles.pendingAmount}>₹{pendingAmount().toLocaleString()}</Text>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Payment Mode *</Text>
            <View style={styles.paymentModeContainer}>
              <TouchableOpacity
                style={[styles.paymentButton, paymentMode === 'UPI' && styles.paymentButtonActive]}
                onPress={() => setPaymentModeLocal('UPI')}
              >
                <Text style={[styles.paymentButtonText, paymentMode === 'UPI' && styles.paymentButtonTextActive]}>
                  UPI
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentButton, paymentMode === 'Cash' && styles.paymentButtonActive]}
                onPress={() => setPaymentModeLocal('Cash')}
              >
                <Text style={[styles.paymentButtonText, paymentMode === 'Cash' && styles.paymentButtonTextActive]}>
                  Cash
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentButton, paymentMode === 'Card' && styles.paymentButtonActive]}
                onPress={() => setPaymentModeLocal('Card')}
              >
                <Text style={[styles.paymentButtonText, paymentMode === 'Card' && styles.paymentButtonTextActive]}>
                  Card
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
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
  formGroup: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    color: '#000',
  },
  inputError: {
    borderColor: '#E53935',
    backgroundColor: '#FFEBEE',
  },
  errorText: {
    color: '#E53935',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  pendingContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB74D',
    marginBottom: 20,
  },
  pendingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  pendingAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E65100',
  },
  paymentModeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  paymentButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  paymentButtonTextActive: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});


