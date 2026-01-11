/**
 * Settings Screen
 *
 * App settings including:
 * - Alert preferences
 * - Voice settings
 * - Transport mode
 * - Detection toggles
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SIZES } from "../../../constants/accessibility";
import {
  useAppStore,
  AlertLevel,
  TransportMode,
} from "../../../store/useAppStore";
import { speak } from "../../../services/speech";
import { logout } from "../../../services/auth";

export default function SettingsScreen() {
  const router = useRouter();
  const {
    alertSettings,
    transportSettings,
    detectionSettings,
    setAlertSettings,
    setTransportMode,
    setTransportSettings,
    setDetectionSettings,
    resetProfile,
  } = useAppStore();

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            speak("Logging out");
            await logout();
            router.replace("/login");
          },
        },
      ]
    );
  };

  const handleResetProfile = () => {
    Alert.alert(
      "Reset Profile",
      "This will clear your color vision test results and all settings. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            resetProfile();
            speak("Profile reset. Please retake the vision test.");
          },
        },
      ]
    );
  };

  const handleTestVoice = () => {
    speak(
      "This is a test of the Delta voice system. Red light ahead. Stop.",
      { rate: alertSettings.speechRate }
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Alert Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert Settings</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Alert Level</Text>
              <Text style={styles.settingDescription}>
                How much detail in voice alerts
              </Text>
            </View>
            <View style={styles.segmentedControl}>
              {(["minimal", "standard", "verbose"] as AlertLevel[]).map(
                (level) => (
                  <Pressable
                    key={level}
                    style={[
                      styles.segmentButton,
                      alertSettings.alertLevel === level && styles.segmentActive,
                    ]}
                    onPress={() => setAlertSettings({ alertLevel: level })}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        alertSettings.alertLevel === level &&
                          styles.segmentTextActive,
                      ]}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Position Cues</Text>
              <Text style={styles.settingDescription}>
                "Red light at top" instead of "Red light"
              </Text>
            </View>
            <Switch
              value={alertSettings.positionCuesEnabled}
              onValueChange={(value) =>
                setAlertSettings({ positionCuesEnabled: value })
              }
              trackColor={{ false: COLORS.border, true: COLORS.green }}
              thumbColor={COLORS.textPrimary}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Shape Indicators</Text>
              <Text style={styles.settingDescription}>
                Show shapes alongside colors in UI
              </Text>
            </View>
            <Switch
              value={alertSettings.shapeCuesEnabled}
              onValueChange={(value) =>
                setAlertSettings({ shapeCuesEnabled: value })
              }
              trackColor={{ false: COLORS.border, true: COLORS.green }}
              thumbColor={COLORS.textPrimary}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Speech Rate</Text>
              <Text style={styles.settingDescription}>
                {alertSettings.speechRate.toFixed(1)}x speed
              </Text>
            </View>
            <View style={styles.speedControl}>
              <Pressable
                style={styles.speedButton}
                onPress={() =>
                  setAlertSettings({
                    speechRate: Math.max(0.5, alertSettings.speechRate - 0.1),
                  })
                }
              >
                <Text style={styles.speedButtonText}>-</Text>
              </Pressable>
              <Text style={styles.speedValue}>
                {alertSettings.speechRate.toFixed(1)}
              </Text>
              <Pressable
                style={styles.speedButton}
                onPress={() =>
                  setAlertSettings({
                    speechRate: Math.min(2.0, alertSettings.speechRate + 0.1),
                  })
                }
              >
                <Text style={styles.speedButtonText}>+</Text>
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.testButton} onPress={handleTestVoice}>
            <Text style={styles.testButtonText}>Test Voice</Text>
          </Pressable>
        </View>

        {/* Voice Provider */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice Provider</Text>

          <Pressable
            style={[
              styles.providerCard,
              alertSettings.voiceProvider === "expo-speech" &&
                styles.providerActive,
            ]}
            onPress={() => setAlertSettings({ voiceProvider: "expo-speech" })}
          >
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>System Voice</Text>
              <Text style={styles.providerDescription}>
                Built-in device voice. Works offline.
              </Text>
            </View>
            {alertSettings.voiceProvider === "expo-speech" && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </Pressable>

          <Pressable
            style={[
              styles.providerCard,
              alertSettings.voiceProvider === "elevenlabs" &&
                styles.providerActive,
            ]}
            onPress={() => {
              Alert.alert(
                "ElevenLabs",
                "ElevenLabs provides more natural voice alerts. This feature requires an API key and internet connection.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Enable",
                    onPress: () =>
                      setAlertSettings({ voiceProvider: "elevenlabs" }),
                  },
                ]
              );
            }}
          >
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>ElevenLabs</Text>
              <Text style={styles.providerDescription}>
                Natural AI voice. Requires internet.
              </Text>
            </View>
            {alertSettings.voiceProvider === "elevenlabs" && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </Pressable>
        </View>

        {/* Transport Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transport Mode</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-detect Mode</Text>
              <Text style={styles.settingDescription}>
                Use GPS speed to set mode
              </Text>
            </View>
            <Switch
              value={transportSettings.autoDetectMode}
              onValueChange={(value) =>
                setTransportSettings({ autoDetectMode: value })
              }
              trackColor={{ false: COLORS.border, true: COLORS.green }}
              thumbColor={COLORS.textPrimary}
            />
          </View>

          {!transportSettings.autoDetectMode && (
            <View style={styles.modeSelector}>
              {(
                ["walking", "biking", "driving", "passenger"] as TransportMode[]
              ).map((mode) => (
                <Pressable
                  key={mode}
                  style={[
                    styles.modeButton,
                    transportSettings.currentMode === mode &&
                      styles.modeButtonActive,
                  ]}
                  onPress={() => setTransportMode(mode)}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      transportSettings.currentMode === mode &&
                        styles.modeButtonTextActive,
                    ]}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                  <Text style={styles.modeInterval}>
                    {transportSettings.modeConfig[mode].alertIntervalMs / 1000}s
                    alerts
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Detection Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detection Types</Text>
          <Text style={styles.sectionDescription}>
            Choose which hazards to detect and alert
          </Text>

          {[
            {
              key: "enableTrafficLights",
              label: "Traffic Lights",
              desc: "Red, yellow, green signals",
            },
            {
              key: "enableStopSigns",
              label: "Stop Signs",
              desc: "Octagonal stop signs",
            },
            {
              key: "enableBrakeLights",
              label: "Brake Lights",
              desc: "Vehicle braking ahead",
            },
            {
              key: "enableEmergencyVehicles",
              label: "Emergency Vehicles",
              desc: "Police, fire, ambulance",
            },
            {
              key: "enableConstructionZones",
              label: "Construction Zones",
              desc: "Orange cones and barriers",
            },
            {
              key: "enablePedestrianSignals",
              label: "Pedestrian Signals",
              desc: "Walk/don't walk signs",
            },
          ].map((item) => (
            <View key={item.key} style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{item.label}</Text>
                <Text style={styles.settingDescription}>{item.desc}</Text>
              </View>
              <Switch
                value={detectionSettings[item.key as keyof typeof detectionSettings]}
                onValueChange={(value) =>
                  setDetectionSettings({ [item.key]: value })
                }
                trackColor={{ false: COLORS.border, true: COLORS.green }}
                thumbColor={COLORS.textPrimary}
              />
            </View>
          ))}
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={styles.sectionTitle}>Data</Text>

          <Pressable style={styles.dangerButton} onPress={handleResetProfile}>
            <Text style={styles.dangerButtonText}>Reset All Settings</Text>
          </Pressable>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </Pressable>
        </View>

        {/* Version */}}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Delta v1.0.0</Text>
          <Text style={styles.footerText}>Your data stays on your device</Text>
        </View>
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
    padding: SIZES.spacingLarge,
  },
  section: {
    marginBottom: SIZES.spacingLarge,
  },
  sectionTitle: {
    fontSize: SIZES.textMedium,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SIZES.spacingSmall,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SIZES.spacingMedium,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.backgroundSecondary,
    padding: SIZES.spacingMedium,
    borderRadius: SIZES.borderRadius,
    marginBottom: SIZES.spacingSmall,
  },
  settingInfo: {
    flex: 1,
    marginRight: SIZES.spacingMedium,
  },
  settingLabel: {
    fontSize: SIZES.textSmall,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: COLORS.border,
    borderRadius: 8,
    padding: 2,
  },
  segmentButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: COLORS.green,
  },
  segmentText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: COLORS.background,
  },
  speedControl: {
    flexDirection: "row",
    alignItems: "center",
  },
  speedButton: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.border,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  speedButtonText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "bold",
  },
  speedValue: {
    color: COLORS.textPrimary,
    fontSize: SIZES.textSmall,
    fontWeight: "600",
    marginHorizontal: SIZES.spacingMedium,
    minWidth: 40,
    textAlign: "center",
  },
  testButton: {
    backgroundColor: COLORS.backgroundSecondary,
    padding: SIZES.spacingMedium,
    borderRadius: SIZES.borderRadius,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.green,
  },
  testButtonText: {
    color: COLORS.green,
    fontSize: SIZES.textSmall,
    fontWeight: "600",
  },
  providerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundSecondary,
    padding: SIZES.spacingMedium,
    borderRadius: SIZES.borderRadius,
    marginBottom: SIZES.spacingSmall,
    borderWidth: 2,
    borderColor: "transparent",
  },
  providerActive: {
    borderColor: COLORS.green,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: SIZES.textSmall,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  providerDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  checkmark: {
    color: COLORS.green,
    fontSize: 20,
    fontWeight: "bold",
  },
  modeSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SIZES.spacingSmall,
    marginTop: SIZES.spacingSmall,
  },
  modeButton: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: COLORS.backgroundSecondary,
    padding: SIZES.spacingMedium,
    borderRadius: SIZES.borderRadius,
    borderWidth: 2,
    borderColor: "transparent",
  },
  modeButtonActive: {
    borderColor: COLORS.green,
  },
  modeButtonText: {
    fontSize: SIZES.textSmall,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  modeButtonTextActive: {
    color: COLORS.green,
  },
  modeInterval: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dangerSection: {
    marginTop: SIZES.spacingLarge,
  },
  dangerButton: {
    backgroundColor: "transparent",
    padding: SIZES.spacingMedium,
    borderRadius: SIZES.borderRadius,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.red,
  },
  dangerButtonText: {
    color: COLORS.red,
    fontSize: SIZES.textSmall,
    fontWeight: "600",
  },
  logoutButton: {
    backgroundColor: COLORS.red,
    padding: SIZES.spacingMedium,
    borderRadius: SIZES.borderRadius,
    alignItems: "center",
  },
  logoutButtonText: {
    color: COLORS.textPrimary,
    fontSize: SIZES.textSmall,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    paddingVertical: SIZES.spacingLarge,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
});
