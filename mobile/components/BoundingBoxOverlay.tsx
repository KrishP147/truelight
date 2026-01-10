/**
 * Bounding Box Overlay Component
 *
 * Draws bounding boxes around detected objects on the camera view.
 * - Solid colored boxes for objects with colors the user can't see well
 * - Dashed/transparent boxes for other detected objects
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { DetectedObject } from '../services/api';
import { COLORS, SIZES } from '../constants/accessibility';

interface Props {
  objects: DetectedObject[];
  imageWidth: number;
  imageHeight: number;
  containerWidth: number;
  containerHeight: number;
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

  // Get color for the bounding box based on detected color
  const getBoxColor = (obj: DetectedObject) => {
    if (!obj.isProblematicColor) {
      return 'rgba(255, 255, 255, 0.5)'; // Transparent white for non-problematic
    }

    // Use the actual color for problematic objects
    switch (obj.color?.toLowerCase()) {
      case 'red':
        return COLORS.red;
      case 'yellow':
        return COLORS.yellow;
      case 'green':
        return COLORS.green;
      case 'blue':
        return '#007AFF';
      case 'orange':
        return '#FF9500';
      default:
        return '#FFFFFF';
    }
  };

  // Get label for the object
  const getLabel = (obj: DetectedObject) => {
    // Use the human-readable label if available
    if (obj.label) {
      return obj.label;
    }
    // Fallback to color + class
    if (obj.color) {
      return `${obj.color.toUpperCase()} ${obj.class}`;
    }
    return obj.class;
  };

  return (
    <View style={[styles.container, { width: containerWidth, height: containerHeight }]}>
      {objects.map((obj) => {
        // Convert center coordinates to top-left
        const left = (obj.bbox.x - obj.bbox.width / 2) * scaleX;
        const top = (obj.bbox.y - obj.bbox.height / 2) * scaleY;
        const width = obj.bbox.width * scaleX;
        const height = obj.bbox.height * scaleY;

        const boxColor = getBoxColor(obj);
        const isPriority = obj.isProblematicColor;

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
                borderWidth: isPriority ? 3 : 1,
                borderStyle: isPriority ? 'solid' : 'dashed',
              },
            ]}
          >
            {/* Label background */}
            <View
              style={[
                styles.labelContainer,
                {
                  backgroundColor: isPriority ? boxColor : 'rgba(0,0,0,0.6)',
                },
              ]}
            >
              <Text
                style={[
                  styles.label,
                  {
                    color: isPriority ? '#000' : '#FFF',
                  },
                ]}
                numberOfLines={1}
              >
                {getLabel(obj)}
              </Text>
              {/* Confidence indicator */}
              <Text style={styles.confidence}>
                {Math.round(obj.confidence * 100)}%
              </Text>
            </View>

            {/* Corner brackets for priority objects */}
            {isPriority && (
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
});
