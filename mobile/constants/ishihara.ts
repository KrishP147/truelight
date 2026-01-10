/**
 * Ishihara-style Color Vision Test Data
 *
 * Based on standard Ishihara test plates and their known responses
 * for different types of color vision deficiency.
 *
 * Plate types:
 * - Vanishing: Number visible to normal, invisible to colorblind
 * - Transformation: Different number seen by colorblind vs normal
 * - Hidden digit: Number only visible to colorblind (not normal)
 * - Diagnostic: Different responses for protan vs deutan
 */

import { ColorblindnessType } from "./accessibility";

export interface TestPlate {
  id: number;
  // What someone with normal vision should see
  normalAnswer: string;
  // What someone with protanopia (red-blind) might see
  protanAnswer: string | null;
  // What someone with deuteranopia (green-blind) might see
  deutanAnswer: string | null;
  // What someone with tritanopia (blue-yellow blind) might see
  tritanAnswer: string | null;
  // Colors used in this plate (for rendering)
  backgroundColor: string;
  foregroundColor: string;
  // Multiple choice options to display
  options: string[];
  // Description for accessibility
  description: string;
  // Type of plate for scoring
  plateType: "vanishing" | "transformation" | "diagnostic";
}

export const TEST_PLATES: TestPlate[] = [
  // Plate 1: Demonstration plate - everyone should see 12
  {
    id: 1,
    normalAnswer: "12",
    protanAnswer: "12",
    deutanAnswer: "12",
    tritanAnswer: "12",
    backgroundColor: "#8BC34A",
    foregroundColor: "#E53935",
    options: ["12", "17", "21", "Can't see"],
    description: "A circle of colored dots with a number hidden inside",
    plateType: "vanishing",
  },
  // Plate 2: Vanishing - 8 visible to normal, hard for red-green blind
  {
    id: 2,
    normalAnswer: "8",
    protanAnswer: null,
    deutanAnswer: null,
    tritanAnswer: "8",
    backgroundColor: "#4CAF50",
    foregroundColor: "#F44336",
    options: ["8", "3", "6", "Can't see"],
    description: "A circle of colored dots with a number hidden inside",
    plateType: "vanishing",
  },
  // Plate 3: Vanishing - 6 visible to normal, hard for red-green blind
  {
    id: 3,
    normalAnswer: "6",
    protanAnswer: null,
    deutanAnswer: null,
    tritanAnswer: "6",
    backgroundColor: "#66BB6A",
    foregroundColor: "#EF5350",
    options: ["6", "5", "9", "Can't see"],
    description: "A circle of colored dots with a number hidden inside",
    plateType: "vanishing",
  },
  // Plate 4: Transformation - 29 for normal, 70 for red-green blind
  {
    id: 4,
    normalAnswer: "29",
    protanAnswer: "70",
    deutanAnswer: "70",
    tritanAnswer: "29",
    backgroundColor: "#81C784",
    foregroundColor: "#FF7043",
    options: ["29", "70", "26", "Can't see"],
    description: "A circle of colored dots with a number hidden inside",
    plateType: "transformation",
  },
  // Plate 5: Transformation - 57 for normal, 35 for red-green blind
  {
    id: 5,
    normalAnswer: "57",
    protanAnswer: "35",
    deutanAnswer: "35",
    tritanAnswer: "57",
    backgroundColor: "#AED581",
    foregroundColor: "#FF5722",
    options: ["57", "35", "53", "Can't see"],
    description: "A circle of colored dots with a number hidden inside",
    plateType: "transformation",
  },
  // Plate 6: Diagnostic - 5 for normal, protan sees 5, deutan sees nothing
  {
    id: 6,
    normalAnswer: "5",
    protanAnswer: "5",
    deutanAnswer: null,
    tritanAnswer: "5",
    backgroundColor: "#9CCC65",
    foregroundColor: "#8E24AA",
    options: ["5", "2", "8", "Can't see"],
    description: "A circle of colored dots with a number hidden inside",
    plateType: "diagnostic",
  },
  // Plate 7: Diagnostic - 3 for normal, protan sees nothing, deutan sees 3
  {
    id: 7,
    normalAnswer: "3",
    protanAnswer: null,
    deutanAnswer: "3",
    tritanAnswer: "3",
    backgroundColor: "#C5E1A5",
    foregroundColor: "#7B1FA2",
    options: ["3", "5", "8", "Can't see"],
    description: "A circle of colored dots with a number hidden inside",
    plateType: "diagnostic",
  },
  // Plate 8: Diagnostic - 15 for normal, protan sees 17, deutan sees 15
  {
    id: 8,
    normalAnswer: "15",
    protanAnswer: "17",
    deutanAnswer: "15",
    tritanAnswer: "15",
    backgroundColor: "#DCEDC8",
    foregroundColor: "#D32F2F",
    options: ["15", "17", "51", "Can't see"],
    description: "A circle of colored dots with a number hidden inside",
    plateType: "diagnostic",
  },
  // Plate 9: Diagnostic - 74 for normal, protan sees 21, deutan sees 74
  {
    id: 9,
    normalAnswer: "74",
    protanAnswer: "21",
    deutanAnswer: "74",
    tritanAnswer: "74",
    backgroundColor: "#F0F4C3",
    foregroundColor: "#E64A19",
    options: ["74", "21", "71", "Can't see"],
    description: "A circle of colored dots with a number hidden inside",
    plateType: "diagnostic",
  },
  // Plate 10: Tritanopia detection - uses blue/yellow confusion
  {
    id: 10,
    normalAnswer: "2",
    protanAnswer: "2",
    deutanAnswer: "2",
    tritanAnswer: null,
    backgroundColor: "#FFEB3B",
    foregroundColor: "#2196F3",
    options: ["2", "7", "4", "Can't see"],
    description: "A circle of colored dots with a number hidden inside",
    plateType: "vanishing",
  },
];

/**
 * Full 10-question test for comprehensive assessment
 */
export const QUICK_TEST_PLATE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export interface TestResponse {
  plateId: number;
  answer: string;
}

/**
 * Analyzes test responses to determine colorblindness type
 *
 * Scoring logic:
 * - Plate 1: Control plate, everyone should see 12
 * - Plates 2-3: Vanishing plates - if can't see, indicates red-green deficiency
 * - Plates 4-5: Transformation plates - seeing 70/35 indicates red-green deficiency
 * - Plates 6-9: Diagnostic plates - differentiate protan from deutan
 * - Plate 10: Tritanopia detection - if can't see, indicates blue-yellow deficiency
 */
export function analyzeColorVision(responses: TestResponse[]): {
  type: ColorblindnessType;
  confidence: "high" | "medium" | "low";
  description: string;
} {
  let normalScore = 0;
  let redGreenDeficiencyScore = 0;
  let protanScore = 0;
  let deutanScore = 0;
  let tritanScore = 0;
  let cantSeeCount = 0;

  for (const response of responses) {
    const plate = TEST_PLATES.find((p) => p.id === response.plateId);
    if (!plate) continue;

    const answer = response.answer.toLowerCase().trim();
    const isCantSee = answer.includes("can't see");

    if (isCantSee) {
      cantSeeCount++;
    }

    // Plate 1: Control - everyone should see 12
    if (plate.id === 1) {
      if (answer === "12") {
        normalScore++;
      } else if (isCantSee) {
        // Can't even see control plate - likely low vision
        cantSeeCount += 2; // Weight this more heavily
      }
      continue;
    }

    // Plate 10: Tritanopia detection
    if (plate.id === 10) {
      if (isCantSee || answer !== plate.normalAnswer.toLowerCase()) {
        tritanScore += 2;
      } else {
        normalScore++;
      }
      continue;
    }

    // Vanishing plates (2, 3): Can't see = red-green deficiency
    if (plate.plateType === "vanishing") {
      if (isCantSee) {
        redGreenDeficiencyScore += 2;
      } else if (answer === plate.normalAnswer.toLowerCase()) {
        normalScore++;
      }
      continue;
    }

    // Transformation plates (4, 5): Seeing alternate number = red-green deficiency
    if (plate.plateType === "transformation") {
      if (answer === plate.normalAnswer.toLowerCase()) {
        normalScore++;
      } else if (
        (plate.protanAnswer && answer === plate.protanAnswer.toLowerCase()) ||
        (plate.deutanAnswer && answer === plate.deutanAnswer.toLowerCase())
      ) {
        redGreenDeficiencyScore += 2;
      }
      continue;
    }

    // Diagnostic plates (6, 7, 8, 9): Differentiate protan vs deutan
    if (plate.plateType === "diagnostic") {
      // Check for normal answer
      if (answer === plate.normalAnswer.toLowerCase()) {
        normalScore++;
      }

      // Plate 6: Protan sees 5, deutan can't see
      if (plate.id === 6) {
        if (isCantSee) {
          deutanScore += 2;
        }
      }

      // Plate 7: Protan can't see, deutan sees 3
      if (plate.id === 7) {
        if (isCantSee) {
          protanScore += 2;
        }
      }

      // Plate 8: Protan sees 17, deutan sees 15
      if (plate.id === 8) {
        if (answer === "17") {
          protanScore += 2;
        }
      }

      // Plate 9: Protan sees 21, deutan sees 74
      if (plate.id === 9) {
        if (answer === "21") {
          protanScore += 2;
        }
      }
    }
  }

  const total = responses.length;

  // If user couldn't see most plates, classify as low vision
  if (cantSeeCount >= total * 0.5) {
    return {
      type: "low_vision",
      confidence: "high",
      description:
        "You may have difficulty seeing the test patterns. The app will use enhanced audio descriptions with position cues.",
    };
  }

  // Check for tritanopia (blue-yellow colorblindness) - rare but check first
  if (tritanScore >= 2 && redGreenDeficiencyScore < 2) {
    return {
      type: "tritanopia",
      confidence: tritanScore >= 3 ? "high" : "medium",
      description:
        "You may have blue-yellow color vision deficiency (tritanopia). The app will include position cues to help identify traffic signals.",
    };
  }

  // Strong normal vision - most answers match normal expectations
  if (normalScore >= total * 0.7 && redGreenDeficiencyScore < 2) {
    return {
      type: "normal",
      confidence: normalScore >= total * 0.8 ? "high" : "medium",
      description:
        "Your color vision appears normal. The app will use standard audio cues.",
    };
  }

  // Red-green colorblindness detected - now differentiate protan vs deutan
  if (redGreenDeficiencyScore >= 2) {
    // Use diagnostic plate scores to differentiate
    if (protanScore > deutanScore) {
      return {
        type: "protanopia",
        confidence: protanScore >= 3 ? "high" : "medium",
        description:
          "You may have protanopia (red color vision deficiency). The app will include position cues - red lights are always at the top.",
      };
    } else if (deutanScore > protanScore) {
      return {
        type: "deuteranopia",
        confidence: deutanScore >= 3 ? "high" : "medium",
        description:
          "You may have deuteranopia (green color vision deficiency). The app will include position cues - green lights are always at the bottom.",
      };
    } else {
      // Can't differentiate, but definitely red-green deficient
      // Default to deuteranopia as it's more common (6% vs 2% of males)
      return {
        type: "deuteranopia",
        confidence: "medium",
        description:
          "You may have red-green color vision deficiency. The app will include position cues to help identify traffic signals.",
      };
    }
  }

  // Inconclusive results - default to low_vision for safety
  return {
    type: "low_vision",
    confidence: "low",
    description:
      "We couldn't clearly determine your color vision type. For safety, the app will use enhanced audio descriptions with position cues.",
  };
}
