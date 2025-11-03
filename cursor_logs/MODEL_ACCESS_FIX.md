# Model Access Fix for Release Builds

## Problem
The release APK failed to access the TinyLlama model file because:
1. The model was bundled in the APK's assets directory at `android/app/src/main/assets/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf`
2. The native `llama.rn` library requires a real file system path, not an Android asset URL
3. The previous code tried to use `file:///android_asset/` URL scheme which doesn't work with native libraries

## Root Cause
Native libraries in Android (like llama.rn which uses C++ via JNI) cannot directly access files inside the APK's assets. They need files to be extracted to the device's file system first.

## Solution
Updated `FileService.checkTinyLlamaModel()` to automatically copy the model from APK assets to internal storage on first launch:

### Changes Made

#### 1. FileService.ts (`src/services/FileService.ts`)
- **Before**: Returned asset URL `file:///android_asset/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf`
- **After**: 
  - Checks if model exists in internal storage (`DocumentDirectoryPath`)
  - If not found, uses `RNFS.copyFileAssets()` to copy from APK to internal storage
  - Returns the internal storage path that native library can access
  - Logs progress during the ~30-60 second copy operation

Key code:
```typescript
const internalPath = `${RNFS.DocumentDirectoryPath}/${modelFileName}`;

// Check internal storage first
const internalExists = await RNFS.exists(internalPath);
if (internalExists) {
  return { exists: true, size: stats.size, path: internalPath };
}

// Copy from assets to internal storage
await RNFS.copyFileAssets(modelFileName, internalPath);
```

#### 2. LLMQueryApp.tsx (`src/components/LLMQueryApp.tsx`)
- Updated initialization logs to inform about first-launch copy process
- Improved error messages for release builds
- Better debugging information

#### 3. release.sh
- Added warning about first launch taking 30-60 seconds
- Updated documentation about model copying

## Behavior

### First Launch (Release Build)
1. App starts and shows initialization screen
2. `checkTinyLlamaModel()` detects model not in internal storage
3. Copies ~640MB model from APK assets to internal storage (30-60 seconds)
4. Logs show progress: "Copying from assets/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf..."
5. Returns internal storage path to LLM service
6. Model loads successfully

### Subsequent Launches
1. App starts normally (fast)
2. `checkTinyLlamaModel()` finds model already in internal storage
3. Returns cached path immediately
4. Model loads in ~5-10 seconds

## Testing
To test the fix:

1. **Clean install**:
   ```bash
   # Uninstall old version
   adb uninstall com.odly
   
   # Run release script
   ./release.sh
   ```

2. **Monitor logs during first launch**:
   ```bash
   adb logcat -s ReactNativeJS:I | grep -i "model\|copy"
   ```

3. **Expected log output**:
   ```
   Checking TinyLlama GGUF model...
   Note: First launch will take 30-60 seconds to copy ~640MB model from assets
   Model not in internal storage, copying from assets...
   Copying from assets/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf to /data/data/com.odly/files/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf
   ✓ Model copied successfully to internal storage: 637.5MB
   ✓ Model is now accessible at: /data/data/com.odly/files/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf
   ✓ TinyLlama model ready: 637.5MB
   ```

## Why This Works

### Android Asset System
- APK files are just ZIP archives
- Assets are stored compressed inside the APK
- Files can be accessed via Android's AssetManager API
- `RNFS.copyFileAssets()` uses AssetManager to extract files

### Native Library Requirements
- Native libraries (C/C++) need POSIX file paths
- Cannot use Android-specific APIs like AssetManager
- Require files to be on actual file system
- Internal storage provides writable, app-private storage

### Storage Locations
- **Assets**: Read-only, inside APK at `/data/app/.../base.apk!/assets/`
- **Internal Storage**: Writable, app-private at `/data/data/com.odly/files/`
- **Document Directory**: Alias for internal storage, managed by React Native

## Disk Space Considerations

The model file exists in two locations after first launch:
1. **Inside APK** (assets): ~640MB compressed
2. **Internal storage**: ~640MB extracted

Total additional space: ~640MB (beyond the APK itself)

### User Impact
- First install + launch: ~1.3GB total (APK + extracted model)
- User can uninstall to recover all space
- Model stays in internal storage for fast subsequent launches

## Alternative Approaches Considered

### 1. Keep model outside APK (rejected)
- **Pros**: Smaller APK, no duplication
- **Cons**: Requires download on first launch, needs network, complex error handling

### 2. Use external storage (rejected)
- **Pros**: User can see/manage file
- **Cons**: Requires permissions, less secure, user can delete

### 3. Stream from assets (rejected)
- **Pros**: No duplication
- **Cons**: Native library doesn't support AssetManager, would require library changes

### 4. Copy on build (rejected)
- **Pros**: Ready immediately
- **Cons**: Requires adb push for each install, not suitable for distribution

## Future Improvements

1. **Progress indicator**: Show copy progress in UI
2. **Compression**: Use smaller model variant or better compression
3. **Model caching**: Check model hash to avoid unnecessary copies
4. **Cleanup**: Delete old models when app uninstalls
5. **Streaming**: Work with llama.rn to support asset streaming

## Related Files
- `src/services/FileService.ts` - Model detection and copying
- `src/services/LLMService.ts` - Model initialization
- `src/components/LLMQueryApp.tsx` - App initialization
- `release.sh` - Release build script
- `android/app/src/main/assets/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf` - Model file

## Verification Checklist
- [x] Model file exists in assets
- [x] FileService copies model on first launch
- [x] LLM service receives correct file path
- [x] Release script warns about first launch delay
- [x] Error messages guide users correctly
- [x] No linter errors
- [ ] Tested on clean install
- [ ] Verified logs show correct behavior
- [ ] Confirmed model loads successfully

