# Passcode Feature Implementation

## Overview
Added a 4-digit passcode lock feature for Android devices to secure the app.

## Components Added

### 1. PasscodeService (`src/services/PasscodeService.ts`)
Service layer that handles all passcode operations:
- **setPasscode(passcode: string)**: Stores a new 4-digit passcode
- **getPasscode()**: Retrieves the stored passcode
- **hasPasscode()**: Checks if a passcode exists
- **verifyPasscode(enteredPasscode: string)**: Verifies if entered passcode matches
- **clearPasscode()**: Removes the stored passcode
- **isValidPasscode(passcode: string)**: Validates passcode format (4 digits)

Uses `react-native-fs` for file-based storage in the app's document directory.

### 2. PasscodeScreen Component (`src/components/PasscodeScreen.tsx`)
Full-screen UI component for passcode entry:
- **First-time setup**: If no passcode exists, prompts user to create one with confirmation
- **Unlock screen**: If passcode exists, prompts user to enter it
- **Visual feedback**: Shows dots that fill as user enters digits
- **Error handling**: Displays errors for incorrect passcode or mismatched confirmation
- **Auto-submit**: Automatically submits when 4 digits are entered

### 3. App.tsx Updates
Modified main App component to:
- Show PasscodeScreen on app launch (Android only)
- Lock the app when it goes to background/inactive state
- Re-lock when app returns from background
- Bypass passcode on non-Android platforms (iOS, etc.)

## Dependencies Used
- `react-native-fs`: For secure file-based storage of passcode (already installed)

## How It Works

### First Launch (Android)
1. App detects no passcode exists
2. Shows "Set Passcode" screen
3. User enters 4-digit passcode
4. User confirms by re-entering passcode
5. Passcode is saved and app unlocks

### Subsequent Launches
1. App detects passcode exists
2. Shows "Enter Passcode" screen
3. User enters their 4-digit passcode
4. If correct, app unlocks
5. If incorrect, shows error and clears input

### Background/Foreground Behavior
- When app goes to background → locks automatically
- When app returns to foreground → requires passcode entry
- This prevents unauthorized access when device is left unattended

## Platform Support
- **Android**: Fully functional with passcode lock
- **iOS/Other**: Bypassed (no passcode required)

## Security Notes
- Passcode is stored locally in the app's document directory
- Uses `secureTextEntry` for password input field
- No network transmission of passcode
- File is stored in app sandbox (protected by OS-level security)
- Can be easily enhanced with encryption or moved to Keychain/Keystore if needed

## Deployment
To deploy to an Android device:
```bash
./deploy.sh
```

This will:
1. Bundle the JavaScript
2. Build a debug APK
3. Prompt to install on connected device

## Testing
1. Run the deploy script: `./deploy.sh`
2. On first launch, set a 4-digit passcode
3. Minimize the app and bring it back - should require passcode
4. Try incorrect passcode - should show error
5. Try correct passcode - should unlock

## Troubleshooting
If you encounter issues:
1. Clean the Android build: `cd android && ./gradlew clean && cd ..`
2. Rebuild: `./deploy.sh`

## Future Enhancements
- Biometric authentication (fingerprint/face)
- Passcode reset mechanism via email or backup code
- Lock timer (auto-lock after X minutes)
- Failed attempt limits with lockout
- Encryption of passcode file
- iOS support


