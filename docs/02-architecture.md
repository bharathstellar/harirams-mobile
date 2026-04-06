# 2) Architecture

## App Architecture Style

The app follows a practical **component-based React Native architecture** with:
- screen-driven flow (`app/` routes via Expo Router)
- reusable UI components (`components/`)
- centralized API access (`utils/api.ts`)
- centralized booking state (`Redux Toolkit` slice)

It is not strict Clean Architecture, but responsibilities are reasonably separated by UI, API service helpers, and global state.

## State Management

- **Global state**: Redux Toolkit (`store/slices/bookingSlice.ts`)
  - used for multi-screen booking flow state persistence (selected rooms, customer details, amounts, proofs, dates)
- **Local state**: `useState` in screens/components for UI and request status
- **Transient persistence**: AsyncStorage for auth session and selected flow data cleanup

## Navigation Structure

- **Routing framework**: Expo Router (`expo-router`)
- **Root stack**: defined in `app/_layout.tsx`
  - includes splash, login, operational screens, admin/staff dashboards
- **Tabs**: `(tabs)` group with its own `_layout.tsx`
- **Flow style**: mostly stack-style linear operational flow with param passing

## API Communication Flow

- API configuration and endpoint constants in `utils/api.ts`
- Common helper: `apiCall(endpoint, options)` (fetch wrapper)
- Token-based requests:
  - token loaded from AsyncStorage (`userToken`)
  - `Authorization: Bearer <token>` attached for protected calls
- Screen-level orchestration:
  - screens call helper methods (e.g., `getAdminCurrentBookingsList`, `submitCheckout`)
  - response normalized in screen if endpoint shapes differ
  - UI state updated (loading/error/data)

## Data Flow Pattern

1. User action in screen.
2. Screen validates inputs.
3. API helper called.
4. Response parsed and normalized.
5. Local/Redux state updated.
6. UI rerenders; navigation moves to next step if successful.

