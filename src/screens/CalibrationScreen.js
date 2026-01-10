import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import IshiharaTest from '../components/IshiharaTest';

const TESTS = [
  {
    id: 1,
    correctAnswer: '12',
    normalVision: '12',
    protanopia: '1',
    deuteranopia: '1',
    tritanopia: '12',
    description: 'Test for red-green colorblindness',
  },
  {
    id: 2,
    correctAnswer: '8',
    normalVision: '8',
    protanopia: '3',
    deuteranopia: '3',
    tritanopia: '8',
    description: 'Test for red-green colorblindness',
  },
  {
    id: 3,
    correctAnswer: '6',
    normalVision: '6',
    protanopia: 'none',
    deuteranopia: 'none',
    tritanopia: '6',
    description: 'Test for red-green colorblindness',
  },
  {
    id: 4,
    correctAnswer: '45',
    normalVision: '45',
    protanopia: 'none',
    deuteranopia: 'none',
    tritanopia: '45',
    description: 'Test for red-green colorblindness',
  },
  {
    id: 5,
    correctAnswer: '5',
    normalVision: '5',
    protanopia: '5',
    deuteranopia: '5',
    tritanopia: 'none',
    description: 'Test for blue-yellow colorblindness',
  },
];

export default function CalibrationScreen({ onCalibrationComplete }) {
  const [currentTest, setCurrentTest] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [userInput, setUserInput] = useState('');

  const handleSubmitAnswer = (answer) => {
    const newAnswers = [...answers, { testId: TESTS[currentTest].id, answer }];
    setAnswers(newAnswers);
    setUserInput('');

    if (currentTest < TESTS.length - 1) {
      setCurrentTest(currentTest + 1);
    } else {
      // Calculate colorblindness type
      const type = determineColorblindnessType(newAnswers);
      Alert.alert(
        'Calibration Complete',
        `Detected type: ${type}\n\nThis will help customize hazard warnings for you.`,
        [
          {
            text: 'Continue',
            onPress: () => onCalibrationComplete(type),
          },
        ]
      );
    }
  };

  const determineColorblindnessType = (userAnswers) => {
    let protanopiaScore = 0;
    let deuteranopiaScore = 0;
    let tritanopiaScore = 0;
    let normalScore = 0;

    userAnswers.forEach((userAnswer) => {
      const test = TESTS.find((t) => t.id === userAnswer.testId);
      if (!test) return;

      const answer = userAnswer.answer.toLowerCase();
      
      if (answer === test.protanopia.toLowerCase()) protanopiaScore++;
      if (answer === test.deuteranopia.toLowerCase()) deuteranopiaScore++;
      if (answer === test.tritanopia.toLowerCase()) tritanopiaScore++;
      if (answer === test.normalVision.toLowerCase()) normalScore++;
    });

    // Determine the type based on scores
    if (normalScore >= 4) return 'Normal Vision';
    if (protanopiaScore >= 3) return 'Protanopia (Red-Blind)';
    if (deuteranopiaScore >= 3) return 'Deuteranopia (Green-Blind)';
    if (tritanopiaScore >= 2) return 'Tritanopia (Blue-Blind)';
    
    // Default to most common type if unclear
    return 'Deuteranopia (Green-Blind)';
  };

  const handleSkipCalibration = () => {
    Alert.alert(
      'Skip Calibration?',
      'You can skip calibration, but warnings may be less accurate. Default to deuteranopia (most common)?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: () => onCalibrationComplete('Deuteranopia (Green-Blind)'),
        },
      ]
    );
  };

  const options = ['none', '1', '2', '3', '5', '6', '8', '12', '45'];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Colorblindness Calibration</Text>
        <Text style={styles.subtitle}>
          Test {currentTest + 1} of {TESTS.length}
        </Text>
        <Text style={styles.instruction}>
          What number do you see in the circle below?
        </Text>

        <IshiharaTest testId={TESTS[currentTest].id} />

        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                userInput === option && styles.optionButtonSelected,
              ]}
              onPress={() => handleSubmitAnswer(option)}
            >
              <Text
                style={[
                  styles.optionText,
                  userInput === option && styles.optionTextSelected,
                ]}
              >
                {option === 'none' ? 'No number visible' : option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkipCalibration}
        >
          <Text style={styles.skipButtonText}>Skip Calibration</Text>
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          {TESTS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index <= currentTest && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ecf0f1',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  instruction: {
    fontSize: 18,
    color: '#34495e',
    marginBottom: 30,
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
    marginTop: 30,
  },
  optionButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#bdc3c7',
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#3498db',
    borderColor: '#2980b9',
  },
  optionText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#fff',
  },
  skipButton: {
    marginTop: 20,
    padding: 10,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#95a5a6',
    textDecorationLine: 'underline',
  },
  progressContainer: {
    flexDirection: 'row',
    marginTop: 30,
    gap: 10,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#bdc3c7',
  },
  progressDotActive: {
    backgroundColor: '#3498db',
  },
});
