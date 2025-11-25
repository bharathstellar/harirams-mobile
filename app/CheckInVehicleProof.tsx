import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PageHeader from '../components/PageHeader';

export default function CheckInVehicleProof() {
  const insets = useSafeAreaInsets();
  const { bookingId, checkin_by, guest_name, guest_mobile, guest_address, guest_city, guest_state, guest_zip, hasGuestProof, guestProofName, guestProofUri, guestProofData } = useLocalSearchParams<{
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
  }>();
  const [vehicleProof, setVehicleProof] = useState<{ uri: string; name?: string; type?: 'image' | 'pdf' } | null>(null);
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

  const getCompressedBase64 = async (uri: string, fileName: string): Promise<{ name: string; dataBase64: string; contentType: string }> => {
    try {
      setCompressing(true);
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1920 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const response = await fetch(manipResult.uri);
      const blob = await response.blob();
      const fileSizeMB = blob.size / (1024 * 1024);

      if (fileSizeMB > 5) {
        const moreCompressed = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1280 } }],
          { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
        );
        const response2 = await fetch(moreCompressed.uri);
        const blob2 = await response2.blob();
        const reader = new FileReader();
        return new Promise((resolve) => {
          reader.onloadend = () => {
            const base64data = (reader.result as string).split(',')[1];
            const shortName = `v${guest_mobile?.slice(-8) || Date.now().toString().slice(-8)}.jpg`;
            resolve({
              name: shortName,
              dataBase64: base64data,
              contentType: 'image/jpeg',
            });
          };
          reader.readAsDataURL(blob2);
        });
      }

      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          const shortName = `v${guest_mobile?.slice(-8) || Date.now().toString().slice(-8)}.jpg`;
          resolve({
            name: shortName,
            dataBase64: base64data,
            contentType: 'image/jpeg',
          });
        };
        reader.readAsDataURL(blob);
      });
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
        setVehicleProof({ uri: asset.uri, name: `vehicle_${Date.now()}.jpg`, type: 'image' });
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
        const fileName = asset.fileName || asset.uri.split('/').pop() || `vehicle_${Date.now()}`;
        const isPdf = fileName.toLowerCase().endsWith('.pdf');
        setVehicleProof({
          uri: asset.uri,
          name: fileName,
          type: isPdf ? 'pdf' : 'image',
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to select file');
    }
  };

  const handleNext = async () => {
    let proofBlob = null;
    if (vehicleProof && vehicleProof.type === 'image') {
      try {
        proofBlob = await getCompressedBase64(vehicleProof.uri, vehicleProof.name || 'vehicle.jpg');
      } catch (error: any) {
        Alert.alert('Error', 'Failed to process image. Please try again.');
        return;
      }
    }

    router.push({
      pathname: '/CheckInSummary',
      params: {
        bookingId: bookingId || '',
        checkin_by: checkin_by || '',
        guest_name: guest_name || '',
        guest_mobile: guest_mobile || '',
        guest_address: guest_address || '',
        guest_city: guest_city || '',
        guest_state: guest_state || '',
        guest_zip: guest_zip || '',
        hasGuestProof: hasGuestProof || 'false',
        guestProofName: guestProofName || '',
        guestProofUri: guestProofUri || '',
        guestProofData: guestProofData || '',
        hasVehicleProof: vehicleProof ? 'true' : 'false',
        vehicleProofName: vehicleProof?.name || '',
        vehicleProofUri: vehicleProof?.uri || '',
        vehicleProofData: proofBlob ? JSON.stringify(proofBlob) : '',
      },
    });
  };

  const handleSkip = () => {
    router.push({
      pathname: '/CheckInSummary',
      params: {
        bookingId: bookingId || '',
        checkin_by: checkin_by || '',
        guest_name: guest_name || '',
        guest_mobile: guest_mobile || '',
        guest_address: guest_address || '',
        guest_city: guest_city || '',
        guest_state: guest_state || '',
        guest_zip: guest_zip || '',
        hasGuestProof: hasGuestProof || 'false',
        guestProofName: guestProofName || '',
        guestProofUri: guestProofUri || '',
        guestProofData: guestProofData || '',
        hasVehicleProof: 'false',
      },
    });
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(10, insets.bottom) }]}>
      <PageHeader title="Vehicle Proof (Optional)" onBackPress={() => router.back()} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Image source={require('../assets/harirams_logo.png')} style={styles.logo} />

          <View style={styles.formGroup}>
            <Text style={styles.uploadTitle}>Upload Vehicle Proof (Optional)</Text>
            {vehicleProof ? (
              <View>
                <View style={styles.uploadBox}>
                  <View style={styles.filePreviewContainer}>
                    {vehicleProof.type === 'image' ? (
                      <>
                        <Image source={{ uri: vehicleProof.uri }} style={styles.previewImage} resizeMode="contain" />
                        <Text style={styles.fileName}>{vehicleProof.name}</Text>
                      </>
                    ) : (
                      <View style={styles.pdfContainer}>
                        <MaterialCommunityIcons name="file-pdf-box" size={50} color="red" />
                        <Text style={styles.fileName}>{vehicleProof.name}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity style={styles.removeButton} onPress={() => setVehicleProof(null)}>
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

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextButton, compressing && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={compressing}
            >
              <Text style={styles.nextButtonText}>{compressing ? 'Processing...' : 'Next'}</Text>
            </TouchableOpacity>
          </View>
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  skipButton: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

