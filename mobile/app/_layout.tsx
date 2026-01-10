/**
 * Root Layout
 *
 * Sets up the navigation structure and global styles.
 * Uses dark theme for accessibility and reduced eye strain.
 */

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../constants/accessibility';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
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
