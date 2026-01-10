/**
 * Color Profiles for Different Types of Colorblindness
 *
 * Defines which colors are problematic for each type of colorblindness
 * and what objects/hazards to prioritize for detection.
 * 
 * Detection Categories (from FEATURES_ROADMAP):
 * - Traffic Signals: Red/Yellow/Green lights, pedestrian signals
 * - Traffic Signs: Stop signs, yield signs, warning signs
 * - Vehicle Hazards: Brake lights, turn signals, emergency vehicles
 * - Road Hazards: Construction cones, barriers, road markings
 * - Pedestrian Hazards: Crosswalks, people, cyclists
 * - Environmental: Fire, smoke, warning lights
 */

import { ColorblindnessType } from './accessibility';

export type DetectionCategory = 
  | "traffic_signal"
  | "traffic_sign"
  | "vehicle_hazard"
  | "road_hazard"
  | "pedestrian_hazard"
  | "environmental";

export interface DetectableObject {
  id: string;
  name: string;
  category: DetectionCategory;
  primaryColors: string[];
  alertPriority: "critical" | "high" | "medium" | "low";
  alertMessage: string;
  actionRequired?: string;
}

// All detectable objects organized by category
export const DETECTABLE_OBJECTS: DetectableObject[] = [
  // Traffic Signals
  { id: "red_light", name: "Red Light", category: "traffic_signal", primaryColors: ["red"], alertPriority: "critical", alertMessage: "Red light detected", actionRequired: "Stop" },
  { id: "yellow_light", name: "Yellow Light", category: "traffic_signal", primaryColors: ["yellow", "orange"], alertPriority: "high", alertMessage: "Yellow light detected", actionRequired: "Prepare to stop" },
  { id: "green_light", name: "Green Light", category: "traffic_signal", primaryColors: ["green"], alertPriority: "medium", alertMessage: "Green light detected", actionRequired: "Safe to proceed" },
  { id: "pedestrian_signal_stop", name: "Don't Walk Signal", category: "traffic_signal", primaryColors: ["red", "orange"], alertPriority: "high", alertMessage: "Don't walk signal", actionRequired: "Wait" },
  { id: "pedestrian_signal_go", name: "Walk Signal", category: "traffic_signal", primaryColors: ["green", "white"], alertPriority: "medium", alertMessage: "Walk signal", actionRequired: "Safe to cross" },
  { id: "flashing_red", name: "Flashing Red", category: "traffic_signal", primaryColors: ["red"], alertPriority: "critical", alertMessage: "Flashing red light", actionRequired: "Treat as stop sign" },
  { id: "flashing_yellow", name: "Flashing Yellow", category: "traffic_signal", primaryColors: ["yellow"], alertPriority: "high", alertMessage: "Flashing yellow light", actionRequired: "Proceed with caution" },
  
  // Traffic Signs
  { id: "stop_sign", name: "Stop Sign", category: "traffic_sign", primaryColors: ["red"], alertPriority: "critical", alertMessage: "Stop sign ahead", actionRequired: "Come to complete stop" },
  { id: "yield_sign", name: "Yield Sign", category: "traffic_sign", primaryColors: ["red", "yellow"], alertPriority: "high", alertMessage: "Yield sign ahead", actionRequired: "Give way to traffic" },
  { id: "warning_sign", name: "Warning Sign", category: "traffic_sign", primaryColors: ["yellow", "orange"], alertPriority: "high", alertMessage: "Warning sign ahead", actionRequired: "Slow down" },
  { id: "no_entry", name: "No Entry Sign", category: "traffic_sign", primaryColors: ["red"], alertPriority: "critical", alertMessage: "No entry sign", actionRequired: "Do not proceed" },
  { id: "speed_limit", name: "Speed Limit Sign", category: "traffic_sign", primaryColors: ["red", "white"], alertPriority: "medium", alertMessage: "Speed limit sign", actionRequired: "Check your speed" },
  { id: "school_zone", name: "School Zone Sign", category: "traffic_sign", primaryColors: ["yellow", "green"], alertPriority: "high", alertMessage: "School zone ahead", actionRequired: "Reduce speed" },
  { id: "construction_sign", name: "Construction Sign", category: "traffic_sign", primaryColors: ["orange"], alertPriority: "high", alertMessage: "Construction ahead", actionRequired: "Slow down and be alert" },
  
  // Vehicle Hazards
  { id: "brake_light", name: "Brake Lights", category: "vehicle_hazard", primaryColors: ["red"], alertPriority: "critical", alertMessage: "Brake lights ahead", actionRequired: "Vehicle slowing - maintain distance" },
  { id: "turn_signal_left", name: "Left Turn Signal", category: "vehicle_hazard", primaryColors: ["yellow", "orange"], alertPriority: "high", alertMessage: "Vehicle signaling left turn", actionRequired: "Be aware of turning vehicle" },
  { id: "turn_signal_right", name: "Right Turn Signal", category: "vehicle_hazard", primaryColors: ["yellow", "orange"], alertPriority: "high", alertMessage: "Vehicle signaling right turn", actionRequired: "Be aware of turning vehicle" },
  { id: "hazard_lights", name: "Hazard Lights", category: "vehicle_hazard", primaryColors: ["yellow", "orange"], alertPriority: "high", alertMessage: "Vehicle with hazard lights", actionRequired: "Caution - vehicle may be stopped" },
  { id: "emergency_vehicle", name: "Emergency Vehicle", category: "vehicle_hazard", primaryColors: ["red", "blue"], alertPriority: "critical", alertMessage: "Emergency vehicle detected", actionRequired: "Pull over and yield" },
  { id: "reverse_light", name: "Reverse Lights", category: "vehicle_hazard", primaryColors: ["white"], alertPriority: "high", alertMessage: "Vehicle reversing", actionRequired: "Stop and wait" },
  { id: "ambulance", name: "Ambulance", category: "vehicle_hazard", primaryColors: ["red", "white"], alertPriority: "critical", alertMessage: "Ambulance approaching", actionRequired: "Clear the way" },
  { id: "fire_truck", name: "Fire Truck", category: "vehicle_hazard", primaryColors: ["red"], alertPriority: "critical", alertMessage: "Fire truck approaching", actionRequired: "Pull over immediately" },
  { id: "police_car", name: "Police Vehicle", category: "vehicle_hazard", primaryColors: ["red", "blue"], alertPriority: "critical", alertMessage: "Police vehicle", actionRequired: "Yield if lights active" },
  
  // Road Hazards
  { id: "construction_cone", name: "Traffic Cone", category: "road_hazard", primaryColors: ["orange"], alertPriority: "high", alertMessage: "Traffic cone detected", actionRequired: "Navigate around" },
  { id: "construction_barrel", name: "Construction Barrel", category: "road_hazard", primaryColors: ["orange"], alertPriority: "high", alertMessage: "Construction barrel", actionRequired: "Lane may be blocked" },
  { id: "road_barrier", name: "Road Barrier", category: "road_hazard", primaryColors: ["orange", "red", "yellow"], alertPriority: "high", alertMessage: "Road barrier ahead", actionRequired: "Do not cross" },
  { id: "pothole", name: "Pothole", category: "road_hazard", primaryColors: [], alertPriority: "medium", alertMessage: "Pothole detected", actionRequired: "Avoid if safe" },
  { id: "debris", name: "Road Debris", category: "road_hazard", primaryColors: [], alertPriority: "medium", alertMessage: "Debris on road", actionRequired: "Navigate carefully" },
  { id: "roadwork", name: "Roadwork Zone", category: "road_hazard", primaryColors: ["orange", "yellow"], alertPriority: "high", alertMessage: "Roadwork zone", actionRequired: "Reduce speed" },
  
  // Pedestrian Hazards
  { id: "pedestrian", name: "Pedestrian", category: "pedestrian_hazard", primaryColors: [], alertPriority: "critical", alertMessage: "Pedestrian detected", actionRequired: "Yield to pedestrian" },
  { id: "cyclist", name: "Cyclist", category: "pedestrian_hazard", primaryColors: [], alertPriority: "critical", alertMessage: "Cyclist detected", actionRequired: "Maintain safe distance" },
  { id: "crosswalk", name: "Crosswalk", category: "pedestrian_hazard", primaryColors: ["yellow", "white"], alertPriority: "high", alertMessage: "Crosswalk ahead", actionRequired: "Watch for pedestrians" },
  { id: "child", name: "Child", category: "pedestrian_hazard", primaryColors: [], alertPriority: "critical", alertMessage: "Child detected", actionRequired: "Extreme caution" },
  { id: "jogger", name: "Jogger", category: "pedestrian_hazard", primaryColors: [], alertPriority: "high", alertMessage: "Jogger nearby", actionRequired: "Give space" },
  
  // Environmental
  { id: "fire", name: "Fire", category: "environmental", primaryColors: ["red", "orange"], alertPriority: "critical", alertMessage: "Fire detected", actionRequired: "Danger - avoid area" },
  { id: "smoke", name: "Smoke", category: "environmental", primaryColors: ["gray"], alertPriority: "high", alertMessage: "Smoke detected", actionRequired: "Reduce visibility - slow down" },
  { id: "warning_light", name: "Warning Light", category: "environmental", primaryColors: ["red", "yellow", "orange"], alertPriority: "high", alertMessage: "Warning light", actionRequired: "Be alert" },
  { id: "flood_water", name: "Flood Water", category: "environmental", primaryColors: ["brown"], alertPriority: "critical", alertMessage: "Water on road", actionRequired: "Turn around - don't drown" },
];

/**
 * Get objects that are relevant to a specific color
 */
export function getObjectsForColor(color: string): DetectableObject[] {
  return DETECTABLE_OBJECTS.filter(obj => 
    obj.primaryColors.includes(color.toLowerCase())
  );
}

/**
 * Get all objects in a category
 */
export function getObjectsByCategory(category: DetectionCategory): DetectableObject[] {
  return DETECTABLE_OBJECTS.filter(obj => obj.category === category);
}

/**
 * Get objects that are problematic for a colorblindness type
 */
export function getProblematicObjects(type: ColorblindnessType): DetectableObject[] {
  const profile = COLOR_PROFILES[type] || COLOR_PROFILES.unknown;
  return DETECTABLE_OBJECTS.filter(obj => 
    obj.primaryColors.some(color => 
      profile.problematicColors.includes(color) || 
      profile.problematicColors.includes('all')
    ) ||
    // Also include non-color objects (pedestrians, etc.) as important
    obj.primaryColors.length === 0 && obj.alertPriority === 'critical'
  );
}

export interface ColorProfile {
  type: ColorblindnessType;
  name: string;
  description: string;
  // Colors that this user has difficulty seeing
  problematicColors: string[];
  // Colors to watch for in detection (HSV ranges or color names)
  detectColors: {
    name: string;
    hsvMin: [number, number, number]; // H, S, V min
    hsvMax: [number, number, number]; // H, S, V max
    alertPriority: 'critical' | 'high' | 'medium' | 'low';
  }[];
  // Object types to prioritize
  priorityObjects: string[];
  // Whether to use ElevenLabs for voice (premium voice)
  useElevenLabs: boolean;
}

/**
 * Color profiles based on colorblindness type
 */
export const COLOR_PROFILES: Record<ColorblindnessType, ColorProfile> = {
  protanopia: {
    type: 'protanopia',
    name: 'Protanopia (Red-Blind)',
    description: 'Difficulty seeing red colors',
    problematicColors: ['red', 'orange', 'brown', 'pink'],
    detectColors: [
      {
        name: 'red',
        hsvMin: [0, 70, 50],
        hsvMax: [10, 255, 255],
        alertPriority: 'critical',
      },
      {
        name: 'red-high',
        hsvMin: [170, 70, 50],
        hsvMax: [180, 255, 255],
        alertPriority: 'critical',
      },
      {
        name: 'orange',
        hsvMin: [10, 70, 50],
        hsvMax: [25, 255, 255],
        alertPriority: 'high',
      },
      {
        name: 'pink',
        hsvMin: [140, 30, 50],
        hsvMax: [170, 255, 255],
        alertPriority: 'medium',
      },
    ],
    priorityObjects: [
      'red_light',
      'stop_sign',
      'brake_light',
      'emergency_vehicle',
      'fire_truck',
      'ambulance',
      'fire',
      'warning_sign',
      'construction_cone',
      'construction_barrel',
      'construction_sign',
      'flashing_red',
    ],
    useElevenLabs: true,
  },

  deuteranopia: {
    type: 'deuteranopia',
    name: 'Deuteranopia (Green-Blind)',
    description: 'Difficulty seeing green colors',
    problematicColors: ['green', 'yellow-green', 'brown', 'orange'],
    detectColors: [
      {
        name: 'green',
        hsvMin: [35, 70, 50],
        hsvMax: [85, 255, 255],
        alertPriority: 'critical',
      },
      {
        name: 'yellow-green',
        hsvMin: [25, 70, 50],
        hsvMax: [35, 255, 255],
        alertPriority: 'high',
      },
      // Also detect red (since it can be confused with green)
      {
        name: 'red',
        hsvMin: [0, 70, 50],
        hsvMax: [10, 255, 255],
        alertPriority: 'critical',
      },
    ],
    priorityObjects: [
      'green_light',
      'red_light',
      'pedestrian_signal_go',
      'pedestrian_signal_stop',
      'school_zone',
      'crosswalk',
    ],
    useElevenLabs: true,
  },

  tritanopia: {
    type: 'tritanopia',
    name: 'Tritanopia (Blue-Yellow Blind)',
    description: 'Difficulty seeing blue and yellow colors',
    problematicColors: ['blue', 'yellow', 'purple', 'cyan'],
    detectColors: [
      {
        name: 'blue',
        hsvMin: [100, 70, 50],
        hsvMax: [130, 255, 255],
        alertPriority: 'critical',
      },
      {
        name: 'yellow',
        hsvMin: [20, 70, 50],
        hsvMax: [35, 255, 255],
        alertPriority: 'critical',
      },
      {
        name: 'purple',
        hsvMin: [130, 50, 50],
        hsvMax: [160, 255, 255],
        alertPriority: 'high',
      },
    ],
    priorityObjects: [
      'yellow_light',
      'flashing_yellow',
      'warning_sign',
      'school_zone',
      'emergency_vehicle',
      'police_car',
      'construction_sign',
      'crosswalk',
    ],
    useElevenLabs: true,
  },

  low_vision: {
    type: 'low_vision',
    name: 'Low Vision',
    description: 'General difficulty seeing - relies on audio',
    problematicColors: ['all'],
    detectColors: [
      // Detect all major colors for maximum assistance
      {
        name: 'red',
        hsvMin: [0, 70, 50],
        hsvMax: [10, 255, 255],
        alertPriority: 'critical',
      },
      {
        name: 'yellow',
        hsvMin: [20, 70, 50],
        hsvMax: [35, 255, 255],
        alertPriority: 'critical',
      },
      {
        name: 'green',
        hsvMin: [35, 70, 50],
        hsvMax: [85, 255, 255],
        alertPriority: 'critical',
      },
      {
        name: 'blue',
        hsvMin: [100, 70, 50],
        hsvMax: [130, 255, 255],
        alertPriority: 'high',
      },
      {
        name: 'orange',
        hsvMin: [10, 70, 50],
        hsvMax: [20, 255, 255],
        alertPriority: 'high',
      },
    ],
    priorityObjects: [
      'red_light',
      'yellow_light',
      'green_light',
      'stop_sign',
      'pedestrian',
      'cyclist',
      'child',
      'brake_light',
      'emergency_vehicle',
      'crosswalk',
      'construction_cone',
    ],
    useElevenLabs: true,
  },

  normal: {
    type: 'normal',
    name: 'Normal Vision',
    description: 'No color vision deficiency detected',
    problematicColors: [],
    detectColors: [],
    priorityObjects: [],
    useElevenLabs: false, // Use basic TTS for normal vision
  },

  unknown: {
    type: 'unknown',
    name: 'Unknown',
    description: 'Vision type not yet determined',
    problematicColors: ['red', 'green', 'yellow'], // Default to detecting all
    detectColors: [
      {
        name: 'red',
        hsvMin: [0, 70, 50],
        hsvMax: [10, 255, 255],
        alertPriority: 'critical',
      },
      {
        name: 'yellow',
        hsvMin: [20, 70, 50],
        hsvMax: [35, 255, 255],
        alertPriority: 'high',
      },
      {
        name: 'green',
        hsvMin: [35, 70, 50],
        hsvMax: [85, 255, 255],
        alertPriority: 'high',
      },
    ],
    priorityObjects: ['red_light', 'yellow_light', 'green_light', 'stop_sign', 'pedestrian'],
    useElevenLabs: true,
  },
};

/**
 * Get the color profile for a given colorblindness type
 */
export function getColorProfile(type: ColorblindnessType): ColorProfile {
  return COLOR_PROFILES[type] || COLOR_PROFILES.unknown;
}

/**
 * Check if a detected color is problematic for the user
 */
export function isProblematicColor(
  detectedColor: string,
  userType: ColorblindnessType
): boolean {
  const profile = getColorProfile(userType);
  return profile.problematicColors.includes(detectedColor.toLowerCase()) ||
         profile.problematicColors.includes('all');
}

/**
 * Get alert priority for a detected color
 */
export function getColorAlertPriority(
  detectedColor: string,
  userType: ColorblindnessType
): 'critical' | 'high' | 'medium' | 'low' | 'none' {
  const profile = getColorProfile(userType);
  const colorConfig = profile.detectColors.find(
    c => c.name.toLowerCase() === detectedColor.toLowerCase()
  );
  return colorConfig?.alertPriority || 'none';
}
