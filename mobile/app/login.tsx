/**
 * Login/Register Screen
 * 
 * Allows users to login or create a new account.
 * Uses a tabbed interface to switch between login and register.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../constants/accessibility';
import { login as authLogin, register, type LoginCredentials, type RegisterData } from '../services/auth';
import { speak } from '../services/speech';
import { useAuth } from '../contexts/AuthContext';

type TabType = 'login' | 'register';

export default function LoginScreen() {
  const router = useRouter();
  const { login: setAuthUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('login');
  const [loading, setLoading] = useState(false);

  // Form state for login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [useEmailForLogin, setUseEmailForLogin] = useState(true);

  // Form state for register
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  const handleLogin = async () => {
    if (!loginPassword || (!loginEmail && !loginUsername)) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const credentials: LoginCredentials = useEmailForLogin
        ? { email: loginEmail, password: loginPassword }
        : { username: loginUsername, password: loginPassword };

      const result = await authLogin(credentials);
      setAuthUser(result.user);
      speak('Login successful');
      router.replace('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      Alert.alert('Login Failed', message);
      speak('Login failed. ' + message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerEmail || !registerUsername || !registerPassword) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (registerPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const data: RegisterData = {
        email: registerEmail,
        username: registerUsername,
        password: registerPassword,
      };

      const result = await register(data);
      setAuthUser(result.user);
      speak('Registration successful. Welcome to Delta.');
      router.replace('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      Alert.alert('Registration Failed', message);
      speak('Registration failed. ' + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title} accessibilityRole="header">
          DELTA
        </Text>
        <Text style={styles.subtitle}>Traffic Signal Assistant</Text>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tab, activeTab === 'login' && styles.activeTab]}
            onPress={() => {
              setActiveTab('login');
              speak('Login tab');
            }}
            accessibilityRole="tab"
            accessibilityLabel="Login tab"
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'login' && styles.activeTabText,
              ]}
            >
              LOGIN
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'register' && styles.activeTab]}
            onPress={() => {
              setActiveTab('register');
              speak('Register tab');
            }}
            accessibilityRole="tab"
            accessibilityLabel="Register tab"
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'register' && styles.activeTabText,
              ]}
            >
              REGISTER
            </Text>
          </Pressable>
        </View>

        {/* Login Form */}
        {activeTab === 'login' && (
          <View style={styles.formContainer}>
            <Pressable
              style={styles.switchButton}
              onPress={() => {
                setUseEmailForLogin(!useEmailForLogin);
                speak(useEmailForLogin ? 'Switch to username' : 'Switch to email');
              }}
            >
              <Text style={styles.switchButtonText}>
                {useEmailForLogin ? 'Use username instead' : 'Use email instead'}
              </Text>
            </Pressable>

            {useEmailForLogin ? (
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={COLORS.textSecondary}
                value={loginEmail}
                onChangeText={setLoginEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                accessibilityLabel="Email input"
              />
            ) : (
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor={COLORS.textSecondary}
                value={loginUsername}
                onChangeText={setLoginUsername}
                autoCapitalize="none"
                autoComplete="username"
                accessibilityLabel="Username input"
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.textSecondary}
              value={loginPassword}
              onChangeText={setLoginPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              accessibilityLabel="Password input"
            />

            <Pressable
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Login button"
            >
              {loading ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.primaryButtonText}>LOGIN</Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Register Form */}
        {activeTab === 'register' && (
          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={COLORS.textSecondary}
              value={registerEmail}
              onChangeText={setRegisterEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              accessibilityLabel="Email input"
            />

            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={COLORS.textSecondary}
              value={registerUsername}
              onChangeText={setRegisterUsername}
              autoCapitalize="none"
              autoComplete="username"
              accessibilityLabel="Username input"
            />

            <TextInput
              style={styles.input}
              placeholder="Password (min 6 characters)"
              placeholderTextColor={COLORS.textSecondary}
              value={registerPassword}
              onChangeText={setRegisterPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              accessibilityLabel="Password input"
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor={COLORS.textSecondary}
              value={registerConfirmPassword}
              onChangeText={setRegisterConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              accessibilityLabel="Confirm password input"
            />

            <Pressable
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Register button"
            >
              {loading ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.primaryButtonText}>REGISTER</Text>
              )}
            </Pressable>
          </View>
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
    fontSize: SIZES.textXL + 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    letterSpacing: 8,
    marginBottom: SIZES.spacingSmall,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: SIZES.textMedium,
    color: COLORS.textSecondary,
    marginBottom: SIZES.spacingLarge * 2,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius,
    padding: 4,
    marginBottom: SIZES.spacingLarge,
  },
  tab: {
    flex: 1,
    paddingVertical: SIZES.buttonPadding,
    alignItems: 'center',
    borderRadius: SIZES.borderRadius - 4,
  },
  activeTab: {
    backgroundColor: COLORS.green,
  },
  tabText: {
    fontSize: SIZES.textMedium,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.background,
  },
  formContainer: {
    width: '100%',
  },
  switchButton: {
    paddingVertical: SIZES.spacingSmall,
    marginBottom: SIZES.spacingMedium,
    alignItems: 'center',
  },
  switchButtonText: {
    fontSize: SIZES.textSmall,
    color: COLORS.green,
    textDecorationLine: 'underline',
  },
  input: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.buttonPadding,
    fontSize: SIZES.textMedium,
    color: COLORS.textPrimary,
    marginBottom: SIZES.spacingMedium,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: SIZES.touchTarget,
  },
  primaryButton: {
    backgroundColor: COLORS.green,
    paddingHorizontal: SIZES.spacingLarge * 2,
    paddingVertical: SIZES.buttonPadding,
    borderRadius: SIZES.borderRadius,
    marginTop: SIZES.spacingMedium,
    minHeight: SIZES.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: SIZES.textMedium,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});

