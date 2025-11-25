import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  const reduxDetails = useSelector((state: RootState) => state.booking.customerDetails);

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
  const reduxProof = useSelector((state: RootState) => state.booking.aadharProof);

  const [formData, setFormData] = useState({
    name: reduxDetails?.name || '',
    address: reduxDetails?.address || '',
    city: reduxDetails?.city || '',
    state: reduxDetails?.state || '',
    zip: reduxDetails?.pincode || '',
  });
  const [proofImage, setProofImage] = useState<{ uri: string; name?: string; type?: string } | null>(
    reduxProof ? { ...reduxProof, type: (reduxProof as any).type || 'image' } : null
  );
  const [cityStateLocked, setCityStateLocked] = useState(false);

  useEffect(() => {
    if (reduxProof) {
      // Ensure type is set - check file extension if type is missing
      const fileName = reduxProof.name || '';
      const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
      const isPdf = fileExt === 'pdf';
      const fileType = (reduxProof as any).type || (isPdf ? 'pdf' : 'image');
      setProofImage({ ...reduxProof, type: fileType });
    } else {
      setProofImage(null);
    }
  }, [reduxProof]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Auto-fill city/state by pincode
  const fetchCityState = async (pincode: string) => {
    if (pincode.length !== 6) {
      setCityStateLocked(false);
      handleInputChange('city', '');
      handleInputChange('state', '');
      return;
    }

    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();
      if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
        const postOffice = data[0].PostOffice[0];
        handleInputChange('city', postOffice.District || '');
        handleInputChange('state', postOffice.State || '');
        setCityStateLocked(true);
      } else {
        setCityStateLocked(false);
      }
    } catch (error) {
      setCityStateLocked(false);
    }
  };

  // Compress image to under 5MB (target ~3.9MB base64 = ~5MB binary)
  const getCompressedBase64 = async (uri: string, targetWidth = 800, quality = 0.5, maxSize = 3900000) => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: targetWidth } }],
        { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!result.base64) return null;

      // If still too large, compress further
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

      // Compress image
      const compressed = await getCompressedBase64(asset.uri);
      if (!compressed) {
        Alert.alert('Error', 'Failed to process image');
        return;
      }

      // Short filename
      const timestamp = Date.now().toString().slice(-8); // Last 8 digits
      const fileName = `p${timestamp}.jpg`;

      setProofImage({ uri: compressed.uri || asset.uri, name: fileName, type: 'image' });
      dispatch(setAadharProof({ uri: compressed.uri || asset.uri, name: fileName }));
      dispatch(setAadharProofBlob({
        name: fileName,
        dataBase64: compressed.base64,
        contentType: compressed.contentType,
      }));
    } catch (error: any) {
      Alert.alert('Error', `Failed to take photo: ${error.message || 'Unknown error'}`);
    }
  };

  const selectFile = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Media library permission is needed.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        base64: false,
        quality: 1,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      if (!asset?.uri) {
        Alert.alert('Error', 'No file selected');
        return;
      }

      const fileExtension = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const isImage = ['jpg', 'jpeg', 'png'].includes(fileExtension);
      const isPdf = fileExtension === 'pdf';

      if (!isImage && !isPdf) {
        Alert.alert('Unsupported format', 'Only JPG, PNG or PDF allowed');
        return;
      }

      let base64Data = null;
      let contentType = isPdf ? 'application/pdf' : 'image/jpeg';
      
      // Short filename
      const timestamp = Date.now().toString().slice(-8); // Last 8 digits
      const fileName = isPdf ? `p${timestamp}.pdf` : `p${timestamp}.jpg`;

      if (isImage) {
        // Compress image to under 5MB
        const compressed = await getCompressedBase64(asset.uri);
        if (!compressed) {
          Alert.alert('Error', 'Failed to process image');
          return;
        }
        
        base64Data = compressed.base64;
        contentType = compressed.contentType;
        
        setProofImage({ uri: compressed.uri || asset.uri, name: fileName, type: 'image' });
        dispatch(setAadharProof({ uri: compressed.uri || asset.uri, name: fileName }));
        dispatch(setAadharProofBlob({
          name: fileName,
          dataBase64: base64Data,
          contentType: contentType,
        }));
      } else {
        // PDF handling - read as base64
        try {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            const base64 = base64data.includes(',') ? base64data.split(',')[1] : base64data;
            
            setProofImage({ uri: asset.uri, name: fileName, type: 'pdf' });
            dispatch(setAadharProof({ uri: asset.uri, name: fileName }));
            dispatch(setAadharProofBlob({
              name: fileName,
              dataBase64: base64,
              contentType: contentType,
            }));
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error('Error processing PDF:', error);
          Alert.alert('Error', 'Failed to process PDF file');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to select file: ${error.message || 'Unknown error'}`);
    }
  };

  const handleNext = () => {
    // Name and proof are mandatory
    if (!formData.name.trim()) {
      Alert.alert('Name Required', 'Please enter customer name.');
      return;
    }
    
    if (!proofImage) {
      Alert.alert('Proof Required', 'Please upload customer proof (Aadhar/ID).');
      return;
    }

    // Save to Redux
    dispatch(setCustomerDetails({
      name: formData.name.trim(),
      address: formData.address.trim() || '',
      city: formData.city.trim() || '',
      state: formData.state.trim() || '',
      pincode: formData.zip.trim() || '',
    }));

    router.push('/TotalAmount');
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(10, insets.bottom) }]}>
      <PageHeader title="Customer Details" onBackPress={() => router.back()} />

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
            <Text style={styles.label}>Customer Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Customer Name"
              placeholderTextColor="#666"
              value={formData.name}
              onChangeText={(text) => {
                // Only allow letters and spaces, no numbers or symbols
                const onlyText = text.replace(/[^A-Za-z\s]/g, '');
                handleInputChange('name', onlyText);
              }}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter Address (Optional)"
              placeholderTextColor="#666"
              value={formData.address}
              onChangeText={(text) => handleInputChange('address', text)}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Zip Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Zip Code (Optional)"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={formData.zip}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, '');
                handleInputChange('zip', cleaned);
                if (cleaned.length === 6) {
                  fetchCityState(cleaned);
                } else if (cleaned.length < 6) {
                  setCityStateLocked(false);
                  handleInputChange('city', '');
                  handleInputChange('state', '');
                }
              }}
              maxLength={6}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={[styles.input, cityStateLocked && styles.disabledInput]}
              placeholder="Enter City (Optional)"
              placeholderTextColor="#666"
              value={formData.city}
              onChangeText={(text) => handleInputChange('city', text)}
              editable={!cityStateLocked}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={[styles.input, cityStateLocked && styles.disabledInput]}
              placeholder="Enter State (Optional)"
              placeholderTextColor="#666"
              value={formData.state}
              onChangeText={(text) => handleInputChange('state', text)}
              editable={!cityStateLocked}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.uploadTitle}>Upload Customer Proof (Aadhar/ID) *</Text>
            {proofImage ? (
              <View>
                <View style={styles.uploadBox}>
                  <View style={styles.filePreviewContainer}>
                    {(() => {
                      const fileType = (proofImage as any).type;
                      const fileName = proofImage.name || '';
                      const fileExt = fileName.toLowerCase().split('.').pop();
                      const isPdfFile = fileType === 'pdf' || fileExt === 'pdf';
                      
                      // Default to image if type is not set and not a PDF
                      if (!isPdfFile) {
                        return (
                          <>
                            <Image 
                              source={{ uri: proofImage.uri }} 
                              style={styles.previewImage}
                              resizeMode="contain"
                            />
                            <Text style={styles.fileName}>{proofImage.name}</Text>
                          </>
                        );
                      } else {
                        return (
                          <View style={styles.pdfContainer}>
                            <MaterialCommunityIcons name="file-pdf-box" size={50} color="red" />
                            <Text style={styles.fileName}>{proofImage.name}</Text>
                          </View>
                        );
                      }
                    })()}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => {
                    setProofImage(null);
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
  disabledInput: {
    backgroundColor: '#e0e0e0',
    color: '#666',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
  uploadTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: '#ccc',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
    marginBottom: 20,
  },
  placeholderContainer: {
    alignItems: 'center',
  },
  uploadIcon: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  placeholderText: {
    fontSize: 16,
    color: '#aaa',
  },
  supportText: {
    color: '#888',
    marginTop: 5,
    fontSize: 12,
  },
  orText: {
    marginVertical: 10,
    color: '#666',
    fontSize: 14,
  },
  takePhotoButton: {
    marginTop: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  takePhotoText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filePreviewContainer: {
    width: '100%',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 250,
    resizeMode: 'contain',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  pdfContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 8,
  },
  fileName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginTop: 6,
  },
  removeButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C62828',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    minWidth: 150,
  },
  removeText: {
    color: '#C62828',
    fontSize: 18,
    fontWeight: '700',
  },
});

