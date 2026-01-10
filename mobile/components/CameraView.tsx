/**
 * CameraView Component
 *
 * Minimalist camera detection screen
 * Only the signal state text shows color (red/yellow/green)
 */

import React, { useRef, useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import {
  CameraView as ExpoCameraView,
  useCameraPermissions,
} from "expo-camera";
import {
  COLORS,
  SIZES,
  TIMING,
  SignalState,
  ColorblindnessType,
  getSignalMessage,
} from "../constants/accessibility";
import { detectSignal, DetectionResponse } from "../services/api";
import { speakSignalState, resetSpeechState } from "../services/speech";

interface Props {
  colorblindType: ColorblindnessType;
  onError?: (error: string) => void;
}

export function CameraViewComponent({ colorblindType, onError }: Props) {
  const cameraRef = useRef<ExpoCameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(true);
  const [currentState, setCurrentState] = useState<SignalState>("unknown");
  const [confidence, setConfidence] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const captureFrame = useCallback(async () => {
    if (!cameraRef.current || isProcessing || !isCapturing) return;

    try {
      setIsProcessing(true);

      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.3,
        skipProcessing: true,
        shutterSound: false,
      });

      if (!photo?.base64) {
        throw new Error("Failed to capture image");
      }

      const result: DetectionResponse = await detectSignal(photo.base64);
      setCurrentState(result.state);
      setConfidence(result.confidence);

      if (result.confidence >= TIMING.minConfidenceToAnnounce) {
        await speakSignalState(result.state, colorblindType);
      }
    } catch (error) {
      console.error("Capture error:", error);
      onError?.(error instanceof Error ? error.message : "Detection failed");
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, isCapturing, colorblindType, onError]);

  useEffect(() => {
    if (isCapturing && permission?.granted) {
      resetSpeechState();
      captureIntervalRef.current = setInterval(
        captureFrame,
        TIMING.captureInterval,
      );
    }

    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
    };
  }, [isCapturing, permission?.granted, captureFrame]);

  // Get color for detected state text only
  const getStateColor = () => {
    switch (currentState) {
      case "red":
        return COLORS.red;
      case "yellow":
        return COLORS.yellow;
      case "green":
        return COLORS.green;
      default:
        return COLORS.textSecondary;
    }
  };

  const getStateLabel = () => {
    switch (currentState) {
      case "red":
        return "Red";
      case "yellow":
        return "Yellow";
      case "green":
        return "Green";
      default:
        return "Scanning";
    }
  };

  const getActionText = () => {
    if (currentState === "unknown") {
      return "Point camera at traffic light";
    }
    return getSignalMessage(currentState, colorblindType);
  };

  // Permission states
  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.message}>Checking camera permission...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>Camera Access</Text>
          <Text style={styles.message}>
            Delta needs camera access to detect traffic signals.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={requestPermission}
            accessibilityRole="button"
            accessibilityLabel="Grant camera permission"
          >
            <Text style={styles.primaryButtonText}>Enable Camera</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.stateText, { color: getStateColor() }]}>
          {getStateLabel()}
        </Text>
        <Text style={styles.actionText}>{getActionText()}</Text>
      </View>

      {/* Camera */}
      <View style={styles.cameraContainer}>
        <ExpoCameraView ref={cameraRef} style={styles.camera} facing="back">
          {isProcessing && (
            <View style={styles.processingIndicator}>
              <View style={styles.processingDot} />
            </View>
          )}
        </ExpoCameraView>
      </View>

      {/* Controls */}
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.controlButton,
            !isCapturing && styles.controlButtonActive,
          ]}
          onPress={() => setIsCapturing(!isCapturing)}
          accessibilityRole="button"
          accessibilityLabel={
            isCapturing ? "Pause detection" : "Resume detection"
          }
        >
          <Text
            style={[
              styles.controlButtonText,
              !isCapturing && styles.controlButtonTextActive,
            ]}
          >
            {isCapturing ? "Pause" : "Resume"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.spacingLarge,
  },
  header: {
    paddingTop: 70,
    paddingHorizontal: SIZES.spacingLarge,
    paddingBottom: SIZES.spacingMedium,
  },
  stateText: {
    fontSize: SIZES.textXL,
    fontWeight: "600",
    letterSpacing: -1,
    marginBottom: 4,
  },
  actionText: {
    fontSize: SIZES.textMedium,
    color: COLORS.textSecondary,
  },
  cameraContainer: {
    flex: 1,
    marginHorizontal: SIZES.spacingLarge,
    marginBottom: SIZES.spacingMedium,
    borderRadius: SIZES.borderRadius,
    overflow: "hidden",
    backgroundColor: COLORS.textPrimary,
  },
  camera: {
    flex: 1,
  },
  processingIndicator: {
    position: "absolute",
    top: SIZES.spacingMedium,
    right: SIZES.spacingMedium,
  },
  processingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.background,
    opacity: 0.8,
  },
  footer: {
    paddingHorizontal: SIZES.spacingLarge,
    paddingBottom: SIZES.spacingLarge,
  },
  controlButton: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingVertical: SIZES.buttonPadding,
    borderRadius: SIZES.borderRadius,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  controlButtonActive: {
    backgroundColor: COLORS.buttonBackground,
    borderColor: COLORS.buttonBackground,
  },
  controlButtonText: {
    color: COLORS.textPrimary,
    fontSize: SIZES.textMedium,
    fontWeight: "500",
  },
  controlButtonTextActive: {
    color: COLORS.buttonText,
  },
  title: {
    fontSize: SIZES.textLarge,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SIZES.spacingSmall,
  },
  message: {
    fontSize: SIZES.textMedium,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SIZES.spacingLarge,
    lineHeight: 26,
  },
  primaryButton: {
    backgroundColor: COLORS.buttonBackground,
    paddingVertical: SIZES.buttonPadding,
    paddingHorizontal: SIZES.spacingLarge * 2,
    borderRadius: SIZES.borderRadius,
  },
  primaryButtonText: {
    color: COLORS.buttonText,
    fontSize: SIZES.textMedium,
    fontWeight: "600",
  },
});
