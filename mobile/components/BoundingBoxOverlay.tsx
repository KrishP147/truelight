/**
 * Bounding Box Overlay Component
 *
 * Draws bounding boxes around detected objects on the camera view.
 * - Solid colored boxes for objects with colors the user can't see well
 * - Dashed/transparent boxes for other detected objects
 * - Animated brackets for MOVING objects
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { DetectedObject } from '../services/api';
import { TrackedObject } from '../services/motionTracking';
import { COLORS, SIZES } from '../constants/accessibility';

interface Props {
  objects: (DetectedObject | TrackedObject)[];
  imageWidth: number;
  imageHeight: number;
  containerWidth: number;
  containerHeight: number;
}

// Helper component for animated moving object brackets
function MovingObjectBrackets({ boxColor }: { boxColor: string }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View 
      style={[
        styles.motionIndicator,
        { 
          borderColor: boxColor,
          transform: [{ scale: pulseAnim }],
        }
      ]} 
    />
  );
}

export function BoundingBoxOverlay({
  objects,
  imageWidth,
  imageHeight,
  containerWidth,
  containerHeight,
}: Props) {
  if (!objects || objects.length === 0) return null;

  // Calculate scale factors
  const scaleX = containerWidth / imageWidth;
  const scaleY = containerHeight / imageHeight;

  // Check if object has motion tracking info
  const isTracked = (obj: DetectedObject | TrackedObject): obj is TrackedObject => {
    return 'isMoving' in obj;
  };

  // Get color for the bounding box based on detected color
  const getBoxColor = (obj: DetectedObject | TrackedObject) => {
    // Moving objects get a distinct cyan color
    if (isTracked(obj) && obj.isMoving) {
      return '#00FFFF'; // Cyan for movement
    }
    
    if (!obj.isProblematicColor) {
      return 'rgba(255, 255, 255, 0.4)'; // Transparent white for non-problematic
    }

    // Get color from colors array or legacy color field
    const primaryColor = ('colors' in obj && obj.colors?.length > 0) 
      ? obj.colors[0] 
      : obj.color;

    // Use the actual color for problematic objects
    switch (primaryColor?.toLowerCase()) {
      case 'red':
        return '#FF3B30';
      case 'yellow':
        return '#FFCC00';
      case 'green':
        return '#34C759';
      case 'blue':
        return '#007AFF';
      case 'orange':
        return '#FF9500';
      case 'purple':
        return '#AF52DE';
      default:
        return '#FFFFFF';
    }
  };

  // Get label for the object
  const getLabel = (obj: DetectedObject | TrackedObject) => {
    // Add motion indicator to label if moving
    const motionPrefix = isTracked(obj) && obj.isMoving ? '→ ' : '';
    
    // Use the human-readable label if available
    if (obj.label) {
      return motionPrefix + obj.label;
    }

    // Get color from colors array or legacy color field
    const primaryColor = ('colors' in obj && obj.colors?.length > 0) 
      ? obj.colors[0] 
      : obj.color;

    // Fallback to color + class
    if (primaryColor) {
      return motionPrefix + `${primaryColor.toUpperCase()} ${obj.class}`;
    }
    return motionPrefix + obj.class;
  };

  return (
    <View style={[styles.container, { width: containerWidth, height: containerHeight }]}>
      {objects.map((obj) => {
        // The API now returns top-left coordinates directly
        // Scale to container dimensions
        const left = obj.bbox.x * scaleX;
        const top = obj.bbox.y * scaleY;
        const width = obj.bbox.width * scaleX;
        const height = obj.bbox.height * scaleY;

        const boxColor = getBoxColor(obj);
        const isPriority = obj.isProblematicColor;
        const isMoving = isTracked(obj) && obj.isMoving;

        return (
          <View
            key={obj.id}
            style={[
              styles.boundingBox,
              {
                left,
                top,
                width,
                height,
                borderColor: boxColor,
                borderWidth: isPriority || isMoving ? 3 : 1,
                borderStyle: isPriority ? 'solid' : 'dashed',
              },
            ]}
          >
            {/* Motion indicator for moving objects */}
            {isMoving && <MovingObjectBrackets boxColor={boxColor} />}
            
            {/* Label background */}
            <View
              style={[
                styles.labelContainer,
                {
                  backgroundColor: isMoving ? '#00FFFF' : (isPriority ? boxColor : 'rgba(0,0,0,0.6)'),
                },
              ]}
            >
              <Text
                style={[
                  styles.label,
                  {
                    color: (isPriority || isMoving) ? '#000' : '#FFF',
                  },
                ]}
                numberOfLines={1}
              >
                {getLabel(obj)}
              </Text>
              {/* Confidence indicator */}
              <Text style={[styles.confidence, { color: isMoving ? '#000' : '#FFF' }]}>
                {Math.round(obj.confidence * 100)}%
              </Text>
            </View>

            {/* Corner brackets for priority objects or moving objects */}
            {(isPriority || isMoving) && (
              <>
                <View style={[styles.cornerTL, { borderColor: boxColor }]} />
                <View style={[styles.cornerTR, { borderColor: boxColor }]} />
                <View style={[styles.cornerBL, { borderColor: boxColor }]} />
                <View style={[styles.cornerBR, { borderColor: boxColor }]} />
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}

const CORNER_SIZE = 16;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  boundingBox: {
    position: 'absolute',
    borderRadius: 4,
  },
  labelContainer: {
    position: 'absolute',
    top: -24,
    left: -2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  confidence: {
    fontSize: 10,
    color: '#FFF',
    opacity: 0.8,
  },
  // Corner brackets for emphasis
  cornerTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 4,
  },
  motionIndicator: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderWidth: 2,
    borderRadius: 8,
    borderStyle: 'dashed',
  },
});
