# ColourGuard

Devpost Link: https://devpost.com/software/truelight

ColourGuard is a mobile dashcam app designed to help people with color vision deficiency navigate safely. It uses real-time object detection to identify objects in the camera feed, analyzes their colors, and provides audio alerts when it detects something that might be difficult for the user to see based on their specific type of colorblindness.

The app runs object detection using YOLOv3-tiny through a Python backend, with a React Native frontend built on Expo. When objects are detected, the app checks if their colors fall within the user's problematic color range and announces them via text-to-speech. For users with low vision, alerts are prioritized by proximity rather than color.

## Tech Stack

The mobile app is built with Expo and React Native using TypeScript. The backend consists of a Next.js API proxy that forwards requests to a Python FastAPI service running YOLOv3 for object detection and OpenCV for color analysis. Audio alerts use ElevenLabs for natural-sounding voice, falling back to the device's built-in speech synthesis when unavailable.

## Setup

You'll need Node.js 18+, Python 3.8+, and the Expo Go app installed on your phone. Your computer and phone need to be on the same Wi-Fi network.

Start the Python detection service first:

```bash
cd python-detection
pip install -r requirements.txt
python main.py
```

Then start the Next.js backend:

```bash
cd backend
npm install
npm run dev
```

Finally, run the mobile app:

```bash
cd mobile
npm install
npx expo start
```

Create a `.env` file in the mobile directory with your computer's local IP address:

```
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000
EXPO_PUBLIC_ELEVENLABS_API_KEY=your_key_here
```

Scan the QR code with Expo Go to run the app on your phone.

## How It Works

The app captures frames from the camera and sends them to the backend for processing. The Python service runs YOLO detection to identify objects, then analyzes the colors present in each detection. Results are sent back to the app, which renders bounding boxes around detected objects and speaks alerts for anything containing colors the user might have trouble distinguishing.

The app supports various types of color vision deficiency including protanopia, deuteranopia, tritanopia, and their milder variants. There's also a low vision mode that prioritizes alerts based on how close objects are to the camera rather than their color.

## License

MIT
