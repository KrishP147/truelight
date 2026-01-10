#!/usr/bin/env node

/**
 * Simple validation script to check app structure
 */

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'App.js',
  'app.json',
  'package.json',
  'babel.config.js',
  'src/screens/CalibrationScreen.js',
  'src/screens/CameraScreen.js',
  'src/components/IshiharaTest.js',
  'src/utils/HazardDetector.js',
  'src/utils/SpeedDetector.js',
];

const requiredDependencies = [
  'expo',
  'expo-camera',
  'expo-speech',
  'expo-sensors',
  'expo-location',
  'react',
  'react-native',
  '@react-navigation/native',
  '@react-navigation/stack',
  'react-native-svg',
];

console.log('🔍 Validating app structure...\n');

let allValid = true;

// Check required files
console.log('📁 Checking required files:');
requiredFiles.forEach((file) => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allValid = false;
});

console.log('\n📦 Checking dependencies:');
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8')
);
const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

requiredDependencies.forEach((dep) => {
  const exists = dependencies.hasOwnProperty(dep);
  console.log(`  ${exists ? '✅' : '❌'} ${dep}`);
  if (!exists) allValid = false;
});

console.log('\n📱 App Configuration:');
const appJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'app.json'), 'utf-8')
);
console.log(`  ✅ App Name: ${appJson.expo.name}`);
console.log(`  ✅ Slug: ${appJson.expo.slug}`);
console.log(`  ✅ Version: ${appJson.expo.version}`);

if (appJson.expo.ios && appJson.expo.ios.infoPlist) {
  console.log('  ✅ iOS Camera Permission: Configured');
}
if (appJson.expo.android && appJson.expo.android.permissions) {
  console.log('  ✅ Android Permissions: Configured');
}

console.log('\n' + (allValid ? '✅ All checks passed!' : '❌ Some checks failed'));

process.exit(allValid ? 0 : 1);
