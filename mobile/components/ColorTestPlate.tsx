/**
 * ColorTestPlate Component
 *
 * Renders a simplified Ishihara-style color test plate.
 * Uses colored circles to display a number that may be
 * visible or hidden depending on the user's color vision.
 */

import React, { useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { TestPlate } from "../constants/ishihara";
import { COLORS } from "../constants/accessibility";

interface Props {
  plate: TestPlate;
}

const { width } = Dimensions.get("window");
const PLATE_SIZE = Math.min(width - 48, 320);

export function ColorTestPlate({ plate }: Props) {
  // Generate circles once per plate
  const circles = useMemo(() => generateCirclePattern(plate), [plate.id]);

  return (
    <View style={styles.container}>
      <View style={[styles.plate, { width: PLATE_SIZE, height: PLATE_SIZE }]}>
        {circles.map((circle, index) => (
          <View
            key={index}
            style={[
              styles.circle,
              {
                backgroundColor: circle.color,
                width: circle.size,
                height: circle.size,
                left: circle.x,
                top: circle.y,
                borderRadius: circle.size / 2,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

interface Circle {
  x: number;
  y: number;
  size: number;
  color: string;
}

/**
 * Attempt to place a circle without overlapping existing circles
 */
function tryPlaceCircle(
  existingCircles: Circle[],
  centerX: number,
  centerY: number,
  plateRadius: number,
  minSize: number,
  maxSize: number,
): Circle | null {
  const maxAttempts = 20;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * (plateRadius - 15);
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;
    const size = minSize + Math.random() * (maxSize - minSize);

    // Check if within plate bounds
    const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    if (distFromCenter + size / 2 > plateRadius - 5) continue;

    // Check for overlap with existing circles
    let overlaps = false;
    for (const existing of existingCircles) {
      const dist = Math.sqrt(
        (x - existing.x - existing.size / 2) ** 2 +
          (y - existing.y - existing.size / 2) ** 2,
      );
      const minDist = (size + existing.size) / 2 + 2; // 2px gap
      if (dist < minDist) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      return { x: x - size / 2, y: y - size / 2, size, color: "" };
    }
  }

  return null;
}

/**
 * Generates a pattern of circles that form a number
 * The number is visible to those who can distinguish the colors
 */
function generateCirclePattern(plate: TestPlate): Circle[] {
  const circles: Circle[] = [];
  const centerX = PLATE_SIZE / 2;
  const centerY = PLATE_SIZE / 2;
  const radius = PLATE_SIZE / 2 - 8;

  // Get the number pattern function
  const numberPattern = getNumberPattern(plate.normalAnswer);

  // Place circles with collision detection
  const targetCircles = 180;
  let attempts = 0;
  const maxTotalAttempts = targetCircles * 30;

  while (circles.length < targetCircles && attempts < maxTotalAttempts) {
    attempts++;

    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;

    // Vary circle sizes
    const size = 14 + Math.random() * 14;

    // Check if within plate bounds
    const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    if (distFromCenter + size / 2 > radius) continue;

    // Check for overlap with existing circles
    let overlaps = false;
    for (const existing of circles) {
      const ex = existing.x + existing.size / 2;
      const ey = existing.y + existing.size / 2;
      const dist = Math.sqrt((x - ex) ** 2 + (y - ey) ** 2);
      const minDist = (size + existing.size) / 2 + 3;
      if (dist < minDist) {
        overlaps = true;
        break;
      }
    }

    if (overlaps) continue;

    // Check if this position is part of the number
    const normalizedX = (x - centerX + radius) / (radius * 2);
    const normalizedY = (y - centerY + radius) / (radius * 2);
    const isPartOfNumber = numberPattern(normalizedX, normalizedY);

    circles.push({
      x: x - size / 2,
      y: y - size / 2,
      size,
      color: isPartOfNumber ? plate.foregroundColor : plate.backgroundColor,
    });
  }

  return circles;
}

/**
 * Returns a function that determines if a point is part of the number
 * x and y are normalized 0-1, with (0.5, 0.5) being the center
 * Strokes are made thick (0.12-0.15 width) for better readability
 */
function getNumberPattern(answer: string): (x: number, y: number) => boolean {
  const patterns: Record<string, (x: number, y: number) => boolean> = {
    "12": (x, y) => {
      // "1" on left - thick vertical bar
      const in1 = x > 0.18 && x < 0.35 && y > 0.22 && y < 0.78;
      // "2" on right
      const in2Top = x > 0.48 && x < 0.82 && y > 0.22 && y < 0.35;
      const in2Right = x > 0.68 && x < 0.82 && y > 0.22 && y < 0.52;
      const in2Mid = x > 0.48 && x < 0.82 && y > 0.42 && y < 0.55;
      const in2Left = x > 0.48 && x < 0.62 && y > 0.48 && y < 0.78;
      const in2Bot = x > 0.48 && x < 0.82 && y > 0.65 && y < 0.78;
      return in1 || in2Top || in2Right || in2Mid || in2Left || in2Bot;
    },

    "8": (x, y) => {
      // Two stacked circles forming an 8 - thicker rings
      const cx = 0.5;
      const topY = 0.35;
      const botY = 0.65;
      const outerR = 0.22;
      const innerR = 0.08;

      const distTop = Math.sqrt((x - cx) ** 2 + (y - topY) ** 2);
      const distBot = Math.sqrt((x - cx) ** 2 + (y - botY) ** 2);

      const inTopRing = distTop > innerR && distTop < outerR;
      const inBotRing = distBot > innerR && distBot < outerR;

      return inTopRing || inBotRing;
    },

    "3": (x, y) => {
      // Three horizontal bars with right vertical - thick strokes
      const top = y > 0.22 && y < 0.35 && x > 0.32 && x < 0.68;
      const mid = y > 0.42 && y < 0.58 && x > 0.32 && x < 0.68;
      const bot = y > 0.65 && y < 0.78 && x > 0.32 && x < 0.68;
      const right = x > 0.55 && x < 0.68 && y > 0.22 && y < 0.78;
      return top || mid || bot || right;
    },

    "5": (x, y) => {
      const top = y > 0.22 && y < 0.35 && x > 0.28 && x < 0.72;
      const leftTop = x > 0.28 && x < 0.42 && y > 0.22 && y < 0.52;
      const mid = y > 0.42 && y < 0.55 && x > 0.28 && x < 0.72;
      const rightBot = x > 0.58 && x < 0.72 && y > 0.48 && y < 0.78;
      const bot = y > 0.65 && y < 0.78 && x > 0.28 && x < 0.72;
      return top || leftTop || mid || rightBot || bot;
    },

    "2": (x, y) => {
      const top = y > 0.22 && y < 0.35 && x > 0.28 && x < 0.72;
      const rightTop = x > 0.58 && x < 0.72 && y > 0.22 && y < 0.52;
      const mid = y > 0.42 && y < 0.55 && x > 0.28 && x < 0.72;
      const leftBot = x > 0.28 && x < 0.42 && y > 0.48 && y < 0.78;
      const bot = y > 0.65 && y < 0.78 && x > 0.28 && x < 0.72;
      return top || rightTop || mid || leftBot || bot;
    },

    "29": (x, y) => {
      // "2" on left
      const in2Top = x > 0.12 && x < 0.45 && y > 0.22 && y < 0.35;
      const in2Right = x > 0.32 && x < 0.45 && y > 0.22 && y < 0.52;
      const in2Mid = x > 0.12 && x < 0.45 && y > 0.42 && y < 0.55;
      const in2Left = x > 0.12 && x < 0.25 && y > 0.48 && y < 0.78;
      const in2Bot = x > 0.12 && x < 0.45 && y > 0.65 && y < 0.78;

      // "9" on right - circle on top with tail
      const cx9 = 0.68;
      const cy9 = 0.38;
      const dist9 = Math.sqrt((x - cx9) ** 2 + (y - cy9) ** 2);
      const in9Circle = dist9 > 0.05 && dist9 < 0.18;
      const in9Tail = x > 0.75 && x < 0.88 && y > 0.32 && y < 0.78;

      return (
        in2Top ||
        in2Right ||
        in2Mid ||
        in2Left ||
        in2Bot ||
        in9Circle ||
        in9Tail
      );
    },

    "70": (x, y) => {
      // "7" on left
      const in7Top = x > 0.12 && x < 0.45 && y > 0.22 && y < 0.35;
      const in7Stem = x > 0.28 && x < 0.42 && y > 0.22 && y < 0.78;

      // "0" on right - ellipse
      const cx0 = 0.68;
      const cy0 = 0.5;
      const dist0 = Math.sqrt((x - cx0) ** 2 + ((y - cy0) * 0.75) ** 2);
      const in0 = dist0 > 0.08 && dist0 < 0.22;

      return in7Top || in7Stem || in0;
    },

    "74": (x, y) => {
      // "7" on left
      const in7Top = x > 0.12 && x < 0.45 && y > 0.22 && y < 0.35;
      const in7Stem = x > 0.28 && x < 0.42 && y > 0.22 && y < 0.78;

      // "4" on right
      const in4Left = x > 0.52 && x < 0.65 && y > 0.22 && y < 0.55;
      const in4Mid = y > 0.48 && y < 0.58 && x > 0.52 && x < 0.88;
      const in4Right = x > 0.75 && x < 0.88 && y > 0.22 && y < 0.78;

      return in7Top || in7Stem || in4Left || in4Mid || in4Right;
    },

    "21": (x, y) => {
      // "2" on left
      const in2Top = x > 0.12 && x < 0.45 && y > 0.22 && y < 0.35;
      const in2Right = x > 0.32 && x < 0.45 && y > 0.22 && y < 0.52;
      const in2Mid = x > 0.12 && x < 0.45 && y > 0.42 && y < 0.55;
      const in2Left = x > 0.12 && x < 0.25 && y > 0.48 && y < 0.78;
      const in2Bot = x > 0.12 && x < 0.45 && y > 0.65 && y < 0.78;

      // "1" on right - thick bar
      const in1 = x > 0.58 && x < 0.78 && y > 0.22 && y < 0.78;

      return in2Top || in2Right || in2Mid || in2Left || in2Bot || in1;
    },

    // New patterns for plates 6-10
    "45": (x, y) => {
      // "4" on left
      const in4Left = x > 0.12 && x < 0.25 && y > 0.22 && y < 0.55;
      const in4Mid = y > 0.48 && y < 0.58 && x > 0.12 && x < 0.45;
      const in4Right = x > 0.32 && x < 0.45 && y > 0.22 && y < 0.78;

      // "5" on right
      const in5Top = y > 0.22 && y < 0.35 && x > 0.52 && x < 0.88;
      const in5LeftTop = x > 0.52 && x < 0.65 && y > 0.22 && y < 0.52;
      const in5Mid = y > 0.42 && y < 0.55 && x > 0.52 && x < 0.88;
      const in5RightBot = x > 0.75 && x < 0.88 && y > 0.48 && y < 0.78;
      const in5Bot = y > 0.65 && y < 0.78 && x > 0.52 && x < 0.88;

      return (
        in4Left ||
        in4Mid ||
        in4Right ||
        in5Top ||
        in5LeftTop ||
        in5Mid ||
        in5RightBot ||
        in5Bot
      );
    },

    "6": (x, y) => {
      // Single "6" - circle at bottom with tail curving up on left
      const cx = 0.5;
      const cy = 0.6;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const inCircle = dist > 0.08 && dist < 0.25;
      const inTail = x > 0.25 && x < 0.42 && y > 0.22 && y < 0.6;
      const inTopCurve = y > 0.22 && y < 0.35 && x > 0.35 && x < 0.65;
      return inCircle || inTail || inTopCurve;
    },

    "16": (x, y) => {
      // "1" on left
      const in1 = x > 0.15 && x < 0.35 && y > 0.22 && y < 0.78;

      // "6" on right
      const cx6 = 0.68;
      const cy6 = 0.6;
      const dist6 = Math.sqrt((x - cx6) ** 2 + (y - cy6) ** 2);
      const in6Circle = dist6 > 0.06 && dist6 < 0.2;
      const in6Tail = x > 0.52 && x < 0.65 && y > 0.22 && y < 0.6;
      const in6TopCurve = y > 0.22 && y < 0.35 && x > 0.6 && x < 0.85;

      return in1 || in6Circle || in6Tail || in6TopCurve;
    },

    "42": (x, y) => {
      // "4" on left
      const in4Left = x > 0.12 && x < 0.25 && y > 0.22 && y < 0.55;
      const in4Mid = y > 0.48 && y < 0.58 && x > 0.12 && x < 0.45;
      const in4Right = x > 0.32 && x < 0.45 && y > 0.22 && y < 0.78;

      // "2" on right
      const in2Top = y > 0.22 && y < 0.35 && x > 0.52 && x < 0.88;
      const in2RightTop = x > 0.75 && x < 0.88 && y > 0.22 && y < 0.52;
      const in2Mid = y > 0.42 && y < 0.55 && x > 0.52 && x < 0.88;
      const in2LeftBot = x > 0.52 && x < 0.65 && y > 0.48 && y < 0.78;
      const in2Bot = y > 0.65 && y < 0.78 && x > 0.52 && x < 0.88;

      return (
        in4Left ||
        in4Mid ||
        in4Right ||
        in2Top ||
        in2RightTop ||
        in2Mid ||
        in2LeftBot ||
        in2Bot
      );
    },

    "97": (x, y) => {
      // "9" on left - circle on top with tail
      const cx9 = 0.28;
      const cy9 = 0.38;
      const dist9 = Math.sqrt((x - cx9) ** 2 + (y - cy9) ** 2);
      const in9Circle = dist9 > 0.05 && dist9 < 0.18;
      const in9Tail = x > 0.35 && x < 0.48 && y > 0.32 && y < 0.78;

      // "7" on right
      const in7Top = x > 0.55 && x < 0.88 && y > 0.22 && y < 0.35;
      const in7Stem = x > 0.68 && x < 0.82 && y > 0.22 && y < 0.78;

      return in9Circle || in9Tail || in7Top || in7Stem;
    },

    "4": (x, y) => {
      // Single "4" centered
      const inLeft = x > 0.28 && x < 0.42 && y > 0.22 && y < 0.55;
      const inMid = y > 0.48 && y < 0.58 && x > 0.28 && x < 0.72;
      const inRight = x > 0.58 && x < 0.72 && y > 0.22 && y < 0.78;
      return inLeft || inMid || inRight;
    },

    "9": (x, y) => {
      // Single "9" centered
      const cx = 0.5;
      const cy = 0.38;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const inCircle = dist > 0.06 && dist < 0.2;
      const inTail = x > 0.58 && x < 0.72 && y > 0.32 && y < 0.78;
      return inCircle || inTail;
    },

    "57": (x, y) => {
      // "5" on left
      const in5Top = y > 0.22 && y < 0.35 && x > 0.12 && x < 0.45;
      const in5LeftTop = x > 0.12 && x < 0.25 && y > 0.22 && y < 0.52;
      const in5Mid = y > 0.42 && y < 0.55 && x > 0.12 && x < 0.45;
      const in5RightBot = x > 0.32 && x < 0.45 && y > 0.48 && y < 0.78;
      const in5Bot = y > 0.65 && y < 0.78 && x > 0.12 && x < 0.45;

      // "7" on right
      const in7Top = x > 0.52 && x < 0.88 && y > 0.22 && y < 0.35;
      const in7Stem = x > 0.65 && x < 0.78 && y > 0.22 && y < 0.78;

      return (
        in5Top ||
        in5LeftTop ||
        in5Mid ||
        in5RightBot ||
        in5Bot ||
        in7Top ||
        in7Stem
      );
    },

    "35": (x, y) => {
      // "3" on left
      const in3Top = y > 0.22 && y < 0.35 && x > 0.12 && x < 0.45;
      const in3Mid = y > 0.42 && y < 0.55 && x > 0.12 && x < 0.45;
      const in3Bot = y > 0.65 && y < 0.78 && x > 0.12 && x < 0.45;
      const in3Right = x > 0.32 && x < 0.45 && y > 0.22 && y < 0.78;

      // "5" on right
      const in5Top = y > 0.22 && y < 0.35 && x > 0.52 && x < 0.88;
      const in5LeftTop = x > 0.52 && x < 0.65 && y > 0.22 && y < 0.52;
      const in5Mid = y > 0.42 && y < 0.55 && x > 0.52 && x < 0.88;
      const in5RightBot = x > 0.75 && x < 0.88 && y > 0.48 && y < 0.78;
      const in5Bot = y > 0.65 && y < 0.78 && x > 0.52 && x < 0.88;

      return (
        in3Top ||
        in3Mid ||
        in3Bot ||
        in3Right ||
        in5Top ||
        in5LeftTop ||
        in5Mid ||
        in5RightBot ||
        in5Bot
      );
    },

    "15": (x, y) => {
      // "1" on left
      const in1 = x > 0.15 && x < 0.35 && y > 0.22 && y < 0.78;

      // "5" on right
      const in5Top = y > 0.22 && y < 0.35 && x > 0.48 && x < 0.85;
      const in5LeftTop = x > 0.48 && x < 0.62 && y > 0.22 && y < 0.52;
      const in5Mid = y > 0.42 && y < 0.55 && x > 0.48 && x < 0.85;
      const in5RightBot = x > 0.72 && x < 0.85 && y > 0.48 && y < 0.78;
      const in5Bot = y > 0.65 && y < 0.78 && x > 0.48 && x < 0.85;

      return in1 || in5Top || in5LeftTop || in5Mid || in5RightBot || in5Bot;
    },

    "17": (x, y) => {
      // "1" on left
      const in1 = x > 0.15 && x < 0.35 && y > 0.22 && y < 0.78;

      // "7" on right
      const in7Top = x > 0.48 && x < 0.85 && y > 0.22 && y < 0.35;
      const in7Stem = x > 0.62 && x < 0.75 && y > 0.22 && y < 0.78;

      return in1 || in7Top || in7Stem;
    },

    "7": (x, y) => {
      // Single "7" centered
      const inTop = x > 0.28 && x < 0.72 && y > 0.22 && y < 0.35;
      const inStem = x > 0.45 && x < 0.58 && y > 0.22 && y < 0.78;
      return inTop || inStem;
    },
  };

  return patterns[answer] || (() => false);
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  plate: {
    borderRadius: PLATE_SIZE / 2,
    backgroundColor: COLORS.backgroundSecondary,
    position: "relative",
    overflow: "hidden",
  },
  circle: {
    position: "absolute",
  },
});
