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
  const [currentState, setCurrentState] = useState<SignalState>("unknown");
  const [confidence, setConfidence] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState<TrackedObject[]>([]);
  const [activeTargetIndex, setActiveTargetIndex] = useState(0); // For lock-on cursor cycling
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
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);

      // Capture a photo with better quality for detection
      console.log('[CameraView] 📸 Taking snapshot...');
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,  // Higher quality for better detection
        skipProcessing: true,
        shutterSound: false,
      });

      if (!photo?.base64) {
        throw new Error("Failed to capture image");
      }

      console.log(`[CameraView] ✓ Snapshot captured: ${photo.base64.length} chars, ${photo.width}x${photo.height}`);

      // Save frame for AI assistant
      setLastFrameBase64(photo.base64);

      // Send to backend for analysis with colorblind type for enhanced detection
      console.log('[CameraView] 🔍 Sending to detection service...');
      const result: DetectionResponse = await detectSignal(
        photo.base64,
        colorblindType as ColorblindnessType
      );

      console.log(`[CameraView] ✓ Detection result: ${result.detectedObjects?.length || 0} objects, state: ${result.state}`);

      // Update state
      setCurrentState(result.state);
      setConfidence(result.confidence);
      
      // Update detected objects for bounding box overlay with motion tracking
      if (result.detectedObjects && result.detectedObjects.length > 0) {
        console.log(`[CameraView] Objects detected:`, result.detectedObjects.map(o => `${o.label} (${Math.round(o.confidence*100)}%)`));
        // Apply motion tracking to identify moving objects
        frameNumberRef.current++;
        const trackedObjects = updateMotionTracking(result.detectedObjects, frameNumberRef.current);
        setDetectedObjects(trackedObjects);
        
        // VOICE ALERTS: Only speak for objects with problematic colors
        // This is the ONLY place voice alerts should trigger in the app
        const problematicObjects = result.detectedObjects.filter(
          obj => obj.isProblematicColor && obj.alertPriority !== 'none'
        );
        
        if (problematicObjects.length > 0 && result.confidence >= alertSettings.minConfidenceToAlert) {
          // Generate alert message for problematic colors
          const alertMessage = generateColorAlert(problematicObjects);
          
          try {
            // Use ElevenLabs for more natural voice
            await speakWithElevenLabs(alertMessage);
          } catch (e) {
            // Fallback to regular speech
            console.warn("ElevenLabs failed, using fallback:", e);
            speak(alertMessage);
          }
        }
      } else {
        setDetectedObjects([]);
      }

      // Notify parent component
      onDetection?.(result.state, result.confidence);
    } catch (error) {
      console.error("Capture error:", error);
      onError?.(error instanceof Error ? error.message : "Detection failed");
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    colorblindType,
    colorProfile.useElevenLabs,
    onError,
    onDetection,
    alertSettings.minConfidenceToAlert,
    alertSettings.positionCuesEnabled,
  ]);
  
  // Generate descriptive alert for objects with problematic colors
  const generateColorAlert = (objects: DetectedObject[]): string => {
    // Sort by priority - critical first
    const sorted = objects.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
      return (priorityOrder[a.alertPriority] || 4) - (priorityOrder[b.alertPriority] || 4);
    });
    
    const topObject = sorted[0];
    
    // Use color warning if available, otherwise generate from label and colors
    if (topObject.colorWarning) {
      return topObject.colorWarning;
    }
    
    // Generate alert based on detected colors
    const colors = topObject.colors?.join(', ') || 'colored';
    const label = topObject.label || topObject.class || 'object';
    
    // Specific alerts for known objects
    if (label.toLowerCase().includes('traffic light') || label.toLowerCase().includes('signal')) {
      const color = topObject.colors?.[0] || 'unknown';
      if (color.toLowerCase().includes('red')) {
        return "Red traffic light ahead. Stop.";
      } else if (color.toLowerCase().includes('yellow')) {
        return "Yellow light. Prepare to stop.";
      } else if (color.toLowerCase().includes('green')) {
        return "Green light. You may go.";
      }
    }
    
    if (label.toLowerCase().includes('stop sign')) {
      return "Stop sign ahead. Come to a complete stop.";
    }
    
    if (label.toLowerCase().includes('car') || label.toLowerCase().includes('vehicle')) {
      const color = topObject.colors?.[0] || '';
      if (color.toLowerCase().includes('red')) {
        return "Brake lights ahead. Slow down.";
      }
    }
    
    // Generic alert for other objects
    return `${colors} ${label} detected ahead.`;
  };

  // Start capture interval - always active (no pause)
  useEffect(() => {
    if (permission?.granted) {
      resetSpeechState();
      captureIntervalRef.current = setInterval(captureFrame, frameInterval);
    }

    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
    };
  }, [permission?.granted, captureFrame, frameInterval]);
  
  // Auto-lock on highest priority target (moving objects or threats)
  useEffect(() => {
    if (detectedObjects.length === 0) {
      setActiveTargetIndex(0);
      return;
    }
    
    // Calculate priority score for each object
    // Priority order: Moving objects > Critical alerts > High alerts > Medium alerts > Others
    const getPriorityScore = (obj: TrackedObject): number => {
      let score = 0;
      
      // Moving objects get highest priority
      if (obj.isMoving) {
        score += 1000;
        // Add velocity magnitude for moving objects
        const velocityMag = Math.sqrt(obj.velocity.x ** 2 + obj.velocity.y ** 2);
        score += velocityMag * 10;
      }
      
      // Alert priority scoring
      const priorityOrder: Record<string, number> = {
        critical: 500,
        high: 200,
        medium: 50,
        low: 10,
        none: 0,
      };
      score += priorityOrder[obj.alertPriority] || 0;
      
      // Problematic colors get bonus
      if (obj.isProblematicColor) {
        score += 100;
      }
      
      // Confidence bonus
      score += obj.confidence * 10;
      
      return score;
    };
    
    // Find the highest priority target
    let bestIndex = 0;
    let bestScore = getPriorityScore(detectedObjects[0]);
    
    for (let i = 1; i < detectedObjects.length; i++) {
      const score = getPriorityScore(detectedObjects[i]);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    
    setActiveTargetIndex(bestIndex);
  }, [detectedObjects]);

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
        return ""; // No label when not detecting a signal
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
      <ExpoCameraView 
        ref={cameraRef} 
        style={styles.camera} 
        facing="back"
        flash="off"
        enableTorch={false}
      >
        {/* Bounding box overlay for detected objects with auto-targeting */}
        <BoundingBoxOverlay
          objects={detectedObjects}
          imageWidth={640}
          imageHeight={480}
          containerWidth={screenDimensions.width}
          containerHeight={screenDimensions.height}
          activeTargetIndex={activeTargetIndex}
          colorblindType={colorblindType as ColorblindnessType}
        />
        
        {/* Minimal HUD overlay - only show when signal detected */}
        {currentState !== "unknown" && (
          <View style={styles.hudOverlay}>
            <View style={styles.hudRow}>
              {getShapeIndicator()}
              <View
                style={[styles.hudSignal, { backgroundColor: stateColor }]}
              >
                <Text style={styles.hudSignalText}>{getStateLabel()}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Processing indicator - top right dot */}
        {isProcessing && (
          <View style={styles.processingIndicator}>
            <View
              style={[styles.processingDot, { backgroundColor: COLORS.accent }]}
            />
          </View>
        )}

        {/* Confidence bar - subtle at bottom */}
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
        
        {/* Object count - minimal badge */}
        {detectedObjects.length > 0 && (
          <View style={styles.objectCountBadge}>
            <Text style={styles.objectCountText}>
              {detectedObjects.length}
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

      {/* Lock-on status indicator */}
      <View style={styles.controlOverlay}>
        <View style={styles.lockOnIndicator}>
          <Text style={styles.lockOnText}>
            {detectedObjects.length > 0 
              ? `◎ ${activeTargetIndex + 1}/${detectedObjects.length}` 
              : "○ SCANNING"}
          </Text>
        </View>
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
  // Minimal HUD overlay
  hudOverlay: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hudRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.spacingSmall,
  },
  hudSignal: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  hudSignalText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 2,
  },
  // Shape indicators for colorblind users
  shapeSquare: {
    width: 24,
    height: 24,
  },
  shapeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  shapeTriangle: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 24,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  processingIndicator: {
    position: "absolute",
    top: 20,
    right: 20,
  },
  processingDot: {
    width: 8,
    height: 8,
  },
  confidenceBar: {
    position: "absolute",
    bottom: 60,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  confidenceFill: {
    height: "100%",
  },
  controlOverlay: {
    position: "absolute",
    bottom: 20,
    left: 20,
  },
  lockOnIndicator: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  lockOnText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  controlButton: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  controlButtonPaused: {
    backgroundColor: COLORS.accent,
  },
  controlButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "bold",
  },
  objectCountBadge: {
    position: "absolute",
    bottom: 80,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  objectCountText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: "700",
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
    backgroundColor: COLORS.accent,
    paddingHorizontal: SIZES.spacingLarge,
    paddingVertical: SIZES.buttonPadding,
  },
  permissionButtonText: {
    color: "#000",
    fontSize: SIZES.textMedium,
    fontWeight: "bold",
  },
  aiResponseOverlay: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
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
