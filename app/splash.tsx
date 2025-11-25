import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from "expo-router";
import React, { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import { validateToken } from '../utils/api';

export default function SplashScreen() {
  useEffect(() => {
    const checkAuthAndNavigate = async () => {
      try {
        // Check if user has a token
        const token = await AsyncStorage.getItem('userToken');
        const userData = await AsyncStorage.getItem('userData');
        
        // Wait for 2 seconds to show splash screen
        setTimeout(async () => {
          if (token && userData && await validateToken(token)) {
            // If token and user data exist and are valid, navigate based on role
            try {
              const parsed = JSON.parse(userData);
              const roleRaw = String(
                (parsed && (parsed.role || parsed.Role || parsed.UserRole)) || ''
              ).toLowerCase();
              const isAdmin = roleRaw === 'admin' || parsed?.isAdmin === true;
              const isManager = roleRaw === 'manager';
              const isStaff = roleRaw === 'staff' || (!isAdmin && !isManager);

              if (isAdmin) {
                console.log('Valid token and admin role, navigating to admin dashboard');
                router.replace('/adminDashboard');
              } else if (isStaff || isManager) {
                console.log('Valid token and staff/manager role, navigating to staff dashboard');
                router.replace('/staffDashboard');
              } else {
                console.log('Valid token, navigating to staff dashboard');
                router.replace('/staffDashboard');
              }
            } catch (e) {
              console.log('Failed to parse userData, defaulting to select room');
              router.replace('/SelectRoomScreen');
            }
          } else {
            // If no token, user data, or invalid token, navigate to Login screen
            console.log('No valid token found, navigating to login screen');
            router.replace('/login');
          }
        }, 2000);
      } catch (error) {
        // On error, navigate to login screen
        setTimeout(() => {
          router.replace('/login');
        }, 2000);
      }
    };

    checkAuthAndNavigate();
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/harirams_logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 250,
    height: 250,
  },
});