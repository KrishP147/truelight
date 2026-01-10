/**
 * Logout Screen
 * 
 * Dedicated logout page with confirmation and user information.
 * Provides a clear logout experience with accessibility support.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../constants/accessibility';
import { useAuth } from '../contexts/AuthContext';
import { speak } from '../services/speech';

export default function LogoutScreen() {
  const router = useRouter();
  const { user, logout, isAuth } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!isAuth) {
      router.replace('/login');
    } else {
      // Announce the logout screen
      speak('Logout screen. You are currently logged in as ' + (user?.username || 'user'));
    }
  }, [isAuth, router, user]);

  const handleLogout = async () => {
    setLoading(true);
    try {
      speak('Logging out');
      await logout();
      speak('Logged out successfully');
      
      // Small delay for better UX
      setTimeout(() => {
        router.replace('/login');
      }, 500);
    } catch (error) {
      console.error('Logout error:', error);
      setLoading(false);
      speak('Logout failed. Please try again.');
    }
  };

  const handleCancel = () => {
    speak('Cancelled logout');
    router.back();
  };

  // If not authenticated, don't render (redirected to login)
  if (!isAuth) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} accessibilityRole="header">
          LOGOUT
        </Text>

        {user && (
          <View style={styles.userInfoCard}>
            <Text style={styles.userInfoLabel}>Currently logged in as:</Text>
            <Text style={styles.userInfoValue}>{user.username}</Text>
            {user.email && (
              <Text style={styles.userInfoEmail}>{user.email}</Text>
            )}
          </View>
        )}

        <View style={styles.confirmationCard}>
          <Text style={styles.confirmationTitle}>Are you sure you want to logout?</Text>
          <Text style={styles.confirmationDescription}>
            You will need to login again to access your account and continue using True Light.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.logoutButton, loading && styles.buttonDisabled]}
            onPress={handleLogout}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Confirm logout"
          >
            {loading ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.logoutButtonText}>YES, LOGOUT</Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.cancelButton, loading && styles.buttonDisabled]}
            onPress={handleCancel}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Cancel logout"
          >
            <Text style={styles.cancelButtonText}>CANCEL</Text>
          </Pressable>
        </View>

        {loading && (
          <Text style={styles.loadingText}>Logging out...</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SIZES.spacingLarge,
    justifyContent: 'center',
  },
  title: {
    fontSize: SIZES.textXL + 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 4,
    marginBottom: SIZES.spacingLarge * 2,
    textAlign: 'center',
  },
  userInfoCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.spacingLarge,
    marginBottom: SIZES.spacingLarge,
    width: '100%',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.green,
  },
  userInfoLabel: {
    fontSize: SIZES.textSmall,
    color: COLORS.textSecondary,
    marginBottom: SIZES.spacingSmall,
    textAlign: 'center',
  },
  userInfoValue: {
    fontSize: SIZES.textLarge,
    fontWeight: 'bold',
    color: COLORS.green,
    marginBottom: SIZES.spacingSmall / 2,
    textAlign: 'center',
  },
  userInfoEmail: {
    fontSize: SIZES.textSmall,
    color: COLORS.textSecondary,
    opacity: 0.8,
    textAlign: 'center',
  },
  confirmationCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.spacingLarge,
    marginBottom: SIZES.spacingLarge * 2,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.red,
  },
  confirmationTitle: {
    fontSize: SIZES.textMedium,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.spacingMedium,
    textAlign: 'center',
  },
  confirmationDescription: {
    fontSize: SIZES.textSmall,
    color: COLORS.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
  },
  logoutButton: {
    backgroundColor: COLORS.red,
    paddingHorizontal: SIZES.spacingLarge * 2,
    paddingVertical: SIZES.buttonPadding,
    borderRadius: SIZES.borderRadius,
    marginBottom: SIZES.spacingMedium,
    minHeight: SIZES.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  logoutButtonText: {
    color: COLORS.background,
    fontSize: SIZES.textMedium,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    width: '100%',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: SIZES.spacingLarge,
    paddingVertical: SIZES.buttonPadding,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: SIZES.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.textMedium,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    width: '100%',
  },
  loadingText: {
    fontSize: SIZES.textSmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.spacingMedium,
    opacity: 0.7,
  },
});

