# 7) Business Logic, End-to-End Flows, Errors, Improvements, Summary

## Business Logic (Core Workflows)

### Login
- Validate non-empty username/password.
- Call login API.
- Persist token/user.
- Route user by role.

### Booking
- Select valid date range and available rooms.
- Capture phone -> customer details + proof -> amount/payment details.
- Validate mandatory fields and amount rules.
- Submit booking and clear workflow state.

### Check-In
- Fetch booking by booking ID.
- Choose check-in mode (self/guest path).
- Validate guest details and required proof (for guest flow).
- Optional vehicle proof.
- Submit check-in and return to dashboard.

### Checkout
- Load pending checkout records.
- Capture misc charges + collected pending + payment mode.
- Validate non-negative collected amount.
- Submit checkout and refresh/return.

### Admin Booking Control
- Fetch and render current/future/past lists independently.
- Search and paginate current/future independently.
- Cancel future booking and refetch related lists.

## Validation Rules Summary

- Phone number: numeric and fixed length checks.
- Date logic: checkout strictly after check-in.
- Amount logic: total > 0, advance >= 0, advance <= total.
- Guest details: required fields with format checks.
- Proof files: mandatory in required steps; optional where allowed.

## End-to-End App Flow (User -> API -> State -> UI)

1. User enters data in UI form.
2. Client validates data.
3. API helper sends request.
4. Response is normalized (if needed).
5. Local/Redux state updates.
6. UI updates (loading/error/success state).
7. Optional route transition to next step.

## Error Handling & Edge Cases

- **Network failure**: catch blocks show message and keep user on same step.
- **Invalid input**: block submit + show immediate feedback.
- **Empty list responses**: handled with explicit empty states (not crashes).
- **Auth missing token**: helper throws, forcing re-auth flow.
- **Fallback APIs**: admin flow has fallback calls for backward compatibility.

## UI/UX Handling

- Styling via `StyleSheet` in each module.
- Reusable controls (`PageHeader`, `LoadingButton`) for consistency.
- Safe area handling via `react-native-safe-area-context`.
- Loading and empty states included across key list and form screens.

## Performance & Scalability Improvements (Recommended)

- Use `React.memo` for heavy tables/cards and pass stable props.
- Split large screens (`adminDashboard`) into feature subcomponents.
- Introduce typed API response interfaces to reduce runtime mapping issues.
- Move fetch/status logic to dedicated hooks or RTK Query.
- Add centralized error parser for backend errors (status + message body).
- Add server token verification/refresh strategy.
- Add request cancellation/debouncing for search APIs.
- Add integration tests for booking/checkin/checkout journeys.

## Risks / Gaps to Track

- Tab config references `(tabs)/index` route that is not present.
- `adminDashboard` passes `navigation={navigator}` to revenue component; verify runtime usage.
- Base URL points to local network IP; requires env-based config for staging/prod.
- Endpoint naming typo `AvilableRooms` should be standardized carefully (backward compatibility first).

## Non-Technical Summary

This app helps hotel staff run daily operations quickly: allocate rooms, register guests, collect payments, check guests in/out, and track business metrics.  
Admins get clear booking and revenue visibility, while staff get guided step-by-step workflows.  
The app is mobile-first, role-based, and designed to reduce manual errors at the front desk.

