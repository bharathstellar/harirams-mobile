import { useColorScheme } from '@/hooks/use-color-scheme';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Provider } from 'react-redux';
import { store } from '../store';

export const unstable_settings = {
  anchor: 'splash',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            gestureEnabled: false,
          }}
        >
          <Stack.Screen name="splash" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="phonenumber" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="SelectRoomScreen" options={{ headerShown: false }} />
          <Stack.Screen name="adminDashboard" options={{ headerShown: false }} />
          <Stack.Screen name="staffDashboard" options={{ headerShown: false }} />
          <Stack.Screen name="BookingsList" options={{ headerShown: false }} />
          <Stack.Screen name="CustomerDetails" options={{ headerShown: false }} />
          <Stack.Screen name="TotalAmount" options={{ headerShown: false }} />
          <Stack.Screen name="BookingSummary" options={{ headerShown: false }} />
          <Stack.Screen name="BookingDetail" options={{ headerShown: false }} />
          <Stack.Screen name="CheckInVehicleProof" options={{ headerShown: false }} />
          <Stack.Screen name="CheckInSummary" options={{ headerShown: false }} />
          <Stack.Screen name="PendingPayments" options={{ headerShown: false }} />
          <Stack.Screen name="CheckoutSummary" options={{ headerShown: false }} />
        </Stack>

        <StatusBar style="dark" backgroundColor="#ffffff" />
        <Toast />
      </SafeAreaProvider>
    </Provider>
  );
}
