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

interface FileItem {
  name: string;
  path: string;
}

interface FileExplorerInterfaceProps {
  files: FileItem[];
  onLoadFile: (filePath: string) => Promise<string>;
  onSaveFile: (filePath: string, content: string) => Promise<void>;
  isLoading: boolean;
}

export const FileExplorerInterface: React.FC<FileExplorerInterfaceProps> = ({
  files,
  onLoadFile,
  onSaveFile,
  isLoading,
}) => {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
      console.error('Error loading file:', error);
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
      console.error('Error saving file:', error);
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
      <ScrollView 
        style={styles.fileListContainer}
        contentContainerStyle={styles.fileListContent}
      >
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
});

