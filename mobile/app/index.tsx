/**
 * Welcome/Onboarding Screen
 *
 * The entry point of the app. Explains what Delta does and
 * guides users to take the color vision test before using the camera.
 *
 * ACCESSIBILITY:
 * - Large, readable text
 * - High contrast colors
 * - Clear call-to-action buttons
 * - Screen reader support
 */

import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SIZES, ColorblindnessType } from "../constants/accessibility";
import {
  isOnboardingComplete,
  getColorblindType,
  setColorblindType,
  completeOnboarding,
} from "../services/storage";
import { speak } from "../services/speech";
import { useAuth } from "../contexts/AuthContext";

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, isAuth, loading: authLoading, logout } = useAuth();
  const [hasCompletedSetup, setHasCompletedSetup] = useState(false);
  const [userColorblindType, setUserColorblindType] =
    useState<ColorblindnessType>("unknown");

  useEffect(() => {
    // Check authentication - redirect to login if not authenticated
    if (!authLoading && !isAuth) {
      router.replace("/login");
      return;
    }

    // If authenticated, check onboarding status
    if (isAuth) {
      const completed = isOnboardingComplete();
      setHasCompletedSetup(completed);
      if (completed) {
        setUserColorblindType(getColorblindType());
      }
    }
  }, [isAuth, authLoading, router]);

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.green} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If not authenticated, this won't render (redirected to login)
  if (!isAuth) {
    return null;
  }

  const handleStartTest = () => {
    speak("Starting color vision assessment");
    router.push("/test");
  };

  const handleSkipTest = () => {
    // Default to providing enhanced cues for safety
    setColorblindType("low_vision");
    completeOnboarding();
    speak("Skipping test. Using enhanced audio descriptions for safety.");
    router.push("/camera");
  };

  const handleStartCamera = () => {
    speak("Starting traffic signal detection");
    router.push("/camera");
  };

  const handleRetakeTest = () => {
    speak("Retaking color vision assessment");
    router.push("/test");
  };

  const handleLogout = () => {
    speak('Opening logout screen');
    router.push('/logout');
  };

  // If user has completed setup, show simplified home
  if (hasCompletedSetup) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title} accessibilityRole="header">
            DELTA
          </Text>
          <Text style={styles.subtitle}>Traffic Signal Assistant</Text>

          {user && (
            <View style={styles.userCard}>
              <Text style={styles.userLabel}>Logged in as</Text>
              <Text style={styles.userValue}>{user.username}</Text>
            </View>
          )}

          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Your Settings</Text>
            <Text style={styles.statusValue}>
              {getVisionTypeLabel(userColorblindType)}
            </Text>
          </View>

          <Pressable
            style={styles.primaryButton}
            onPress={handleStartCamera}
            accessibilityRole="button"
            accessibilityLabel="Start camera and begin detecting traffic signals"
          >
            <Text style={styles.primaryButtonText}>START DETECTION</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={handleRetakeTest}
            accessibilityRole="button"
            accessibilityLabel="Retake the color vision test"
          >
            <Text style={styles.secondaryButtonText}>Retake Vision Test</Text>
          </Pressable>

          <Pressable
            style={styles.logoutButton}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Logout"
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // First-time onboarding
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} accessibilityRole="header">
          DELTA
        </Text>
        <Text style={styles.subtitle}>Traffic Signal Assistant</Text>

        <View style={styles.descriptionCard}>
          <Text style={styles.description}>
            Delta helps you navigate traffic signals safely by detecting lights
            and providing clear audio feedback.
          </Text>
          <Text style={styles.description}>
            Point your camera at traffic signals to hear announcements like "Red
            light - Stop" or "Green light - Safe to proceed."
          </Text>
        </View>

        <View style={styles.testPrompt}>
          <Text style={styles.testPromptTitle}>Quick Vision Assessment</Text>
          <Text style={styles.testPromptDescription}>
            Take a quick 30-second test so we can customize the app to work best
            for your vision.
          </Text>
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={handleStartTest}
          accessibilityRole="button"
          accessibilityLabel="Start the color vision assessment test"
        >
          <Text style={styles.primaryButtonText}>TAKE VISION TEST</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={handleSkipTest}
          accessibilityRole="button"
          accessibilityLabel="Skip the test and use default settings"
        >
          <Text style={styles.secondaryButtonText}>
            Skip and use enhanced audio
          </Text>
        </Pressable>

        <Text style={styles.footer}>Your data stays on your device</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function getVisionTypeLabel(type: ColorblindnessType): string {
  switch (type) {
    case "normal":
      return "Standard mode";
    case "protanopia":
      return "Red-enhanced mode";
    case "deuteranopia":
      return "Green-enhanced mode";
    case "tritanopia":
      return "Blue-yellow mode";
    case "low_vision":
      return "Full audio descriptions";
    default:
      return "Adaptive mode";
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: SIZES.spacingMedium,
    fontSize: SIZES.textMedium,
    color: COLORS.textSecondary,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.spacingLarge,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.spacingLarge,
  },
  userCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.spacingMedium,
    marginBottom: SIZES.spacingMedium,
    width: "100%",
    alignItems: "center",
  },
  userLabel: {
    fontSize: SIZES.textSmall,
    color: COLORS.textSecondary,
    marginBottom: SIZES.spacingSmall / 2,
  },
  userValue: {
    fontSize: SIZES.textMedium,
    fontWeight: "bold",
    color: COLORS.green,
  },
  title: {
    fontSize: SIZES.textXL + 16,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    letterSpacing: 8,
    marginBottom: SIZES.spacingSmall,
  },
  subtitle: {
    fontSize: SIZES.textMedium,
    color: COLORS.textSecondary,
    marginBottom: SIZES.spacingLarge * 2,
  },
  descriptionCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.spacingLarge,
    marginBottom: SIZES.spacingLarge,
    width: "100%",
  },
  description: {
    fontSize: SIZES.textSmall,
    color: COLORS.textPrimary,
    lineHeight: 26,
    marginBottom: SIZES.spacingMedium,
  },
  testPrompt: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.spacingLarge,
    marginBottom: SIZES.spacingLarge,
    width: "100%",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.green,
  },
  testPromptTitle: {
    fontSize: SIZES.textMedium,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SIZES.spacingSmall,
  },
  testPromptDescription: {
    fontSize: SIZES.textSmall,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  statusCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.spacingLarge,
    marginBottom: SIZES.spacingLarge * 2,
    width: "100%",
    alignItems: "center",
  },
  statusLabel: {
    fontSize: SIZES.textSmall,
    color: COLORS.textSecondary,
    marginBottom: SIZES.spacingSmall,
  },
  statusValue: {
    fontSize: SIZES.textMedium,
    fontWeight: "bold",
    color: COLORS.green,
  },
  primaryButton: {
    backgroundColor: COLORS.green,
    paddingHorizontal: SIZES.spacingLarge * 2,
    paddingVertical: SIZES.buttonPadding,
    borderRadius: SIZES.borderRadius,
    marginBottom: SIZES.spacingMedium,
    minWidth: 250,
    alignItems: "center",
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: SIZES.textMedium,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    paddingHorizontal: SIZES.spacingLarge,
    paddingVertical: SIZES.buttonPadding,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 250,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.textSmall,
  },
  footer: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SIZES.spacingLarge * 2,
    opacity: 0.6,
  },
  logoutButton: {
    backgroundColor: "transparent",
    paddingHorizontal: SIZES.spacingLarge,
    paddingVertical: SIZES.buttonPadding / 2,
    borderRadius: SIZES.borderRadius,
    marginTop: SIZES.spacingLarge * 2,
    minWidth: 250,
    alignItems: "center",
  },
  logoutButtonText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.textSmall,
    opacity: 0.7,
  },
});
