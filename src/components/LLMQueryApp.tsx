import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
  TouchableOpacity,
  ToastAndroid,
} from 'react-native';
import { QueryInterface } from './QueryInterface';
import { ChatInterface } from './ChatInterface';
import { FileExplorerInterface } from './FileExplorerInterface';
import { LLMService } from '../services/LLMService';
import { FileService } from '../services/FileService';
import { AnswerService } from '../services/AnswerService';
import { ChatService } from '../services/ChatService';
import { GroupbyService } from '../services/GroupbyService';
import { log } from '../utils/logger';

type TabType = 'search' | 'chat' | 'files';

export const LLMQueryApp: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [filesLoaded, setFilesLoaded] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isGrouping, setIsGrouping] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [fileList, setFileList] = useState<Array<{ name: string; path: string }>>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const llmService = LLMService.getInstance();
  const fileService = FileService.getInstance();
  const answerService = AnswerService.getInstance();
  const chatService = ChatService.getInstance();
  const groupbyService = GroupbyService.getInstance();

  // Initialize the app
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = useCallback(async () => {
    try {
      setIsInitializing(true);
      setInitializationError(null);

      // Check TinyLlama model first
      log.info('Checking TinyLlama GGUF model...');
      const modelCheck = await fileService.checkTinyLlamaModel();
      if (!modelCheck.exists) {
        throw new Error(`TinyLlama model not found at: ${modelCheck.path}`);
      }
      log.info(`TinyLlama model found: ${(modelCheck.size / 1024 / 1024).toFixed(1)}MB`);
      log.info(`TinyLlama model path: ${modelCheck.path}`);

      // Load files from aham directory
      log.info('Loading files from aham directory...');
      const files = await answerService.getAvailableFiles();
      setAvailableFiles(files);
      setFilesLoaded(true);
      log.info('Files loaded successfully:', files);

      // Initialize LLM service with TinyLlama using the found model path
      log.info('Initializing TinyLlama GGUF model...');
      await llmService.initialize(modelCheck.path);
      log.info('TinyLlama model initialized successfully');

      // Get model information
      const info = llmService.getModelInfo();
      setModelInfo(info);

      // Initialize chat service and load messages (non-blocking)
      log.info('Initializing chat service...');
      try {
        await chatService.initialize();
        setChatMessages(chatService.getMessages());
        log.info('Chat service initialized');
      } catch (chatError) {
        log.error('Chat service initialization failed, continuing anyway:', chatError);
        // Continue even if chat fails - don't block the app
      }

      // Load file list for file explorer and generate tags
      log.info('Loading file list...');
      const ahamFiles = await fileService.getAhamFileList();
      setFileList(ahamFiles);
      log.info('File list loaded:', ahamFiles);
      
      // Generate tags from file list (remove .md extension and add # prefix)
      const tags = ahamFiles.map(file => `#${file.name.replace('.md', '')}`);
      setAvailableTags(tags);
      log.info('Available tags:', tags);

    } catch (error) {
      log.error('Initialization error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setInitializationError(errorMessage);
      Alert.alert(
        'Initialization Error',
        `Failed to initialize the app: ${errorMessage}`,
        [{ text: 'Retry', onPress: initializeApp }]
      );
    } finally {
      setIsInitializing(false);
    }
  }, [llmService, fileService, answerService, chatService]);

  const handleQuery = useCallback(async (query: string, selectedTags: string[]): Promise<{ answer: string; sources: string[] }> => {
    if (!answerService.isReady()) {
      throw new Error('Answer service is not ready');
    }

    setIsQuerying(true);
    try {
      // Convert tags to file names (e.g., '#gig' -> 'gig.md')
      const selectedFileNames = selectedTags.length > 0 
        ? selectedTags.map(tag => `${tag.replace('#', '')}.md`)
        : undefined; // undefined means use all files
      
      log.info('HandleQuery: Selected tags:', selectedTags);
      log.info('HandleQuery: Filtering to files:', selectedFileNames || 'all files');
      
      const response = await answerService.answerQuery(query, selectedFileNames);
      return {
        answer: response.answer,
        sources: response.sources,
      };
    } catch (error) {
      log.error('Query execution error:', error);
      throw error;
    } finally {
      setIsQuerying(false);
    }
  }, [answerService]);

  const handleSaveMessage = useCallback(async (message: string, tags: string[]) => {
    try {
      await chatService.saveMessage(message, tags);
      setChatMessages(chatService.getMessages());
    } catch (error) {
      log.error('Error saving message:', error);
      Alert.alert('Error', 'Failed to save message');
    }
  }, [chatService]);

  const handleClearMessages = useCallback(async () => {
    Alert.alert(
      'Clear All Messages',
      'Are you sure you want to delete all messages? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.clearAllMessages();
              setChatMessages([]);
              if (Platform.OS === 'android') {
                ToastAndroid.show('All messages cleared', ToastAndroid.SHORT);
              }
            } catch (error) {
              log.error('Error clearing messages:', error);
              Alert.alert('Error', 'Failed to clear messages');
            }
          }
        }
      ]
    );
  }, [chatService]);

  const handleDeleteMessage = useCallback(async (id: string) => {
    try {
      await chatService.deleteMessage(id);
      setChatMessages(chatService.getMessages());
      if (Platform.OS === 'android') {
        ToastAndroid.show('Message deleted', ToastAndroid.SHORT);
      }
    } catch (error) {
      log.error('Error deleting message:', error);
      Alert.alert('Error', 'Failed to delete message');
    }
  }, [chatService]);

  const handleUpdateMessage = useCallback(async (id: string, newText: string, tags: string[]) => {
    try {
      await chatService.updateMessage(id, newText, tags);
      setChatMessages(chatService.getMessages());
      if (Platform.OS === 'android') {
        ToastAndroid.show('Message updated', ToastAndroid.SHORT);
      }
    } catch (error) {
      log.error('Error updating message:', error);
      Alert.alert('Error', 'Failed to update message');
    }
  }, [chatService]);

  const handleLoadFile = useCallback(async (filePath: string): Promise<string> => {
    try {
      return await fileService.loadFileForEditing(filePath);
    } catch (error) {
      log.error('Error loading file:', error);
      throw error;
    }
  }, [fileService]);

  const handleSaveFile = useCallback(async (filePath: string, content: string): Promise<void> => {
    try {
      await fileService.saveEditedFile(filePath, content);
    } catch (error) {
      log.error('Error saving file:', error);
      throw error;
    }
  }, [fileService]);

  const handleCreateFile = useCallback(async (fileName: string): Promise<void> => {
    try {
      await fileService.createAhamFile(fileName);
      log.info('File created successfully:', fileName);
      
      // Refresh file list
      const ahamFiles = await fileService.getAhamFileList();
      setFileList(ahamFiles);
      log.info('File list refreshed after creation:', ahamFiles);
      
      // Update available tags
      const tags = ahamFiles.map(file => `#${file.name.replace('.md', '')}`);
      setAvailableTags(tags);
      log.info('Tags updated after file creation:', tags);
    } catch (error) {
      log.error('Error creating file:', error);
      throw error;
    }
  }, [fileService]);

  const handleDeleteFile = useCallback(async (fileName: string): Promise<void> => {
    try {
      await fileService.deleteAhamFile(fileName);
      log.info('File deleted successfully:', fileName);
      
      // Refresh file list
      const ahamFiles = await fileService.getAhamFileList();
      setFileList(ahamFiles);
      log.info('File list refreshed after deletion:', ahamFiles);
      
      // Update available tags
      const tags = ahamFiles.map(file => `#${file.name.replace('.md', '')}`);
      setAvailableTags(tags);
      log.info('Tags updated after file deletion:', tags);
    } catch (error) {
      log.error('Error deleting file:', error);
      throw error;
    }
  }, [fileService]);

  const handleRenameFile = useCallback(async (oldFileName: string, newFileName: string): Promise<void> => {
    try {
      await fileService.renameAhamFile(oldFileName, newFileName);
      log.info('File renamed successfully:', oldFileName, '->', newFileName);
      
      // Refresh file list
      const ahamFiles = await fileService.getAhamFileList();
      setFileList(ahamFiles);
      log.info('File list refreshed after rename:', ahamFiles);
      
      // Update available tags
      const tags = ahamFiles.map(file => `#${file.name.replace('.md', '')}`);
      setAvailableTags(tags);
      log.info('Tags updated after file rename:', tags);
    } catch (error) {
      log.error('Error renaming file:', error);
      throw error;
    }
  }, [fileService]);

  const handlePushMessages = useCallback(async () => {
    if (chatMessages.length === 0) {
      return;
    }

    setIsPushing(true);
    try {
      log.info('Pushing messages to aham files...');

      // Group messages by their first tag
      const messagesByTag: { [tag: string]: Array<{ text: string; timestamp: Date }> } = {};
      
      for (const message of chatMessages) {
        const firstTag = message.tags && message.tags.length > 0 ? message.tags[0] : '#random';
        if (!messagesByTag[firstTag]) {
          messagesByTag[firstTag] = [];
        }
        messagesByTag[firstTag].push({
          text: message.text,
          timestamp: message.timestamp,
        });
      }

      log.info('Grouped messages by tags:', Object.keys(messagesByTag));

      // Append to each corresponding file
      let successCount = 0;
      let failCount = 0;

      for (const [tag, messages] of Object.entries(messagesByTag)) {
        try {
          await fileService.appendToAhamFile(tag, messages);
          successCount++;
          log.info(`✓ Pushed ${messages.length} messages to ${tag}`);
        } catch (error) {
          failCount++;
          log.error(`✗ Failed to push messages to ${tag}:`, error);
        }
      }

      // Show result and clear if successful
      if (failCount === 0) {
        // Clear conversation history on success
        await chatService.clearAllMessages();
        setChatMessages([]);
        
        if (Platform.OS === 'android') {
          ToastAndroid.show(
            `Pushed ${chatMessages.length} messages to ${successCount} files!`,
            ToastAndroid.LONG
          );
        } else {
          Alert.alert('Success', `Pushed ${chatMessages.length} messages to ${successCount} files!`);
        }
      } else {
        if (Platform.OS === 'android') {
          ToastAndroid.show(
            `Pushed to ${successCount} files, ${failCount} failed`,
            ToastAndroid.LONG
          );
        } else {
          Alert.alert('Partial Success', `Pushed to ${successCount} files, ${failCount} failed`);
        }
      }
    } catch (error) {
      log.error('Error pushing messages:', error);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Failed to push messages', ToastAndroid.LONG);
      } else {
        Alert.alert('Error', 'Failed to push messages');
      }
    } finally {
      setIsPushing(false);
    }
  }, [chatMessages, fileService]);

  const handleGroupMessages = useCallback(async () => {
    if (chatMessages.length < 2) {
      return;
    }

    setIsGrouping(true);
    try {
      log.info('Starting message grouping with GroupbyService...');
      
      // Backup current messages before attempting grouping
      log.info('Backing up messages...');
      await chatService.backupMessages();
      log.info('Messages backed up successfully');
      
      // Use GroupbyService to group messages by tags
      const groupedMessages = await groupbyService.groupMessages(chatMessages);
      
      log.info(`GroupbyService returned ${groupedMessages.length} grouped messages`);

      // Replace messages in the chat service
      await chatService.replaceMessages(groupedMessages);
      setChatMessages(chatService.getMessages());

      log.info('Message grouping completed successfully');
      
      // Show success toast
      if (Platform.OS === 'android') {
        ToastAndroid.show('Messages grouped successfully!', ToastAndroid.SHORT);
      }
    } catch (error) {
      log.error('Error grouping messages:', error);
      
      // Restore from backup on any error
      try {
        log.info('Restoring messages from backup due to error...');
        await chatService.restoreFromBackup();
        setChatMessages(chatService.getMessages());
      } catch (restoreError) {
        log.error('Failed to restore from backup:', restoreError);
      }
      
      // Show toast notification
      if (Platform.OS === 'android') {
        ToastAndroid.show('Grouping failed. Messages restored.', ToastAndroid.LONG);
      } else {
        Alert.alert('Grouping Error', 'Grouping failed. Messages have been restored.');
      }
    } finally {
      setIsGrouping(false);
    }
  }, [chatMessages, chatService, groupbyService]);

  if (isInitializing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingTitle}>Awakening the Oracle</Text>
        <Text style={styles.loadingSubtitle}>
          Summoning ancient wisdom...
        </Text>
        <Text style={styles.loadingDetails}>
          🪔 Preparing the lamp
        </Text>
          {initializationError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Initialization Failed</Text>
              <Text style={styles.errorText}>{initializationError}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏝️Rūḥ</Text>
      </View>
      
      {/* Tab Content */}
      {activeTab === 'search' ? (
        <QueryInterface
          onQuery={handleQuery}
          isLoading={isQuerying}
          filesLoaded={filesLoaded}
          availableFiles={availableFiles}
          availableTags={availableTags}
        />
      ) : activeTab === 'chat' ? (
        <ChatInterface
          onSaveMessage={handleSaveMessage}
          onGroupMessages={handleGroupMessages}
          onClearMessages={handleClearMessages}
          onPushMessages={handlePushMessages}
          onDeleteMessage={handleDeleteMessage}
          onUpdateMessage={handleUpdateMessage}
          messages={chatMessages}
          isGrouping={isGrouping}
          isPushing={isPushing}
          availableTags={availableTags}
        />
      ) : (
        <FileExplorerInterface
          files={fileList}
          onLoadFile={handleLoadFile}
          onSaveFile={handleSaveFile}
          onCreateFile={handleCreateFile}
          onDeleteFile={handleDeleteFile}
          onRenameFile={handleRenameFile}
          isLoading={false}
        />
      )}

      {/* Tab Navigation - Fixed at Bottom */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'chat' && styles.tabButtonActive
          ]}
          onPress={() => setActiveTab('chat')}
        >
          <Text style={[
            styles.tabIcon,
            activeTab === 'chat' && styles.tabIconActive
          ]}>
            💭
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'search' && styles.tabButtonActive
          ]}
          onPress={() => setActiveTab('search')}
        >
          <Text style={[
            styles.tabIcon,
            activeTab === 'search' && styles.tabIconActive
          ]}>
            🧞
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'files' && styles.tabButtonActive
          ]}
          onPress={() => setActiveTab('files')}
        >
          <Text style={[
            styles.tabIcon,
            activeTab === 'files' && styles.tabIconActive
          ]}>
            🏰
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
    padding: 20,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingDetails: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'monospace',
  },
  errorContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d32f2f',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  header: {
    backgroundColor: '#00CED1',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#008B8B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#8B6F47',
    marginBottom: 4,
    letterSpacing: 1,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFEB3B',
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textShadowColor: '#006064',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 2,
    borderTopColor: '#00BCD4',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 8,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: '#E0F7FA',
    borderWidth: 1,
    borderColor: '#00BCD4',
  },
  tabIcon: {
    fontSize: 28,
    marginBottom: 4,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00838F',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    opacity: 0.5,
  },
  tabLabelActive: {
    opacity: 1,
    color: '#006064',
  },
});
