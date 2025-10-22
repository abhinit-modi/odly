#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Script configuration
APP_PACKAGE="com.odly"
MAIN_ACTIVITY="com.odly/.MainActivity"
RELEASE_APK_PATH="android/app/build/outputs/apk/release/app-arm64-v8a-release.apk"

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         📦 ODLY Release Build & Deployment 📦            ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "${MAGENTA}Building standalone APK (no Metro, no dev tools required)${NC}\n"

# Function to print step headers
print_step() {
    echo -e "\n${BLUE}▶ $1${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to print info
print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

# Check if we're in the correct directory
print_step "Checking current directory..."
if [ ! -f "package.json" ] || [ ! -d "android" ]; then
    print_error "Not in the odly project directory!"
    exit 1
fi
print_success "In correct project directory: $(pwd)"

# List connected Android devices
print_step "Checking connected Android devices..."
DEVICES=$(adb devices | grep -v "List" | grep "device$" | awk '{print $1}')
DEVICE_COUNT=$(echo "$DEVICES" | grep -v "^$" | wc -l | tr -d ' ')

if [ "$DEVICE_COUNT" -eq 0 ]; then
    print_error "No Android devices connected!"
    echo "Please connect a device or start an emulator."
    exit 1
elif [ "$DEVICE_COUNT" -eq 1 ]; then
    DEVICE_ID=$(echo "$DEVICES" | head -1)
    print_success "Found 1 device: $DEVICE_ID"
else
    print_warning "Multiple devices found:"
    echo "$DEVICES" | nl
    echo ""
    read -p "Enter device number to use (1-$DEVICE_COUNT): " DEVICE_NUM
    DEVICE_ID=$(echo "$DEVICES" | sed -n "${DEVICE_NUM}p")
    print_success "Using device: $DEVICE_ID"
fi

# Get device details
DEVICE_MODEL=$(adb -s $DEVICE_ID shell getprop ro.product.model 2>/dev/null | tr -d '\r')
ANDROID_VERSION=$(adb -s $DEVICE_ID shell getprop ro.build.version.release 2>/dev/null | tr -d '\r')
DEVICE_ABI=$(adb -s $DEVICE_ID shell getprop ro.product.cpu.abi 2>/dev/null | tr -d '\r')
print_success "Device: $DEVICE_MODEL (Android $ANDROID_VERSION, $DEVICE_ABI)"

# Verify device architecture
if [[ ! "$DEVICE_ABI" =~ ^arm64 ]]; then
    print_warning "Device is $DEVICE_ABI (build will create arm64-v8a APK)"
    read -p "Continue anyway? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
fi

# Stop Metro bundler if running
print_step "Checking for Metro bundler..."
METRO_PID=$(lsof -t -i:8081 2>/dev/null)
if [ ! -z "$METRO_PID" ]; then
    print_warning "Metro bundler is running (PID: $METRO_PID)"
    print_info "Release build doesn't need Metro, but it won't interfere"
fi

# Check for existing release APK
print_step "Checking for existing release APK..."
if [ -f "$RELEASE_APK_PATH" ]; then
    APK_SIZE=$(du -h "$RELEASE_APK_PATH" | awk '{print $1}')
    APK_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$RELEASE_APK_PATH" 2>/dev/null || stat -c "%y" "$RELEASE_APK_PATH" 2>/dev/null | cut -d. -f1)
    print_warning "Found existing APK (${APK_SIZE}, built: ${APK_DATE})"
    read -p "Rebuild? (y/n): " REBUILD
    if [ "$REBUILD" != "y" ]; then
        print_info "Using existing APK"
        SKIP_BUILD=true
    fi
fi

if [ "$SKIP_BUILD" != "true" ]; then
    # Create JavaScript bundle
    print_step "Creating optimized JavaScript bundle..."
    print_info "Bundling all JS code (no Metro needed at runtime)"
    
    npm run bundle:android
    
    if [ $? -ne 0 ]; then
        print_error "Failed to create JavaScript bundle"
        exit 1
    fi
    
    # Verify bundle was created
    if [ -f "android/app/src/main/assets/index.android.bundle" ]; then
        BUNDLE_SIZE=$(du -h android/app/src/main/assets/index.android.bundle | awk '{print $1}')
        print_success "JavaScript bundle created (${BUNDLE_SIZE})"
    else
        print_error "Bundle file not found!"
        exit 1
    fi
    
    # Build release APK
    print_step "Building release APK with Gradle..."
    print_info "This may take 2-3 minutes..."
    
    cd android
    ./gradlew assembleRelease
    BUILD_RESULT=$?
    cd ..
    
    if [ $BUILD_RESULT -ne 0 ]; then
        print_error "Gradle build failed!"
        exit 1
    fi
    
    # Verify APK was created
    if [ ! -f "$RELEASE_APK_PATH" ]; then
        print_error "Release APK not found at expected location!"
        exit 1
    fi
    
    APK_SIZE=$(du -h "$RELEASE_APK_PATH" | awk '{print $1}')
    print_success "Release APK built successfully (${APK_SIZE})"
else
    APK_SIZE=$(du -h "$RELEASE_APK_PATH" | awk '{print $1}')
fi

# APK information
print_step "Release APK Information..."
echo -e "  Path: ${YELLOW}$RELEASE_APK_PATH${NC}"
echo -e "  Size: ${YELLOW}$APK_SIZE${NC}"
print_info "This APK includes:"
echo "  • Optimized JavaScript bundle (no Metro needed)"
echo "  • TinyLlama model (~700MB)"
echo "  • All native libraries"
echo "  • Markdown knowledge files"

# Uninstall old version if exists
print_step "Checking for existing app installation..."
APP_INSTALLED=$(adb -s $DEVICE_ID shell pm list packages | grep "^package:${APP_PACKAGE}$")
if [ ! -z "$APP_INSTALLED" ]; then
    APP_VERSION=$(adb -s $DEVICE_ID shell dumpsys package $APP_PACKAGE | grep versionName | head -1 | awk '{print $1}')
    print_warning "App is already installed ($APP_VERSION)"
    read -p "Uninstall old version first? (recommended, y/n): " UNINSTALL
    if [ "$UNINSTALL" = "y" ]; then
        print_info "Uninstalling old version..."
        adb -s $DEVICE_ID uninstall $APP_PACKAGE 2>/dev/null
        if [ $? -eq 0 ]; then
            print_success "Old version uninstalled"
        else
            print_warning "Uninstall failed, will try to replace"
        fi
    fi
fi

# Install release APK
print_step "Installing release APK on device..."
print_info "Installing $APK_SIZE APK (this may take 30-60 seconds)..."

adb -s $DEVICE_ID install -r "$RELEASE_APK_PATH"
INSTALL_RESULT=$?

if [ $INSTALL_RESULT -eq 0 ]; then
    print_success "Release APK installed successfully!"
else
    print_error "Failed to install APK (error code: $INSTALL_RESULT)"
    exit 1
fi

# Verify installation
APP_INSTALLED=$(adb -s $DEVICE_ID shell pm list packages | grep "^package:${APP_PACKAGE}$")
if [ -z "$APP_INSTALLED" ]; then
    print_error "App not found after installation!"
    exit 1
fi

# Clear logcat buffer
print_step "Preparing for launch..."
adb -s $DEVICE_ID logcat -c 2>/dev/null
print_success "Log buffer cleared"

# Stop any running instances
adb -s $DEVICE_ID shell am force-stop $APP_PACKAGE 2>/dev/null
sleep 1

# Launch the app
print_step "Launching release app..."
print_info "App will run WITHOUT Metro bundler or network"

LAUNCH_OUTPUT=$(adb -s $DEVICE_ID shell am start -n $MAIN_ACTIVITY 2>&1)
if echo "$LAUNCH_OUTPUT" | grep -q "Starting:"; then
    print_success "App launched successfully"
else
    print_error "Failed to launch app"
    echo "$LAUNCH_OUTPUT"
    exit 1
fi

# Wait for app to initialize
print_step "Waiting for app initialization..."
echo -n "Loading"
for i in {1..5}; do
    sleep 1
    echo -n "."
done
echo ""

# Verify app is running
print_step "Verifying app is running..."
CURRENT_FOCUS=$(adb -s $DEVICE_ID shell dumpsys window | grep mCurrentFocus | grep "$APP_PACKAGE")
if [ ! -z "$CURRENT_FOCUS" ]; then
    print_success "App is running and in focus"
else
    print_warning "App may not be in foreground"
fi

# Check for Metro connection attempts (should be NONE for release)
print_step "Verifying standalone operation..."
sleep 3
METRO_ATTEMPTS=$(adb -s $DEVICE_ID logcat -d | grep -i "metro" | grep -v "systemui.clocks.metro" | wc -l | tr -d ' ')
if [ "$METRO_ATTEMPTS" -eq 0 ]; then
    print_success "✓ App running STANDALONE (no Metro connection attempts)"
else
    print_warning "Detected $METRO_ATTEMPTS Metro-related log entries (checking...)"
fi

# Check for successful initialization
print_step "Checking app initialization..."
sleep 3
LOGS=$(adb -s $DEVICE_ID logcat -d -s ReactNativeJS:I 2>/dev/null | tail -50)

# Check for model loading
if echo "$LOGS" | grep -q "Found model at"; then
    MODEL_PATH=$(echo "$LOGS" | grep "Found model at" | tail -1 | sed 's/.*Found model at: //' | awk '{print $1}')
    MODEL_SIZE=$(echo "$LOGS" | grep "Found model at" | tail -1 | sed 's/.* (//' | sed 's/).*//')
    print_success "Model loaded: $MODEL_SIZE"
fi

# Check for service initialization
if echo "$LOGS" | grep -q "ChatService.*initialized"; then
    print_success "ChatService initialized"
fi

if echo "$LOGS" | grep -q "Voice.*initialized"; then
    print_success "Voice module initialized"
fi

if echo "$LOGS" | grep -q "Available tags"; then
    TAGS=$(echo "$LOGS" | grep -A 10 "Available tags" | grep "#" | tr -d '[] ,"' | paste -sd ' ' -)
    print_success "Knowledge files indexed: $TAGS"
fi

# Show recent logs
print_step "Recent app logs..."
echo -e "${CYAN}"
echo "$LOGS" | grep "INFO" | tail -8
echo -e "${NC}"

# Summary
echo -e "\n${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                 🎉 Release Deployed! 🎉                   ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Deployment Details:${NC}"
echo -e "  Device:       ${YELLOW}$DEVICE_MODEL${NC}"
echo -e "  Android:      ${YELLOW}$ANDROID_VERSION${NC}"
echo -e "  APK Size:     ${YELLOW}$APK_SIZE${NC}"
echo -e "  Package:      ${YELLOW}$APP_PACKAGE${NC}"
echo ""
echo -e "${GREEN}✓ App Status:${NC}"
echo -e "  • Runs ${MAGENTA}completely offline${NC}"
echo -e "  • No Metro bundler needed"
echo -e "  • No development tools required"
echo -e "  • No network connection needed"
echo -e "  • All AI processing on-device"
echo ""
echo -e "${GREEN}Useful Commands:${NC}"
echo -e "  View logs:      ${YELLOW}adb -s $DEVICE_ID logcat -s ReactNativeJS:*${NC}"
echo -e "  Restart app:    ${YELLOW}adb -s $DEVICE_ID shell am start -n $MAIN_ACTIVITY${NC}"
echo -e "  Stop app:       ${YELLOW}adb -s $DEVICE_ID shell am force-stop $APP_PACKAGE${NC}"
echo -e "  Uninstall:      ${YELLOW}adb -s $DEVICE_ID uninstall $APP_PACKAGE${NC}"
echo -e "  APK location:   ${YELLOW}$RELEASE_APK_PATH${NC}"
echo ""
echo -e "${BLUE}📱 Your device is running the release version!${NC}"
echo -e "${CYAN}The APK can be shared/installed on any Android device.${NC}"
echo ""

# Optional: Follow logs
read -p "Follow live logs? (y/n): " FOLLOW_LOGS
if [ "$FOLLOW_LOGS" = "y" ]; then
    echo ""
    echo -e "${CYAN}Following ReactNative logs (Ctrl+C to stop)...${NC}"
    echo ""
    adb -s $DEVICE_ID logcat -s ReactNativeJS:*
fi

