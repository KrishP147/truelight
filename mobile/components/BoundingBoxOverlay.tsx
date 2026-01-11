/**
 * Bounding Box Overlay Component - TARGET LOCK STYLE
 *
 * Draws orange/coral brackets around detected objects like a targeting system.
 * - Solid orange/coral brackets for ALL detected objects
 * - Pulsing/flashing animation for objects with problematic colors
 * - Smooth animations for tracking moving objects
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { DetectedObject } from '../services/api';
import { TrackedObject } from '../services/motionTracking';

interface Props {
  objects: (DetectedObject | TrackedObject)[];
  imageWidth: number;
  imageHeight: number;
  containerWidth: number;
  containerHeight: number;
  activeTargetIndex?: number; // Index of the currently locked-on target
}

// Colors for the targeting brackets - always orange for all objects
const BRACKET_COLOR = '#FF6B35'; // Orange - used for all detected objects, motion, and traffic hazards

// Animated bracket component for each detected object
function TargetBracket({
  targetObj,
  left,
  top,
  boxWidth,
  boxHeight,
  isActive
}: {
  targetObj: DetectedObject | TrackedObject;
  left: number;
  top: number;
  boxWidth: number;
  boxHeight: number;
  isActive?: boolean; // Whether this is the currently locked-on target
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(1)).current;

  const isTracked = 'isMoving' in targetObj;
  const isMoving = isTracked && (targetObj as TrackedObject).isMoving;
  const isAlert = targetObj.isProblematicColor;

  // Always use orange brackets for all objects (motion, objects, traffic hazards)
  const bracketColor = BRACKET_COLOR;

  useEffect(() => {
    // Pulse animation for all tracked objects
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [pulseAnim]);

  // Get label for display
  const getLabel = () => {
    if (targetObj.label) {
      const prefix = isMoving ? '→ ' : '';
      return prefix + targetObj.label;
    }
    return targetObj.class || 'Object';
  };

  const cornerSize = Math.min(boxWidth, boxHeight) * 0.15;
  const minCornerSize = 12;
  const maxCornerSize = 30;
  const actualCornerSize = Math.max(minCornerSize, Math.min(maxCornerSize, cornerSize));
  const thickness = isActive ? 4 : 3; // Thicker brackets for active target

  return (
    <Animated.View
      style={[
        styles.targetContainer,
        {
          left,
          top,
          width: boxWidth,
          height: boxHeight,
          transform: [{ scale: pulseAnim }],
          opacity: 1,
        },
      ]}
    >
      {/* Lock-on cursor/reticle for active target - prominent game-style */}
      {isActive && (
        <View style={styles.lockOnCursor}>
          {/* Large center crosshair */}
          <View style={[styles.cursorLine, styles.cursorHorizontal]} />
          <View style={[styles.cursorLine, styles.cursorVertical]} />
          {/* Outer ring corners */}
          <View style={[styles.cursorCorner, styles.cursorCornerTL]} />
          <View style={[styles.cursorCorner, styles.cursorCornerTR]} />
          <View style={[styles.cursorCorner, styles.cursorCornerBL]} />
          <View style={[styles.cursorCorner, styles.cursorCornerBR]} />
          {/* Inner targeting dots */}
          <View style={[styles.cursorDot, styles.cursorDotTL]} />
          <View style={[styles.cursorDot, styles.cursorDotTR]} />
          <View style={[styles.cursorDot, styles.cursorDotBL]} />
          <View style={[styles.cursorDot, styles.cursorDotBR]} />
        </View>
      )}
      {/* Top-left bracket */}
      <View style={[styles.corner, styles.cornerTL, {
        borderColor: bracketColor,
        borderTopWidth: thickness,
        borderLeftWidth: thickness,
        width: actualCornerSize,
        height: actualCornerSize,
      }]} />

      {/* Top-right bracket */}
      <View style={[styles.corner, styles.cornerTR, {
        borderColor: bracketColor,
        borderTopWidth: thickness,
        borderRightWidth: thickness,
        width: actualCornerSize,
        height: actualCornerSize,
      }]} />

      {/* Bottom-left bracket */}
      <View style={[styles.corner, styles.cornerBL, {
        borderColor: bracketColor,
        borderBottomWidth: thickness,
        borderLeftWidth: thickness,
        width: actualCornerSize,
        height: actualCornerSize,
      }]} />

      {/* Bottom-right bracket */}
      <View style={[styles.corner, styles.cornerBR, {
        borderColor: bracketColor,
        borderBottomWidth: thickness,
        borderRightWidth: thickness,
        width: actualCornerSize,
        height: actualCornerSize,
      }]} />

      {/* Label at bottom */}
      <View style={[styles.labelContainer, { backgroundColor: bracketColor }]}>
        <Text style={styles.labelText} numberOfLines={1}>
          {getLabel()}
        </Text>
        <Text style={styles.confidenceText}>
          {Math.round(targetObj.confidence * 100)}%
        </Text>
      </View>
    </Animated.View>
  );
}

export function BoundingBoxOverlay({
  objects,
  imageWidth,
  imageHeight,
  containerWidth,
  containerHeight,
  activeTargetIndex = 0,
}: Props) {
  if (!objects || objects.length === 0) return null;


  // Calculate scale factors to simulate "cover" mode (what the camera preview usually does)
  // This means the image is scaled to fill the container, cropping what doesn't fit
  const scale = Math.max(containerWidth / imageWidth, containerHeight / imageHeight);

  // Calculate offsets to center the image
  const scaledWidth = imageWidth * scale;
  const scaledHeight = imageHeight * scale;
  const offsetX = (containerWidth - scaledWidth) / 2;
  const offsetY = (containerHeight - scaledHeight) / 2;

  // Ensure activeTargetIndex is within bounds
  const safeActiveIndex = Math.max(0, Math.min(activeTargetIndex, objects.length - 1));

  return (
    <View style={[styles.container, { width: containerWidth, height: containerHeight }]}>
      {objects.map((obj, index) => {
        // Scale coordinates to container dimensions with "cover" logic
        const left = obj.bbox.x * scale + offsetX;
        const top = obj.bbox.y * scale + offsetY;
        const width = obj.bbox.width * scale;
        const height = obj.bbox.height * scale;

        // Skip very small detections
        if (width < 20 || height < 20) return null;

        const isActive = index === safeActiveIndex;

        return (
          <TargetBracket
            key={obj.id}
            targetObj={obj}
            left={left}
            top={top}
            boxWidth={width}
            boxHeight={height}
            isActive={isActive}
          />
        );
      })}

      {/* Object count indicator */}
      <View style={styles.countBadge}>
        <Text style={styles.countText}>
          {objects.length} {objects.length === 1 ? 'target' : 'targets'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none',
  },
  targetContainer: {
    position: 'absolute',
  },
  corner: {
    position: 'absolute',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomRightRadius: 4,
  },
  crosshair: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 20,
    height: 20,
    marginLeft: -10,
    marginTop: -10,
  },
  crosshairLine: {
    position: 'absolute',
  },
  crosshairH: {
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    marginTop: -1,
  },
  crosshairV: {
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
  },
  labelContainer: {
    position: 'absolute',
    bottom: -28,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 6,
  },
  labelText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  confidenceText: {
    color: 'rgba(0,0,0,0.7)',
    fontSize: 10,
    fontWeight: '600',
  },
  alertBadge: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF3366',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  alertText: {
    color: '#fff',
    fontSize: 14,
  },
  countBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  countText: {
    color: '#FF6B35',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Lock-on cursor/reticle styles - prominent game-style reticle
  lockOnCursor: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 80,
    height: 80,
    marginLeft: -40,
    marginTop: -40,
    pointerEvents: 'none',
    zIndex: 1000,
  },
  cursorLine: {
    position: 'absolute',
    backgroundColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  cursorHorizontal: {
    top: '50%',
    left: -20,
    right: -20,
    height: 3,
    marginTop: -1.5,
  },
  cursorVertical: {
    left: '50%',
    top: -20,
    bottom: -20,
    width: 3,
    marginLeft: -1.5,
  },
  cursorCorner: {
    position: 'absolute',
    width: 16,
    height: 16,
    backgroundColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 6,
  },
  cursorCornerTL: {
    top: -4,
    left: -4,
    borderTopLeftRadius: 2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopColor: '#FF6B35',
    borderLeftColor: '#FF6B35',
    backgroundColor: 'transparent',
  },
  cursorCornerTR: {
    top: -4,
    right: -4,
    borderTopRightRadius: 2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopColor: '#FF6B35',
    borderRightColor: '#FF6B35',
    backgroundColor: 'transparent',
  },
  cursorCornerBL: {
    bottom: -4,
    left: -4,
    borderBottomLeftRadius: 2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomColor: '#FF6B35',
    borderLeftColor: '#FF6B35',
    backgroundColor: 'transparent',
  },
  cursorCornerBR: {
    bottom: -4,
    right: -4,
    borderBottomRightRadius: 2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomColor: '#FF6B35',
    borderRightColor: '#FF6B35',
    backgroundColor: 'transparent',
  },
  cursorDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  cursorDotTL: {
    top: 8,
    left: 8,
  },
  cursorDotTR: {
    top: 8,
    right: 8,
  },
  cursorDotBL: {
    bottom: 8,
    left: 8,
  },
  cursorDotBR: {
    bottom: 8,
    right: 8,
  },
});
