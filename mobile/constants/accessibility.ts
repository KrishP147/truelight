/**
 * Accessibility Constants
 *
 * Dark mode design - clean, minimal, no gradients
 * Sharp corners, white text on dark backgrounds
 * 
 * ADAPTIVE COLOR SYSTEM:
 * Colors automatically adapt based on user's colorblindness type
 * to ensure all UI elements are visible and distinguishable.
 */

/**
 * Colorblindness Types
 * Common medical terms for color vision deficiencies
 */
export type ColorblindnessType =
  | "normal"
  | "protanopia"     // Red-blind (severe) - most common
  | "protanomaly"    // Red-weak (mild)
  | "deuteranopia"   // Green-blind (severe) - most common
  | "deuteranomaly"  // Green-weak (mild) - most common overall
  | "tritanopia"     // Blue-yellow blind (rare)
  | "low_vision"     // General low vision
  | "unknown";

/**
 * Base colors - used as fallback and for normal vision
 */
const BASE_COLORS = {
  // Background - dark mode
  background: "#0A0A0B",
  backgroundSecondary: "#121214",
  backgroundTertiary: "#1A1A1E",

  // Text - white/light for dark mode
  textPrimary: "#FFFFFF",
  textSecondary: "#A0A0A8",
  textMuted: "#6B6B73",

  // UI elements
  border: "#2A2A30",
  borderLight: "#3A3A42",
  buttonBackground: "#FFFFFF",
  buttonText: "#0A0A0B",

  // Standard signal colors (for normal vision)
  red: "#EF4444",
  yellow: "#F59E0B",
  green: "#10B981",
  orange: "#FF6B35",
  unknown: "#6B7280",

  // Accent
  accent: "#FF6B35",
  accentDim: "rgba(255, 107, 53, 0.2)",
  
  // Alert colors
  alertPrimary: "#FF3366",    // Default alert (red-pink)
  alertSecondary: "#00FF88",  // Active/locked target (green)
};

/**
 * Adaptive color palettes for different colorblindness types
 * These replace problematic colors with ones the user can see
 */
const ADAPTIVE_PALETTES: Record<ColorblindnessType, Partial<typeof BASE_COLORS>> = {
  normal: {},
  
  // Red-blind: Replace reds with cyan/blue tones
  protanopia: {
    red: "#00CED1",           // Cyan instead of red
    alertPrimary: "#00BFFF",  // Deep sky blue for alerts (not red!)
    accent: "#00CED1",        // Cyan accent
    accentDim: "rgba(0, 206, 209, 0.2)",
    orange: "#FFD700",        // Gold (more yellow)
  },
  
  // Red-weak: Similar to protanopia but less severe
  protanomaly: {
    red: "#20B2AA",           // Light sea green
    alertPrimary: "#00CED1",  // Cyan for alerts
    accent: "#20B2AA",
    accentDim: "rgba(32, 178, 170, 0.2)",
  },
  
  // Green-blind: Replace greens with blue/purple tones  
  deuteranopia: {
    green: "#9370DB",         // Medium purple instead of green
    alertPrimary: "#FF69B4",  // Hot pink for alerts (they can see pink)
    accent: "#FF69B4",        // Pink accent
    accentDim: "rgba(255, 105, 180, 0.2)",
    alertSecondary: "#9370DB", // Purple for active target
  },
  
  // Green-weak: Similar but less severe
  deuteranomaly: {
    green: "#8A2BE2",         // Blue violet
    alertPrimary: "#FF69B4",  // Hot pink
    accent: "#DA70D6",        // Orchid
    accentDim: "rgba(218, 112, 214, 0.2)",
  },
  
  // Blue-yellow blind: Replace blues with red/magenta, yellows with pink
  tritanopia: {
    yellow: "#FF6B9D",        // Pink instead of yellow
    alertPrimary: "#FF4500",  // Orange-red for alerts (not blue)
    accent: "#FF4500",        // Orange-red
    accentDim: "rgba(255, 69, 0, 0.2)",
    alertSecondary: "#FF6B9D", // Pink for active
  },
  
  // Low vision: High contrast, larger elements
  low_vision: {
    alertPrimary: "#FFFF00",  // Bright yellow (high contrast)
    accent: "#FFFF00",
    accentDim: "rgba(255, 255, 0, 0.3)",
    textSecondary: "#CCCCCC", // Brighter secondary text
  },
  
  unknown: {},
};

/**
 * Get adaptive colors based on user's colorblindness type
 */
export function getAdaptiveColors(colorblindType: ColorblindnessType = 'normal') {
  const adaptations = ADAPTIVE_PALETTES[colorblindType] || {};
  return { ...BASE_COLORS, ...adaptations };
}

/**
 * Default COLORS export - uses base colors
 * Components should use getAdaptiveColors() when colorblind type is known
 */
export const COLORS = BASE_COLORS;

export const SIZES = {
  // Text sizes - clean hierarchy
  textXL: 42,
  textLarge: 28,
  textMedium: 18,
  textSmall: 15,

  // Touch targets - minimum 48dp for accessibility
  touchTarget: 48,
  buttonPadding: 16,

  // Spacing - generous for minimalist feel
  spacingLarge: 32,
  spacingMedium: 16,
  spacingSmall: 8,

  // Border radius - sharp corners, no rounding
  borderRadius: 0,
};

export const TIMING = {
  // Frame capture interval (ms) - local detection is fast, can be frequent
  captureInterval: 1000, // 1 second - local detection is fast

  // Debounce for audio announcements (ms) - avoid repeating same state
  audioDebounce: 2500,

  // Minimum confidence to announce (0-1)
  minConfidenceToAnnounce: 0.5,

  // API timeout (ms)
  apiTimeout: 8000,
};

export type SignalState = "red" | "yellow" | "green" | "flashing" | "unknown";

/**
 * Common colorblindness type labels for UI display
 * Uses medical/common names, not "can't see X" descriptions
 */
export const COLORBLINDNESS_LABELS: Record<ColorblindnessType, { name: string; description: string }> = {
  normal: {
    name: "Normal Vision",
    description: "Standard color perception",
  },
  protanopia: {
    name: "Protanopia",
    description: "Red-blind color vision (most common type)",
  },
  protanomaly: {
    name: "Protanomaly", 
    description: "Red-weak color vision (mild form)",
  },
  deuteranopia: {
    name: "Deuteranopia",
    description: "Green-blind color vision (most common type)",
  },
  deuteranomaly: {
    name: "Deuteranomaly",
    description: "Green-weak color vision (most common overall)",
  },
  tritanopia: {
    name: "Tritanopia",
    description: "Blue-yellow color vision (rare)",
  },
  low_vision: {
    name: "Low Vision",
    description: "General visual impairment, uses full audio cues",
  },
  unknown: {
    name: "Not Set",
    description: "Take the test to determine your vision type",
  },
};

/**
 * Signal messages tailored to colorblindness type
 *
 * For users with red-green colorblindness, we add position cues
 * (top/middle/bottom) since traffic lights are arranged vertically.
 */
export const getSignalMessage = (
  state: SignalState,
  colorblindType: ColorblindnessType,
): string => {
  const needsPositionCues =
    colorblindType === "protanopia" ||
    colorblindType === "protanomaly" ||
    colorblindType === "deuteranopia" ||
    colorblindType === "deuteranomaly" ||
    colorblindType === "low_vision";

  const messages: Record<SignalState, { standard: string; enhanced: string }> =
    {
      red: {
        standard: "Red light. Stop.",
        enhanced: "Red light at top. Stop.",
      },
      yellow: {
        standard: "Yellow light. Prepare to stop.",
        enhanced: "Yellow light in middle. Prepare to stop.",
      },
      green: {
        standard: "Green light. Safe to proceed.",
        enhanced: "Green light at bottom. Safe to proceed.",
      },
      flashing: {
        standard: "Warning. Flashing signal.",
        enhanced: "Warning. Flashing signal. Proceed with caution.",
      },
      unknown: {
        standard: "",
        enhanced: "",
      },
    };

  return needsPositionCues
    ? messages[state].enhanced
    : messages[state].standard;
};

/**
 * UI adjustments based on colorblindness type
 */
export const getColorblindAdjustments = (type: ColorblindnessType) => {
  switch (type) {
    case "protanopia":
    case "protanomaly":
    case "deuteranopia":
    case "deuteranomaly":
      // For red-green colorblindness: use patterns/shapes in addition to color
      return {
        usePatterns: true,
        redColor: "#FF6B6B", // Warmer red
        greenColor: "#4ECDC4", // More blue-green (teal)
        showPositionIndicator: true,
      };
    case "tritanopia":
      // For blue-yellow colorblindness: adjust yellow
      return {
        usePatterns: true,
        yellowColor: "#FFA500", // More orange
        showPositionIndicator: true,
      };
    case "low_vision":
      return {
        usePatterns: true,
        showPositionIndicator: true,
        extraLargeText: true,
        highContrast: true,
      };
    default:
      return {
        usePatterns: false,
        showPositionIndicator: false,
      };
  }
};
