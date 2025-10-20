#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script configuration
APP_PACKAGE="com.odly"
MAIN_ACTIVITY="com.odly/.MainActivity"
METRO_PORT=8081

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         🚀 ODLY Development Environment Setup 🚀          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

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

# Get device model
DEVICE_MODEL=$(adb -s $DEVICE_ID shell getprop ro.product.model 2>/dev/null | tr -d '\r')
ANDROID_VERSION=$(adb -s $DEVICE_ID shell getprop ro.build.version.release 2>/dev/null | tr -d '\r')
print_success "Device: $DEVICE_MODEL (Android $ANDROID_VERSION)"

# Check if Metro is already running
print_step "Checking Metro bundler status..."
METRO_PID=$(lsof -t -i:$METRO_PORT 2>/dev/null)
if [ ! -z "$METRO_PID" ]; then
    print_warning "Metro already running (PID: $METRO_PID)"
    read -p "Kill and restart? (y/n): " RESTART
    if [ "$RESTART" = "y" ]; then
        kill $METRO_PID 2>/dev/null
        sleep 2
        print_success "Metro stopped"
    fi
fi

# Start Metro bundler in background
if [ -z "$(lsof -t -i:$METRO_PORT 2>/dev/null)" ]; then
    print_step "Starting Metro bundler..."
    npx react-native start > metro.log 2>&1 &
    METRO_PID=$!
    echo $METRO_PID > .metro.pid
    
    # Wait for Metro to be ready
    echo -n "Waiting for Metro to start"
    for i in {1..15}; do
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
    # Give it more time
    sleep 3
fi

# Check if app is installed
print_step "Checking if app is installed..."
APP_INSTALLED=$(adb -s $DEVICE_ID shell pm list packages | grep "^package:${APP_PACKAGE}$")
if [ -z "$APP_INSTALLED" ]; then
    print_warning "App not installed on device"
    read -p "Build and install now? (y/n): " INSTALL
    if [ "$INSTALL" = "y" ]; then
        print_step "Building and installing app..."
        npx react-native run-android --deviceId=$DEVICE_ID
        if [ $? -ne 0 ]; then
            print_error "Failed to build/install app"
            exit 1
        fi
        print_success "App installed successfully"
    else
        print_error "App must be installed to continue"
        exit 1
    fi
else
    print_success "App is installed"
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
print_step "Clearing device logs..."
adb -s $DEVICE_ID logcat -c
print_success "Log buffer cleared"

# Stop app if running
print_step "Stopping any running instances..."
adb -s $DEVICE_ID shell am force-stop $APP_PACKAGE 2>/dev/null
print_success "App stopped"

# Launch the app
print_step "Launching MainActivity..."
LAUNCH_OUTPUT=$(adb -s $DEVICE_ID shell am start -n $MAIN_ACTIVITY 2>&1)
if echo "$LAUNCH_OUTPUT" | grep -q "Starting:"; then
    print_success "MainActivity launched"
else
    print_error "Failed to launch MainActivity"
    echo "$LAUNCH_OUTPUT"
    exit 1
fi

# Wait and verify app is running
sleep 3
print_step "Verifying app is running..."
CURRENT_FOCUS=$(adb -s $DEVICE_ID shell dumpsys window | grep mCurrentFocus | grep "$APP_PACKAGE")
if [ ! -z "$CURRENT_FOCUS" ]; then
    print_success "App is in focus and running"
else
    print_warning "App may not be in focus"
fi

# Check for Metro connection errors
print_step "Verifying Metro connection..."
sleep 3
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

# Show initialization logs
print_step "Checking initialization logs..."
sleep 2
LOGS=$(adb -s $DEVICE_ID logcat -d -s ReactNativeJS:I | tail -30)
if echo "$LOGS" | grep -q "TinyLlama model initialized successfully"; then
    print_success "Model initialized successfully!"
    echo ""
    echo -e "${CYAN}Recent logs:${NC}"
    echo "$LOGS" | grep "ReactNativeJS" | tail -10
elif echo "$LOGS" | grep -q "Initializing TinyLlama"; then
    print_warning "Model is initializing (this takes ~10-15 seconds)..."
    echo ""
    echo -e "${CYAN}Recent logs:${NC}"
    echo "$LOGS" | grep "ReactNativeJS" | tail -10
else
    print_warning "Waiting for app to load JavaScript bundle..."
    echo ""
    echo -e "${CYAN}Recent logs:${NC}"
    echo "$LOGS" | grep "ReactNativeJS" | tail -10
fi

# Summary
echo -e "\n${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    🎉 Setup Complete! 🎉                  ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Environment Details:${NC}"
echo -e "  Device ID:    ${YELLOW}$DEVICE_ID${NC}"
echo -e "  Device Model: ${YELLOW}$DEVICE_MODEL${NC}"
echo -e "  Android:      ${YELLOW}$ANDROID_VERSION${NC}"
echo -e "  Metro Port:   ${YELLOW}$METRO_PORT${NC}"
echo -e "  Metro PID:    ${YELLOW}$(cat .metro.pid 2>/dev/null || echo 'N/A')${NC}"
echo ""
echo -e "${GREEN}Useful Commands:${NC}"
echo -e "  View logs:      ${YELLOW}adb -s $DEVICE_ID logcat -s ReactNativeJS:*${NC}"
echo -e "  Stop Metro:     ${YELLOW}kill \$(cat .metro.pid)${NC}"
echo -e "  Port forward:   ${YELLOW}adb -s $DEVICE_ID reverse tcp:$METRO_PORT tcp:$METRO_PORT${NC}"
echo -e "  Reload JS:      ${YELLOW}adb -s $DEVICE_ID shell input keyevent 82${NC}"
echo -e "  Restart app:    ${YELLOW}adb -s $DEVICE_ID shell am start -n $MAIN_ACTIVITY${NC}"
echo -e "  Force stop app: ${YELLOW}adb -s $DEVICE_ID shell am force-stop $APP_PACKAGE${NC}"
echo ""
echo -e "${BLUE}📱 Your device is ready for prototyping!${NC}"
echo ""
echo -e "${CYAN}Note:${NC} If you see EPERM cache errors in Metro logs, they are harmless and don't affect functionality."
echo ""

# Optional: Follow logs
read -p "Follow live logs? (y/n): " FOLLOW_LOGS
if [ "$FOLLOW_LOGS" = "y" ]; then
    echo ""
    echo -e "${CYAN}Following ReactNative logs (Ctrl+C to stop)...${NC}"
    echo ""
    adb -s $DEVICE_ID logcat -s ReactNativeJS:*
fi

