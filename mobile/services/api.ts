/**
 * Backend API Service
 *
 * Handles communication with the Next.js detection backend.
 * Falls back to direct Roboflow API if backend is unreachable.
 * Supports enhanced detection with bounding boxes for all detected objects.
 */

import { TIMING, SignalState, ColorblindnessType } from '../constants/accessibility';
import { getColorProfile, isProblematicColor, getColorAlertPriority } from '../constants/colorProfiles';

// Configure this to your backend URL
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

// Roboflow direct API (fallback when backend unreachable)
const ROBOFLOW_API_KEY = 'SUVn3OiqF6PqIASCVWJT';
const ROBOFLOW_TRAFFIC_MODEL = 'traffic-light-cnlh5/1';
// COCO model for general object detection
const ROBOFLOW_COCO_MODEL = 'coco/9';

// Track if we should use direct Roboflow
let useDirectRoboflow = false;

// Log the API URL on load for debugging
console.log('[API] Backend URL:', API_BASE_URL);

/**
 * Bounding box for detected objects
 */
export interface BoundingBox {
  x: number;      // Center X
  y: number;      // Center Y
  width: number;
  height: number;
}

/**
 * Detected object with color and bounding box
 */
export interface DetectedObject {
  id: string;
  label: string;            // Human-readable label (e.g., "Stop Sign", "Brake Light")
  class: string;            // Object class from model (traffic-light, car, person, etc.)
  category?: string;        // Detection category (traffic_signal, vehicle_hazard, etc.)
  color?: string;           // Detected color if applicable
  confidence: number;
  bbox: BoundingBox;
  isProblematicColor: boolean;  // Is this a color the user can't see well?
  alertPriority: 'critical' | 'high' | 'medium' | 'low' | 'none';
}

export interface DetectionResponse {
  state: SignalState;
  confidence: number;
  message: string;
  processingTimeMs?: number;
  // Enhanced: All detected objects with bounding boxes
  detectedObjects?: DetectedObject[];
  // Image dimensions for scaling bounding boxes
  imageWidth?: number;
  imageHeight?: number;
}

/**
 * Sends an image to the backend for traffic signal detection
 * Falls back to direct Roboflow API if backend is unreachable
 */
export async function detectSignal(
  base64Image: string,
  colorblindType: ColorblindnessType = 'unknown'
): Promise<DetectionResponse> {
  // If we've determined backend is unreachable, go direct to Roboflow
  if (useDirectRoboflow) {
    return detectSignalDirect(base64Image, colorblindType);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMING.apiTimeout);

  try {
    console.log('[API] Sending detection request to:', `${API_BASE_URL}/api/detect`);

    const response = await fetch(`${API_BASE_URL}/api/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        image: base64Image,
        colorblindType,
        includeAllObjects: true, // Request all detected objects
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[API] Detection error:', response.status, response.statusText);
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('[API] Detection result:', result.state, 'confidence:', result.confidence);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('[API] Request timeout - switching to direct Roboflow');
        useDirectRoboflow = true;
        return detectSignalDirect(base64Image, colorblindType);
      }
      console.error('[API] Error:', error.message, '- switching to direct Roboflow');
      useDirectRoboflow = true;
      return detectSignalDirect(base64Image, colorblindType);
    }

    throw error;
  }
}

/**
 * Direct Roboflow API call (bypasses backend)
 * Detects traffic lights and general objects, returns with bounding boxes
 */
async function detectSignalDirect(
  base64Image: string,
  colorblindType: ColorblindnessType = 'unknown'
): Promise<DetectionResponse> {
  try {
    console.log('[API] Using direct Roboflow API');
    
    // Use traffic light model first
    const ROBOFLOW_URL = `https://detect.roboflow.com/${ROBOFLOW_TRAFFIC_MODEL}?api_key=${ROBOFLOW_API_KEY}`;
    
    const response = await fetch(ROBOFLOW_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: base64Image,
    });

    if (!response.ok) {
      throw new Error(`Roboflow error: ${response.status}`);
    }

    const data = await response.json();
    const colorProfile = getColorProfile(colorblindType);
    
    // Parse Roboflow response
    let detectedObjects: DetectedObject[] = [];
    let state: SignalState = 'unknown';
    let bestConfidence = 0;
    
    if (data.predictions && data.predictions.length > 0) {
      // Convert traffic light predictions to DetectedObject format
      detectedObjects = data.predictions.map((pred: any, index: number) => {
        const color = pred.class.toLowerCase();
        const isProblematic = isProblematicColor(color, colorblindType);
        const alertPriority = isProblematic 
          ? getColorAlertPriority(color, colorblindType) 
          : (color === 'red' ? 'critical' : color === 'yellow' ? 'high' : 'medium');
        
        // Map color to signal state
        if (pred.confidence > bestConfidence) {
          bestConfidence = pred.confidence;
          state = color === 'red' ? 'red' : 
                  color === 'yellow' ? 'yellow' : 
                  color === 'green' ? 'green' : 'unknown';
        }
        
        return {
          id: `traffic-${index}`,
          label: `${color.charAt(0).toUpperCase() + color.slice(1)} Light`,
          class: 'traffic-light',
          category: 'traffic_signal',
          color: color,
          confidence: pred.confidence,
          bbox: {
            x: pred.x,
            y: pred.y,
            width: pred.width,
            height: pred.height,
          },
          isProblematicColor: isProblematic,
          alertPriority: alertPriority as any,
        };
      });
    }

    // Also try to detect general objects (vehicles, pedestrians, etc.)
    try {
      const cocoResponse = await fetch(
        `https://detect.roboflow.com/${ROBOFLOW_COCO_MODEL}?api_key=${ROBOFLOW_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: base64Image,
        }
      );
      
      if (cocoResponse.ok) {
        const cocoData = await cocoResponse.json();
        if (cocoData.predictions) {
          // Filter and add relevant objects
          const relevantClasses = [
            'person', 'bicycle', 'car', 'motorcycle', 'bus', 'truck', 
            'traffic light', 'fire hydrant', 'stop sign'
          ];
          
          cocoData.predictions
            .filter((pred: any) => 
              relevantClasses.includes(pred.class.toLowerCase()) &&
              pred.confidence > 0.4
            )
            .forEach((pred: any, index: number) => {
              const objClass = pred.class.toLowerCase();
              const objectInfo = mapCocoToDetectable(objClass);
              
              detectedObjects.push({
                id: `coco-${index}`,
                label: objectInfo.label,
                class: objClass,
                category: objectInfo.category,
                confidence: pred.confidence,
                bbox: {
                  x: pred.x,
                  y: pred.y,
                  width: pred.width,
                  height: pred.height,
                },
                isProblematicColor: objectInfo.isProblematic && isProblematicColor(objectInfo.color || '', colorblindType),
                alertPriority: objectInfo.alertPriority,
              });
            });
        }
      }
    } catch (cocoError) {
      console.log('[API] COCO detection failed, continuing with traffic lights only');
    }

    const position = state === 'red' ? 'Top' : state === 'yellow' ? 'Middle' : state === 'green' ? 'Bottom' : '';
    const action = state === 'red' ? 'Stop' : state === 'yellow' ? 'Caution' : state === 'green' ? 'Go' : '';

    return {
      state,
      confidence: bestConfidence,
      message: state !== 'unknown' 
        ? `${state.charAt(0).toUpperCase() + state.slice(1)} light. ${action}. ${position} light is on.`
        : detectedObjects.length > 0 
          ? `${detectedObjects.length} object(s) detected`
          : 'Scanning...',
      detectedObjects,
      imageWidth: data.image?.width || 640,
      imageHeight: data.image?.height || 480,
    };
  } catch (error) {
    console.error('[API] Direct Roboflow error:', error);
    return {
      state: 'unknown' as SignalState,
      confidence: 0,
      message: 'Detection error',
      detectedObjects: [],
    };
  }
}

/**
 * Maps COCO object classes to our detection system
 */
function mapCocoToDetectable(cocoClass: string): {
  label: string;
  category: string;
  alertPriority: 'critical' | 'high' | 'medium' | 'low' | 'none';
  isProblematic: boolean;
  color?: string;
} {
  const mapping: Record<string, any> = {
    'person': { label: 'Pedestrian', category: 'pedestrian_hazard', alertPriority: 'critical', isProblematic: false },
    'bicycle': { label: 'Cyclist', category: 'pedestrian_hazard', alertPriority: 'critical', isProblematic: false },
    'car': { label: 'Vehicle', category: 'vehicle_hazard', alertPriority: 'medium', isProblematic: false },
    'motorcycle': { label: 'Motorcycle', category: 'vehicle_hazard', alertPriority: 'high', isProblematic: false },
    'bus': { label: 'Bus', category: 'vehicle_hazard', alertPriority: 'medium', isProblematic: false },
    'truck': { label: 'Truck', category: 'vehicle_hazard', alertPriority: 'high', isProblematic: false },
    'traffic light': { label: 'Traffic Light', category: 'traffic_signal', alertPriority: 'high', isProblematic: true, color: 'red' },
    'fire hydrant': { label: 'Fire Hydrant', category: 'road_hazard', alertPriority: 'low', isProblematic: true, color: 'red' },
    'stop sign': { label: 'Stop Sign', category: 'traffic_sign', alertPriority: 'critical', isProblematic: true, color: 'red' },
  };
  
  return mapping[cocoClass] || { 
    label: cocoClass.charAt(0).toUpperCase() + cocoClass.slice(1), 
    category: 'environmental', 
    alertPriority: 'low', 
    isProblematic: false 
  };
}

/**
 * Checks if the backend is reachable
 * If not, enables direct Roboflow mode
 */
export async function checkHealth(): Promise<boolean> {
  try {
    console.log('[API] Checking health at:', `${API_BASE_URL}/api/health`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log('[API] Health check passed - using backend');
      useDirectRoboflow = false;
      return true;
    } else {
      console.log('[API] Health check failed - using direct Roboflow');
      useDirectRoboflow = true;
      return true; // Return true because direct Roboflow will work
    }
  } catch (error) {
    console.log('[API] Backend unreachable - using direct Roboflow');
    useDirectRoboflow = true;
    return true; // Return true because direct Roboflow will work
  }
}
