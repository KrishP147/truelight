/**
 * Advanced Color Analyzer Service v2
 *
 * Extracts dominant colors from detected object regions and determines
 * if they are problematic for the user's specific colorblindness type.
 * 
 * NO OpenCV needed - uses pure JavaScript/TypeScript for color analysis.
 */

import { ColorblindnessType } from '../constants/accessibility';
import { getColorProfile, isProblematicColor as checkProblematic, getColorAlertPriority } from '../constants/colorProfiles';

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface HSVColor {
  h: number; // 0-180 (OpenCV style)
  s: number; // 0-255
  v: number; // 0-255
}

export interface ColorAnalysisResult {
  dominantColor: string; // Named color (red, yellow, green, blue, orange, etc.)
  rgb: RGBColor;
  hsv: HSVColor;
  isProblematicForUser: boolean;
  alertPriority: 'critical' | 'high' | 'medium' | 'low' | 'none';
  confidence: number;
}

/**
 * Convert RGB to HSV (OpenCV-style: H 0-180, S 0-255, V 0-255)
 */
export function rgbToHsv(r: number, g: number, b: number): HSVColor {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const diff = max - min;

  let h = 0;
  let s = 0;
  const v = max;

  if (diff !== 0) {
    s = diff / max;

    if (max === rNorm) {
      h = 60 * (((gNorm - bNorm) / diff) % 6);
    } else if (max === gNorm) {
      h = 60 * ((bNorm - rNorm) / diff + 2);
    } else {
      h = 60 * ((rNorm - gNorm) / diff + 4);
    }
  }

  if (h < 0) h += 360;

  // Convert to OpenCV scale
  return {
    h: Math.round(h / 2), // 0-180
    s: Math.round(s * 255), // 0-255
    v: Math.round(v * 255), // 0-255
  };
}

/**
 * Named color definitions with HSV ranges (OpenCV scale)
 */
const COLOR_DEFINITIONS: {
  name: string;
  hsvMin: [number, number, number];
  hsvMax: [number, number, number];
}[] = [
  // Red (wraps around 0/180)
  { name: 'red', hsvMin: [0, 100, 100], hsvMax: [10, 255, 255] },
  { name: 'red', hsvMin: [160, 100, 100], hsvMax: [180, 255, 255] },
  
  // Orange
  { name: 'orange', hsvMin: [10, 100, 100], hsvMax: [25, 255, 255] },
  
  // Yellow
  { name: 'yellow', hsvMin: [25, 100, 100], hsvMax: [35, 255, 255] },
  
  // Yellow-Green
  { name: 'yellow-green', hsvMin: [35, 100, 100], hsvMax: [45, 255, 255] },
  
  // Green
  { name: 'green', hsvMin: [45, 100, 100], hsvMax: [85, 255, 255] },
  
  // Cyan
  { name: 'cyan', hsvMin: [85, 100, 100], hsvMax: [100, 255, 255] },
  
  // Blue
  { name: 'blue', hsvMin: [100, 100, 100], hsvMax: [130, 255, 255] },
  
  // Purple/Violet
  { name: 'purple', hsvMin: [130, 100, 100], hsvMax: [160, 255, 255] },
  
  // Pink/Magenta
  { name: 'pink', hsvMin: [140, 50, 100], hsvMax: [170, 150, 255] },
  
  // Brown (desaturated orange/red with low value)
  { name: 'brown', hsvMin: [5, 50, 50], hsvMax: [25, 200, 150] },
  
  // White (low saturation, high value)
  { name: 'white', hsvMin: [0, 0, 200], hsvMax: [180, 50, 255] },
  
  // Gray (low saturation, medium value)
  { name: 'gray', hsvMin: [0, 0, 80], hsvMax: [180, 50, 200] },
  
  // Black (very low value)
  { name: 'black', hsvMin: [0, 0, 0], hsvMax: [180, 255, 50] },
];

/**
 * Identify the named color from HSV values
 */
export function identifyColor(hsv: HSVColor): string {
  for (const def of COLOR_DEFINITIONS) {
    const [hMin, sMin, vMin] = def.hsvMin;
    const [hMax, sMax, vMax] = def.hsvMax;
    
    if (hsv.h >= hMin && hsv.h <= hMax &&
        hsv.s >= sMin && hsv.s <= sMax &&
        hsv.v >= vMin && hsv.v <= vMax) {
      return def.name;
    }
  }
  
  // Fallback: identify by hue if saturation is decent
  if (hsv.s < 50) {
    return hsv.v > 180 ? 'white' : hsv.v < 50 ? 'black' : 'gray';
  }
  
  // Identify by hue
  if (hsv.h < 10 || hsv.h >= 160) return 'red';
  if (hsv.h < 25) return 'orange';
  if (hsv.h < 35) return 'yellow';
  if (hsv.h < 85) return 'green';
  if (hsv.h < 130) return 'blue';
  return 'purple';
}

/**
 * Extract dominant color from a region of an image (base64)
 * Uses simple averaging with outlier removal
 */
export async function extractDominantColor(
  base64Image: string,
  bbox: { x: number; y: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number
): Promise<{ rgb: RGBColor; confidence: number }> {
  try {
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const binaryString = atob(cleanBase64);
    const len = binaryString.length;
    
    // Estimate pixel data start (skip headers)
    const headerSize = Math.min(500, Math.floor(len * 0.1));
    
    // Calculate region bounds (normalized 0-1)
    const regionLeft = (bbox.x - bbox.width / 2) / imageWidth;
    const regionRight = (bbox.x + bbox.width / 2) / imageWidth;
    const regionTop = (bbox.y - bbox.height / 2) / imageHeight;
    const regionBottom = (bbox.y + bbox.height / 2) / imageHeight;
    
    // Sample pixels from the estimated region
    const samples: RGBColor[] = [];
    const bytesPerRow = Math.floor((len - headerSize) / imageHeight);
    
    for (let row = Math.floor(regionTop * imageHeight); row < Math.floor(regionBottom * imageHeight); row += 3) {
      for (let col = Math.floor(regionLeft * imageWidth); col < Math.floor(regionRight * imageWidth); col += 3) {
        const offset = headerSize + row * bytesPerRow + col * 3;
        if (offset + 2 < len) {
          const r = binaryString.charCodeAt(offset);
          const g = binaryString.charCodeAt(offset + 1);
          const b = binaryString.charCodeAt(offset + 2);
          
          // Skip very dark or very bright
          const brightness = (r + g + b) / 3;
          if (brightness > 30 && brightness < 240) {
            samples.push({ r, g, b });
          }
        }
      }
    }
    
    if (samples.length < 5) {
      // Not enough samples, do global sampling
      return extractGlobalDominantColor(cleanBase64);
    }
    
    // Calculate average RGB
    let avgR = 0, avgG = 0, avgB = 0;
    for (const s of samples) {
      avgR += s.r;
      avgG += s.g;
      avgB += s.b;
    }
    
    return {
      rgb: {
        r: Math.round(avgR / samples.length),
        g: Math.round(avgG / samples.length),
        b: Math.round(avgB / samples.length),
      },
      confidence: Math.min(1, samples.length / 50),
    };
  } catch (error) {
    console.warn('[ColorAnalyzer] Failed to extract region color:', error);
    return { rgb: { r: 128, g: 128, b: 128 }, confidence: 0 };
  }
}

/**
 * Extract global dominant color from image
 */
function extractGlobalDominantColor(base64: string): { rgb: RGBColor; confidence: number } {
  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const samples: RGBColor[] = [];
    
    const step = Math.max(30, Math.floor(len / 500));
    for (let i = 500; i < len - 2; i += step) {
      const r = binaryString.charCodeAt(i);
      const g = binaryString.charCodeAt(i + 1);
      const b = binaryString.charCodeAt(i + 2);
      
      const brightness = (r + g + b) / 3;
      if (brightness > 30 && brightness < 240) {
        samples.push({ r, g, b });
      }
    }
    
    if (samples.length === 0) {
      return { rgb: { r: 128, g: 128, b: 128 }, confidence: 0 };
    }
    
    let avgR = 0, avgG = 0, avgB = 0;
    for (const s of samples) {
      avgR += s.r;
      avgG += s.g;
      avgB += s.b;
    }
    
    return {
      rgb: {
        r: Math.round(avgR / samples.length),
        g: Math.round(avgG / samples.length),
        b: Math.round(avgB / samples.length),
      },
      confidence: Math.min(1, samples.length / 100),
    };
  } catch {
    return { rgb: { r: 128, g: 128, b: 128 }, confidence: 0 };
  }
}

/**
 * Analyze a detected object's color for colorblind relevance
 */
export async function analyzeObjectColor(
  base64Image: string,
  bbox: { x: number; y: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number,
  userColorblindType: ColorblindnessType
): Promise<ColorAnalysisResult> {
  const { rgb, confidence } = await extractDominantColor(base64Image, bbox, imageWidth, imageHeight);
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  const dominantColor = identifyColor(hsv);
  
  const isProblematicForUser = checkProblematic(dominantColor, userColorblindType);
  const alertPriority = isProblematicForUser 
    ? getColorAlertPriority(dominantColor, userColorblindType)
    : 'none';
  
  return {
    dominantColor,
    rgb,
    hsv,
    isProblematicForUser,
    alertPriority,
    confidence,
  };
}

/**
 * Batch analyze multiple objects in one image
 */
export async function analyzeMultipleObjects(
  base64Image: string,
  objects: Array<{ bbox: { x: number; y: number; width: number; height: number }; id: string }>,
  imageWidth: number,
  imageHeight: number,
  userColorblindType: ColorblindnessType
): Promise<Map<string, ColorAnalysisResult>> {
  const results = new Map<string, ColorAnalysisResult>();
  
  for (const obj of objects) {
    const analysis = await analyzeObjectColor(
      base64Image,
      obj.bbox,
      imageWidth,
      imageHeight,
      userColorblindType
    );
    results.set(obj.id, analysis);
  }
  
  return results;
}

/**
 * Check if any colors in the frame are problematic for the user
 * Fast pre-filter before detailed object detection
 */
export async function hasProblematicColors(
  base64Image: string,
  userColorblindType: ColorblindnessType
): Promise<{ hasProblematic: boolean; detectedColors: string[] }> {
  const profile = getColorProfile(userColorblindType);
  
  if (profile.problematicColors.length === 0) {
    return { hasProblematic: false, detectedColors: [] };
  }
  
  // Quick global color check
  const { rgb } = await extractDominantColor(
    base64Image,
    { x: 320, y: 240, width: 640, height: 480 }, // Full frame
    640,
    480
  );
  
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  const detectedColor = identifyColor(hsv);
  
  const hasProblematic = profile.problematicColors.includes(detectedColor) ||
                         profile.problematicColors.includes('all');
  
  return {
    hasProblematic,
    detectedColors: [detectedColor],
  };
}
