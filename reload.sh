#!/bin/bash

# Quick reload script - restarts the app on the connected device
# Usage: ./reload.sh [device_id]

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_PACKAGE="com.odly"
MAIN_ACTIVITY="com.odly/.MainActivity"

# Get device ID
if [ -z "$1" ]; then
    DEVICE_ID=$(adb devices | grep "device$" | head -1 | awk '{print $1}')
    if [ -z "$DEVICE_ID" ]; then
        echo -e "${RED}✗ No device connected${NC}"
        exit 1
    fi
else
    DEVICE_ID=$1
fi

echo -e "${BLUE}🔄 Reloading app on $DEVICE_ID...${NC}"

# Stop and start the app
adb -s $DEVICE_ID shell am force-stop $APP_PACKAGE 2>/dev/null
sleep 1
adb -s $DEVICE_ID shell am start -n $MAIN_ACTIVITY 2>&1 | head -1

# Wait a bit and check logs
sleep 3
echo -e "\n${YELLOW}Recent logs:${NC}"
adb -s $DEVICE_ID logcat -d -s ReactNativeJS:I | tail -10

echo -e "\n${GREEN}✓ App reloaded${NC}"

