# File Sync Scripts Guide

This guide explains how to sync `.md` files between your local development environment and Android device.

## Overview

- **`pull-files.sh`** - Pull files from device to local
- **`push-files.sh`** - Push files from local to device

Both scripts include safety checks and confirmation prompts to prevent accidental data loss.

---

## Pull Files (Device → Local)

### Basic Usage

```bash
# Pull only edited files (asks for confirmation)
./pull-files.sh

# Pull edited files with auto-confirm
./pull-files.sh -y

# Extract from APK assets (includes unedited files)
./pull-files.sh -f

# Extract from APK with auto-confirm
./pull-files.sh -f -y

# Show help
./pull-files.sh --help
```

### Options

- `-f, --force` - Extract files from APK assets (even if not edited on device)
- `-y, --yes` - Skip confirmation prompts (auto-confirm)
- `-h, --help` - Show help message

### What It Does

1. **Checks device for edited files** in `/data/data/com.odly/files/aham/`
2. **Shows which files will be overwritten** vs. new files
3. **Asks for confirmation** before overwriting local files
4. **Optionally extracts from APK** (with `-f` flag) to get unedited files

### Example Output

```
✓ Found edited files on device:
  - play.md (will be overwritten)
  - work.md (will be overwritten)

⚠ This will overwrite local files with versions from the device.
Do you want to continue? (y/N): y

Pulling edited files...
  Pulling play.md...
    ✓ Pulled play.md (428 bytes)
  Pulling work.md...
    ✓ Pulled work.md (134 bytes)
```

---

## Push Files (Local → Device)

### Basic Usage

```bash
# Push local files to device (asks for confirmation)
./push-files.sh

# Push with auto-confirm
./push-files.sh -y

# Show help
./push-files.sh --help
```

### Options

- `-y, --yes` - Skip confirmation prompts (auto-confirm)
- `-h, --help` - Show help message

### What It Does

1. **Scans local directory** `android/app/src/main/assets/aham/` for `.md` files
2. **Compares with device** to show which files will be overwritten
3. **Asks for confirmation** before pushing
4. **Pushes files to device** at `/data/data/com.odly/files/aham/`
5. **Verifies** files were successfully copied

### Example Output

```
✓ Found local files:
  - fun.md (new file on device)
  - gig.md (new file on device)
  - love.md (new file on device)
  - play.md (will be overwritten on device)
  - work.md (will be overwritten on device)

⚠ This will push local files to the device and may overwrite existing versions.
Do you want to continue? (y/N): y

Pushing files to device...
  Pushing fun.md...
    ✓ Pushed fun.md (381 bytes)
  ...
```

---

## Understanding File Locations

### Android File Structure

```
Device (Read-only assets in APK):
  /data/app/.../base.apk
    └── assets/aham/*.md         (Bundled with app, read-only)

Device (Writable storage):
  /data/data/com.odly/files/aham/*.md   (Created when files are edited)

Local (Development):
  android/app/src/main/assets/aham/*.md (Bundled into APK on build)
```

### How The App Works

1. **First run**: App reads from bundled assets (read-only)
2. **When editing**: App creates writable copy in DocumentDirectory
3. **After editing**: App reads from DocumentDirectory (edits persist)
4. **On reinstall**: Edits in DocumentDirectory are lost (unless backed up)

### Sync Workflow

```
┌──────────────┐         pull          ┌──────────────┐
│              │ ◄───────────────────── │              │
│    Local     │                        │    Device    │
│  (Dev Env)   │ ────────────────────► │  (Android)   │
│              │         push           │              │
└──────────────┘                        └──────────────┘
```

---

## Common Workflows

### 1. Get Latest Changes from Device

After making changes in the app:

```bash
./pull-files.sh
# Review changes
git diff android/app/src/main/assets/aham/
# Commit if satisfied
git add android/app/src/main/assets/aham/
git commit -m "Update markdown files from device"
```

### 2. Push Local Changes to Device

After editing files locally:

```bash
./push-files.sh
# Restart app on device to see changes
```

### 3. Reset Device Files to Bundled Versions

To get all files including unedited ones:

```bash
./pull-files.sh -f
```

### 4. Automated CI/CD

For scripts and automation:

```bash
# Pull without prompts
./pull-files.sh -y

# Push without prompts
./push-files.sh -y
```

---

## Troubleshooting

### No Device Connected

```
✗ No device connected
```

**Solution**: Connect your Android device and ensure USB debugging is enabled.

```bash
adb devices  # Should show your device
```

### Permission Denied

**Solution**: Make sure you're using a **debug build** (not release). Debug builds allow `run-as` access.

```bash
# Rebuild debug version
npm run android
```

### Files Not Found on Device

**Solution**: This is normal if files haven't been edited yet. Use `-f` flag to extract from APK:

```bash
./pull-files.sh -f
```

---

## Safety Features

Both scripts include:

✅ **Confirmation prompts** - Prevents accidental overwrites
✅ **File status indicators** - Shows what will be overwritten vs. new
✅ **Auto-confirm flag** (`-y`) - For automation while keeping safety in interactive use
✅ **Detailed summaries** - Shows exactly what was synced
✅ **Error handling** - Clear error messages and graceful failures

---

## Tips

1. **Always pull before pushing** to avoid losing device changes
2. **Review diffs** after pulling to see what changed
3. **Use `-y` flag carefully** - only in automation or when you're certain
4. **Keep backups** - Commit pulled files to git regularly
5. **Test on device** after pushing to verify changes

---

## Quick Reference

| Action | Command |
|--------|---------|
| Pull edited files | `./pull-files.sh` |
| Pull all files (including unedited) | `./pull-files.sh -f` |
| Push local files | `./push-files.sh` |
| Auto-confirm pull | `./pull-files.sh -y` |
| Auto-confirm push | `./push-files.sh -y` |
| Show help | `./pull-files.sh --help` or `./push-files.sh --help` |

