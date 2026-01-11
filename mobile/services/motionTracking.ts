/**
 * Motion Tracking Service
 *
 * Tracks detected objects across frames to identify moving objects.
 * Moving objects get enhanced bounding box visualization (animated brackets).
 */

import { DetectedObject } from './api';

export interface TrackedObject extends DetectedObject {
  // Motion tracking fields
  isMoving: boolean;
  velocity: { x: number; y: number }; // Pixels per frame
  trackingId: string;
  framesTracked: number;
  lastSeen: number;
}

interface ObjectHistory {
  positions: Array<{ x: number; y: number; timestamp: number }>;
  class: string;
  lastSeen: number;
  trackingId: string;
}

// Configuration
const MAX_HISTORY_LENGTH = 10; // Number of frames to keep history
const MOVEMENT_THRESHOLD = 5; // Minimum pixel movement to consider "moving"
const MAX_FRAME_GAP = 3; // Max frames an object can disappear before losing track
const IOU_THRESHOLD = 0.3; // Intersection over Union threshold for matching

// Object tracking history
const objectHistory: Map<string, ObjectHistory> = new Map();
let nextTrackingId = 1;
let lastFrameTimestamp = 0;

/**
 * Calculate Intersection over Union (IoU) for two bounding boxes
 */
function calculateIoU(
  box1: { x: number; y: number; width: number; height: number },
  box2: { x: number; y: number; width: number; height: number }
): number {
  // Convert center coordinates to corners
  const box1Left = box1.x - box1.width / 2;
  const box1Right = box1.x + box1.width / 2;
  const box1Top = box1.y - box1.height / 2;
  const box1Bottom = box1.y + box1.height / 2;

  const box2Left = box2.x - box2.width / 2;
  const box2Right = box2.x + box2.width / 2;
  const box2Top = box2.y - box2.height / 2;
  const box2Bottom = box2.y + box2.height / 2;

  // Calculate intersection
  const intersectLeft = Math.max(box1Left, box2Left);
  const intersectRight = Math.min(box1Right, box2Right);
  const intersectTop = Math.max(box1Top, box2Top);
  const intersectBottom = Math.min(box1Bottom, box2Bottom);

  if (intersectRight < intersectLeft || intersectBottom < intersectTop) {
    return 0; // No intersection
  }

  const intersectArea = (intersectRight - intersectLeft) * (intersectBottom - intersectTop);
  const box1Area = box1.width * box1.height;
  const box2Area = box2.width * box2.height;
  const unionArea = box1Area + box2Area - intersectArea;

  return intersectArea / unionArea;
}

/**
 * Find the best matching tracked object for a new detection
 */
function findBestMatch(
  detection: DetectedObject,
  timestamp: number
): ObjectHistory | null {
  let bestMatch: ObjectHistory | null = null;
  let bestIoU = IOU_THRESHOLD;

  objectHistory.forEach((history) => {
    // Must be same class
    if (history.class !== detection.class) return;

    // Must have been seen recently
    const frameGap = timestamp - history.lastSeen;
    if (frameGap > MAX_FRAME_GAP) return;

    // Get last known position
    const lastPos = history.positions[history.positions.length - 1];
    const iou = calculateIoU(
      detection.bbox,
      { x: lastPos.x, y: lastPos.y, width: detection.bbox.width, height: detection.bbox.height }
    );

    if (iou > bestIoU) {
      bestIoU = iou;
      bestMatch = history;
    }
  });

  return bestMatch;
}

/**
 * Calculate velocity from position history
 */
function calculateVelocity(positions: Array<{ x: number; y: number; timestamp: number }>): { x: number; y: number } {
  if (positions.length < 2) {
    return { x: 0, y: 0 };
  }

  // Use simple difference between last two positions
  const current = positions[positions.length - 1];
  const previous = positions[positions.length - 2];
  const timeDiff = current.timestamp - previous.timestamp || 1;

  return {
    x: (current.x - previous.x) / timeDiff,
    y: (current.y - previous.y) / timeDiff,
  };
}

/**
 * Determine if an object is moving based on its history
 */
function isObjectMoving(positions: Array<{ x: number; y: number; timestamp: number }>): boolean {
  if (positions.length < 3) {
    return false; // Need at least 3 frames to determine motion
  }

  // Calculate total displacement over recent frames
  const recentPositions = positions.slice(-5);
  let totalDisplacement = 0;

  for (let i = 1; i < recentPositions.length; i++) {
    const dx = recentPositions[i].x - recentPositions[i - 1].x;
    const dy = recentPositions[i].y - recentPositions[i - 1].y;
    totalDisplacement += Math.sqrt(dx * dx + dy * dy);
  }

  const avgDisplacement = totalDisplacement / (recentPositions.length - 1);
  return avgDisplacement > MOVEMENT_THRESHOLD;
}

/**
 * Clean up old tracking data
 */
function cleanupOldTracks(currentTimestamp: number): void {
  const keysToDelete: string[] = [];
  
  objectHistory.forEach((history, key) => {
    if (currentTimestamp - history.lastSeen > MAX_FRAME_GAP) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => objectHistory.delete(key));
}

/**
 * Update motion tracking with new detections
 * Returns detected objects enhanced with motion information
 */
export function updateMotionTracking(
  detections: DetectedObject[],
  frameNumber?: number
): TrackedObject[] {
  const timestamp = frameNumber ?? ++lastFrameTimestamp;
  
  // Clean up old tracks
  cleanupOldTracks(timestamp);
  
  const trackedObjects: TrackedObject[] = [];
  const matchedHistoryIds = new Set<string>();

  for (const detection of detections) {
    // Try to find a matching tracked object
    const match = findBestMatch(detection, timestamp);

    if (match) {
      // Update existing track
      matchedHistoryIds.add(match.trackingId);
      
      match.positions.push({
        x: detection.bbox.x,
        y: detection.bbox.y,
        timestamp,
      });
      
      // Keep history limited
      if (match.positions.length > MAX_HISTORY_LENGTH) {
        match.positions.shift();
      }
      
      match.lastSeen = timestamp;

      const velocity = calculateVelocity(match.positions);
      const isMoving = isObjectMoving(match.positions);

      trackedObjects.push({
        ...detection,
        isMoving,
        velocity,
        trackingId: match.trackingId,
        framesTracked: match.positions.length,
        lastSeen: timestamp,
      });
    } else {
      // New object - start tracking
      const trackingId = `track-${nextTrackingId++}`;
      
      objectHistory.set(trackingId, {
        positions: [{ x: detection.bbox.x, y: detection.bbox.y, timestamp }],
        class: detection.class,
        lastSeen: timestamp,
        trackingId,
      });

      trackedObjects.push({
        ...detection,
        isMoving: false, // New objects start as not moving
        velocity: { x: 0, y: 0 },
        trackingId,
        framesTracked: 1,
        lastSeen: timestamp,
      });
    }
  }

  return trackedObjects;
}

/**
 * Reset all motion tracking state
 */
export function resetMotionTracking(): void {
  objectHistory.clear();
  nextTrackingId = 1;
  lastFrameTimestamp = 0;
}

/**
 * Get all currently tracked objects (including recently lost ones)
 */
export function getAllTrackedObjects(): ObjectHistory[] {
  return Array.from(objectHistory.values());
}
