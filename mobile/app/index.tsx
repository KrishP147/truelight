/**
 * Welcome/Onboarding Screen
 *
 * Users can select their colorblindness type directly or take a test
 */

import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SIZES, ColorblindnessType } from "../constants/accessibility";
import {
  getColorblindType,
  setColorblindType,
  completeOnboarding,
  isOnboardingComplete,
} from "../services/storage";
import { speak } from "../services/speech";
import { useAuth } from "../contexts/AuthContext";

type SelectableType = Exclude<ColorblindnessType, "unknown">;

const VISION_TYPES: {
  type: SelectableType;
  label: string;
  description: string;
}[] = [
    {
      type: "normal",
      label: "Normal Vision",
      description: "No color vision deficiency",
    },
    {
      type: "protanopia",
      label: "Protanopia",
      description: "Difficulty seeing red",
    },
    {
      type: "deuteranopia",
      label: "Deuteranopia",
      description: "Difficulty seeing green",
    },
    {
      type: "tritanopia",
      label: "Tritanopia",
      description: "Difficulty seeing blue/yellow",
    },
    {
      type: "low_vision",
      label: "Low Vision",
      description: "Prefer full audio descriptions",
    },
  ];

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, isAuth, loading: authLoading, logout } = useAuth();
  const [hasCompletedSetup, setHasCompletedSetup] = useState(false);
  const [userColorblindType, setUserColorblindType] =
    useState<ColorblindnessType>("unknown");
  const [selectedType, setSelectedType] =
    useState<ColorblindnessType>("normal");

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

  const handleSelectType = (type: SelectableType) => {
    setSelectedType(type);
    setColorblindType(type);
    completeOnboarding();
    speak(getVisionTypeLabel(type) + " selected");
  };

  const handleTakeTest = () => {
    speak("Starting color vision assessment");
    router.push("/test");
  };

  const handleStartCamera = () => {
    // If "normal" is selected (default) but not explicitly saved yet, save it now
    if (selectedType !== "unknown") {
      setColorblindType(selectedType);
      completeOnboarding();
    }

    speak("Starting traffic signal detection");
    router.push("/camera");
  };

  const hasSelection = selectedType !== "unknown";

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
            True Light
          </Text>
          <Text style={styles.subtitle}>Color Assistant</Text>

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
            onPress={() => {
              setHasCompletedSetup(false);
              speak("Retaking vision test");
            }}
            accessibilityRole="button"
            accessibilityLabel="Change vision settings"
          >
            <Text style={styles.secondaryButtonText}>Change Settings</Text>
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
          True Light
        </Text>
        <Text style={styles.subtitle}>Color Assistant</Text>

        <View style={styles.descriptionCard}>
          <Text style={styles.description}>
            True Light helps you navigate traffic signals safely by detecting lights
            and providing clear audio feedback.
          </Text>
          <Text style={styles.description}>
            Point your camera at traffic signals to hear announcements like "Red
            light - Stop" or "Green light - Safe to proceed."
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Select your vision type</Text>

        <View style={styles.optionsContainer}>
          {VISION_TYPES.map(({ type, label, description }) => (
            <Pressable
              key={type}
              style={[
                styles.optionButton,
                selectedType === type && styles.optionButtonSelected,
              ]}
              onPress={() => handleSelectType(type)}
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${description}`}
              accessibilityState={{ selected: selectedType === type }}
            >
              <View style={styles.optionContent}>
                <Text
                  style={[
                    styles.optionLabel,
                    selectedType === type && styles.optionLabelSelected,
                  ]}
                >
                  {label}
                </Text>
                <Text
                  style={[
                    styles.optionDescription,
                    selectedType === type && styles.optionDescriptionSelected,
                  ]}
                >
                  {description}
                </Text>
              </View>
              {selectedType === type && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          style={styles.testButton}
          onPress={handleTakeTest}
          accessibilityRole="button"
          accessibilityLabel="Take a short vision test to determine your type"
        >
          <Text style={styles.testButtonText}>Not sure? Take a short test</Text>
        </Pressable>

        <View style={styles.spacer} />

        <Pressable
          style={[
            styles.primaryButton,
            !hasSelection && styles.primaryButtonDisabled,
          ]}
          onPress={handleStartCamera}
          disabled={!hasSelection}
          accessibilityRole="button"
          accessibilityLabel="Start camera and begin detecting traffic signals"
          accessibilityState={{ disabled: !hasSelection }}
        >
          <Text
            style={[
              styles.primaryButtonText,
              !hasSelection && styles.primaryButtonTextDisabled,
            ]}
          >
            Start Detection
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
      return "Normal Vision";
    case "protanopia":
      return "Protanopia";
    case "deuteranopia":
      return "Deuteranopia";
    case "tritanopia":
      return "Tritanopia";
    case "low_vision":
      return "Low Vision";
    default:
      return "Unknown";
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
    padding: SIZES.spacingLarge,
    paddingTop: 60,
  },
  header: {
    marginBottom: SIZES.spacingLarge * 1.5,
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
    textAlign: "center",
  },
  userValue: {
    fontSize: SIZES.textMedium,
    fontWeight: "bold",
    color: COLORS.green,
    textAlign: "center",
  },
  title: {
    fontSize: SIZES.textXL + 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: 4,
    marginBottom: SIZES.spacingSmall,
    textAlign: "center",
  },
  subtitle: {
    fontSize: SIZES.textMedium + 2,
    color: COLORS.textSecondary,
    marginBottom: SIZES.spacingLarge * 2,
    textAlign: "center",
    letterSpacing: 1,
    opacity: 0.9,
  },
  sectionTitle: {
    fontSize: SIZES.textMedium,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SIZES.spacingMedium,
    textAlign: "left",
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
    textAlign: "left",
  },
  optionsContainer: {
    gap: SIZES.spacingSmall,
  },
  optionButton: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.spacingMedium,
    marginBottom: SIZES.spacingSmall,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  testPromptTitle: {
    fontSize: SIZES.textMedium,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SIZES.spacingSmall,
    textAlign: "left",
  },
  testPromptDescription: {
    fontSize: SIZES.textSmall,
    color: COLORS.textSecondary,
    lineHeight: 24,
    textAlign: "left",
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
    textAlign: "center",
  },
  statusValue: {
    fontSize: SIZES.textMedium,
    fontWeight: "bold",
    color: COLORS.green,
    textAlign: "center",
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
    justifyContent: "center",
    minHeight: SIZES.touchTarget,
    marginBottom: SIZES.spacingMedium,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.textSmall,
    textAlign: "center",
    width: "100%",
  },
  optionButtonSelected: {
    backgroundColor: COLORS.textPrimary,
    borderColor: COLORS.textPrimary,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: SIZES.textSmall,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  optionLabelSelected: {
    color: COLORS.background,
  },
  optionDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  optionDescriptionSelected: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: SIZES.spacingLarge,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    paddingHorizontal: SIZES.spacingMedium,
    fontSize: SIZES.textSmall,
    color: COLORS.textSecondary,
  },
  testButton: {
    paddingVertical: SIZES.buttonPadding,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadius,
  },
  testButtonText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.textSmall,
    textAlign: "center",
    width: "100%",
  },
  spacer: {
    flex: 1,
    minHeight: SIZES.spacingLarge,
  },
  primaryButton: {
    backgroundColor: COLORS.buttonBackground,
    paddingVertical: SIZES.buttonPadding,
    paddingHorizontal: SIZES.spacingLarge,
    borderRadius: SIZES.borderRadius,
    alignItems: "center",
    justifyContent: "center",
    minHeight: SIZES.touchTarget,
    width: "100%",
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  primaryButtonText: {
    color: COLORS.buttonText,
    fontSize: SIZES.textMedium,
    fontWeight: "600",
    textAlign: "center",
    width: "100%",
  },
  primaryButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  footer: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SIZES.spacingLarge,
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
    justifyContent: "center",
    minHeight: SIZES.touchTarget,
  },
  logoutButtonText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.textSmall,
    opacity: 0.7,
    textAlign: "center",
    width: "100%",
  },
});
