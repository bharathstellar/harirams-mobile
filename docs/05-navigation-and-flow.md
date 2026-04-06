# 5) Navigation Flow

## Navigation Type

- Expo Router stack-driven navigation (`app/_layout.tsx`)
- Tab group exists for template routes under `app/(tabs)/`
- Primary business workflows are stack flows (not tab-dependent)

## Screen Hierarchy (Primary)

1. `index` -> redirects to `splash`
2. `splash` -> `login` or role dashboard
3. Role split:
   - Admin -> `adminDashboard`
   - Staff/Manager -> `staffDashboard`

## Core Operational Flows

### Booking Creation

`staffDashboard` -> `SelectRoomScreen` -> `phonenumber` -> `CustomerDetails` -> `TotalAmount` -> `BookingSummary` -> dashboard

### Check-In

`staffDashboard` -> `BookingsList` -> `BookingDetail` -> `CheckInVehicleProof` -> `CheckInSummary` -> dashboard

### Checkout

`staffDashboard` -> `PendingPayments` -> `CheckoutSummary` -> dashboard

### Admin Booking Management

`adminDashboard` (current + future + past tables, cancel future, proof links, pagination/search)

## Route Params Passed

- `BookingsList` -> `BookingDetail`
  - `bookingId`
- `PendingPayments` -> `CheckoutSummary`
  - `bookingId`
- `BookingDetail` -> `CheckInVehicleProof`
  - `bookingId`, `checkin_by`, guest details, guest proof metadata
- `CheckInVehicleProof` -> `CheckInSummary`
  - all previous params + vehicle proof metadata

## Notes

- Current and future booking tables use independent search and pagination.
- Cancel action is on future booking rows.
- Android hardware back handling is implemented in multiple screens for controlled navigation behavior.

