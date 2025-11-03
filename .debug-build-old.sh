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
METRO_PORT=8081

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║        🐛 ODLY Debug Build Switch & Deployment 🐛        ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "${MAGENTA}Switching from release to debug build${NC}\n"

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

# Check Metro bundler status
print_step "Checking Metro bundler status..."
METRO_PID=$(lsof -t -i:$METRO_PORT 2>/dev/null)
if [ ! -z "$METRO_PID" ]; then
    print_warning "Metro already running (PID: $METRO_PID)"
    read -p "Kill and restart? (y/n): " RESTART
    if [ "$RESTART" = "y" ]; then
        kill $METRO_PID 2>/dev/null
        sleep 2
        print_success "Metro stopped"
        METRO_PID=""
    fi
fi

# Start Metro bundler in background
if [ -z "$METRO_PID" ]; then
    print_step "Starting Metro bundler..."
    print_info "Starting Metro for debug build (dev mode)"
    
    npx react-native start > metro.log 2>&1 &
    METRO_PID=$!
    echo $METRO_PID > .metro.pid
    
    # Wait for Metro to be ready
    echo -n "Waiting for Metro to start"
    for i in {1..20}; do
        if lsof -t -i:$METRO_PORT > /dev/null 2>&1; then
            echo ""
            print_success "Metro bundler running (PID: $METRO_PID)"
            break
        fi
        echo -n "."
        sleep 1
    done
    
    if ! lsof -t -i:$METRO_PORT > /dev/null 2>&1; then
        print_error "Metro failed to start. Check metro.log for details."
        exit 1
    fi
else
    print_success "Metro bundler already running"
fi

# Verify Metro is responding
print_step "Verifying Metro bundler is responding..."
sleep 2
METRO_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$METRO_PORT/status 2>/dev/null || echo "000")
if [ "$METRO_STATUS" = "200" ]; then
    print_success "Metro bundler is responding correctly"
else
    print_warning "Metro may still be starting up (status: $METRO_STATUS)"
    sleep 3
fi

# Check if release build is currently installed
print_step "Checking current installation..."
APP_INSTALLED=$(adb -s $DEVICE_ID shell pm list packages | grep "^package:${APP_PACKAGE}$")
if [ -z "$APP_INSTALLED" ]; then
    print_warning "App not installed on device"
else
    print_info "App is installed, will replace with debug build"
fi

# Uninstall existing version to ensure clean debug install
if [ ! -z "$APP_INSTALLED" ]; then
    print_step "Uninstalling existing build..."
    adb -s $DEVICE_ID uninstall $APP_PACKAGE 2>/dev/null
    if [ $? -eq 0 ]; then
        print_success "Existing build uninstalled"
    else
        print_warning "Uninstall failed, continuing anyway"
    fi
    sleep 1
fi

# Build and install debug APK
print_step "Building debug APK..."
print_info "Building debug variant (no JS bundle, connects to Metro)"

cd android
./gradlew assembleDebug
BUILD_RESULT=$?
cd ..

if [ $BUILD_RESULT -ne 0 ]; then
    print_error "Gradle debug build failed!"
    exit 1
fi

# Find the debug APK
DEBUG_APK_PATH=$(find android/app/build/outputs/apk/debug -name "*.apk" 2>/dev/null | head -1)
if [ -z "$DEBUG_APK_PATH" ]; then
    print_error "Debug APK not found!"
    exit 1
fi

APK_SIZE=$(du -h "$DEBUG_APK_PATH" | awk '{print $1}')
print_success "Debug APK built successfully (${APK_SIZE})"

# Install debug APK
print_step "Installing debug APK on device..."
print_info "Installing $APK_SIZE debug APK..."

adb -s $DEVICE_ID install "$DEBUG_APK_PATH"
INSTALL_RESULT=$?

if [ $INSTALL_RESULT -eq 0 ]; then
    print_success "Debug APK installed successfully!"
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

# Setup ADB reverse port forwarding for Metro connection
print_step "Setting up port forwarding for Metro..."
adb -s $DEVICE_ID reverse tcp:$METRO_PORT tcp:$METRO_PORT 2>/dev/null
if [ $? -eq 0 ]; then
    print_success "Port forwarding established (device:$METRO_PORT -> host:$METRO_PORT)"
else
    print_error "Failed to set up port forwarding"
    exit 1
fi

# Clear logcat buffer
print_step "Preparing for launch..."
adb -s $DEVICE_ID logcat -c 2>/dev/null
print_success "Log buffer cleared"

# Launch the app
print_step "Launching debug app..."
print_info "Debug build connects to Metro bundler"

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

# Check for Metro connection
print_step "Verifying Metro connection..."
sleep 5
CONNECTION_ERRORS=$(adb -s $DEVICE_ID logcat -d | grep -i "Couldn't connect.*$METRO_PORT" | tail -1)
if [ ! -z "$CONNECTION_ERRORS" ]; then
    print_error "Device cannot connect to Metro bundler!"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "  1. Ensure port forwarding is active: adb reverse tcp:$METRO_PORT tcp:$METRO_PORT"
    echo "  2. Check Metro is running: lsof -ti:$METRO_PORT"
    echo "  3. Check Metro logs: tail -f metro.log"
    exit 1
else
    print_success "Metro connection established"
fi

# Check for successful initialization
print_step "Checking app initialization..."
sleep 3
LOGS=$(adb -s $DEVICE_ID logcat -d -s ReactNativeJS:I 2>/dev/null | tail -50)

# Check for Metro connection confirmation
if echo "$LOGS" | grep -q "Metro" || echo "$LOGS" | grep -q "Downloading"; then
    print_success "JavaScript bundle downloading from Metro"
fi

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
echo -e "${CYAN}║                  🎉 Debug Build Active! 🎉                 ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Deployment Details:${NC}"
echo -e "  Device:       ${YELLOW}$DEVICE_MODEL${NC}"
echo -e "  Android:      ${YELLOW}$ANDROID_VERSION${NC}"
echo -e "  APK Size:     ${YELLOW}$APK_SIZE${NC}"
echo -e "  Package:      ${YELLOW}$APP_PACKAGE${NC}"
echo -e "  Build Type:   ${MAGENTA}DEBUG${NC}"
echo ""
echo -e "${GREEN}✓ Debug Features:${NC}"
echo -e "  • Metro bundler connected"
echo -e "  • Fast refresh enabled"
echo -e "  • Remote JS debugging available"
echo -e "  • Dev menu accessible (shake or menu key)"
echo -e "  • All development tools enabled"
echo ""
echo -e "${GREEN}Useful Commands:${NC}"
echo -e "  View logs:      ${YELLOW}adb -s $DEVICE_ID logcat -s ReactNativeJS:*${NC}"
echo -e "  Stop Metro:     ${YELLOW}kill \$(cat .metro.pid)${NC}"
echo -e "  Reload JS:      ${YELLOW}adb -s $DEVICE_ID shell input keyevent 82${NC}"
echo -e "  Restart app:    ${YELLOW}adb -s $DEVICE_ID shell am start -n $MAIN_ACTIVITY${NC}"
echo -e "  Stop app:       ${YELLOW}adb -s $DEVICE_ID shell am force-stop $APP_PACKAGE${NC}"
echo -e "  APK location:   ${YELLOW}$DEBUG_APK_PATH${NC}"
echo ""
echo -e "${BLUE}📱 Your device is now running the debug version!${NC}"
echo -e "${CYAN}Code changes will hot reload automatically.${NC}"
echo ""

# Optional: Follow logs
read -p "Follow live logs? (y/n): " FOLLOW_LOGS
if [ "$FOLLOW_LOGS" = "y" ]; then
    echo ""
    echo -e "${CYAN}Following ReactNative logs (Ctrl+C to stop)...${NC}"
    echo ""
    adb -s $DEVICE_ID logcat -s ReactNativeJS:*
fi

