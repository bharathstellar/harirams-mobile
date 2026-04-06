# 3) Folder Structure

## Top-Level Structure

- `app/`  
  Route-based screens and flow orchestration (Expo Router).
- `components/`  
  Shared/reusable UI blocks used by multiple screens.
- `store/`  
  Redux store config and booking slice.
- `utils/`  
  API service helpers and utility functions.
- `assets/`  
  Static assets (logos/images/fonts).
- `docs/`  
  Technical documentation (this folder).

## `app/` Responsibilities

- `_layout.tsx`: root providers + stack registration.
- `index.tsx`: entry redirect to splash.
- `splash.tsx`: startup auth routing.
- `login.tsx`: credential auth and session setup.
- `staffDashboard.tsx`: staff entry actions and logout.
- `adminDashboard.tsx`: admin analytics + booking management.
- `SelectRoomScreen.tsx`: room/date selection.
- `phonenumber.tsx`: phone capture.
- `CustomerDetails.tsx`: guest details + proof capture.
- `TotalAmount.tsx`: amount/payment setup.
- `BookingSummary.tsx`: final booking submit.
- `BookingsList.tsx`: check-in list.
- `BookingDetail.tsx`: check-in details and guest flow.
- `CheckInVehicleProof.tsx`: optional vehicle proof.
- `CheckInSummary.tsx`: check-in submit summary.
- `PendingPayments.tsx`: checkout candidate list.
- `CheckoutSummary.tsx`: final checkout submit.
- `modal.tsx`, `(tabs)/*`: template/demo routes.

## `components/` Responsibilities

- `PageHeader.tsx`: common header.
- `LoadingButton.tsx`: button with loading state.
- `RevenueSection.tsx`: admin revenue visualization.
- `RoomsStatusSection.tsx`: occupied room status cards.
- themed/ui components: Expo template reusable primitives.

## `store/` Responsibilities

- `index.ts`: Redux store bootstrap and typings.
- `slices/bookingSlice.ts`: booking-related global state/actions/thunk.

## `utils/` Responsibilities

- `api.ts`: endpoint constants + all API helper methods.
- `userRole.ts`: role and storage cleanup helpers.

