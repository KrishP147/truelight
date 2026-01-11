/**
 * Root Layout
 *
 * Sets up the navigation structure and global styles.
 * Uses dark theme for accessibility and reduced eye strain.
 */

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { COLORS } from '../constants/accessibility';
import { AuthProvider } from '../contexts/AuthContext';
import { useAppStore } from '../store/useAppStore';
import { setAlertsOnlyMode, configureElevenLabs } from '../services/speech';

export default function RootLayout() {
  const { alertSettings } = useAppStore();

  // Initialize ElevenLabs if API key is available
  useEffect(() => {
    const elevenLabsKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
    if (elevenLabsKey && alertSettings.voiceProvider === 'elevenlabs') {
      // Use Rachel voice (default ElevenLabs voice)
      configureElevenLabs(elevenLabsKey, '21m00Tcm4TlvDq8ikWAM');
      console.log('[Speech] ElevenLabs configured');
    }
  }, [alertSettings.voiceProvider]);

  // Sync alertsOnlyAudio setting from store to speech service
  useEffect(() => {
    setAlertsOnlyMode(alertSettings.alertsOnlyAudio);
  }, [alertSettings.alertsOnlyAudio]);
  return (
    <AuthProvider>
      <View style={styles.container}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: COLORS.background,
            },
            headerTintColor: COLORS.textPrimary,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 20,
            },
            contentStyle: {
              backgroundColor: COLORS.background,
            },
            animation: 'fade',
          }}
        >
        <Stack.Screen
          name="index"
          options={{
            title: 'True Light',
            headerShown: false,
          }}
        />
          <Stack.Screen
            name="login"
            options={{
              title: 'Login',
              headerShown: false,
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="logout"
            options={{
              title: 'Logout',
              headerShown: false,
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="test"
            options={{
              title: 'Vision Test',
              headerBackTitle: 'Back',
            }}
          />
        <Stack.Screen
          name="camera"
          options={{
            title: 'True Light',
            headerShown: false,
          }}
        />
        </Stack>
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
