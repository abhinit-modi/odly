import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  ToastAndroid,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { log } from '../utils/logger';

interface FileItem {
  name: string;
  path: string;
}

interface FileExplorerInterfaceProps {
  files: FileItem[];
  onLoadFile: (filePath: string) => Promise<string>;
  onSaveFile: (filePath: string, content: string) => Promise<void>;
  onCreateFile: (fileName: string) => Promise<void>;
  onDeleteFile: (fileName: string) => Promise<void>;
  onRenameFile: (oldFileName: string, newFileName: string) => Promise<void>;
  isLoading: boolean;
}

export const FileExplorerInterface: React.FC<FileExplorerInterfaceProps> = ({
  files,
  onLoadFile,
  onSaveFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  isLoading,
}) => {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isRenamingFile, setIsRenamingFile] = useState(false);
  const [fileToRename, setFileToRename] = useState<FileItem | null>(null);
  const [renameFileName, setRenameFileName] = useState('');

  const handleFileClick = useCallback(async (file: FileItem) => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to discard them?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: async () => {
              await loadFile(file);
            }
          }
        ]
      );
    } else {
      await loadFile(file);
    }
  }, [hasUnsavedChanges]);

  const loadFile = async (file: FileItem) => {
    setIsLoadingFile(true);
    try {
      const content = await onLoadFile(file.path);
      setFileContent(content);
      setSelectedFile(file);
      setHasUnsavedChanges(false);
    } catch (error) {
      log.error('Error loading file:', error);
      Alert.alert('Error', `Failed to load ${file.name}`);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (!selectedFile) return;

    setIsSaving(true);
    try {
      await onSaveFile(selectedFile.path, fileContent);
      setHasUnsavedChanges(false);
      if (Platform.OS === 'android') {
        ToastAndroid.show('File saved successfully!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', 'File saved successfully!');
      }
    } catch (error) {
      log.error('Error saving file:', error);
      Alert.alert('Error', 'Failed to save file');
    } finally {
      setIsSaving(false);
    }
  }, [selectedFile, fileContent, onSaveFile]);

  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to discard them?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setSelectedFile(null);
              setFileContent('');
              setHasUnsavedChanges(false);
            }
          }
        ]
      );
    } else {
      setSelectedFile(null);
      setFileContent('');
    }
  }, [hasUnsavedChanges]);

  const handleContentChange = useCallback((text: string) => {
    setFileContent(text);
    setHasUnsavedChanges(true);
  }, []);

  const handleCreateFile = useCallback(async () => {
    if (!newFileName.trim()) {
      Alert.alert('Error', 'Please enter a file name');
      return;
    }

    try {
      await onCreateFile(newFileName.trim());
      setNewFileName('');
      setIsCreatingFile(false);
      if (Platform.OS === 'android') {
        ToastAndroid.show('File created successfully!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', 'File created successfully!');
      }
    } catch (error) {
      log.error('Error creating file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create file';
      Alert.alert('Error', errorMessage);
    }
  }, [newFileName, onCreateFile]);

  const handleCancelCreate = useCallback(() => {
    setIsCreatingFile(false);
    setNewFileName('');
  }, []);

  const handleFileLongPress = useCallback((file: FileItem) => {
    Alert.alert(
      file.name,
      'What would you like to do?',
      [
        {
          text: 'Rename',
          onPress: () => {
            setFileToRename(file);
            setRenameFileName(file.name.replace('.md', ''));
            setIsRenamingFile(true);
          }
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete File',
              `Are you sure you want to delete "${file.name}"? This cannot be undone.`,
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await onDeleteFile(file.name);
                      if (Platform.OS === 'android') {
                        ToastAndroid.show('File deleted successfully!', ToastAndroid.SHORT);
                      } else {
                        Alert.alert('Success', 'File deleted successfully!');
                      }
                    } catch (error) {
                      log.error('Error deleting file:', error);
                      const errorMessage = error instanceof Error ? error.message : 'Failed to delete file';
                      Alert.alert('Error', errorMessage);
                    }
                  }
                }
              ]
            );
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }, [onDeleteFile]);

  const handleRenameFile = useCallback(async () => {
    if (!fileToRename || !renameFileName.trim()) {
      Alert.alert('Error', 'Please enter a file name');
      return;
    }

    try {
      await onRenameFile(fileToRename.name, renameFileName.trim());
      setRenameFileName('');
      setIsRenamingFile(false);
      setFileToRename(null);
      if (Platform.OS === 'android') {
        ToastAndroid.show('File renamed successfully!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', 'File renamed successfully!');
      }
    } catch (error) {
      log.error('Error renaming file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to rename file';
      Alert.alert('Error', errorMessage);
    }
  }, [fileToRename, renameFileName, onRenameFile]);

  const handleCancelRename = useCallback(() => {
    setIsRenamingFile(false);
    setFileToRename(null);
    setRenameFileName('');
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BCD4" />
        <Text style={styles.loadingText}>Loading files...</Text>
      </View>
    );
  }

  if (selectedFile) {
    return (
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Editor Header */}
        <View style={styles.editorHeader}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.fileName} numberOfLines={1}>
            {selectedFile.name}
            {hasUnsavedChanges && ' *'}
          </Text>
          <TouchableOpacity
            style={[
              styles.saveButton,
              (isSaving || !hasUnsavedChanges) && styles.buttonDisabled
            ]}
            onPress={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>💾</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Text Editor */}
        <ScrollView 
          style={styles.editorContainer}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            style={styles.editor}
            value={fileContent}
            onChangeText={handleContentChange}
            multiline
            editable={!isSaving && !isLoadingFile}
            placeholder="File content..."
            placeholderTextColor="#80868b"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Create File Modal */}
      {isCreatingFile && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New File</Text>
            <Text style={styles.modalSubtitle}>Enter a name for your new .md file</Text>
            <TextInput
              style={styles.modalInput}
              value={newFileName}
              onChangeText={setNewFileName}
              placeholder="e.g., ideas, notes, journal"
              placeholderTextColor="#80868b"
              autoFocus
              maxLength={50}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={handleCancelCreate}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButtonCreate,
                  !newFileName.trim() && styles.buttonDisabled
                ]}
                onPress={handleCreateFile}
                disabled={!newFileName.trim()}
              >
                <Text style={styles.modalButtonCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Rename File Modal */}
      {isRenamingFile && fileToRename && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename File</Text>
            <Text style={styles.modalSubtitle}>Enter a new name for {fileToRename.name}</Text>
            <TextInput
              style={styles.modalInput}
              value={renameFileName}
              onChangeText={setRenameFileName}
              placeholder="e.g., ideas, notes, journal"
              placeholderTextColor="#80868b"
              autoFocus
              maxLength={50}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={handleCancelRename}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButtonCreate,
                  !renameFileName.trim() && styles.buttonDisabled
                ]}
                onPress={handleRenameFile}
                disabled={!renameFileName.trim()}
              >
                <Text style={styles.modalButtonCreateText}>Rename</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ScrollView 
        style={styles.fileListContainer}
        contentContainerStyle={styles.fileListContent}
      >
        {/* Create New File Button */}
        <TouchableOpacity
          style={styles.createFileButton}
          onPress={() => setIsCreatingFile(true)}
        >
          <Text style={styles.createFileIcon}>➕</Text>
          <Text style={styles.createFileText}>Create New File</Text>
        </TouchableOpacity>

        {files.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🏰</Text>
            <Text style={styles.emptyStateTitle}>No Files Found</Text>
            <Text style={styles.emptyStateText}>
              No files available in the aham directory
            </Text>
          </View>
        ) : (
          files.map((file, index) => (
            <TouchableOpacity
              key={index}
              style={styles.fileItem}
              onPress={() => handleFileClick(file)}
              onLongPress={() => handleFileLongPress(file)}
              delayLongPress={500}
            >
              <Text style={styles.fileIcon}>📄</Text>
              <Text style={styles.fileNameText}>{file.name}</Text>
              <Text style={styles.fileChevron}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5DEB3',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5DEB3',
  },
  loadingText: {
    fontSize: 16,
    color: '#00838F',
    marginTop: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  fileListContainer: {
    flex: 1,
  },
  fileListContent: {
    padding: 20,
  },
  listHeader: {
    fontSize: 24,
    fontWeight: '900',
    color: '#006064',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#00BCD4',
    shadowColor: '#00ACC1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  fileIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  fileNameText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#004D40',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  fileChevron: {
    fontSize: 24,
    color: '#00BCD4',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00838F',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#0097A7',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A8DADC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#00BCD4',
    gap: 12,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#00BCD4',
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  fileName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#006064',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  saveButton: {
    width: 44,
    height: 44,
    backgroundColor: '#7CB342',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#558B2F',
  },
  saveButtonText: {
    fontSize: 24,
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  editorContainer: {
    flex: 1,
  },
  editor: {
    flex: 1,
    padding: 20,
    fontSize: 15,
    lineHeight: 24,
    color: '#004D40',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlignVertical: 'top',
    minHeight: 600,
  },
  createFileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7CB342',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#558B2F',
    shadowColor: '#7CB342',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  createFileIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  createFileText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#00BCD4',
    shadowColor: '#00ACC1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#006064',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#0097A7',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 2,
    borderColor: '#00BCD4',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#004D40',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 20,
    backgroundColor: '#F5F5F5',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: '#FF6F61',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E85D4F',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalButtonCreate: {
    flex: 1,
    backgroundColor: '#7CB342',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#558B2F',
  },
  modalButtonCreateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

