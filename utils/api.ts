// API Configuration
export const API_CONFIG = {
    BASE_URL: 'http://91.98.148.189:3001/v1/api',
  // BASE_URL: 'https://hariramsapi-f8ccetawf7hdcqdh.centralus-01.azurewebsites.net/v1/api',
  ENDPOINTS: {
    //tenents
    LOGIN: '/users/login',
    AvilableRooms :'/mobile/rooms',
    CreateBooking: '/mobile/bookings',
    AdminCurrentBookings: '/mobile/bookings/current',
    AdminPastBookings: '/mobile/bookings/past',
    FutureAndCheckinBookings: '/mobile/bookings/future-and-checkin',
    CancelBooking: '/mobile/bookings',
    AdminBookingPercentage: '/mobile/rooms/booking-percentage',
    AdminDashboard: '/mobile/bookings/dashboard',
    RevenueDashboard: '/mobile/dashboard/revenue',
    OccupancyDashboard: '/mobile/dashboard/occupancy',
    RoomsStatus: '/mobile/dashboard/rooms-status',
    BookingHistory: '/mobile/bookings/history',
    GetBooking: '/mobile/bookings',
    CheckInList: '/mobile/bookings/checkin/list',
    GetBookingForCheckIn: '/mobile/bookings/checkin',
    SubmitCheckIn: '/mobile/bookings',
    CheckoutList: '/mobile/bookings/checkout/list',
    GetBookingForCheckout: '/mobile/bookings',
    SubmitCheckout: '/mobile/bookings',
  }
};

// API Helper Functions
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Login API call
export const loginUser = async (username: string, password: string) => {
  const payload = {
    Username: username,
    Password: password
  };
  
  return apiCall(API_CONFIG.ENDPOINTS.LOGIN, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};
export const getCurrentBookings = async (page: number = 1, search?: string) => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const token = await AsyncStorage.getItem('userToken');
  if (!token) throw new Error('No authentication token found');

  const qs = new URLSearchParams();
  qs.set('page', String(page));
  if (search) qs.set('search', search);

  return apiCall(`${API_CONFIG.ENDPOINTS.AdminCurrentBookings}?${qs.toString()}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
};

// Admin: Past bookings (old endpoint - kept for backward compatibility)
export const getPastBookings = async (page: number = 1, search?: string, monthParam?: string) => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const token = await AsyncStorage.getItem('userToken');
  if (!token) throw new Error('No authentication token found');

  const qs = new URLSearchParams();
  qs.set('page', String(page));
  if (search) qs.set('search', search);
  if (monthParam) qs.set('monthParam', monthParam);

  return apiCall(`${API_CONFIG.ENDPOINTS.AdminPastBookings}?${qs.toString()}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
};

// Admin: Booking history (new endpoint)
export const getBookingHistory = async (page: number = 1, limit: number = 10, month?: string, mobile?: string) => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const token = await AsyncStorage.getItem('userToken');
  if (!token) throw new Error('No authentication token found');

  const qs = new URLSearchParams();
  qs.set('page', String(page));
  qs.set('limit', String(limit));
  if (month) qs.set('month', month);
  if (mobile) qs.set('mobile', mobile);

  return apiCall(`${API_CONFIG.ENDPOINTS.BookingHistory}?${qs.toString()}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
};

// Admin: Future and Check-in bookings
export const getFutureAndCheckinBookings = async (page: number = 1, limit: number = 10, search?: string) => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const token = await AsyncStorage.getItem('userToken');
  if (!token) throw new Error('No authentication token found');

  const qs = new URLSearchParams();
  qs.set('page', String(page));
  qs.set('limit', String(limit));
  if (search) qs.set('search', search);

  return apiCall(`${API_CONFIG.ENDPOINTS.FutureAndCheckinBookings}?${qs.toString()}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
};

// Admin: Cancel booking
export const cancelBooking = async (bookingId: string) => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const token = await AsyncStorage.getItem('userToken');
  if (!token) throw new Error('No authentication token found');

  return apiCall(`${API_CONFIG.ENDPOINTS.CancelBooking}/${bookingId}/cancel`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
};


// Admin: Dashboard overview (daily/weekly/monthly/overall + percentage)
export const getDashboardOverview = async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const token = await AsyncStorage.getItem('userToken');
  if (!token) throw new Error('No authentication token found');

  return apiCall(API_CONFIG.ENDPOINTS.AdminDashboard, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
};

// Admin: Revenue dashboard data
export const getRevenueDashboard = async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const token = await AsyncStorage.getItem('userToken');
  if (!token) throw new Error('No authentication token found');

  return apiCall(API_CONFIG.ENDPOINTS.RevenueDashboard, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
};

// Admin: Occupancy dashboard data
export const getOccupancyDashboard = async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const token = await AsyncStorage.getItem('userToken');
  if (!token) throw new Error('No authentication token found');

  return apiCall(API_CONFIG.ENDPOINTS.OccupancyDashboard, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
};

// Admin: Rooms status data
export const getRoomsStatus = async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const token = await AsyncStorage.getItem('userToken');
  if (!token) throw new Error('No authentication token found');

  return apiCall(API_CONFIG.ENDPOINTS.RoomsStatus, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
};

// Token validation helper
export const validateToken = async (token: string) => {
  // You can add token validation logic here
  // For now, we'll just check if token exists
  return token && token.length > 0;
};

// Logout helper
export const logoutUser = async () => {
  // Clear stored data
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.removeItem('userToken');
  await AsyncStorage.removeItem('userData');
};

// Get check-in bookings list
export const getCheckInBookings = async (page: number = 1, limit: number = 10, search?: string) => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const token = await AsyncStorage.getItem('userToken');
  if (!token) throw new Error('No authentication token found');

  const qs = new URLSearchParams();
  qs.set('page', String(page));
  qs.set('limit', String(limit));
  if (search) qs.set('search', search);

  return apiCall(`${API_CONFIG.ENDPOINTS.CheckInList}?${qs.toString()}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
};

// Get booking details for check-in by BookingId
export const getBookingForCheckIn = async (bookingId: string) => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const token = await AsyncStorage.getItem('userToken');
  if (!token) throw new Error('No authentication token found');

  // Try both endpoints: /mobile/bookings/checkin/HR012 and /mobile/bookings/HR012/checkin
  try {
    return await apiCall(`${API_CONFIG.ENDPOINTS.GetBookingForCheckIn}/${bookingId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  } catch (e) {
    // Fallback to alternative endpoint
    return await apiCall(`${API_CONFIG.ENDPOINTS.GetBooking}/${bookingId}/checkin`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }
};

// Submit check-in
export const submitCheckIn = async (bookingId: string, checkInData: FormData) => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const token = await AsyncStorage.getItem('userToken');
  if (!token) throw new Error('No authentication token found');

  return fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SubmitCheckIn}/${bookingId}/checkin`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Don't set Content-Type, let FormData set it with boundary
    },
    body: checkInData as any,
  });
};

// Get checkout bookings list
export const getCheckoutBookings = async (page: number = 1, limit: number = 10, search?: string) => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const token = await AsyncStorage.getItem('userToken');
  if (!token) throw new Error('No authentication token found');

  const qs = new URLSearchParams();
  qs.set('page', String(page));
  qs.set('limit', String(limit));
  if (search) qs.set('search', search);

  return apiCall(`${API_CONFIG.ENDPOINTS.CheckoutList}?${qs.toString()}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
};

// Get booking details for checkout by BookingId
export const getBookingForCheckout = async (bookingId: string) => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const token = await AsyncStorage.getItem('userToken');
  if (!token) throw new Error('No authentication token found');

  return apiCall(`${API_CONFIG.ENDPOINTS.CheckoutList.replace('/list', '')}/${bookingId}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
};

// Submit checkout
export const submitCheckout = async (bookingId: string, checkoutData: { misc_charges?: number; pending_collected: number; payment_mode: string }) => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const token = await AsyncStorage.getItem('userToken');
  if (!token) throw new Error('No authentication token found');

  return fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SubmitCheckout}/${bookingId}/checkout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(checkoutData),
  });
};

