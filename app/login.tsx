import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Toast from 'react-native-toast-message';
import LoadingButton from '../components/LoadingButton';
import { loginUser, validateToken } from '../utils/api';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if user is already authenticated and redirect accordingly
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userData = await AsyncStorage.getItem('userData');
        
        if (token && userData && await validateToken(token)) {
          // User is already authenticated, redirect based on role
          const parsed = JSON.parse(userData);
          const roleRaw = String(
            (parsed && (parsed.role || parsed.Role || parsed.UserRole)) || ''
          ).toLowerCase();
          const isAdmin = roleRaw === 'admin' || parsed?.isAdmin === true;
          const isManager = roleRaw === 'manager';
          const isStaff = roleRaw === 'staff' || (!isAdmin && !isManager);

          if (isAdmin) {
            router.replace('/adminDashboard');
          } else if (isStaff || isManager) {
            router.replace('/staffDashboard');
          } else {
            router.replace('/staffDashboard');
          }
        }
      } catch (error) {
        console.log('Auth check failed, staying on login screen');
      }
    };

    checkAuthAndRedirect();
  }, []);

  const handleLogin = async () => {
    if (username === '' || password === '') {
      Toast.show({ type: 'error', text1: 'Login Failed', text2: 'Please enter both username and password.' });
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting to log in with:', { Username: username, Password: password });

      // Use the API helper function
      const data = await loginUser(username, password);

      if (data.message) {
        // Save the real token from API response
        await AsyncStorage.setItem('userToken', data.token);
        
        // Save user data for future use
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
        
        // Optional success toast
        Toast.show({ type: 'success', text1: `Welcome ${data.user.Username}!` });

        // Navigate based on role: admin -> dashboard, staff -> staffDashboard, else -> select room
        const roleRaw = String(
          (data.user && (data.user.role || data.user.Role || data.user.UserRole)) || ''
        ).toLowerCase();
        const isAdmin = roleRaw === 'admin' || data.user?.isAdmin === true;
        const isManager = roleRaw === 'manager';
        const isStaff = roleRaw === 'staff' || (!isAdmin && !isManager);

        if (isAdmin) {
          router.replace('/adminDashboard');
        } else if (isStaff) {
          router.replace('/staffDashboard');
        } else if (isManager) {
          router.replace('/staffDashboard');
        } else {
          router.replace('/staffDashboard');
        }
      } else {
        Toast.show({ type: 'error', text1: 'Login Failed', text2: data.message || 'Invalid credentials. Please try again.' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Login Failed', text2: 'Invalid credentials. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        {/* Replace with your logo image */}
        <Image
          source={require('../assets/harirams_logo.png')} // Update this path
          style={styles.logo}
        />
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Username *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Username"
           placeholderTextColor="#000"
          value={username}
          onChangeText={(text) => setUsername(text.trim())}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Password"
          placeholderTextColor="#000"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={true}
        />

        <LoadingButton
          title="Submit"
          onPress={handleLogin}
          loading={loading}
          loadingText="Signing in..."
          style={styles.submitButton}
          textStyle={styles.submitButtonText}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 50,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logo: {
    width: 200, // Adjust size as needed
    height: 200, // Adjust size as needed
    resizeMode: 'contain',
  },
  tagline: {
    fontSize: 16,
    color: '#888',
  },
  formContainer: {
    width: '80%',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginTop: 5,
    borderRadius: 5,
    color: '#000',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});