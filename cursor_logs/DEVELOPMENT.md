# Development Guide

## Quick Start - Prototyping Mode 🚀

### Initial Setup (Run Once)
```bash
npm run warmup
# or
./warmup.sh
```

This script will:
- ✅ Detect connected Android devices
- ✅ Start Metro bundler automatically
- ✅ Verify app installation
- ✅ Launch the app
- ✅ Show initialization logs
- ✅ Verify TinyLlama model is loaded

### Quick Reload (During Development)
```bash
npm run reload
# or
./reload.sh
```

Quickly restarts the app without full environment check.

---

## Manual Commands

### Device Management
```bash
# List connected devices
adb devices

# Get device info
adb -s DEVICE_ID shell getprop ro.product.model
adb -s DEVICE_ID shell getprop ro.build.version.release

# Check app is running
adb -s DEVICE_ID shell dumpsys window | grep mCurrentFocus
```

### Metro Bundler
```bash
# Start Metro
npm start

# Check if Metro is running
lsof -i :8081

# Stop Metro
kill $(cat .metro.pid)
```

### App Management
```bash
# Install/Build app
npx react-native run-android --deviceId=DEVICE_ID

# Launch app
adb -s DEVICE_ID shell am start -n com.odly/.MainActivity

# Stop app
adb -s DEVICE_ID shell am force-stop com.odly

# Clear app data
adb -s DEVICE_ID shell pm clear com.odly
```

### Debugging
```bash
# View all logs
adb -s DEVICE_ID logcat

# View React Native logs only
adb -s DEVICE_ID logcat -s ReactNativeJS:*

# Clear log buffer
adb -s DEVICE_ID logcat -c

# Save logs to file
adb -s DEVICE_ID logcat > debug.log
```

### Development Workflow
```bash
# Open dev menu on device
adb -s DEVICE_ID shell input keyevent 82

# Reload JS (from dev menu or)
adb -s DEVICE_ID shell input text "RR"
```

---

## Project Structure

```
odly/
├── android/               # Android native code
│   └── app/
│       ├── src/main/
│       │   ├── assets/   # Asset files (context.txt, models)
│       │   └── java/     # Kotlin/Java code
│       └── build.gradle
├── src/                  # React Native source
│   ├── components/       # UI components
│   │   ├── LLMQueryApp.tsx
│   │   └── QueryInterface.tsx
│   └── services/         # Business logic
│       ├── LLMService.ts
│       └── FileService.ts
├── warmup.sh            # Development setup script
├── reload.sh            # Quick app reload script
└── package.json
```

---

## Troubleshooting

### Metro won't start
```bash
# Kill any process on port 8081
lsof -ti:8081 | xargs kill -9

# Clear Metro cache
npx react-native start --reset-cache
```

### App won't install
```bash
# Clean Android build
cd android && ./gradlew clean && cd ..

# Rebuild
npx react-native run-android
```

### Model not loading
```bash
# Check if model exists on device
adb -s DEVICE_ID shell ls -lh /data/user/0/com.odly/files/

# Copy model to device (if needed)
adb -s DEVICE_ID push tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf /data/user/0/com.odly/files/
```

### Can't see logs
```bash
# Ensure app is running
adb -s DEVICE_ID shell pidof com.odly

# If not running, launch it
adb -s DEVICE_ID shell am start -n com.odly/.MainActivity
```

---

## Performance Tips

1. **Use a physical device** - Emulators are slow with LLM inference
2. **Keep Metro running** - Restart only when needed
3. **Hot reload** - Press `R` twice in dev menu for JS changes
4. **Monitor memory** - TinyLlama uses ~638MB + overhead

---

## Environment Files

- `.metro.pid` - Metro process ID (auto-generated)
- `metro.log` - Metro bundler logs
- `debug.log` - Device logs (if saved)

---

## Useful Info

- **App Package**: `com.odly`
- **MainActivity**: `com.odly.MainActivity`
- **Metro Port**: `8081`
- **Model Size**: 637.8MB
- **Context Size**: 256 tokens
- **Threads**: 1 (CPU only)

