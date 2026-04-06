# 8) Setup Instructions

## Prerequisites

- Node.js (LTS recommended)
- npm
- Expo CLI/runtime toolchain
- Android Studio (for Android builds)
- Xcode (for iOS builds on macOS)

## Installation

```bash
npm install
```

## Environment Setup

- API base URL is currently hardcoded in `utils/api.ts`:
  - `http://192.168.1.15:3000/v1/api`
- Update this value per environment (local/staging/prod) before release builds.

## Run Commands

- Start Metro:
```bash
npm run start
```

- Run Android:
```bash
npm run android
```

- Run iOS:
```bash
npm run ios
```

- Run web:
```bash
npm run web
```

- Lint:
```bash
npm run lint
```

## Important Dependencies

- Framework: `expo`, `react-native`, `expo-router`
- State: `@reduxjs/toolkit`, `react-redux`
- Storage: `@react-native-async-storage/async-storage`
- UI: `react-native-chart-kit`, `react-native-toast-message`, icons libs
- Device features: `expo-image-picker`, `expo-image-manipulator`

## Build Notes

- Ensure Android/iOS signing and package IDs are configured in app config before production.
- Camera/media permissions are required for proof upload flows.

