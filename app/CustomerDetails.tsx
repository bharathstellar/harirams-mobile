import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
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
import { setAadharProof, setAadharProofBlob, setCustomerDetails } from '../store/slices/bookingSlice';

export default function CustomerDetails() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const reduxCustomerDetails = useSelector((state: RootState) => state.booking.customerDetails);
  const reduxAadharProof = useSelector((state: RootState) => state.booking.aadharProof);

  const [name, setName] = useState(reduxCustomerDetails?.name || '');
  const [address, setAddress] = useState(reduxCustomerDetails?.address || '');
  const [city, setCity] = useState(reduxCustomerDetails?.city || '');
  const [state, setState] = useState(reduxCustomerDetails?.state || '');
  const [pincode, setPincode] = useState(reduxCustomerDetails?.pincode || '');
  const [aadharProof, setAadharProofLocal] = useState<{ uri: string; name?: string; type?: 'image' | 'pdf'; dataBase64?: string } | null>(reduxAadharProof);
  const [cityStateLocked, setCityStateLocked] = useState(false);
  const [compressing, setCompressing] = useState(false);

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

  // Auto-fill city/state by pincode
  const fetchCityState = async (pincodeValue: string) => {
    if (pincodeValue.length !== 6) {
      setCityStateLocked(false);
      setCity('');
      setState('');
      return;
    }

    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincodeValue}`);
      const data = await response.json();
      if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
        const postOffice = data[0].PostOffice[0];
        setCity(postOffice.District || '');
        setState(postOffice.State || '');
        setCityStateLocked(true);
      } else {
        setCityStateLocked(false);
      }
    } catch (error) {
      setCityStateLocked(false);
    }
  };

  // Compress image and get base64
  const getCompressedBase64 = async (uri: string): Promise<{ uri: string; base64: string } | null> => {
    try {
      setCompressing(true);
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      const base64 = await ImageManipulator.manipulateAsync(
        manipulated.uri,
        [],
        { format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      return {
        uri: manipulated.uri,
        base64: base64.base64 || '',
      };
    } catch (error) {
      console.error('Error compressing image:', error);
      return null;
    } finally {
      setCompressing(false);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const compressed = await getCompressedBase64(asset.uri);
        if (compressed) {
          const timestamp = Date.now().toString().slice(-8);
          const shortFileName = `proof_${timestamp}.jpg`;
          setAadharProofLocal({
            uri: compressed.uri || asset.uri,
            name: shortFileName,
            type: 'image',
            dataBase64: compressed.base64,
          });
        } else {
          setAadharProofLocal({ uri: asset.uri, name: `proof_${Date.now()}.jpg`, type: 'image' });
        }
      }
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
        const fileName = asset.fileName || asset.uri.split('/').pop() || `proof_${Date.now()}`;
        const isPdf = fileName.toLowerCase().endsWith('.pdf');

        if (isPdf) {
          setAadharProofLocal({ uri: asset.uri, name: fileName, type: 'pdf' });
        } else {
          const compressed = await getCompressedBase64(asset.uri);
          if (compressed) {
            const timestamp = Date.now().toString().slice(-8);
            const shortFileName = `proof_${timestamp}.jpg`;
            setAadharProofLocal({
              uri: compressed.uri || asset.uri,
              name: shortFileName,
              type: 'image',
              dataBase64: compressed.base64,
            });
          } else {
            setAadharProofLocal({ uri: asset.uri, name: fileName, type: 'image' });
          }
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to select file');
    }
  };

  const handleNext = async () => {
    // Validation - only name and aadhar proof are mandatory
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter customer name.');
      return;
    }

    if (!aadharProof) {
      Alert.alert('Proof Required', 'Please upload customer proof (Aadhar/ID).');
      return;
    }

    // Save customer details to Redux
    dispatch(
      setCustomerDetails({
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
      })
    );

    // Save proof to Redux
    dispatch(setAadharProof(aadharProof));

    // Save proof blob if available
    if (aadharProof.dataBase64) {
      const contentType = aadharProof.type === 'pdf' ? 'application/pdf' : 'image/jpeg';
      dispatch(
        setAadharProofBlob({
          name: aadharProof.name || 'proof.jpg',
          dataBase64: aadharProof.dataBase64,
          contentType,
        })
      );
    } else if (aadharProof.type === 'pdf') {
      // For PDF, read as base64 using expo-file-system
      try {
        const base64 = await FileSystem.readAsStringAsync(aadharProof.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        dispatch(
          setAadharProofBlob({
            name: aadharProof.name || 'proof.pdf',
            dataBase64: base64,
            contentType: 'application/pdf',
          })
        );
      } catch (error) {
        console.error('Error reading PDF:', error);
        Alert.alert('Error', 'Failed to process PDF file. Please try again.');
      }
    } else if (aadharProof.uri) {
      // For images without base64, try to get it
      try {
        const compressed = await getCompressedBase64(aadharProof.uri);
        if (compressed) {
          dispatch(
            setAadharProofBlob({
              name: aadharProof.name || 'proof.jpg',
              dataBase64: compressed.base64,
              contentType: 'image/jpeg',
            })
          );
        }
      } catch (error) {
        console.error('Error processing image:', error);
      }
    }

    router.push('/TotalAmount');
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(10, insets.bottom) }]}>
      <PageHeader title="Customer Details" onBackPress={() => router.back()} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Image source={require('../assets/harirams_logo.png')} style={styles.logo} />

          <View style={styles.formGroup}>
            <Text style={styles.label}>Customer Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Customer Name"
              placeholderTextColor="#666"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter Address"
              placeholderTextColor="#666"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Pincode</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit Pincode"
              placeholderTextColor="#666"
              value={pincode}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
                setPincode(cleaned);
                if (cleaned.length === 6) {
                  fetchCityState(cleaned);
                } else if (cleaned.length === 0) {
                  setCityStateLocked(false);
                  setCity('');
                  setState('');
                }
              }}
              keyboardType="numeric"
              maxLength={6}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={[styles.input, cityStateLocked && styles.inputLocked]}
              placeholder="Enter City"
              placeholderTextColor="#666"
              value={city}
              onChangeText={setCity}
              editable={!cityStateLocked}
            />
            {cityStateLocked && <Text style={styles.autoFillText}>Auto-filled from pincode</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={[styles.input, cityStateLocked && styles.inputLocked]}
              placeholder="Enter State"
              placeholderTextColor="#666"
              value={state}
              onChangeText={setState}
              editable={!cityStateLocked}
            />
            {cityStateLocked && <Text style={styles.autoFillText}>Auto-filled from pincode</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.uploadTitle}>Upload Customer Proof (Aadhar/ID) *</Text>
            {aadharProof ? (
              <View>
                <View style={styles.uploadBox}>
                  <View style={styles.filePreviewContainer}>
                    {aadharProof.type === 'image' ? (
                      <>
                        <Image source={{ uri: aadharProof.uri }} style={styles.previewImage} resizeMode="contain" />
                        <Text style={styles.fileName}>{aadharProof.name}</Text>
                      </>
                    ) : (
                      <View style={styles.pdfContainer}>
                        <MaterialCommunityIcons name="file-pdf-box" size={50} color="red" />
                        <Text style={styles.fileName}>{aadharProof.name}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => {
                    setAadharProofLocal(null);
                    dispatch(setAadharProof(null));
                    dispatch(setAadharProofBlob(null));
                  }}
                >
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
            {compressing && <Text style={styles.compressingText}>Compressing image...</Text>}
          </View>

          <TouchableOpacity
            style={[styles.nextButton, compressing && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={compressing}
          >
            <Text style={styles.nextButtonText}>{compressing ? 'Processing...' : 'Next'}</Text>
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
    padding: 16,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 24,
    resizeMode: 'contain',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
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
  inputLocked: {
    backgroundColor: '#e8e8e8',
    color: '#666',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  autoFillText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
    fontStyle: 'italic',
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
  compressingText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  nextButtonDisabled: {
    backgroundColor: '#ccc',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
