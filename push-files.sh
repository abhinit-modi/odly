#!/bin/bash

# Script to push .md files from local development environment to device
# Pushes to DocumentDirectory (writable location on device)
# Usage: ./push-files.sh [options] [device_id]
#   Options:
#     -y, --yes      Skip confirmation prompts (auto-confirm)
#     -h, --help     Show this help message

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

APP_PACKAGE="com.odly"
DEVICE_DIR="/data/data/${APP_PACKAGE}/files/aham"
LOCAL_DIR="android/app/src/main/assets/aham"

# Parse arguments
AUTO_CONFIRM=false
DEVICE_ID=""

show_help() {
    echo "Usage: ./push-files.sh [options] [device_id]"
    echo ""
    echo "Options:"
    echo "  -y, --yes      Skip confirmation prompts (auto-confirm)"
    echo "  -h, --help     Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./push-files.sh                    # Push local files to device"
    echo "  ./push-files.sh -y                 # Auto-confirm all prompts"
    echo "  ./push-files.sh --yes 1B251FDF     # Push to specific device with auto-confirm"
    exit 0
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -y|--yes)
            AUTO_CONFIRM=true
            shift
            ;;
        -h|--help)
            show_help
            ;;
        *)
            # Assume it's a device ID
            DEVICE_ID=$1
            shift
            ;;
    esac
done

# Get device ID if not provided
if [ -z "$DEVICE_ID" ]; then
    DEVICE_ID=$(adb devices | grep "device$" | head -1 | awk '{print $1}')
    if [ -z "$DEVICE_ID" ]; then
        printf "${RED}✗ No device connected${NC}\n"
        exit 1
    fi
fi

printf "${CYAN}\n"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         📤 Push Files from Local to Device 📤            ║"
echo "╚═══════════════════════════════════════════════════════════╝"
printf "${NC}\n"
printf "${BLUE}Device: ${DEVICE_ID}${NC}\n"
printf "${BLUE}Source: ${LOCAL_DIR}${NC}\n"
printf "${BLUE}Destination: ${DEVICE_DIR}${NC}\n"
echo ""

# Check if local directory exists
if [ ! -d "$LOCAL_DIR" ]; then
    printf "${RED}✗ Local directory not found: ${LOCAL_DIR}${NC}\n"
    exit 1
fi

# Find local .md files
LOCAL_FILES=$(ls -1 "$LOCAL_DIR"/*.md 2>/dev/null)

if [ -z "$LOCAL_FILES" ]; then
    printf "${YELLOW}⚠ No .md files found in ${LOCAL_DIR}${NC}\n"
    exit 0
fi

printf "${CYAN}Checking local files...${NC}\n"
printf "${GREEN}✓ Found local files:${NC}\n"

# Get list of files on device to compare
DEVICE_FILES=$(adb -s $DEVICE_ID shell "run-as $APP_PACKAGE ls -1 $DEVICE_DIR/ 2>/dev/null" | tr -d '\r' | grep '\.md$')

# Show files that will be pushed
FILE_COUNT=0
NEW_COUNT=0
OVERWRITE_COUNT=0

echo "$LOCAL_FILES" | while read -r file; do
    FILENAME=$(basename "$file")
    FILE_COUNT=$((FILE_COUNT + 1))
    
    # Check if file exists on device
    if echo "$DEVICE_FILES" | grep -q "^${FILENAME}$"; then
        echo "  - $FILENAME ${YELLOW}(will be overwritten on device)${NC}"
        OVERWRITE_COUNT=$((OVERWRITE_COUNT + 1))
    else
        echo "  - $FILENAME ${GREEN}(new file on device)${NC}"
        NEW_COUNT=$((NEW_COUNT + 1))
    fi
done

# Ask for confirmation (unless auto-confirm is enabled)
if [ "$AUTO_CONFIRM" = false ]; then
    printf "\n${YELLOW}⚠ This will push local files to the device and may overwrite existing versions.${NC}\n"
    printf "${CYAN}Do you want to continue? (y/N): ${NC}"
    read -r CONFIRM
    
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        printf "${RED}✗ Operation cancelled by user${NC}\n"
        exit 0
    fi
else
    printf "\n${GREEN}✓ Auto-confirmed: Will push files to device${NC}\n"
fi

# Push each file
printf "\n${CYAN}Pushing files to device...${NC}\n"
PUSHED_COUNT=0
FAILED_COUNT=0

# Ensure directory exists on device
printf "${BLUE}  Ensuring directory exists on device...${NC}\n"
adb -s $DEVICE_ID shell "run-as $APP_PACKAGE mkdir -p $DEVICE_DIR" 2>/dev/null

# Use for loop to iterate over files
for file in "$LOCAL_DIR"/*.md; do
    if [ ! -f "$file" ]; then
        continue
    fi
    
    FILENAME=$(basename "$file")
    DEST_FILE="$DEVICE_DIR/$FILENAME"
    
    printf "${BLUE}  Pushing ${FILENAME}...${NC}\n"
    
    # Push file using run-as (for debug builds)
    # We need to write to a temp location first, then pipe it through run-as
    TEMP_FILE="/sdcard/${FILENAME}.tmp"
    
    # Push to temp location (accessible location)
    adb -s $DEVICE_ID push "$file" "$TEMP_FILE" >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        # Pipe file content through run-as to app directory
        # This works because run-as can read stdin, but can't access /sdcard directly
        adb -s $DEVICE_ID shell "cat $TEMP_FILE | run-as $APP_PACKAGE tee $DEST_FILE >/dev/null 2>&1 && run-as $APP_PACKAGE chmod 600 $DEST_FILE 2>&1" >/dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            # Verify file was written
            FILE_CHECK=$(adb -s $DEVICE_ID shell "run-as $APP_PACKAGE test -f $DEST_FILE && echo 'exists'" 2>/dev/null | tr -d '\r')
            
            if [ "$FILE_CHECK" = "exists" ]; then
                # Clean up temp file
                adb -s $DEVICE_ID shell "rm $TEMP_FILE" 2>/dev/null
                
                FILE_SIZE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
                printf "${GREEN}    ✓ Pushed ${FILENAME} (${FILE_SIZE} bytes)${NC}\n"
                PUSHED_COUNT=$((PUSHED_COUNT + 1))
            else
                printf "${RED}    ✗ Failed to verify ${FILENAME} on device${NC}\n"
                adb -s $DEVICE_ID shell "rm $TEMP_FILE" 2>/dev/null
                FAILED_COUNT=$((FAILED_COUNT + 1))
            fi
        else
            printf "${RED}    ✗ Failed to copy ${FILENAME} to app directory${NC}\n"
            adb -s $DEVICE_ID shell "rm $TEMP_FILE" 2>/dev/null
            FAILED_COUNT=$((FAILED_COUNT + 1))
        fi
    else
        printf "${RED}    ✗ Failed to push ${FILENAME} to temp location${NC}\n"
        FAILED_COUNT=$((FAILED_COUNT + 1))
    fi
done

# Verify files on device
printf "\n${CYAN}Verifying files on device...${NC}\n"
printf "${GREEN}✓ Files now on device:${NC}\n"

# List all .md files in the directory
adb -s $DEVICE_ID shell "run-as $APP_PACKAGE ls -lh $DEVICE_DIR/ 2>/dev/null" | grep '\.md$' | while read -r line; do
    # Extract filename and size from ls -lh output
    FILENAME=$(echo "$line" | awk '{print $NF}')
    FILE_SIZE=$(echo "$line" | awk '{print $5}')
    echo "  - $FILENAME ($FILE_SIZE)"
done

# Summary
printf "\n${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}\n"
printf "${CYAN}║                    📋 Summary 📋                          ║${NC}\n"
printf "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}\n"
echo ""

printf "${GREEN}✓ Push complete!${NC}\n"
echo ""
printf "${CYAN}💡 Next steps:${NC}\n"
printf "${YELLOW}   The app will now use the updated files from device storage.${NC}\n"
printf "${YELLOW}   Restart the app to see changes take effect.${NC}\n"
echo ""

