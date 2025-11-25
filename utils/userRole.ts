import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Check if the current user is an admin
 * @returns Promise<boolean> - true if user is admin, false otherwise
 */
export const isAdmin = async (): Promise<boolean> => {
  try {
    const userData = await AsyncStorage.getItem('userData');
    if (userData) {
      const parsed = JSON.parse(userData);
      const roleRaw = String((parsed?.role || parsed?.Role || parsed?.UserRole) || '').toLowerCase();
      return roleRaw === 'admin' || parsed?.isAdmin === true;
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Clear all stored booking-related data from AsyncStorage
 * This includes any temporary data stored during booking/checkin/checkout flows
 */
export const clearAllStoredData = async (): Promise<void> => {
  try {
    // List of keys that might store temporary booking data
    // Note: We don't remove userToken and userData as they are needed for authentication
    const keysToRemove = [
      'selectedRooms',
      'selectedRoomIds',
      'customerPhone',
      'customerDetails',
      'totalAmount',
      'advanceAmount',
      'paymentMode',
      'checkInDate',
      'checkOutDate',
      'aadharProof',
      'aadharProofBlob',
      'guestProof',
      'vehicleProof',
      'bookingData',
      'checkinData',
      'checkoutData',
    ];

    // Remove each key if it exists
    await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));
  } catch (error) {
    console.error('Error clearing stored data:', error);
  }
};


