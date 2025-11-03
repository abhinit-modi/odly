#!/bin/bash

# Script to pull .md files from device to local development environment
# Pulls from DocumentDirectory (edited files) and optionally from APK assets (bundled files)
# Usage: ./pull-files.sh [options] [device_id]
#   Options:
#     -f, --force    Extract files from APK assets (even if not edited)
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
TEMP_DIR="/tmp/odly_apk_extract"

# Parse arguments
FORCE_APK_EXTRACT=false
AUTO_CONFIRM=false
DEVICE_ID=""

show_help() {
    echo "Usage: ./pull-files.sh [options] [device_id]"
    echo ""
    echo "Options:"
    echo "  -f, --force    Extract files from APK assets (even if not edited)"
    echo "  -y, --yes      Skip confirmation prompts (auto-confirm)"
    echo "  -h, --help     Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./pull-files.sh                    # Pull only edited files from device"
    echo "  ./pull-files.sh -f                 # Pull edited files + extract from APK"
    echo "  ./pull-files.sh -y                 # Auto-confirm all prompts"
    echo "  ./pull-files.sh -f -y              # Force APK extraction with auto-confirm"
    echo "  ./pull-files.sh --force 1B251FDF   # Pull from specific device with APK extraction"
    exit 0
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--force)
            FORCE_APK_EXTRACT=true
            shift
            ;;
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
echo "║         📥 Pull Files from Device to Local 📥            ║"
echo "╚═══════════════════════════════════════════════════════════╝"
printf "${NC}\n"
printf "${BLUE}Device: ${DEVICE_ID}${NC}\n"
printf "${BLUE}Source: ${DEVICE_DIR}${NC}\n"
printf "${BLUE}Destination: ${LOCAL_DIR}${NC}\n"
echo ""

# Create local directory if it doesn't exist
if [ ! -d "$LOCAL_DIR" ]; then
    printf "${YELLOW}⚠ Creating local directory: ${LOCAL_DIR}${NC}\n"
    mkdir -p "$LOCAL_DIR"
fi

# List files on device
printf "\n${CYAN}Checking files on device...${NC}\n"

# Try to list files - this will work if run-as is available (debug builds)
# Note: wildcards don't work with run-as, so we list directory and filter
ALL_FILES=$(adb -s $DEVICE_ID shell "run-as $APP_PACKAGE ls -1 $DEVICE_DIR/ 2>/dev/null" | tr -d '\r')

# Filter for .md files
FILES=""
if [ ! -z "$ALL_FILES" ]; then
    FILES=$(echo "$ALL_FILES" | grep '\.md$')
fi

# If run-as fails, try direct access (requires root or proper permissions)
if [ -z "$FILES" ]; then
    ALL_FILES=$(adb -s $DEVICE_ID shell "ls -1 $DEVICE_DIR/ 2>/dev/null" | tr -d '\r')
    if [ ! -z "$ALL_FILES" ]; then
        FILES=$(echo "$ALL_FILES" | grep '\.md$')
    fi
fi

if [ -z "$FILES" ]; then
    printf "${YELLOW}⚠ No edited .md files found in ${DEVICE_DIR}${NC}\n"
    printf "${YELLOW}ℹ This is normal if files haven't been edited on the device yet.${NC}\n"
    printf "${YELLOW}ℹ Will extract from APK assets instead...${NC}\n"
else
    printf "${GREEN}✓ Found edited files on device:${NC}\n"
    
    # Show files that will be overwritten
    FILES_TO_OVERWRITE=""
    echo "$FILES" | while read -r filename; do
        FILENAME=$(echo "$filename" | tr -d '\r')
        DEST_PATH="$LOCAL_DIR/$FILENAME"
        if [ -f "$DEST_PATH" ]; then
            echo "  - $FILENAME ${YELLOW}(will be overwritten)${NC}"
            FILES_TO_OVERWRITE="yes"
        else
            echo "  - $FILENAME ${GREEN}(new file)${NC}"
        fi
    done
    
    # Ask for confirmation (unless auto-confirm is enabled)
    if [ "$AUTO_CONFIRM" = false ]; then
        printf "\n${YELLOW}⚠ This will overwrite local files with versions from the device.${NC}\n"
        printf "${CYAN}Do you want to continue? (y/N): ${NC}"
        read -r CONFIRM
        
        if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
            printf "${RED}✗ Operation cancelled by user${NC}\n"
            exit 0
        fi
    else
        printf "\n${GREEN}✓ Auto-confirmed: Will pull edited files${NC}\n"
    fi

    # Pull each file
    printf "\n${CYAN}Pulling edited files...${NC}\n"
    PULLED_COUNT=0
    FAILED_COUNT=0

    echo "$FILES" | while read -r filename; do
        FILENAME=$(echo "$filename" | tr -d '\r')
        DEVICE_FILE="$DEVICE_DIR/$FILENAME"
        DEST_PATH="$LOCAL_DIR/$FILENAME"
        
        printf "${BLUE}  Pulling ${FILENAME}...${NC}\n"
        
        # Try with run-as first (for debug builds), then fall back to direct access
        # Use exec-out to read file content and save it
        FILE_CONTENT=$(adb -s $DEVICE_ID exec-out "run-as $APP_PACKAGE cat $DEVICE_FILE 2>/dev/null" 2>/dev/null)
        
        if [ $? -ne 0 ] || [ -z "$FILE_CONTENT" ]; then
            # Try direct access (requires root)
            FILE_CONTENT=$(adb -s $DEVICE_ID exec-out "cat $DEVICE_FILE 2>/dev/null" 2>/dev/null)
        fi
        
        if [ $? -eq 0 ] && [ ! -z "$FILE_CONTENT" ]; then
            echo "$FILE_CONTENT" > "$DEST_PATH"
            FILE_SIZE=$(stat -f%z "$DEST_PATH" 2>/dev/null || stat -c%s "$DEST_PATH" 2>/dev/null)
            printf "${GREEN}    ✓ Pulled ${FILENAME} (${FILE_SIZE} bytes)${NC}\n"
            PULLED_COUNT=$((PULLED_COUNT + 1))
        else
            printf "${RED}    ✗ Failed to pull ${FILENAME}${NC}\n"
            FAILED_COUNT=$((FAILED_COUNT + 1))
        fi
    done
fi

# Optionally extract files from APK assets (files that haven't been edited on device)
if [ "$FORCE_APK_EXTRACT" = true ]; then
    EXTRACT_APK=false
    
    # Ask for confirmation (unless auto-confirm is enabled)
    if [ "$AUTO_CONFIRM" = false ]; then
        printf "\n${CYAN}Preparing to extract files from APK assets...${NC}\n"
        printf "${YELLOW}⚠ This will extract all .md files from the APK and may overwrite local files.${NC}\n"
        printf "${CYAN}Do you want to continue with APK extraction? (y/N): ${NC}"
        read -r CONFIRM_APK
        
        if [[ ! "$CONFIRM_APK" =~ ^[Yy]$ ]]; then
            printf "${YELLOW}⊘ Skipped APK extraction${NC}\n"
        else
            EXTRACT_APK=true
        fi
    else
        printf "\n${GREEN}✓ Auto-confirmed: Will extract from APK${NC}\n"
        EXTRACT_APK=true
    fi
    
    if [ "$EXTRACT_APK" = true ]; then
        printf "\n${CYAN}Extracting files from APK assets...${NC}\n"

        # Get APK path from device
        APK_PATH=$(adb -s $DEVICE_ID shell pm path $APP_PACKAGE | grep base.apk | cut -d':' -f2 | tr -d '\r')

        if [ -z "$APK_PATH" ]; then
            printf "${YELLOW}⚠ Could not find APK path on device${NC}\n"
        else
            printf "${BLUE}APK Path: ${APK_PATH}${NC}\n"
            
            # Create temp directory
            rm -rf "$TEMP_DIR"
            mkdir -p "$TEMP_DIR"
            
            # Pull APK from device
            printf "${BLUE}  Pulling APK...${NC}\n"
            adb -s $DEVICE_ID pull "$APK_PATH" "$TEMP_DIR/base.apk" >/dev/null 2>&1
            
            if [ $? -eq 0 ]; then
                # Extract assets from APK
                printf "${BLUE}  Extracting aham files from APK...${NC}\n"
                unzip -q "$TEMP_DIR/base.apk" "assets/aham/*.md" -d "$TEMP_DIR" 2>/dev/null
                
                if [ -d "$TEMP_DIR/assets/aham" ]; then
                    # Copy extracted files to local directory
                    for file in "$TEMP_DIR/assets/aham"/*.md; do
                        if [ -f "$file" ]; then
                            FILENAME=$(basename "$file")
                            DEST_PATH="$LOCAL_DIR/$FILENAME"
                            
                            # Only copy if file doesn't exist locally or if APK version is different
                            if [ ! -f "$DEST_PATH" ] || ! cmp -s "$file" "$DEST_PATH"; then
                                cp "$file" "$DEST_PATH"
                                printf "${GREEN}    ✓ Extracted ${FILENAME} from APK${NC}\n"
                            else
                                printf "${BLUE}    • ${FILENAME} unchanged${NC}\n"
                            fi
                        fi
                    done
                else
                    printf "${YELLOW}    ⚠ No aham files found in APK assets${NC}\n"
                fi
                
                # Cleanup
                rm -rf "$TEMP_DIR"
            else
                printf "${RED}    ✗ Failed to pull APK${NC}\n"
            fi
        fi
    fi
else
    printf "\n${BLUE}ℹ Skipping APK extraction (use -f or --force to extract from APK)${NC}\n"
fi

# Summary
printf "\n${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}\n"
printf "${CYAN}║                    📋 Summary 📋                          ║${NC}\n"
printf "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}\n"
echo ""

# List local files
LOCAL_FILES=$(ls -1 $LOCAL_DIR/*.md 2>/dev/null)
if [ -z "$LOCAL_FILES" ]; then
    printf "${YELLOW}⚠ No files in ${LOCAL_DIR}${NC}\n"
else
    printf "${GREEN}Files now in ${LOCAL_DIR}:${NC}\n"
    echo "$LOCAL_FILES" | while read -r file; do
        FILENAME=$(basename "$file")
        FILE_SIZE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
        MODIFIED=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$file" 2>/dev/null || stat -c "%y" "$file" 2>/dev/null | cut -d'.' -f1)
        echo "  - $FILENAME (${FILE_SIZE} bytes) [Modified: $MODIFIED]"
    done
fi

printf "\n${GREEN}✓ Pull complete!${NC}\n"
echo ""
printf "${CYAN}💡 Next steps:${NC}\n"
printf "${YELLOW}   Review the files: ls -lh ${LOCAL_DIR}${NC}\n"
printf "${YELLOW}   If satisfied, commit them:${NC}\n"
printf "${YELLOW}     git add ${LOCAL_DIR}${NC}\n"
printf "${YELLOW}     git commit -m \"Update markdown files from device\"${NC}\n"
echo ""

