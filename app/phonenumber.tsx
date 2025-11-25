import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    BackHandler,
    Image,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import PageHeader from '../components/PageHeader';
import { RootState } from '../store';
import { setCustomerPhone } from '../store/slices/bookingSlice';

export default function PhonenumberScreen() {
  const [mobileNumber, setMobileNumber] = useState('');
  const dispatch = useDispatch();
  const selectedRooms = useSelector((state: RootState) => state.booking.selectedRooms);
  const customerPhone = useSelector((state: RootState) => state.booking.customerPhone);

  // Keep input controlled by Redux so value persists when navigating back
  useEffect(() => {
    if (customerPhone && customerPhone !== mobileNumber) {
      setMobileNumber(customerPhone);
    }
  }, [customerPhone]);

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

  const handleNext = () => {
    if (mobileNumber === '') {
      Alert.alert('Error', 'Please enter your mobile number.');
      return;
    }

    if (mobileNumber.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    dispatch(setCustomerPhone(mobileNumber));
    router.push('/CustomerDetails');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
     <PageHeader title="Phone number" onBackPress={handleBack} />

      <View style={styles.content}>
        <Image
          source={require('../assets/harirams_logo.png')} // Update with your logo path
          style={styles.logo}
        />

        <View style={styles.formGroup}>
          <Text style={styles.label}>Mobile Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Mobile Number"
             placeholderTextColor="#000"
            keyboardType="phone-pad"
            value={mobileNumber}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, '');
               setMobileNumber(cleaned); 
               dispatch(setCustomerPhone(cleaned)); }}
               maxLength={10}
          />
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButtonPlaceholder: {
    width: 40,  // increased width to give tappable area
    padding: 5,
  },
  headerText: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginLeft: -40,  // adjust for back button width
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 50,
  },
  logo: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginBottom: 50,
  },
  formGroup: {
    width: '85%',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '85%',
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
