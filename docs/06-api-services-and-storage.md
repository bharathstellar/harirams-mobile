# 6) API & Services, Storage, Authentication

## API Configuration

- File: `utils/api.ts`
- Base URL:
  - active: `http://192.168.1.15:3000/v1/api`
  - alternate hosted URLs are commented
- Helper: `apiCall(endpoint, options)`
  - adds JSON content type
  - throws on non-OK HTTP status

## Endpoint Catalog

### Auth
- `POST /users/login` (`loginUser`)

### Booking Creation + Rooms
- `GET /mobile/rooms` (`AvilableRooms`)
- `POST /mobile/bookings` (booking create)

### Admin
- `GET /mobile/bookings/current/list/admin`
- `GET /mobile/bookings/future/list/admin`
- `GET /mobile/bookings/history`
- `POST /mobile/bookings/:bookingId/cancel`
- `GET /mobile/dashboard/revenue`
- `GET /mobile/dashboard/occupancy`
- `GET /mobile/rooms/booking-percentage` (configured)
- fallback/legacy admin endpoints also exist

### Check-In
- `GET /mobile/bookings/checkin/list`
- `GET /mobile/bookings/checkin/:bookingId` (with fallback variant)
- `POST /mobile/bookings/:bookingId/checkin`

### Checkout
- `GET /mobile/bookings/checkout/list`
- `GET /mobile/bookings/:bookingId` (checkout detail helper path)
- `POST /mobile/bookings/:bookingId/checkout`

## Request/Response Handling

- Token-required helpers load token from AsyncStorage and set bearer auth.
- Endpoints with inconsistent contracts are normalized in screens (especially admin + rooms response shapes).
- Form submissions:
  - booking/check-in use `FormData` for proof uploads
  - checkout uses JSON payload

## Error Handling in Service Layer

- Standard pattern: throw on non-OK responses.
- UI-level catch blocks show toasts/alerts and preserve user context.
- Some flows parse raw text first then guarded JSON parse for resilient handling.

## Local Storage / Persistence

## AsyncStorage Keys

- `userToken`: auth token
- `userData`: user profile + role metadata
- transient booking keys are cleaned by helper (`clearAllStoredData`)

## Why Data Is Stored

- Auth persistence across app restarts.
- Role-based routing without re-login each launch.
- Booking workflow continuity between screens.

## Authentication Design

- Login submits username/password to backend.
- On success:
  - store token + user data
  - route by role
- On startup:
  - splash/login reads stored auth and routes directly
- Logout:
  - clear token + user data

## Security Notes

- Current `validateToken` checks only token presence (not server validation).
- Sensitive proof files are processed on device before upload.

