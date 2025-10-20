# Delete and Rename Files Feature - Implementation Summary

## Overview
Added the ability to delete and rename `.md` files in the aham directory. When files are deleted or renamed, the tags in the chat interface are automatically updated to reflect the changes.

## Changes Made

### 1. FileService (`src/services/FileService.ts`)

#### New Method: `deleteAhamFile(fileName: string)`
- Deletes files from the DocumentDirectory
- Only allows deletion of user-created files (not default asset files)
- Throws error if file doesn't exist or is a protected asset file
- Uses `RNFS.unlink()` to remove files

#### New Method: `renameAhamFile(oldFileName: string, newFileName: string)`
- Renames files in the DocumentDirectory
- Sanitizes new file names (alphanumeric and hyphens only)
- For asset files, creates a writable copy before renaming
- Checks for duplicate names before renaming
- Uses `RNFS.moveFile()` to perform the rename

### 2. FileExplorerInterface (`src/components/FileExplorerInterface.tsx`)

#### New Props
- `onDeleteFile: (fileName: string) => Promise<void>` - Callback for file deletion
- `onRenameFile: (oldFileName: string, newFileName: string) => Promise<void>` - Callback for file rename

#### New State Variables
- `isRenamingFile`: Controls rename modal visibility
- `fileToRename`: Stores the file being renamed
- `renameFileName`: Stores the new file name input

#### New UI Components
- **Long Press Menu**: Shows when user long-presses a file
  - "Rename" option
  - "Delete" option (with red destructive styling)
  - "Cancel" option
- **Rename Modal Dialog**: Similar to create modal
  - Shows current file name in subtitle
  - Text input for new name
  - Cancel and Rename buttons
- **Delete Confirmation**: Double confirmation for safety
  - First alert on long-press menu
  - Second confirmation alert before actual deletion

#### New Handlers
- `handleFileLongPress(file: FileItem)`: Shows action menu on long press
- `handleRenameFile()`: Performs the rename operation
- `handleCancelRename()`: Cancels rename and closes modal

#### Updated Handlers
- File items now support `onLongPress` with 500ms delay

### 3. LLMQueryApp (`src/components/LLMQueryApp.tsx`)

#### New Handler: `handleDeleteFile(fileName: string)`
- Deletes file using FileService
- Refreshes file list after deletion
- Updates available tags to remove deleted file's tag
- Logs all operations

#### New Handler: `handleRenameFile(oldFileName: string, newFileName: string)`
- Renames file using FileService
- Refreshes file list after rename
- Updates available tags to reflect new file name
- Logs all operations

#### Updated Props Passing
- Passes `onDeleteFile` to FileExplorerInterface
- Passes `onRenameFile` to FileExplorerInterface

## User Flow

### Deleting a File
1. User navigates to Files tab (🏰)
2. User **long-presses** on a file (hold for 500ms)
3. Action menu appears with options
4. User taps "Delete"
5. Confirmation dialog appears: "Are you sure you want to delete...?"
6. User confirms deletion
7. File is deleted from storage
8. File disappears from file list
9. Tag automatically removed from chat interface
10. Success message is displayed

### Renaming a File
1. User navigates to Files tab (🏰)
2. User **long-presses** on a file (hold for 500ms)
3. Action menu appears with options
4. User taps "Rename"
5. Rename modal appears with current name pre-filled
6. User enters new name (e.g., "personal-notes")
7. User taps "Rename" button
8. File is renamed in storage
9. File list updates with new name
10. Old tag replaced with new tag in chat interface
11. Success message is displayed

### Auto-Update Behavior
- **Chat Tags**: Automatically updated when files are deleted/renamed
  - Deleted file: Tag removed from chat interface
  - Renamed file: Old tag replaced with new tag
- **File List**: Refreshes immediately after any operation
- **Search Context**: Automatically uses updated file list

## File Operation Rules

### Deletion Rules
- Only user-created files in DocumentDirectory can be deleted
- Default asset files (gig.md, fun.md, love.md, play.md, work.md) **cannot** be deleted
- Attempting to delete a non-existent or asset file shows error
- Deletion is permanent and cannot be undone

### Rename Rules
- Same sanitization rules as file creation
- Only alphanumeric characters and hyphens allowed
- Automatically converted to lowercase
- Duplicate names are prevented
- For asset files: Creates writable copy before renaming
- Extension `.md` is automatically maintained

## UI/UX Features

### Long Press Interaction
- Delay: 500ms (half second)
- Visual: Standard touch feedback
- Works on any file in the list
- Doesn't interfere with normal tap to open

### Alert Dialogs
- **Delete**: Two-step confirmation for safety
  1. Action menu selection
  2. Final confirmation with file name
- **Rename**: Modal with pre-filled current name
- **Success/Error**: Toast notifications (Android) or alerts (iOS)

### Modal Design
- Consistent with existing create modal
- Shows relevant context (current file name)
- Auto-focus on input field
- Disabled button when input is empty
- Matches app color scheme

## Technical Details

### File Storage Locations
- **Asset Files** (Read-only): `android/app/src/main/assets/aham/`
- **User Files** (Writable): `DocumentDirectory/aham/`

### Protection of Default Files
- Default files can only be deleted if first edited (creates writable copy)
- If only in assets, deletion is blocked
- Renaming creates a writable copy, then renames it

### Tag Synchronization
After any file operation (create/delete/rename):
1. File list is refreshed from FileService
2. New tags array is generated from file names
3. Chat interface receives updated tags
4. Old tags automatically removed from UI

### Error Handling
- Invalid file names show error alert
- Duplicate file names show error alert
- Missing files show error alert
- Protected asset file deletion shows error
- All errors are logged for debugging

## Benefits

1. **File Management**: Full CRUD operations on files
2. **Dynamic Updates**: Tags automatically stay in sync
3. **Safe Operations**: Multiple confirmations prevent accidents
4. **Flexible Organization**: Users can reorganize their content
5. **Asset Protection**: Default files are protected from accidental deletion
6. **User Feedback**: Clear success/error messages

## Example Use Cases

### Creating a Journal
1. Create "daily-journal.md"
2. Tag messages with "#daily-journal"
3. Later rename to "personal-diary.md"
4. Tag automatically becomes "#personal-diary"
5. All old messages keep their tag association

### Cleaning Up
1. Create test file "test.md"
2. Experiment with features
3. Long-press and delete when done
4. File and tag completely removed

### Reorganizing
1. Have "random-thoughts.md"
2. Rename to "ideas.md" for better organization
3. Tag changes from "#random-thoughts" to "#ideas"
4. Continue using the updated tag

## Important Notes

- **File Deletion is Permanent**: No undo or trash feature
- **Default Files**: gig.md, fun.md, love.md, play.md, work.md can be renamed but deletion requires creating writable copy first
- **Tag Updates**: Existing messages keep their tags even after file rename/delete
- **Long Press Duration**: 500ms - users should hold, not tap quickly

