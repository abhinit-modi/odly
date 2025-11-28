#!/bin/bash

# Deploy script: Build and install a standalone debug APK
# - Bundles JavaScript (works without Metro)
# - Debuggable build (allows pull-files.sh to work)
# - Quick deployment for testing on device

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

printf "${CYAN}\n"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         🚀 Deploy Debug APK to Device 🚀                 ║"
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

# Find the debug APK (could be app-debug.apk or app-arm64-v8a-debug.apk depending on ABI splits)
DEBUG_APK=$(find android/app/build/outputs/apk/debug -name "*.apk" ! -name "*-unsigned.apk" ! -name "output-metadata.json" | head -1)

if [ -z "$DEBUG_APK" ]; then
    printf "${RED}✗ Could not find debug APK${NC}\n"
    exit 1
fi

APK_NAME=$(basename "$DEBUG_APK")
printf "${GREEN}✓ Found APK: ${APK_NAME}${NC}\n\n"

if [ -z "$DEVICE_ID" ]; then
    printf "${YELLOW}⚠ No device connected${NC}\n"
    printf "${GREEN}✓ APK built at: ${DEBUG_APK}${NC}\n"
    printf "${CYAN}💡 Connect a device and run ./deploy.sh again to install${NC}\n"
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
    adb -s $DEVICE_ID install "$DEBUG_APK"
    
    if [ $? -ne 0 ]; then
        printf "${RED}✗ Installation failed${NC}\n"
        exit 1
    fi
    
    printf "${GREEN}✓ Debug APK installed successfully${NC}\n\n"
    
    printf "${CYAN}💡 Next steps:${NC}\n"
    printf "${YELLOW}   1. Open the app (it will auto-copy assets on first run)${NC}\n"
    printf "${YELLOW}   2. Edit files in the app${NC}\n"
    printf "${YELLOW}   3. Run ./pull-files.sh to pull edited files${NC}\n"
    printf "${YELLOW}   4. App works without Metro running! 🎉${NC}\n"
else
    printf "${GREEN}✓ APK built at: ${DEBUG_APK}${NC}\n"
    printf "${CYAN}💡 Install manually with: adb install ${DEBUG_APK}${NC}\n"
fi

echo ""

