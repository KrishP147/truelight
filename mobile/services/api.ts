/**
 * Detection API Service - COMPREHENSIVE OBJECT DETECTION
 *
 * This service provides general-purpose object detection with colorblind-aware alerts.
 * 
 * Key Features:
 * - Detects ALL objects in frame (cars, people, signs, lights, etc.)
 * - Shows bounding boxes for EVERYTHING detected
 * - Only generates voice alerts for objects with colors the user cannot see well
 * - Uses Python OpenCV/YOLO microservice as primary detection method
 * - Falls back to Roboflow API if Python service unavailable
 */

import { TIMING, SignalState, ColorblindnessType } from '../constants/accessibility';
import { getColorProfile, isProblematicColor } from '../constants/colorProfiles';

// Python detection service URL (direct connection to Python service)
// For Android emulator, use 10.0.2.2 to reach host localhost
// For physical device, use your computer's IP address
const PYTHON_SERVICE_URL = __DEV__ 
  ? 'http://192.168.1.100:8000'  // Change to your IP
  : 'http://localhost:8000';

// Backend proxy URL (goes through Next.js backend)
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Fallback: Roboflow API for when Python service is down
const ROBOFLOW_API_KEY = process.env.EXPO_PUBLIC_ROBOFLOW_API_KEY || 'SUVn3OiqF6PqIASCVWJT';
const ROBOFLOW_MODEL = 'coco/9';

// Detection timing
const DETECTION_TIMEOUT = 10000; // 10 seconds timeout

console.log('[Detection] Service initialized');
console.log('[Detection] Backend URL:', API_BASE_URL);

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

/**
 * Main detection function - detects all objects, alerts only for problematic colors
 */
export async function detectSignal(
  base64Image: string,
  colorblindType: ColorblindnessType = 'unknown'
): Promise<DetectionResponse> {
  console.log(`[Detection] Starting detection for ${colorblindType} user`);
  
  // Try methods in order of preference
  const methods = [
    { name: 'Backend Proxy', fn: () => detectViaBackend(base64Image, colorblindType) },
    { name: 'Direct Python', fn: () => detectWithPython(base64Image, colorblindType) },
    { name: 'Roboflow', fn: () => detectWithRoboflow(base64Image, colorblindType) },
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
  console.error('[Detection] All detection methods failed');
  return {
    state: 'unknown',
    confidence: 0,
    message: 'Detection unavailable',
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
  colorblindType: ColorblindnessType
): Promise<DetectionResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DETECTION_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE_URL}/api/detect/objects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64Image,
        colorblindness_type: colorblindType,
        min_confidence: 0.25,
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
  colorblindType: ColorblindnessType
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
        min_confidence: 0.25,
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
 * Roboflow API detection (fallback)
 */
async function detectWithRoboflow(
  base64Image: string,
  colorblindType: ColorblindnessType
): Promise<DetectionResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DETECTION_TIMEOUT);

  try {
    // Clean base64 string
    const cleanBase64 = base64Image.includes(',') 
      ? base64Image.split(',')[1] 
      : base64Image;
    
    const response = await fetch(
      `https://detect.roboflow.com/${ROBOFLOW_MODEL}?api_key=${ROBOFLOW_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: cleanBase64,
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Roboflow error: ${response.status}`);
    }

    const data = await response.json();
    return processRoboflowResponse(data, colorblindType);
    
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Process Roboflow response into our format
 */
function processRoboflowResponse(
  data: any,
  colorblindType: ColorblindnessType
): DetectionResponse {
  const detectedObjects: DetectedObject[] = [];
  const alertObjects: DetectedObject[] = [];
  
  const imageWidth = data.image?.width || 640;
  const imageHeight = data.image?.height || 480;

  for (let i = 0; i < (data.predictions || []).length; i++) {
    const pred = data.predictions[i];
    
    // Roboflow gives center coordinates - convert to top-left
    const bbox: BoundingBox = {
      x: Math.round(pred.x - pred.width / 2),
      y: Math.round(pred.y - pred.height / 2),
      width: Math.round(pred.width),
      height: Math.round(pred.height),
    };
    
    // Estimate colors based on object type (Roboflow doesn't do color analysis)
    const estimatedColors = estimateObjectColors(pred.class);
    
    // Check if any estimated colors are problematic for this user
    const isProblematic = estimatedColors.some(color => 
      isColorProblematicForType(color, colorblindType)
    );
    
    const priority = getObjectPriority(pred.class, isProblematic);
    
    const detected: DetectedObject = {
      id: `rf-${i}-${Date.now()}`,
      label: formatLabel(pred.class),
      class: pred.class.toLowerCase(),
      confidence: pred.confidence,
      bbox,
      colors: estimatedColors,
      isProblematicColor: isProblematic,
      alertPriority: priority,
      colorWarning: isProblematic ? `${estimatedColors[0]} detected` : undefined,
    };
    
    detectedObjects.push(detected);
    
    if (isProblematic && ['critical', 'high', 'medium'].includes(priority)) {
      alertObjects.push(detected);
    }
  }

  const message = generateAlertMessage(alertObjects, detectedObjects.length);
  
  console.log(`[Detection] Roboflow: ${detectedObjects.length} objects, ${alertObjects.length} alerts`);

  return {
    state: 'unknown',
    confidence: detectedObjects.length > 0 
      ? Math.max(...detectedObjects.map(o => o.confidence)) 
      : 0,
    message,
    detectedObjects,
    alertObjects,
    imageWidth,
    imageHeight,
  };
}

/**
 * Estimate what colors an object typically has
 */
function estimateObjectColors(objectClass: string): string[] {
  const colorMap: Record<string, string[]> = {
    'traffic light': ['red', 'yellow', 'green'],
    'stop sign': ['red'],
    'fire hydrant': ['red', 'yellow'],
    'car': ['red', 'white', 'black'],
    'truck': ['red', 'white'],
    'bus': ['yellow', 'white'],
    'motorcycle': ['red', 'black'],
    'bicycle': ['red', 'blue'],
    'person': [],
    'boat': ['white'],
    'airplane': ['white'],
    'train': ['red', 'yellow'],
    'umbrella': ['red', 'blue'],
    'banana': ['yellow'],
    'apple': ['red', 'green'],
    'orange': ['orange'],
    'broccoli': ['green'],
    'carrot': ['orange'],
    'potted plant': ['green'],
  };
  
  return colorMap[objectClass.toLowerCase()] || [];
}

/**
 * Check if a color is problematic for a colorblindness type
 */
function isColorProblematicForType(color: string, type: ColorblindnessType): boolean {
  const problematicColors: Record<string, string[]> = {
    'protanopia': ['red', 'orange', 'green'],
    'protanomaly': ['red', 'orange'],
    'deuteranopia': ['red', 'green', 'yellow'],
    'deuteranomaly': ['green', 'yellow'],
    'tritanopia': ['blue', 'yellow'],
    'tritanomaly': ['blue', 'yellow'],
    'low_vision': ['red', 'green', 'yellow', 'blue', 'orange'],
    'normal': [],
    'unknown': ['red', 'green', 'yellow'],
  };
  
  const userProblematicColors = problematicColors[type] || problematicColors['unknown'];
  return userProblematicColors.includes(color.toLowerCase());
}

/**
 * Get priority for an object based on type and color relevance
 */
function getObjectPriority(
  objectClass: string, 
  isProblematic: boolean
): 'critical' | 'high' | 'medium' | 'low' | 'none' {
  const cls = objectClass.toLowerCase();
  
  // Critical - traffic control
  if (['traffic light', 'stop sign'].includes(cls)) {
    return isProblematic ? 'critical' : 'high';
  }
  
  // High - vehicles (potential brake lights)
  if (['car', 'truck', 'bus', 'motorcycle'].includes(cls)) {
    return isProblematic ? 'high' : 'medium';
  }
  
  // Medium - road users
  if (['person', 'bicycle', 'fire hydrant'].includes(cls)) {
    return isProblematic ? 'medium' : 'low';
  }
  
  // Low - other
  return isProblematic ? 'low' : 'none';
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
  for (const obj of sorted.slice(0, 3)) {
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
  roboflow: boolean;
}> {
  const results = { backend: false, python: false, roboflow: true }; // Assume Roboflow works
  
  // Check backend
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      signal: AbortSignal.timeout(3000),
    });
    results.backend = res.ok;
  } catch {}
  
  // Check Python service
  try {
    const res = await fetch(`${PYTHON_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      results.python = data.status === 'healthy';
    }
  } catch {}
  
  return results;
}
