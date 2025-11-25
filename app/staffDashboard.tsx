import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isAdmin } from '@/utils/userRole';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    BackHandler,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PageHeader from '../components/PageHeader';

export default function StaffDashboard() {
  const insets = useSafeAreaInsets();
  const [nowDate, setNowDate] = useState<string>('');
  const [nowTime, setNowTime] = useState<string>('');
  const [isManager, setIsManager] = useState<boolean>(false);
  const [userIsAdmin, setUserIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    // Check user role
    const checkUserRole = async () => {
      try {
        const admin = await isAdmin();
        setUserIsAdmin(admin);
        
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const parsed = JSON.parse(userData);
          const roleRaw = String((parsed?.role || parsed?.Role || parsed?.UserRole) || '').toLowerCase();
          setIsManager(roleRaw === 'manager');
        }
      } catch {
        setIsManager(false);
        setUserIsAdmin(false);
      }
    };
    checkUserRole();
  }, []);

  useEffect(() => {
    const formatNow = () => {
      const d = new Date();
      const date = d.toLocaleDateString();
      const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      setNowDate(date);
      setNowTime(time);
    };
    formatNow();
    const id = setInterval(formatNow, 1000);
    return () => clearInterval(id);
  }, []);

  // Handle Android back button - navigate to admin dashboard if admin, exit app for managers, navigate back for staff
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (userIsAdmin) {
          // If admin, navigate to admin dashboard
          router.replace('/adminDashboard');
          return true;
        } else if (isManager) {
          BackHandler.exitApp();
          return true;
        } else {
          router.back();
          return true;
        }
      });
      return () => backHandler.remove();
    }
  }, [isManager, userIsAdmin]);


  const handleLogout = () => {
    Alert.alert("Confirm Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("userToken");
          await AsyncStorage.removeItem("userData");
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(10, insets.bottom) }]}>
      <PageHeader
        title="Staff Dashboard"
        showBack={userIsAdmin || !isManager}
        onBackPress={() => {
          if (userIsAdmin) {
            router.replace('/adminDashboard');
          } else {
            router.back();
          }
        }}
        rightLabel={userIsAdmin ? undefined : "Logout"}
        rightButtonStyle={userIsAdmin ? undefined : "text"}
        onRightPress={userIsAdmin ? undefined : handleLogout}
      />

      <View style={styles.content}>
        {/* Logo and Date/Time Section */}
        <View style={styles.headerSection}>
          <Image
            source={require('../assets/harirams_logo.png')}
            style={styles.logo}
          />
          <View style={styles.dateTimeContainer}>
            <View style={styles.dateContainer}>
              <MaterialCommunityIcons name="calendar-month" size={24} color="#4CAF50" />
              <Text style={styles.dateText}>{nowDate}</Text>
            </View>
            <View style={styles.timeContainer}>
              <MaterialCommunityIcons name="clock-outline" size={24} color="#4CAF50" />
              <Text style={styles.timeText}>{nowTime}</Text>
            </View>
          </View>
        </View>

        {/* Heading Section */}
        <View style={styles.headingContainer}>
          <Text style={styles.headingText}>Quick Actions</Text>
          <Text style={styles.subHeadingText}>Select an option to continue</Text>
        </View>

        {/* Main Three Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.mainButton}
            onPress={() => router.push('/SelectRoomScreen')}
          >
            <MaterialCommunityIcons name="bed-king" size={40} color="#FFFFFF" />
            <Text style={styles.buttonText}>Book Rooms</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mainButton}
            onPress={() => router.push('/BookingsList')}
          >
            <MaterialCommunityIcons name="book-open-variant" size={40} color="#FFFFFF" />
            <Text style={styles.buttonText}>Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mainButton}
            onPress={() => router.push('/PendingPayments')}
          >
            <MaterialCommunityIcons name="cash-register" size={40} color="#FFFFFF" />
            <Text style={styles.buttonText}>Checkout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    backgroundColor: 'transparent',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 280,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
  },
  timeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
  },
  headingContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 0,
  },
  headingText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  subHeadingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  buttonsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  mainButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#2E7D32',
    shadowColor: '#4CAF50',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
});

