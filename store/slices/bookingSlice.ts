import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { API_CONFIG } from '../../utils/api';

export type PaymentMode = 'UPI' | 'Cash' | string;
export type AmountType = 'Actual' | 'Estimated' | string;

export interface BookingState {
  selectedRooms: string[];
  selectedRoomIds: string[]; // Store room IDs
  customerPhone: string;
  totalAmount: number | null;
  advanceAmount?: number | null;
  totalAmountType: AmountType;
  paymentMode: PaymentMode;
  checkInDate?: string | null; // YYYY-MM-DD
  checkOutDate?: string | null; // YYYY-MM-DD
  bookingId?: string | null;
  vehicleProof: { uri: string; name?: string } | null;
  aadharProof: { uri: string; name?: string } | null;
  // Binary payloads for API
  aadharProofBlob?: { name: string; dataBase64: string; contentType: string } | null;
  vehicleProofBlob?: { name: string; dataBase64: string; contentType: string } | null;
  customerDetails: {
    aadharNumber?: string;
    phone: any;
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  submitting: boolean;
  error: string | null;
}

const initialState: BookingState = {
  selectedRooms: [],
  selectedRoomIds: [],
  customerPhone: '',
  totalAmount: null,
  advanceAmount: null,
  totalAmountType: 'Actual',
  paymentMode: 'UPI',
  checkInDate: null,
  checkOutDate: null,
  bookingId: null,
  vehicleProof: null,
  aadharProof: null,
  aadharProofBlob: null,
  vehicleProofBlob: null,
  customerDetails: {
    aadharNumber: '',
    phone: '',
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  },
  submitting: false,
  error: null,
};

export const submitBooking = createAsyncThunk(
  'booking/submit',
  async (_: void, thunkApi) => {
    const state = (thunkApi.getState() as any).booking as BookingState;
    const payload = {
      TotalAmount: state.totalAmount ?? 0,
      AdvanceAmount: state.advanceAmount ?? 0,
      RoomNumber: state.selectedRooms,
      customerPhone: state.customerPhone,
      customerName: state.customerDetails?.name || '',
      customerAddress: state.customerDetails?.address || '',
      customerCity: state.customerDetails?.city || '',
      customerState: state.customerDetails?.state || '',
      customerZip: state.customerDetails?.pincode || '',
      // AadharNumber removed per request
      TotalAmountType: state.totalAmountType,
      TotalAmountModeOfPayment: state.paymentMode,
      CheckInDate: state.checkInDate || null,
      CheckOutDate: state.checkOutDate || null,
      CustomerIdProof: state.aadharProofBlob
        ? {
            name: state.aadharProofBlob.name,
            data: state.aadharProofBlob.dataBase64, // backend should decode base64 to Buffer
            contentType: state.aadharProofBlob.contentType,
          }
        : null,
      customerVechileIdProof: state.vehicleProofBlob
        ? {
            name: state.vehicleProofBlob.name,
            data: state.vehicleProofBlob.dataBase64,
            contentType: state.vehicleProofBlob.contentType,
          }
        : undefined,
    };
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CreateBooking}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Booking failed: ${res.status} ${txt}`);
    }
    return res.json();
  }
);

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setSelectedRooms(state, action: PayloadAction<string[]>) {
      state.selectedRooms = action.payload;
    },
    setSelectedRoomIds(state, action: PayloadAction<string[]>) {
      state.selectedRoomIds = action.payload;
    }
    ,setCustomerPhone(state, action: PayloadAction<string>) {
      state.customerPhone = action.payload;
    }
    ,setTotalAmount(state, action: PayloadAction<number | null>) {
      state.totalAmount = action.payload;
    }
    ,setAdvanceAmount(state, action: PayloadAction<number | null>) {
      state.advanceAmount = action.payload;
    }
    ,setTotalAmountType(state, action: PayloadAction<AmountType>) {
      state.totalAmountType = action.payload;
    }
    ,setPaymentMode(state, action: PayloadAction<PaymentMode>) {
      state.paymentMode = action.payload;
    }
    ,setBookingId(state, action: PayloadAction<string | null>) {
      state.bookingId = action.payload;
    }
    ,setCheckInDate(state, action: PayloadAction<string | null>) {
      state.checkInDate = action.payload;
    }
    ,setCheckOutDate(state, action: PayloadAction<string | null>) {
      state.checkOutDate = action.payload;
    }
    ,setVehicleProof(state, action: PayloadAction<{ uri: string; name?: string } | null>) {
      state.vehicleProof = action.payload;
    }
    ,setAadharProof(state, action: PayloadAction<{ uri: string; name?: string } | null>) {
      state.aadharProof = action.payload;
    }
    ,setAadharProofBlob(state, action: PayloadAction<{ name: string; dataBase64: string; contentType: string } | null>) {
      state.aadharProofBlob = action.payload;
    }
    ,setCustomerDetails(state, action: PayloadAction<{ aadharNumber?: string; name?: string; address?: string; city?: string; state?: string; pincode?: string }>) {
      state.customerDetails = { ...state.customerDetails, ...action.payload } as any;
    }
    ,setVehicleProofBlob(state, action: PayloadAction<{ name: string; dataBase64: string; contentType: string } | null>) {
      state.vehicleProofBlob = action.payload;
    }
    ,resetBooking() {
      return initialState;
    }
  },
  extraReducers: builder => {
    builder
      .addCase(submitBooking.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitBooking.fulfilled, (state) => {
        state.submitting = false;
      })
      .addCase(submitBooking.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.error.message || 'Failed to submit booking';
      });
  }
});

export const {
  setSelectedRooms,
  setSelectedRoomIds,
  setCustomerPhone,
  setTotalAmount,
  setAdvanceAmount,
  setTotalAmountType,
  setPaymentMode,
  setBookingId,
  setCheckInDate,
  setCheckOutDate,
  setVehicleProof,
  setAadharProof,
  setAadharProofBlob,
  setVehicleProofBlob,
  setCustomerDetails,
  resetBooking
} = bookingSlice.actions;

export default bookingSlice.reducer;


