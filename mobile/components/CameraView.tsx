/**
 * CameraView Component
 *
 * Captures camera frames and sends them to the backend for analysis.
 * Optimized for real-time traffic signal detection with dashcam features.
 * 
 * Enhanced Features:
 * - Bounding boxes around detected objects
 * - Color-specific detection based on user's colorblindness profile
 * - ElevenLabs voice for color-related alerts only
 * - Voice commands with AI assistant (Sierra)
 * - Hands-free interaction
 * - Motion tracking for moving objects (animated brackets)
 */

import React, { useRef, useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions, Alert, Animated } from "react-native";
import {
  CameraView as ExpoCameraView,
  useCameraPermissions,
} from "expo-camera";
import {
  COLORS,
  SIZES,
  TIMING,
  SignalState,
  getSignalMessage,
  ColorblindnessType,
} from "../constants/accessibility";
import { detectSignal, DetectionResponse, DetectedObject } from "../services/api";
import { speakSignalState, resetSpeechState, speakWithElevenLabs, speak, stopSpeaking } from "../services/speech";
import { useAppStore, ColorBlindnessType } from "../store/useAppStore";
import { BoundingBoxOverlay } from "./BoundingBoxOverlay";
import { getColorProfile, DETECTABLE_OBJECTS, DetectableObject } from "../constants/colorProfiles";
import { parseVoiceCommand, executeVoiceCommand, VoiceCommand } from "../services/voiceCommands";
import { analyzeScene, askQuestion, getGreeting, SceneAnalysis } from "../services/aiAssistant";
import { updateMotionTracking, TrackedObject, resetMotionTracking } from "../services/motionTracking";

interface Props {
  colorblindType: ColorBlindnessType;
  onError?: (error: string) => void;
  onDetection?: (state: SignalState, confidence: number) => void;
}

export function CameraViewComponent({
  colorblindType,
  onError,
  onDetection,
}: Props) {
  const cameraRef = useRef<ExpoCameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(true);
  const [currentState, setCurrentState] = useState<SignalState>("unknown");
  const [confidence, setConfidence] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState<TrackedObject[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [lastFrameBase64, setLastFrameBase64] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameNumberRef = useRef(0); // Track frame number for motion detection

  // Get screen dimensions for bounding box calculations
  const screenDimensions = Dimensions.get("window");
  
  // Get settings from store
  const { alertSettings, transportSettings } = useAppStore();
  
  // Get the color profile for the user's colorblindness type
  const colorProfile = getColorProfile(colorblindType as any);
  
  // Reset motion tracking when component unmounts or colorblind type changes
  useEffect(() => {
    return () => {
      resetMotionTracking();
    };
  }, [colorblindType]);

  // Calculate frame interval based on transport mode
  const frameInterval =
    transportSettings.modeConfig[transportSettings.currentMode]
      .frameProcessingIntervalMs;

  // Pulse animation for listening indicator
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening, pulseAnim]);

  // Handle AI assistant button press
  const handleAskSierra = useCallback(async () => {
    if (!lastFrameBase64) {
      speak("I need to see something first. Please point the camera at what you want me to describe.");
      return;
    }
    
    setAiResponse(null);
    speak("Let me take a look...");
    
    try {
      const analysis = await analyzeScene(
        lastFrameBase64,
        colorblindType as ColorblindnessType,
        {
          transportMode: transportSettings.currentMode,
        }
      );
      
      // Build response message
      let response = analysis.description;
      
      // Add traffic signal info if present
      if (analysis.trafficSignals.length > 0) {
        response += ` Traffic signal: ${analysis.trafficSignals.join(', ')}.`;
      }
      
      // Add hazard warnings
      if (analysis.hazards.length > 0) {
        response += ` Caution: ${analysis.hazards.join(', ')}.`;
      }
      
      // Add color warnings for colorblind users
      if (analysis.colorWarnings.length > 0 && colorblindType !== 'normal') {
        response += ` Note: ${analysis.colorWarnings.join('. ')}.`;
      }
      
      // Add suggested action
      response += ` ${analysis.suggestedAction}`;
      
      setAiResponse(response);
      
      // Use ElevenLabs for AI responses if enabled
      if (colorProfile.useElevenLabs) {
        await speakWithElevenLabs(response);
      } else {
        speak(response);
      }
    } catch (error) {
      console.error("AI analysis error:", error);
      speak("Sorry, I couldn't analyze the scene. Please try again.");
    }
  }, [lastFrameBase64, colorblindType, transportSettings.currentMode, colorProfile.useElevenLabs]);

  // Handle quick check signal
  const handleQuickCheck = useCallback(() => {
    if (currentState === 'unknown') {
      speak("No traffic signal detected. Point the camera at a traffic light.");
    } else {
      const message = currentState === 'red' 
        ? "Red light. Stop." 
        : currentState === 'yellow'
        ? "Yellow light. Prepare to stop."
        : "Green light. You may proceed.";
      
      if (colorProfile.useElevenLabs) {
        speakWithElevenLabs(message);
      } else {
        speak(message);
      }
    }
  }, [currentState, colorProfile.useElevenLabs]);

  // Capture and analyze a frame
  const captureFrame = useCallback(async () => {
    if (!cameraRef.current || isProcessing || !isCapturing) return;

    try {
      setIsProcessing(true);

      // Capture a photo with reduced quality for faster upload
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.3,
        skipProcessing: true,
        shutterSound: false,
      });

      if (!photo?.base64) {
        throw new Error("Failed to capture image");
      }

      // Save frame for AI assistant
      setLastFrameBase64(photo.base64);

      // Send to backend for analysis with colorblind type for enhanced detection
      const result: DetectionResponse = await detectSignal(
        photo.base64,
        colorblindType as ColorblindnessType
      );

      // Update state
      setCurrentState(result.state);
      setConfidence(result.confidence);
      
      // Update detected objects for bounding box overlay with motion tracking
      if (result.detectedObjects && result.detectedObjects.length > 0) {
        // Apply motion tracking to identify moving objects
        frameNumberRef.current++;
        const trackedObjects = updateMotionTracking(result.detectedObjects, frameNumberRef.current);
        setDetectedObjects(trackedObjects);
      } else {
        setDetectedObjects([]);
      }

      // Notify parent component
      onDetection?.(result.state, result.confidence);

      // Speak the result if confidence is high enough
      if (result.confidence >= alertSettings.minConfidenceToAlert) {
        // Check if any detected objects are problematic colors for this user
        const problematicObjects = result.detectedObjects?.filter(
          obj => obj.isProblematicColor
        ) || [];
        
        // Use ElevenLabs for color-related alerts if enabled in profile
        if (colorProfile.useElevenLabs && problematicObjects.length > 0) {
          // Generate descriptive alert for problematic colors
          const alertMessage = generateColorAlert(problematicObjects, result.state);
          try {
            await speakWithElevenLabs(alertMessage);
          } catch (e) {
            // Fallback to regular speech if ElevenLabs fails
            console.warn("ElevenLabs failed, falling back to regular speech:", e);
            await speakSignalState(
              result.state,
              colorblindType as any,
              alertSettings.positionCuesEnabled
            );
          }
        } else {
          // Use regular speech for non-problematic colors
          await speakSignalState(
            result.state,
            colorblindType as any,
            alertSettings.positionCuesEnabled
          );
        }
      }
    } catch (error) {
      console.error("Capture error:", error);
      onError?.(error instanceof Error ? error.message : "Detection failed");
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    isCapturing,
    colorblindType,
    colorProfile.useElevenLabs,
    onError,
    onDetection,
    alertSettings.minConfidenceToAlert,
    alertSettings.positionCuesEnabled,
  ]);
  
  // Generate descriptive alert for any detected object with problematic colors
  const generateColorAlert = (objects: DetectedObject[], state: SignalState): string => {
    const highPriorityObjects = objects.filter(obj => obj.alertPriority === "high" || obj.alertPriority === "critical");
    
    if (highPriorityObjects.length === 0) {
      // Default message based on traffic light state
      switch (state) {
        case "red":
          return "Red signal ahead. Stop.";
        case "yellow":
          return "Yellow signal. Prepare to stop.";
        case "green":
          return "Green signal. You may proceed.";
        default:
          return "Signal detected.";
      }
    }
    
    // Find the matching detectable object for better messages
    const alertMessages: string[] = [];
    
    for (const obj of highPriorityObjects) {
      // Look up the object in our DETECTABLE_OBJECTS for proper messaging
      const detectedObjInfo = DETECTABLE_OBJECTS.find(
        d => d.name.toLowerCase() === obj.label.toLowerCase() || 
             d.id === obj.label.toLowerCase().replace(/\s+/g, '_')
      );
      
      if (detectedObjInfo) {
        // Use the predefined alert message and action
        alertMessages.push(
          `${detectedObjInfo.alertMessage}. ${detectedObjInfo.actionRequired || ''}`
        );
      } else {
        // Fallback for unknown objects
        alertMessages.push(`${obj.label} detected ahead.`);
      }
    }
    
    // Combine messages, prioritizing critical ones
    if (alertMessages.length === 1) {
      return alertMessages[0];
    } else if (alertMessages.length > 1) {
      // Multiple objects - announce the most critical one
      return `Warning! Multiple hazards. ${alertMessages[0]}`;
    }
    
    return "Hazard detected ahead.";
  };

  // Start/stop capture interval
  useEffect(() => {
    if (isCapturing && permission?.granted) {
      resetSpeechState();
      captureIntervalRef.current = setInterval(captureFrame, frameInterval);
    }

    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
    };
  }, [isCapturing, permission?.granted, captureFrame, frameInterval]);

  // Get display info based on state
  const getStateColor = () => {
    switch (currentState) {
      case "red":
        return COLORS.red;
      case "yellow":
        return COLORS.yellow;
      case "green":
        return COLORS.green;
      default:
        return COLORS.unknown;
    }
  };

  const getStateLabel = () => {
    switch (currentState) {
      case "red":
        return "RED";
      case "yellow":
        return "YELLOW";
      case "green":
        return "GREEN";
      default:
        return "SCANNING";
    }
  };

  const getActionText = () => {
    if (currentState === "unknown") {
      return "Point camera at traffic light";
    }
    // Use position cues based on settings
    return getSignalMessage(
      currentState,
      alertSettings.positionCuesEnabled ? "protanopia" : "normal"
    );
  };

  // Get shape indicator for colorblind users
  const getShapeIndicator = () => {
    if (!alertSettings.shapeCuesEnabled) return null;

    switch (currentState) {
      case "red":
        return <View style={[styles.shapeSquare, { backgroundColor: COLORS.red }]} />;
      case "yellow":
        return <View style={[styles.shapeCircle, { backgroundColor: COLORS.yellow }]} />;
      case "green":
        return <View style={[styles.shapeTriangle, { borderBottomColor: COLORS.green }]} />;
      default:
        return null;
    }
  };

  // Handle permissions
  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Checking camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          Delta needs camera access to detect traffic signals and help keep you
          safe.
        </Text>
        <Pressable
          style={styles.permissionButton}
          onPress={requestPermission}
          accessibilityRole="button"
          accessibilityLabel="Grant camera permission"
        >
          <Text style={styles.permissionButtonText}>Enable Camera</Text>
        </Pressable>
      </View>
    );
  }

  const stateColor = getStateColor();

  return (
    <View style={styles.container}>
      {/* Camera preview - full screen for dashcam mode */}
      <ExpoCameraView ref={cameraRef} style={styles.camera} facing="back">
        {/* Bounding box overlay for detected objects */}
        <BoundingBoxOverlay
          objects={detectedObjects}
          imageWidth={640}
          imageHeight={480}
          containerWidth={screenDimensions.width}
          containerHeight={screenDimensions.height}
        />
        
        {/* Status overlay at top */}
        <View style={styles.statusOverlay}>
          {/* State indicator with optional shape */}
          <View style={styles.stateRow}>
            {getShapeIndicator()}
            <View
              style={[styles.stateIndicator, { backgroundColor: stateColor }]}
            >
              <Text style={styles.stateText}>{getStateLabel()}</Text>
            </View>
          </View>

          {/* Action description */}
          {currentState !== "unknown" && (
            <View style={[styles.actionBar, { borderColor: stateColor }]}>
              <Text style={styles.actionText}>{getActionText()}</Text>
            </View>
          )}
        </View>

        {/* Processing indicator */}
        {isProcessing && (
          <View style={styles.processingIndicator}>
            <View
              style={[styles.processingDot, { backgroundColor: stateColor }]}
            />
          </View>
        )}

        {/* Confidence indicator */}
        {currentState !== "unknown" && (
          <View style={styles.confidenceBar}>
            <View
              style={[
                styles.confidenceFill,
                {
                  width: `${confidence * 100}%`,
                  backgroundColor: stateColor,
                },
              ]}
            />
          </View>
        )}
        
        {/* Detected objects count indicator */}
        {detectedObjects.length > 0 && (
          <View style={styles.objectCountBadge}>
            <Text style={styles.objectCountText}>
              {detectedObjects.length} object{detectedObjects.length !== 1 ? 's' : ''} detected
            </Text>
          </View>
        )}
        
        {/* AI Response overlay */}
        {aiResponse && (
          <View style={styles.aiResponseOverlay}>
            <Text style={styles.aiResponseText}>{aiResponse}</Text>
            <Pressable 
              style={styles.dismissButton}
              onPress={() => setAiResponse(null)}
            >
              <Text style={styles.dismissButtonText}>✕</Text>
            </Pressable>
          </View>
        )}
      </ExpoCameraView>

      {/* Control buttons */}
      <View style={styles.controlOverlay}>
        {/* Pause/Resume button */}
        <Pressable
          style={[
            styles.controlButton,
            !isCapturing && styles.controlButtonPaused,
          ]}
          onPress={() => setIsCapturing(!isCapturing)}
          accessibilityRole="button"
          accessibilityLabel={
            isCapturing ? "Pause detection" : "Resume detection"
          }
        >
          <Text style={styles.controlButtonText}>
            {isCapturing ? "||" : "▶"}
          </Text>
        </Pressable>
      </View>
      
      {/* Right side controls - AI Assistant */}
      <View style={styles.rightControlOverlay}>
        {/* Quick signal check button */}
        <Pressable
          style={styles.quickCheckButton}
          onPress={handleQuickCheck}
          accessibilityRole="button"
          accessibilityLabel="Quick signal check"
        >
          <Text style={styles.quickCheckText}>🚦</Text>
        </Pressable>
        
        {/* AI Assistant button */}
        <Animated.View style={{ transform: [{ scale: isListening ? pulseAnim : 1 }] }}>
          <Pressable
            style={[
              styles.aiButton,
              isListening && styles.aiButtonActive,
            ]}
            onPress={handleAskSierra}
            onLongPress={() => {
              setIsListening(true);
              speak("Hi! I'm Sierra. How can I help you?");
            }}
            onPressOut={() => setIsListening(false)}
            accessibilityRole="button"
            accessibilityLabel="Ask Sierra AI assistant"
            accessibilityHint="Tap to describe scene, hold for voice commands"
          >
            <Text style={styles.aiButtonText}>🎙️</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  camera: {
    flex: 1,
  },
  statusOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: SIZES.spacingMedium,
    paddingBottom: SIZES.spacingMedium,
  },
  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SIZES.spacingSmall,
    marginBottom: SIZES.spacingSmall,
  },
  stateIndicator: {
    paddingHorizontal: SIZES.spacingLarge * 2,
    paddingVertical: SIZES.spacingMedium,
    borderRadius: SIZES.borderRadius,
  },
  stateText: {
    color: COLORS.background,
    fontSize: SIZES.textXL,
    fontWeight: "bold",
    letterSpacing: 4,
    textAlign: "center",
  },
  // Shape indicators for colorblind users
  shapeSquare: {
    width: 32,
    height: 32,
    borderRadius: 4,
  },
  shapeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  shapeTriangle: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderLeftWidth: 16,
    borderRightWidth: 16,
    borderBottomWidth: 32,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  actionBar: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingVertical: SIZES.spacingMedium,
    paddingHorizontal: SIZES.spacingLarge,
    borderRadius: SIZES.borderRadius,
    borderWidth: 2,
  },
  actionText: {
    color: COLORS.textPrimary,
    fontSize: SIZES.textMedium,
    textAlign: "center",
    fontWeight: "500",
  },
  processingIndicator: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  processingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.9,
  },
  confidenceBar: {
    position: "absolute",
    bottom: 80,
    left: SIZES.spacingLarge,
    right: SIZES.spacingLarge,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 2,
  },
  confidenceFill: {
    height: "100%",
    borderRadius: 2,
  },
  controlOverlay: {
    position: "absolute",
    bottom: 20,
    left: 20,
  },
  controlButton: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  controlButtonPaused: {
    backgroundColor: COLORS.green,
  },
  controlButtonText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "bold",
  },
  objectCountBadge: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  objectCountText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "500",
  },
  message: {
    color: COLORS.textPrimary,
    fontSize: SIZES.textMedium,
    textAlign: "center",
    marginHorizontal: SIZES.spacingLarge,
    marginBottom: SIZES.spacingLarge,
    marginTop: 100,
  },
  permissionButton: {
    alignSelf: "center",
    backgroundColor: COLORS.green,
    paddingHorizontal: SIZES.spacingLarge,
    paddingVertical: SIZES.buttonPadding,
    borderRadius: SIZES.borderRadius,
  },
  permissionButtonText: {
    color: COLORS.textPrimary,
    fontSize: SIZES.textMedium,
    fontWeight: "bold",
  },
  // AI Assistant styles
  rightControlOverlay: {
    position: "absolute",
    bottom: 20,
    right: 20,
    gap: 12,
  },
  aiButton: {
    backgroundColor: "rgba(80, 80, 200, 0.8)",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  aiButtonActive: {
    backgroundColor: "rgba(200, 80, 80, 0.9)",
  },
  aiButtonText: {
    fontSize: 24,
  },
  quickCheckButton: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  quickCheckText: {
    fontSize: 20,
  },
  aiResponseOverlay: {
    position: "absolute",
    bottom: 140,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(100, 100, 200, 0.5)",
  },
  aiResponseText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  dismissButton: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 4,
  },
  dismissButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
});
