/**
 * Detection API Service - PYTHON OPENCV DETECTION
 *
 * This service provides object detection with real color analysis for colorblind users.
 * Uses Python OpenCV/YOLO microservice for accurate color detection.
 * 
 * Key Features:
 * - Detects ALL objects in frame (cars, people, signs, lights, etc.)
 * - REAL color analysis using OpenCV HSV color space
 * - Shows bounding boxes for EVERYTHING detected
 * - Generates voice alerts for objects with colors the user cannot see well
 */

import { TIMING, SignalState, ColorblindnessType } from '../constants/accessibility';

// Backend proxy URL (Next.js backend that forwards to Python service)
// Set EXPO_PUBLIC_API_URL in .env to your computer's IP for physical devices
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

// Python detection service URL - derives from backend URL (same host, port 8000)
// This allows physical devices to reach the Python service directly
const getBaseHost = () => {
  const url = API_BASE_URL;
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return 'http://localhost';
  }
};
const PYTHON_SERVICE_URL = `${getBaseHost()}:8000`;

// Detection timing
const DETECTION_TIMEOUT = 15000; // 15 seconds timeout

console.log('[Detection] Backend URL:', API_BASE_URL);
console.log('[Detection] Python service URL:', PYTHON_SERVICE_URL);

/**
 * Bounding box for detected objects
 */
export interface BoundingBox {
  x: number;      // Top-left X
  y: number;      // Top-left Y
  width: number;
  height: number;
}

/**
 * Detected object with full information
 */
export interface DetectedObject {
  id: string;
  label: string;              // Human readable: "Car", "Person", "Traffic Light"
  class: string;              // Model class: "car", "person", "traffic light"
  confidence: number;         // 0-1 confidence score
  bbox: BoundingBox;          // Bounding box coordinates
  colors: string[];           // Detected dominant colors: ["red", "white"]
  isProblematicColor: boolean; // True if user can't see this color well
  alertPriority: 'critical' | 'high' | 'medium' | 'low' | 'none';
  colorWarning?: string;      // "Red color detected" for voice alert
}

/**
 * Detection response from service
 */
export interface DetectionResponse {
  state: SignalState;           // For traffic light compatibility
  confidence: number;           // Overall confidence
  message: string;              // Status message or alert
  detectedObjects: DetectedObject[];  // ALL detected objects
  imageWidth: number;
  imageHeight: number;
  processingTimeMs?: number;
  alertObjects?: DetectedObject[];    // Only objects that need voice alerts
}

// Transport mode type
export type TransportMode = 'walking' | 'biking' | 'driving' | 'passenger';

/**
 * Main detection function - detects all objects, alerts only for problematic colors
 * Detection sensitivity adapts based on transport mode:
 * - Walking: More sensitive, detects smaller objects (user has more time)
 * - Driving: Less sensitive, focuses on road-relevant objects (faster reaction needed)
 */
export async function detectSignal(
  base64Image: string,
  colorblindType: ColorblindnessType = 'unknown',
  transportMode: TransportMode = 'driving'
): Promise<DetectionResponse> {
  console.log(`[Detection] Starting detection for ${colorblindType} user in ${transportMode} mode`);

  // Try Python service methods - NO Roboflow fallback
  // Python service provides accurate color analysis essential for colorblind users
  const methods = [
    { name: 'Backend Proxy', fn: () => detectViaBackend(base64Image, colorblindType, transportMode) },
    { name: 'Direct Python', fn: () => detectWithPython(base64Image, colorblindType, transportMode) },
  ];

  for (const method of methods) {
    try {
      console.log(`[Detection] Trying ${method.name}...`);
      const result = await method.fn();
      console.log(`[Detection] ${method.name} succeeded: ${result.detectedObjects?.length || 0} objects`);
      return result;
    } catch (error) {
      console.warn(`[Detection] ${method.name} failed:`, error);
    }
  }

  // All methods failed - return empty result
  console.error('[Detection] All detection methods failed - is Python service running?');
  console.error('[Detection] Start it with: cd python-detection && python main.py');
  return {
    state: 'unknown',
    confidence: 0,
    message: 'Detection service unavailable',
    detectedObjects: [],
    imageWidth: 640,
    imageHeight: 480,
    alertObjects: [],
  };
}

/**
 * Detect via Next.js backend proxy (preferred for production)
 * Backend forwards to Python service
 */
async function detectViaBackend(
  base64Image: string,
  colorblindType: ColorblindnessType,
  transportMode: TransportMode = 'driving'
): Promise<DetectionResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DETECTION_TIMEOUT);

  // Log image data info for debugging
  console.log(`[Detection] Image data length: ${base64Image.length} chars`);
  console.log(`[Detection] Image starts with: ${base64Image.substring(0, 50)}...`);

  try {
    const response = await fetch(`${API_BASE_URL}/api/detect/objects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64Image,
        colorblindness_type: colorblindType,
        transport_mode: transportMode,
        min_confidence: 0.5,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return processPythonResponse(data, colorblindType);

  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Direct Python OpenCV/YOLO detection service
 */
async function detectWithPython(
  base64Image: string,
  colorblindType: ColorblindnessType,
  transportMode: TransportMode = 'driving'
): Promise<DetectionResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DETECTION_TIMEOUT);

  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64Image,
        colorblindness_type: colorblindType,
        transport_mode: transportMode,
        min_confidence: 0.5,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Python service error: ${response.status}`);
    }

    const data = await response.json();
    return processPythonResponse(data, colorblindType);

  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Process Python service response into our format
 */
function processPythonResponse(
  data: any,
  colorblindType: ColorblindnessType
): DetectionResponse {
  const detectedObjects: DetectedObject[] = [];
  const alertObjects: DetectedObject[] = [];

  for (let i = 0; i < (data.objects || []).length; i++) {
    const obj = data.objects[i];

    const detected: DetectedObject = {
      id: `det-${i}-${Date.now()}`,
      label: formatLabel(obj.label),
      class: obj.label.toLowerCase(),
      confidence: obj.confidence,
      bbox: {
        x: obj.bbox.x,
        y: obj.bbox.y,
        width: obj.bbox.width,
        height: obj.bbox.height,
      },
      colors: obj.dominant_colors || [],
      isProblematicColor: obj.is_problematic_color || false,
      alertPriority: mapPriority(obj.priority),
      colorWarning: obj.color_warning,
    };

    detectedObjects.push(detected);

    // Add to alert list if color is problematic and priority is significant
    if (detected.isProblematicColor &&
      ['critical', 'high', 'medium'].includes(detected.alertPriority)) {
      alertObjects.push(detected);
    }
  }

  // Determine traffic light state for compatibility
  const trafficLight = detectedObjects.find(o =>
    o.class.includes('traffic') || o.class.includes('light')
  );
  let state: SignalState = 'unknown';
  if (trafficLight && trafficLight.colors.length > 0) {
    const color = trafficLight.colors[0].toLowerCase();
    if (color.includes('red')) state = 'red';
    else if (color.includes('yellow') || color.includes('orange')) state = 'yellow';
    else if (color.includes('green')) state = 'green';
  }

  // Generate alert message
  const message = generateAlertMessage(alertObjects, detectedObjects.length);

  console.log(`[Detection] Processed: ${detectedObjects.length} objects, ${alertObjects.length} alerts`);

  return {
    state,
    confidence: detectedObjects.length > 0
      ? Math.max(...detectedObjects.map(o => o.confidence))
      : 0,
    message,
    detectedObjects,
    alertObjects,
    imageWidth: data.frame_width || 640,
    imageHeight: data.frame_height || 480,
    processingTimeMs: data.processing_time_ms,
  };
}

/**
 * Map Python service priority to our type
 */
function mapPriority(priority: string): 'critical' | 'high' | 'medium' | 'low' | 'none' {
  const map: Record<string, 'critical' | 'high' | 'medium' | 'low' | 'none'> = {
    'critical': 'critical',
    'high': 'high',
    'normal': 'medium',
    'medium': 'medium',
    'low': 'low',
  };
  return map[priority?.toLowerCase()] || 'none';
}

/**
 * Format object label for display
 */
function formatLabel(label: string): string {
  return label
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Generate alert message for voice output
 * Only includes objects with problematic colors
 */
function generateAlertMessage(
  alertObjects: DetectedObject[],
  totalObjects: number
): string {
  if (alertObjects.length === 0) {
    if (totalObjects > 0) {
      return `${totalObjects} object${totalObjects > 1 ? 's' : ''} detected`;
    }
    return 'Scanning...';
  }

  // Sort by priority
  const sorted = [...alertObjects].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
    return priorityOrder[a.alertPriority] - priorityOrder[b.alertPriority];
  });

  const messages: string[] = [];

  // Add top alerts
  for (const obj of sorted.slice(0, 2)) {
    const colorInfo = obj.colors.length > 0 ? `${obj.colors[0]} ` : '';
    messages.push(`${colorInfo}${obj.label}`);
  }

  if (messages.length === 0) {
    return `${alertObjects.length} color alert${alertObjects.length > 1 ? 's' : ''}`;
  }

  return messages.join(', ');
}

/**
 * Health check for detection services
 */
export async function checkDetectionHealth(): Promise<{
  backend: boolean;
  python: boolean;
}> {
  const results = { backend: false, python: false };

  // Helper for timeout
  const fetchWithTimeout = async (url: string, timeout = 5000): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  // Check backend
  try {
    console.log('[Health] Checking backend:', `${API_BASE_URL}/api/health`);
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/health`, 5000);
    results.backend = res.ok;
    console.log('[Health] Backend:', results.backend ? 'OK' : 'Failed');
  } catch (e) {
    console.log('[Health] Backend error:', e);
  }

  // Check Python service
  try {
    console.log('[Health] Checking Python:', `${PYTHON_SERVICE_URL}/health`);
    const res = await fetchWithTimeout(`${PYTHON_SERVICE_URL}/health`, 5000);
    if (res.ok) {
      const data = await res.json();
      results.python = data.status === 'healthy';
    }
    console.log('[Health] Python:', results.python ? 'OK' : 'Failed');
  } catch (e) {
    console.log('[Health] Python error:', e);
  }

  console.log('[Health] Results:', results);
  return results;
}

/**
 * Legacy health check function (alias)
 */
export async function checkHealth(): Promise<boolean> {
  const health = await checkDetectionHealth();
  return health.backend || health.python;
}
