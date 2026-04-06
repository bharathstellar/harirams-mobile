# 4) Component Documentation

This section covers all primary screens/components used in hotel workflows.

## Screens (`app/`)

### `SplashScreen` (`app/splash.tsx`)
- **Purpose**: startup gate; checks session then routes by role.
- **State**: minimal local timing/loading behavior.
- **Hooks**: `useEffect`.
- **Behavior**: reads AsyncStorage token/user data and redirects to login/admin/staff.

### `LoginScreen` (`app/login.tsx`)
- **Purpose**: authenticate user.
- **Props**: none.
- **State**: username, password, loading, error.
- **Hooks**: `useState`, `useEffect`.
- **Behavior**: validates inputs, calls `loginUser`, stores `userToken` and `userData`, routes by role.

### `StaffDashboard` (`app/staffDashboard.tsx`)
- **Purpose**: operations entry screen for staff/manager.
- **State**: date/time display, role flags.
- **Hooks**: `useEffect`, `useState`.
- **Behavior**: routes to create booking, check-in, checkout flows; supports logout.

### `AdminDashboard` (`app/adminDashboard.tsx`)
- **Purpose**: admin analytics + booking control center.
- **State**:
  - current/future/past booking datasets
  - separate search and pagination for current/future/past
  - occupancy/revenue/dashboard stats
  - loading/error flags
- **Hooks**: heavy usage of `useEffect`, `useCallback`, `useState`.
- **Behavior**:
  - fetches occupancy/revenue/current/future/past data
  - independent current/future search and pagination
  - cancel future booking action and list refresh
  - proof links open externally via `Linking`

### `SelectRoomScreen` (`app/SelectRoomScreen.tsx`)
- **Purpose**: choose date range and available rooms.
- **State**:
  - rooms list, loading/error/refreshing
  - selected room IDs
  - check-in/check-out date modal state
- **Hooks**: `useState`, `useEffect`, `useMemo`, `useCallback`.
- **Behavior**:
  - fetches available rooms based on dates
  - only available rooms selectable
  - date validation (checkout > checkin)
  - persists selected rooms/dates to Redux

### `PhonenumberScreen` (`app/phonenumber.tsx`)
- **Purpose**: capture customer phone number.
- **State**: input and validation state.
- **Hooks**: `useState`.
- **Behavior**: validates 10-digit number and updates Redux.

### `CustomerDetails` (`app/CustomerDetails.tsx`)
- **Purpose**: collect guest profile and ID proof.
- **State**: form fields + proof file + loading.
- **Hooks**: `useState`, `useEffect`.
- **Behavior**:
  - validates name/address fields
  - handles pincode lookup (city/state auto-fill where available)
  - compresses/encodes proof and stores data in Redux blob fields

### `TotalAmount` (`app/TotalAmount.tsx`)
- **Purpose**: capture pricing/payment details.
- **State**: total, advance, pending, payment mode.
- **Hooks**: `useState`.
- **Behavior**: validates positive amounts and `advance <= total`; saves to Redux.

### `BookingSummary` (`app/BookingSummary.tsx`)
- **Purpose**: final booking confirmation and submit.
- **State**: submitting state, success/failure state.
- **Hooks**: `useSelector`, `useDispatch`, `useState`.
- **Behavior**:
  - builds booking FormData from Redux
  - calls booking creation API
  - resets booking state and routes back to dashboard

### `BookingsList` (`app/BookingsList.tsx`)
- **Purpose**: check-in candidate listing.
- **State**: list, search, pagination, refresh, grouped sections.
- **Hooks**: `useEffect`, `useMemo`, `useCallback`.
- **Behavior**: grouped view by check-in date (today/tomorrow/others), opens booking detail.

### `BookingDetail` (`app/BookingDetail.tsx`)
- **Purpose**: check-in initiation for selected booking.
- **State**: booking detail, guest/self mode, proof capture state.
- **Hooks**: `useEffect`, `useState`, `useMemo`.
- **Behavior**:
  - fetches detail by bookingId
  - validates guest fields
  - routes with serialized params to next check-in step

### `CheckInVehicleProof` (`app/CheckInVehicleProof.tsx`)
- **Purpose**: optional vehicle proof stage.
- **State**: optional proof metadata.
- **Hooks**: `useState`.
- **Behavior**: passes full check-in payload to summary.

### `CheckInSummary` (`app/CheckInSummary.tsx`)
- **Purpose**: final review and check-in submit.
- **State**: submit/loading/result.
- **Hooks**: `useEffect`, `useState`.
- **Behavior**: sends multipart check-in payload and routes back to dashboard.

### `PendingPayments` (`app/PendingPayments.tsx`)
- **Purpose**: checkout list with search/pagination.
- **State**: bookings, loading/error, page/search.
- **Hooks**: `useEffect`, `useCallback`, `useState`.
- **Behavior**: opens checkout summary for selected booking.

### `CheckoutSummary` (`app/CheckoutSummary.tsx`)
- **Purpose**: finalize checkout and collect pending amounts.
- **State**: checkout form values and submit/loading states.
- **Hooks**: `useEffect`, `useState`.
- **Behavior**: validates collected amount and submits checkout.

### Utility/Template Routes
- `app/index.tsx`: redirect only.
- `app/modal.tsx`: template modal.
- `app/(tabs)/_layout.tsx` and `app/(tabs)/explore.tsx`: template tab setup.

## Reusable Components (`components/`)

### `PageHeader`
- **Props**: `title`, `showBack`, `onBackPress`, `rightLabel`, `onRightPress`, `rightButtonStyle`.
- **Purpose**: consistent screen header and actions.

### `LoadingButton`
- **Props**: `title`, `onPress`, `loading`, `disabled`, `style`, `textStyle`, `loadingText`.
- **Purpose**: action button with spinner and disabled handling.

### `RevenueSection`
- **Props**: `revenueData`, `navigation`.
- **Purpose**: revenue cards, monthly chart, payment mode split.
- **Behavior**: renders chart from `monthlyGraph`, percentages from `revenueByPaymentMode`.

### `RoomsStatusSection`
- **Props**: `rooms` (`RoomStatus[]`).
- **Purpose**: occupied room cards and guest/pending details.
- **Behavior**: filters rooms with non-null `currentBooking`.

### Template/Themed Components
- `ThemedText`, `ThemedView`, `ParallaxScrollView`, `HapticTab`, `IconSymbol`, etc.
- Mostly Expo starter utilities and wrappers.

