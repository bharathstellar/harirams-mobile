# 9) Function Inventory (Exported)

This catalog lists exported functions/modules to support maintenance and onboarding.

## `utils/api.ts`

- `API_CONFIG`
- `apiCall(endpoint, options)`
- `loginUser(username, password)`
- `getCurrentBookings(page, search?)`
- `getPastBookings(page, search?, monthParam?)`
- `getBookingHistory(page, limit, month?, mobile?)`
- `getFutureAndCheckinBookings(page, limit, search?)`
- `getAdminCurrentBookingsList(page, limit, search?)`
- `getAdminFutureBookingsList(page, limit, search?)`
- `cancelBooking(bookingId)`
- `getDashboardOverview()`
- `getRevenueDashboard()`
- `getOccupancyDashboard()`
- `getRoomsStatus()`
- `validateToken(token)`
- `logoutUser()`
- `getCheckInBookings(page, limit, search?)`
- `getBookingForCheckIn(bookingId)`
- `submitCheckIn(bookingId, checkInData)`
- `getCheckoutBookings(page, limit, search?)`
- `getBookingForCheckout(bookingId)`
- `submitCheckout(bookingId, checkoutData)`

## `utils/userRole.ts`

- `isAdmin(userData)`
- `clearAllStoredData()`

## `store/slices/bookingSlice.ts`

- Thunk:
  - `submitBooking`
- Actions:
  - `setSelectedRooms`
  - `setSelectedRoomIds`
  - `setCustomerPhone`
  - `setTotalAmount`
  - `setAdvanceAmount`
  - `setTotalAmountType`
  - `setPaymentMode`
  - `setBookingId`
  - `setCheckInDate`
  - `setCheckOutDate`
  - `setVehicleProof`
  - `setAadharProof`
  - `setAadharProofBlob`
  - `setVehicleProofBlob`
  - `setCustomerDetails`
  - `resetBooking`
- Reducer default export:
  - `bookingSlice.reducer`

## `store/index.ts`

- `store`
- `RootState` (type)
- `AppDispatch` (type)

## `components/*`

- `LoadingButton` (default export)
- `PageHeader` (default export)
- `RevenueSection`
- `RoomsStatusSection`
- template/themed exports (`ThemedText`, `ThemedView`, `HapticTab`, `IconSymbol`, etc.)

