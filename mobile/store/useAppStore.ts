/**
 * App Store - Global State Management
 *
 * Uses Zustand for lightweight state management with persistence.
 * Stores user profile, color vision data, settings, and transport mode.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Color blindness types with expanded support
export type ColorBlindnessType =
  | "normal"
  | "protanopia" // Red-blind (severe)
  | "protanomaly" // Red-weak (mild)
  | "deuteranopia" // Green-blind (severe)
  | "deutanomaly" // Green-weak (mild)
  | "tritanopia" // Blue-blind (severe)
  | "tritanomaly" // Blue-weak (mild)
  | "achromatopsia" // Complete color blindness
  | "low_vision" // General low vision
  | "unknown";

export type Severity = "mild" | "moderate" | "severe";

export type TransportMode = "walking" | "biking" | "driving" | "passenger";

export type AlertLevel = "minimal" | "standard" | "verbose";

// Color vision profile
export interface ColorVisionProfile {
  type: ColorBlindnessType;
  severity: Severity;
  confidence: number; // 0-1
  testDate: string | null;

  // Specific color difficulties
  problematicColors: {
    red: boolean;
    green: boolean;
    blue: boolean;
    yellow: boolean;
  };
}

// Alert settings
export interface AlertSettings {
  alertLevel: AlertLevel;
  positionCuesEnabled: boolean;
  shapeCuesEnabled: boolean;
  voiceProvider: "expo-speech" | "elevenlabs";
  voiceId: string | null; // ElevenLabs voice ID
  speechRate: number; // 0.5 - 2.0
  minConfidenceToAlert: number; // 0-1
  alertsOnlyAudio: boolean; // If true, only play audio for urgent color alerts (not navigation/UI)
}

// Transport mode settings
export interface TransportSettings {
  currentMode: TransportMode;
  autoDetectMode: boolean;
  modeConfig: {
    [key in TransportMode]: {
      alertIntervalMs: number;
      frameProcessingIntervalMs: number;
    };
  };
}

// Detection settings
export interface DetectionSettings {
  enableTrafficLights: boolean;
  enableStopSigns: boolean;
  enableBrakeLights: boolean;
  enableEmergencyVehicles: boolean;
  enableConstructionZones: boolean;
  enablePedestrianSignals: boolean;
}

// App state interface
interface AppState {
  // User profile
  hasCompletedOnboarding: boolean;
  colorVisionProfile: ColorVisionProfile;

  // Settings
  alertSettings: AlertSettings;
  transportSettings: TransportSettings;
  detectionSettings: DetectionSettings;

  // Runtime state (not persisted)
  currentSpeed: number; // km/h
  isRecording: boolean;
  activeHazards: number;

  // Actions
  setOnboardingComplete: (complete: boolean) => void;
  setColorVisionProfile: (profile: Partial<ColorVisionProfile>) => void;
  setAlertSettings: (settings: Partial<AlertSettings>) => void;
  setTransportMode: (mode: TransportMode) => void;
  setTransportSettings: (settings: Partial<TransportSettings>) => void;
  setDetectionSettings: (settings: Partial<DetectionSettings>) => void;
  setCurrentSpeed: (speed: number) => void;
  setIsRecording: (recording: boolean) => void;
  setActiveHazards: (count: number) => void;
  resetProfile: () => void;
}

// Default values
const defaultColorVisionProfile: ColorVisionProfile = {
  type: "normal",
  severity: "moderate",
  confidence: 0,
  testDate: null,
  problematicColors: {
    red: false,
    green: false,
    blue: false,
    yellow: false,
  },
};

const defaultAlertSettings: AlertSettings = {
  alertLevel: "standard",
  positionCuesEnabled: true,
  shapeCuesEnabled: true,
  voiceProvider: "elevenlabs", // Use ElevenLabs for natural voice
  voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel voice
  speechRate: 1.1,
  minConfidenceToAlert: 0.5,
  alertsOnlyAudio: true, // Default: only play audio for urgent color alerts
};

const defaultTransportSettings: TransportSettings = {
  currentMode: "driving",
  autoDetectMode: true,
  modeConfig: {
    walking: {
      alertIntervalMs: 5000,
      frameProcessingIntervalMs: 250,
    },
    biking: {
      alertIntervalMs: 3000,
      frameProcessingIntervalMs: 200,
    },
    driving: {
      alertIntervalMs: 1500,
      frameProcessingIntervalMs: 125,
    },
    passenger: {
      alertIntervalMs: 10000,
      frameProcessingIntervalMs: 500,
    },
  },
};

const defaultDetectionSettings: DetectionSettings = {
  enableTrafficLights: true,
  enableStopSigns: true,
  enableBrakeLights: true,
  enableEmergencyVehicles: true,
  enableConstructionZones: true,
  enablePedestrianSignals: true,
};

// Create the store with persistence
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      hasCompletedOnboarding: false,
      colorVisionProfile: defaultColorVisionProfile,
      alertSettings: defaultAlertSettings,
      transportSettings: defaultTransportSettings,
      detectionSettings: defaultDetectionSettings,

      // Runtime state (not persisted via partialize)
      currentSpeed: 0,
      isRecording: false,
      activeHazards: 0,

      // Actions
      setOnboardingComplete: (complete) =>
        set({ hasCompletedOnboarding: complete }),

      setColorVisionProfile: (profile) =>
        set((state) => ({
          colorVisionProfile: { ...state.colorVisionProfile, ...profile },
        })),

      setAlertSettings: (settings) =>
        set((state) => ({
          alertSettings: { ...state.alertSettings, ...settings },
        })),

      setTransportMode: (mode) =>
        set((state) => ({
          transportSettings: { ...state.transportSettings, currentMode: mode },
        })),

      setTransportSettings: (settings) =>
        set((state) => ({
          transportSettings: { ...state.transportSettings, ...settings },
        })),

      setDetectionSettings: (settings) =>
        set((state) => ({
          detectionSettings: { ...state.detectionSettings, ...settings },
        })),

      setCurrentSpeed: (speed) => set({ currentSpeed: speed }),

      setIsRecording: (recording) => set({ isRecording: recording }),

      setActiveHazards: (count) => set({ activeHazards: count }),

      resetProfile: () =>
        set({
          hasCompletedOnboarding: false,
          colorVisionProfile: defaultColorVisionProfile,
          alertSettings: defaultAlertSettings,
        }),
    }),
    {
      name: "truelight-app-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist these fields (exclude runtime state)
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        colorVisionProfile: state.colorVisionProfile,
        alertSettings: state.alertSettings,
        transportSettings: state.transportSettings,
        detectionSettings: state.detectionSettings,
      }),
    }
  )
);

// Utility functions
export function getProblematicColorsForType(
  type: ColorBlindnessType
): ColorVisionProfile["problematicColors"] {
  switch (type) {
    case "protanopia":
    case "protanomaly":
      return { red: true, green: true, blue: false, yellow: false };
    case "deuteranopia":
    case "deutanomaly":
      return { red: true, green: true, blue: false, yellow: false };
    case "tritanopia":
    case "tritanomaly":
      return { red: false, green: false, blue: true, yellow: true };
    case "achromatopsia":
      return { red: true, green: true, blue: true, yellow: true };
    case "low_vision":
      return { red: true, green: true, blue: true, yellow: true };
    default:
      return { red: false, green: false, blue: false, yellow: false };
  }
}

export function getSeverityForType(type: ColorBlindnessType): Severity {
  switch (type) {
    case "protanopia":
    case "deuteranopia":
    case "tritanopia":
    case "achromatopsia":
      return "severe";
    case "protanomaly":
    case "deutanomaly":
    case "tritanomaly":
      return "mild";
    case "low_vision":
      return "severe";
    default:
      return "moderate";
  }
}

// Get transport mode from speed
export function getTransportModeFromSpeed(speedKmh: number): TransportMode {
  if (speedKmh < 5) return "walking";
  if (speedKmh < 25) return "biking";
  return "driving";
}

// Get alert interval based on current settings and speed
export function getCurrentAlertInterval(state: AppState): number {
  const { currentMode, modeConfig } = state.transportSettings;
  return modeConfig[currentMode].alertIntervalMs;
}

// Get frame processing interval based on current settings
export function getCurrentFrameInterval(state: AppState): number {
  const { currentMode, modeConfig } = state.transportSettings;
  return modeConfig[currentMode].frameProcessingIntervalMs;
}
