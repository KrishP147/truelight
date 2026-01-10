/**
 * Color Vision Test Screen
 *
 * Ishihara-style test that determines colorblindness type
 * Returns to main page with result selected
 */

import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SIZES, ColorblindnessType } from "../constants/accessibility";
import {
  TEST_PLATES,
  QUICK_TEST_PLATE_IDS,
  TestResponse,
  analyzeColorVision,
} from "../constants/ishihara";
import { ColorTestPlate } from "../components/ColorTestPlate";
import { setColorblindType, completeOnboarding } from "../services/storage";
import { speak } from "../services/speech";

export default function ColorTestScreen() {
  const router = useRouter();
  const [currentPlateIndex, setCurrentPlateIndex] = useState(0);
  const [responses, setResponses] = useState<TestResponse[]>([]);
  const [testComplete, setTestComplete] = useState(false);
  const [resultType, setResultType] = useState<ColorblindnessType>("unknown");

  const testPlates = QUICK_TEST_PLATE_IDS.map(
    (id) => TEST_PLATES.find((p) => p.id === id)!,
  );
  const currentPlate = testPlates[currentPlateIndex];
  const isLastPlate = currentPlateIndex === testPlates.length - 1;
  const progress = ((currentPlateIndex + 1) / testPlates.length) * 100;

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const shuffledOptions = useMemo(
    () => shuffleArray(currentPlate.options),
    [currentPlate.id],
  );

  const handleSelectOption = (option: string) => {
    const newResponses: TestResponse[] = [
      ...responses,
      { plateId: currentPlate.id, answer: option },
    ];
    setResponses(newResponses);

    if (isLastPlate) {
      finishTest(newResponses);
    } else {
      setCurrentPlateIndex(currentPlateIndex + 1);
      speak(`Plate ${currentPlateIndex + 2} of ${testPlates.length}`);
    }
  };

  const finishTest = (finalResponses: TestResponse[]) => {
    const result = analyzeColorVision(finalResponses);

    // Save result
    setColorblindType(result.type);
    completeOnboarding();

    // Show result screen
    setResultType(result.type);
    setTestComplete(true);

    // Announce result
    speak(`Test complete. ${result.description}`);
  };

  const handleContinue = () => {
    router.replace("/");
  };

  // Result screen
  if (testComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultContent}>
          <Text style={styles.resultTitle}>Test Complete</Text>

          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Your vision type</Text>
            <Text style={styles.resultValue}>
              {getVisionTypeLabel(resultType)}
            </Text>
            <Text style={styles.resultDescription}>
              {getVisionTypeDescription(resultType)}
            </Text>
          </View>

          <Text style={styles.resultNote}>
            This has been saved. You can change it anytime from the main screen.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={handleContinue}
            accessibilityRole="button"
            accessibilityLabel="Continue to main screen"
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Test screen
  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.stepText}>
            {currentPlateIndex + 1} of {testPlates.length}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Question */}
        <Text style={styles.question}>What number do you see?</Text>

        {/* Ishihara plate */}
        <View style={styles.plateContainer}>
          <ColorTestPlate plate={currentPlate} />
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {shuffledOptions.map((option, index) => (
            <Pressable
              key={index}
              style={styles.optionButton}
              onPress={() => handleSelectOption(option)}
              accessibilityRole="button"
              accessibilityLabel={option}
            >
              <Text style={styles.optionText}>{option}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getVisionTypeLabel(type: ColorblindnessType): string {
  switch (type) {
    case "normal":
      return "Normal Vision";
    case "protanopia":
      return "Protanopia";
    case "deuteranopia":
      return "Deuteranopia";
    case "tritanopia":
      return "Tritanopia";
    case "low_vision":
      return "Low Vision";
    default:
      return "Unknown";
  }
}

function getVisionTypeDescription(type: ColorblindnessType): string {
  switch (type) {
    case "normal":
      return "You have normal color vision. The app will use standard audio cues.";
    case "protanopia":
      return "You have difficulty seeing red colors. The app will include position cues in announcements.";
    case "deuteranopia":
      return "You have difficulty seeing green colors. The app will include position cues in announcements.";
    case "tritanopia":
      return "You have difficulty with blue and yellow colors. The app will include position cues in announcements.";
    case "low_vision":
      return "The app will use full audio descriptions with position cues.";
    default:
      return "The app will adapt to help you navigate traffic signals.";
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SIZES.spacingLarge,
    paddingTop: 60,
  },
  header: {
    marginBottom: SIZES.spacingLarge,
  },
  stepText: {
    fontSize: SIZES.textSmall,
    color: COLORS.textSecondary,
    marginBottom: SIZES.spacingSmall,
  },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.textPrimary,
    borderRadius: 2,
  },
  question: {
    fontSize: SIZES.textLarge,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SIZES.spacingLarge,
  },
  plateContainer: {
    alignItems: "center",
    marginBottom: SIZES.spacingLarge,
  },
  optionsContainer: {
    gap: SIZES.spacingSmall,
  },
  optionButton: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingVertical: SIZES.buttonPadding,
    paddingHorizontal: SIZES.spacingLarge,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  optionText: {
    color: COLORS.textPrimary,
    fontSize: SIZES.textLarge,
    fontWeight: "600",
  },
  // Result screen styles
  resultContent: {
    flex: 1,
    padding: SIZES.spacingLarge,
    paddingTop: 100,
  },
  resultTitle: {
    fontSize: SIZES.textXL,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SIZES.spacingLarge * 1.5,
    letterSpacing: -1,
  },
  resultCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.spacingLarge,
    marginBottom: SIZES.spacingLarge,
  },
  resultLabel: {
    fontSize: SIZES.textSmall,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  resultValue: {
    fontSize: SIZES.textLarge,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SIZES.spacingSmall,
  },
  resultDescription: {
    fontSize: SIZES.textSmall,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  resultNote: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SIZES.spacingLarge * 2,
    opacity: 0.7,
  },
  primaryButton: {
    backgroundColor: COLORS.buttonBackground,
    paddingVertical: SIZES.buttonPadding,
    paddingHorizontal: SIZES.spacingLarge,
    borderRadius: SIZES.borderRadius,
    alignItems: "center",
  },
  primaryButtonText: {
    color: COLORS.buttonText,
    fontSize: SIZES.textMedium,
    fontWeight: "600",
  },
});
