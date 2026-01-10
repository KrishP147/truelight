# Delta - Colorblind Hazard Detection App

An Expo React Native application that helps colorblind users detect safety hazards in real-time using computer vision and provides audio warnings.

## Features

### 1. Calibration Screen
- Ishihara-style colorblindness tests to determine user's type
- Detects protanopia (red-blind), deuteranopia (green-blind), and tritanopia (blue-blind)
- Interactive test with 5 different plates
- Option to skip calibration with default settings

### 2. Real-time Hazard Detection
- Camera view with live processing
- Detects multiple safety hazards:
  - Traffic lights (red, yellow, green)
  - Stop signs
  - Brake lights
  - Emergency vehicles
- Visual indicators overlaid on camera feed

### 3. Adaptive Audio Warnings
- Text-to-speech warnings customized based on colorblindness type
- Enhanced warnings for colors that users cannot distinguish
- Clear, actionable instructions

### 4. Speed-based Warning Timing
- Automatic speed detection using GPS
- Adjusts warning frequency based on movement mode:
  - Walking (< 5 km/h): 5-second intervals
  - Biking (5-25 km/h): 3-second intervals
  - Driving (> 25 km/h): 1.5-second intervals

## Installation

### Prerequisites
- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Setup
```bash
# Install dependencies
npm install

# Start the development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Architecture

### Screens
- **CalibrationScreen**: Ishihara test interface for determining colorblindness type
- **CameraScreen**: Real-time camera view with hazard detection and warnings

### Components
- **IshiharaTest**: Renders Ishihara-style color plates using SVG

### Utilities
- **HazardDetector**: Computer vision processing for hazard detection
  - In production: Uses TensorFlow Lite for object detection
  - Current: Simulated detection for demonstration
- **SpeedDetector**: GPS-based speed tracking for warning timing

## Technologies Used

- **Expo** (~51.0.0): React Native framework
- **expo-camera**: Camera access and capture
- **expo-speech**: Text-to-speech for audio warnings
- **expo-location**: GPS for speed detection
- **react-navigation**: Screen navigation
- **react-native-svg**: Ishihara test rendering

Note: TensorFlow Lite integration is planned for production implementation. Current version uses simulated hazard detection for demonstration purposes.

## Production Implementation Notes

For a production-ready application, the following enhancements are needed:

1. **TensorFlow Lite Integration**
   - Train custom models for traffic light, stop sign, and vehicle detection
   - Implement real-time inference on camera frames
   - Optimize model for mobile devices

2. **Enhanced Hazard Detection**
   - Implement actual color detection algorithms
   - Add temporal filtering for stable detection
   - Use multiple detection methods (color, shape, OCR)

3. **Improved Speed Detection**
   - Combine GPS with accelerometer data
   - Add Kalman filtering for smooth speed estimates
   - Handle GPS signal loss gracefully

4. **User Preferences**
   - Save calibration results
   - Customizable warning settings
   - Volume and speech rate controls

5. **Testing & Validation**
   - Field testing with colorblind users
   - Accuracy metrics for hazard detection
   - Performance optimization

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
