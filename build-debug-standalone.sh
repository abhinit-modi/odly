#!/bin/bash

# Script to build a standalone debug APK that:
# 1. Includes bundled JavaScript (works without Metro)
# 2. Is debuggable (allows adb run-as to access app data)
# 3. Can pull edited files using pull-files.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

printf "${CYAN}\n"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║      🔨 Building Standalone Debug APK 🔨                 ║"
echo "╚═══════════════════════════════════════════════════════════╝"
printf "${NC}\n"

printf "${YELLOW}This creates a debuggable APK with bundled JS${NC}\n"
printf "${YELLOW}✓ Works without Metro running${NC}\n"
printf "${YELLOW}✓ Allows pulling files with adb run-as${NC}\n"
echo ""

# Bundle JavaScript for Android
printf "${BLUE}Step 1: Bundling JavaScript...${NC}\n"
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res

if [ $? -ne 0 ]; then
    printf "${RED}✗ JS bundling failed${NC}\n"
    exit 1
fi

printf "${GREEN}✓ JavaScript bundled${NC}\n\n"

# Build debug APK
printf "${BLUE}Step 2: Building debug APK...${NC}\n"
cd android
./gradlew assembleDebug

if [ $? -ne 0 ]; then
    printf "${RED}✗ Build failed${NC}\n"
    exit 1
fi

cd ..
printf "${GREEN}✓ Build successful${NC}\n\n"

# Get device ID
DEVICE_ID=$(adb devices | grep "device$" | head -1 | awk '{print $1}')

if [ -z "$DEVICE_ID" ]; then
    printf "${YELLOW}⚠ No device connected${NC}\n"
    printf "${GREEN}✓ APK built at: android/app/build/outputs/apk/debug/app-debug.apk${NC}\n"
    printf "${CYAN}💡 Connect a device and run again to install${NC}\n"
    exit 0
fi

printf "${BLUE}Device: ${DEVICE_ID}${NC}\n"

# Ask if user wants to install
printf "${CYAN}Do you want to install on the device? (y/N): ${NC}"
read -r INSTALL_CONFIRM

if [[ "$INSTALL_CONFIRM" =~ ^[Yy]$ ]]; then
    # Uninstall existing app (to ensure clean install)
    printf "${YELLOW}Uninstalling existing app...${NC}\n"
    adb -s $DEVICE_ID uninstall com.odly 2>/dev/null
    
    # Install debug APK
    printf "${BLUE}Installing debug APK...${NC}\n"
    adb -s $DEVICE_ID install android/app/build/outputs/apk/debug/app-debug.apk
    
    if [ $? -ne 0 ]; then
        printf "${RED}✗ Installation failed${NC}\n"
        exit 1
    fi
    
    printf "${GREEN}✓ Debug APK installed successfully${NC}\n\n"
    
    printf "${CYAN}💡 Next steps:${NC}\n"
    printf "${YELLOW}   1. Open the app and edit some files${NC}\n"
    printf "${YELLOW}   2. Run ./pull-files.sh to pull edited files${NC}\n"
    printf "${YELLOW}   3. App works without Metro running! 🎉${NC}\n"
else
    printf "${GREEN}✓ APK built at: android/app/build/outputs/apk/debug/app-debug.apk${NC}\n"
    printf "${CYAN}💡 Install manually with: adb install android/app/build/outputs/apk/debug/app-debug.apk${NC}\n"
fi

echo ""

