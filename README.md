# TrueLight - Intelligent Vision Assistant

An accessibility-first mobile application that helps color-blind and visually impaired users safely navigate their environment through AI-powered detection, real-time audio feedback, and voice commands.

## The Problem

Traffic signals and many everyday objects rely heavily on color to communicate critical information. For the estimated 300 million people worldwide with color vision deficiency, and many more with low vision, distinguishing certain colors can be challenging and potentially dangerous.

## The Solution

TrueLight uses your phone's camera to detect traffic signals and objects in real-time, providing clear, immediate audio feedback customized for your specific type of color vision.

### Key Features

- **AI Assistant "Sierra"**: Ask questions about your surroundings using natural voice commands
- **Multi-Object Detection**: Detects traffic signals, signs, vehicles, and other hazards
- **Colorblindness-Aware**: Takes a vision assessment to customize feedback for your specific color profile
- **Natural Voice (ElevenLabs)**: Uses ElevenLabs TTS for natural voice output on critical alerts
- **Bounding Box Overlay**: Visual brackets around detected objects, color-coded for problematic colors
- **Position Cues**: Announces the position of signals for users with red-green colorblindness
- **Hands-Free Interaction**: Voice commands with wake words ("Hey TrueLight", "Sierra")
- **Offline Audio**: Falls back to device TTS for reliable, instant feedback

## Voice Commands

Say "Hey TrueLight" or "Sierra" followed by:
- **"What do you see?"** - Get a detailed scene description
- **"What color is the light?"** - Quick signal check
- **"Can I cross?"** - Check if it's safe to proceed
- **"Help"** - List available commands

## How Accessibility is Addressed

### Visual Accessibility
- **High Contrast Colors**: WCAG AAA compliant color contrast
- **Large Touch Targets**: All buttons exceed 48dp minimum
- **Dark Background**: Reduces eye strain and glare
- **Pattern Differentiation**: Uses shapes (■ ● ◆) in addition to colors

### Colorblindness Support
- **Quick Vision Test**: Simplified Ishihara-style assessment identifies colorblindness type
- **Customized Feedback**: Tailored audio messages based on vision profile
- **Position Indicators**: Visual indicator showing which light position is active (top=red, middle=yellow, bottom=green)
- **Adjusted Colors**: Uses colorblind-friendly color palette when applicable

### Audio Accessibility  
- **Instant Feedback**: No network latency - uses device TTS
- **Smart Debouncing**: Avoids repetitive announcements of same state
- **Clear Speech**: Optimized rate and pitch for clarity
- **State-Specific Voice**: Different vocal characteristics for stop vs. go

## Architecture

```
delta/
├── python-detection/      # Python FastAPI detection service
│   ├── main.py           # FastAPI server endpoints
│   ├── detector.py       # YOLO + OpenCV detection logic
│   ├── requirements.txt  # Python dependencies
│   └── models/           # YOLOv3-tiny model files
│
├── backend/              # Next.js API proxy
│   ├── app/api/         # API routes
│   │   ├── detect/      # Detection endpoint (proxies to Python)
│   │   ├── health/      # Health check
│   │   └── tts/         # ElevenLabs TTS (optional)
│   └── lib/             # Utility functions
│
└── mobile/              # Expo React Native app
    ├── app/            # Expo Router screens
    │   ├── index.tsx  # Welcome/onboarding
    │   ├── test.tsx   # Color vision assessment
    │   └── camera.tsx # Main detection screen
    ├── components/     # Reusable UI components
    │   ├── CameraView.tsx          # Camera & frame capture
    │   ├── BoundingBoxOverlay.tsx  # Visual detection overlay
    │   └── SignalDisplay.tsx       # Traffic light UI
    ├── services/       # Business logic
    │   ├── api.ts              # Backend API client
    │   ├── MLService.ts        # Detection orchestration
    │   ├── aiAssistant.ts      # Gemini voice commands
    │   └── AudioAlertService.ts # TTS & alerts
    └── constants/      # Accessibility config
```

## Technical Approach

### Why HSV Color Detection (not ML)?

For this hackathon, we chose color-based detection over machine learning because:

1. **Instant Startup**: No model loading time
2. **Predictable Behavior**: Easier to debug and demo
3. **No Dependencies**: Works without external APIs
4. **Sufficient for Demo**: Traffic light colors are standardized worldwide

**Tradeoff**: Less robust to unusual lighting. In production, we'd combine this with YOLO object detection to first locate traffic lights, then analyze colors within those bounding boxes.

### Frame Capture Strategy

- Captures every 800ms to balance responsiveness vs. battery
- Compresses to 30% quality for fast upload
- Backend responds in <100ms typically

### Audio Debouncing

- Only announces state changes (not repeated states)
- 2-second minimum between announcements of same state
- Immediate announcement of new states

## How to Run Locally

### Prerequisites

- **Node.js 18+** and npm
- **Python 3.8+** with pip
- **Expo Go** app installed on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- Computer and phone on the **same Wi-Fi network**

### Environment Variables Setup

#### 1. Backend Environment Variables

Create `backend/.env`:
```bash
# Python Detection Service URL
PYTHON_DETECTION_URL=http://localhost:8000

# Optional: ElevenLabs for natural TTS (optional - falls back to expo-speech)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Optional: Roboflow for additional object detection (optional - not currently used)
ROBOFLOW_API_KEY=your_roboflow_api_key_here

# JWT Secret (change in production)
JWT_SECRET=your-secret-key-change-this-in-production
```

#### 2. Mobile Environment Variables

Create `mobile/.env`:
```bash
# Your computer's local IP address (see instructions below)
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000

# Google Gemini API for AI Assistant "Sierra" (optional)
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

**To find your local IP address:**

**Windows:**
```bash
ipconfig
# Look for "IPv4 Address" under your Wi-Fi adapter (e.g., 192.168.1.100)
```

**macOS/Linux:**
```bash
ifconfig | grep "inet "
# or
ipconfig getifaddr en0
```

**Example:** If your IP is `192.168.1.100`, set:
```bash
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

### Running the Application

You need to start **three services** in separate terminals:

#### Terminal 1: Python Detection Service

```bash
cd python-detection

# Install Python dependencies (first time only)
pip install -r requirements.txt

# Download YOLO model (first time only - ~240MB)
# The model will auto-download on first run, or manually:
# Place yolov3-tiny.weights and yolov3-tiny.cfg in models/

# Start the Python detection service
python main.py
```

The Python service runs at `http://localhost:8000`

**Verify it's working:**
```bash
curl http://localhost:8000/health
# Should return: {"status": "healthy", "yolo_loaded": true}
```

#### Terminal 2: Next.js Backend

```bash
cd backend

# Install dependencies (first time only)
npm install

# Start the Next.js backend
npm run dev
```

The backend runs at `http://localhost:3000`

**Verify it's working:**
```bash
curl http://localhost:3000/api/health
# Should return: {"status": "ok", "timestamp": "..."}
```

#### Terminal 3: Expo Mobile App

```bash
cd mobile

# Install dependencies (first time only)
npm install

# Start Expo with cache cleared
npx expo start --clear
```

**On your phone:**
1. Open **Expo Go** app
2. Scan the QR code shown in the terminal
3. Wait for the app to load

### First-Time Setup

When you first run the app:

1. **Grant Permissions**: Allow camera and microphone access
2. **Complete Vision Test** (optional): Take the quick color vision assessment
3. **Start Detection**: Navigate to the camera screen

### Using the App

1. Point your camera at objects or traffic signals
2. Bounding boxes will appear around detected objects
3. Audio alerts will announce detected hazards
4. Use voice commands: "Hey TrueLight" or "Sierra" + your question

## Troubleshooting

### Python Service Issues

**Problem:** "YOLO model not loaded"
```bash
# Download the YOLOv3-tiny model manually
cd python-detection/models
# Download from: https://pjreddie.com/media/files/yolov3-tiny.weights
# And: https://github.com/pjreddie/darknet/blob/master/cfg/yolov3-tiny.cfg
```

**Problem:** Port 8000 already in use
```bash
# Windows: Find and kill the process
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:8000 | xargs kill -9
```

### Backend Issues

**Problem:** Can't connect to Python service
- Ensure Python service is running on port 8000
- Check `PYTHON_DETECTION_URL` in `backend/.env`
- Verify with: `curl http://localhost:8000/health`

**Problem:** Port 3000 already in use
```bash
# Change the port in package.json or kill the process
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Mobile App Issues

**Problem:** "Network request failed"
- Verify phone and computer are on the **same Wi-Fi network**
- Check that `EXPO_PUBLIC_API_URL` uses your computer's **local IP** (not localhost)
- Disable any VPN or firewall blocking port 3000
- Try pinging your computer from your phone

**Problem:** No detections showing
- Check Python service logs for errors
- Ensure camera permissions are granted
- Point camera at well-lit, clear objects
- Check mobile app console logs in Expo

**Problem:** No audio alerts
- Ensure microphone permission is granted (for voice commands)
- Check device volume
- Try toggling voice provider in settings

### General Tips

- **Reload app**: Press `r` in the Expo terminal
- **Clear cache**: Use `npx expo start --clear`
- **Check logs**: Look at all three terminal windows for errors
- **Test API**: Use curl commands above to verify services

## Demo Tips

- For indoor testing, display traffic light images on a monitor
- Ensure good lighting for best detection
- Hold phone steady and point directly at objects
- The app processes frames every 1.5-2 seconds
- Bounding boxes appear in real-time as objects are detected

## Tech Stack

- **Mobile**: Expo SDK 51+, React Native, TypeScript, Expo Camera, Expo Speech
- **Backend**: Next.js 15, TypeScript, App Router
- **Detection Service**: Python 3.8+, FastAPI, OpenCV, YOLOv3-tiny, NumPy
- **AI**: Google Gemini 2.5 Flash (scene analysis via voice commands)
- **Audio**: Expo Speech (primary), ElevenLabs TTS (optional)
- **State Management**: Zustand + AsyncStorage
- **Deployment**: Local development (production: Vercel for backend, Expo Go for mobile)

## Required API Keys (Optional)

All features work without API keys, but these enhance the experience:

| Service | Purpose | How to Get | Free Tier | Required? |
|---------|---------|------------|-----------|-----------|
| [Google AI Studio](https://aistudio.google.com) | AI Assistant "Sierra" | Create project, get API key | Free tier available | No - voice features disabled without it |
| [ElevenLabs](https://elevenlabs.io) | Natural TTS voice | Sign up, get API key | 10,000 chars/month | No - falls back to Expo Speech |
| [Roboflow](https://roboflow.com) | Additional object detection | Create account, get API key | 10,000 calls/month | No - currently not used |

**Without API keys:**
- ✅ Object detection works (YOLO + OpenCV)
- ✅ Audio alerts work (Expo Speech)
- ✅ Bounding boxes work
- ❌ Voice commands disabled ("Hey TrueLight")
- ❌ Natural voice disabled (uses robotic TTS)

## Hackathon Tradeoffs

To ship in 24 hours, we made these conscious tradeoffs:

| Decision | Tradeoff | Why |
|----------|----------|-----|
| Color detection vs ML | Less robust | Faster, no dependencies |
| Expo Speech vs ElevenLabs | Less natural voice | Works offline, instant |
| In-memory storage | Resets on restart | Simpler, no database |
| 3-plate vision test | Less accurate | Faster onboarding |

## Future Improvements

- [ ] Continuous voice listening with wake word detection
- [ ] Facial recognition for familiar people
- [ ] Pedestrian signal detection (walk/don't walk)
- [ ] Persistent user preferences in cloud
- [ ] Apple Watch / WearOS companion app
- [ ] Haptic feedback option
- [ ] Multi-language support

## License

MIT

---

Built with ❤️ for accessibility | **TrueLight** - See the world clearly
