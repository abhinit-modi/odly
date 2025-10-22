# Release Build Guide

This guide explains how to build and deploy standalone release versions of Odly.

## Quick Release

```bash
npm run release
```

This single command will:
1. Bundle JavaScript code (optimized, production-ready)
2. Build the release APK (~1.1GB)
3. Install it on your connected Android device
4. Launch and verify the app
5. Confirm standalone operation (no Metro needed)

## What Makes It Standalone?

The release APK includes:
- **JavaScript Bundle**: All React Native code pre-compiled (`index.android.bundle`)
- **TinyLlama Model**: 700MB GGUF model for on-device AI
- **Native Libraries**: All ARM64 and x86_64 libs
- **Knowledge Files**: All markdown files from `aham/` directory
- **Assets**: Everything needed to run offline

## No Development Tools Required

Once installed, the release version:
- ✅ Works without Metro bundler
- ✅ Works without Node.js/npm
- ✅ Works without Android Studio
- ✅ Works without network connection
- ✅ Works on any device (no dev environment)

## Manual Build Process

If you need more control:

### 1. Create JavaScript Bundle
```bash
npm run bundle:android
```
Output: `android/app/src/main/assets/index.android.bundle`

### 2. Build Release APK
```bash
cd android
./gradlew assembleRelease
cd ..
```
Output: `android/app/build/outputs/apk/release/app-arm64-v8a-release.apk`

### 3. Install on Device
```bash
adb install -r android/app/build/outputs/apk/release/app-arm64-v8a-release.apk
```

### 4. Launch
```bash
adb shell am start -n com.odly/.MainActivity
```

## Build Variants

### Standard Release APK
```bash
npm run build:android:release
```
Outputs: `app-arm64-v8a-release.apk` (~1.1GB)

### Android App Bundle (for Play Store)
```bash
npm run build:android:release-aab
```
Outputs: `app-release.aab` (optimized for Play Store distribution)

## Distribution

The release APK can be:
- Shared via file transfer (email, USB, cloud storage)
- Installed on any Android device (enable "Install from unknown sources")
- Distributed internally without app stores
- Tested on production-like environment

## Verification

After installation, verify standalone operation:

```bash
# Check for Metro connection attempts (should see "Failed to connect")
adb logcat -d | grep "8081\|metro" | grep -v "systemui.clocks.metro"

# Should see initial attempt, then fallback to bundle:
# "The packager does not seem to be running"
# "Couldn't connect to localhost:8081"
# This is EXPECTED and CORRECT behavior!

# Verify app functionality
adb logcat -s ReactNativeJS:*
```

Look for:
- ✓ Model loaded
- ✓ Services initialized
- ✓ Knowledge files indexed
- ✓ No repeated connection errors

## File Sizes

- **JavaScript Bundle**: ~1.1MB (optimized)
- **TinyLlama Model**: ~700MB (Q4_K_M quantized)
- **Native Libraries**: ~300MB (React Native + llama.cpp)
- **Total APK**: ~1.1GB

## Release vs Development

| Feature | Development (`npm run warmup`) | Release (`npm run release`) |
|---------|-------------------------------|----------------------------|
| Metro Required | ✅ Yes | ❌ No |
| Network Required | ✅ Yes | ❌ No |
| Fast Refresh | ✅ Yes | ❌ No |
| Hot Reload | ✅ Yes | ❌ No |
| Debug Tools | ✅ Yes | ❌ No |
| Performance | Slower | ✅ Faster |
| APK Size | ~1.1GB | ~1.1GB |
| Distribution | Cannot | ✅ Can share |

## Troubleshooting

### "Java Runtime not found"
- Ensure Java 17+ is installed and in PATH
- Run: `java -version`

### "Build failed"
- Clean: `cd android && ./gradlew clean && cd ..`
- Rebuild: `npm run build:android:release`

### "Installation failed"
- Uninstall old version: `adb uninstall com.odly`
- Try again: `adb install -r <apk-path>`

### "App crashes on launch"
- Check model file is in APK: should be ~1.1GB
- View logs: `adb logcat -s ReactNativeJS:*`

## iOS Release

For iOS release builds:

```bash
# Create iOS bundle
npm run bundle:ios

# Open Xcode
open ios/odly.xcodeproj

# In Xcode:
# 1. Select "Product > Archive"
# 2. Follow distribution workflow
# 3. Export IPA for distribution
```

## Signing for Production

For production distribution (Play Store, App Store):
1. Generate signing keys
2. Configure signing in `android/app/build.gradle`
3. Build signed release
4. Test before distribution

See React Native documentation for detailed signing instructions.

## Performance Notes

The release build:
- Uses ProGuard/R8 minification
- Strips debug symbols
- Optimizes JavaScript bundle
- Should be ~10-20% faster than debug builds
- Lower memory usage
- Better battery efficiency

## Security Notes

The release APK:
- Has no dev tools access
- Cannot connect to Metro
- Has debug features disabled
- Uses release signing key
- Suitable for production use

---

**Built with ❤️ for offline-first, privacy-focused AI**

