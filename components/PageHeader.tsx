import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  title: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
  rightButtonStyle?: 'icon' | 'text';
};

export default function PageHeader({ title, showBack = true, onBackPress, rightLabel, onRightPress, rightButtonStyle = 'icon' }: Props) {
  const insets = useSafeAreaInsets();
  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top, backgroundColor: '#ffffff', zIndex: 1000 }]}> 
      <View style={[styles.container, { backgroundColor: '#ffffff' }]}>
        <Text style={styles.title}>{title}</Text>
        {showBack ? (
          <TouchableOpacity style={styles.back} onPress={handleBack}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
        ) : null}
        {onRightPress ? (
          <TouchableOpacity 
            style={[styles.right, rightButtonStyle === 'text' && styles.rightTextButton]} 
            onPress={onRightPress}
          >
            <Text style={[styles.rightIcon, rightButtonStyle === 'text' && styles.rightText]}>{rightLabel ?? '⎋'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 0,
    zIndex: 1000,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 0,
  },
  back: {
    position: 'absolute',
    left: 16,
    top: 6, // centers 32px button within 44px header
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#8FD18F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: '#111',
    fontWeight: '600',
  },
  right: {
    position: 'absolute',
    right: 16,
    top: 6,
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F28B82',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightTextButton: {
    width: 'auto',
    minWidth: 70,
    paddingHorizontal: 12,
  },
  rightIcon: {
    fontSize: 16,
    color: '#111',
    fontWeight: '700',
  },
  rightText: {
    fontSize: 12,
    color: '#111',
    fontWeight: '700',
  },
  title: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#2E7D32',
  },
});


