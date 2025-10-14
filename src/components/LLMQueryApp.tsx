import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { QueryInterface } from './QueryInterface';
import { LLMService, LLMResponse } from '../services/LLMService';
import { FileService } from '../services/FileService';

export const LLMQueryApp: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [contextLoaded, setContextLoaded] = useState(false);
  const [contextContent, setContextContent] = useState<string>('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<string>('');

  const llmService = LLMService.getInstance();
  const fileService = FileService.getInstance();

  // Initialize the app
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = useCallback(async () => {
    try {
      setIsInitializing(true);
      setInitializationError(null);

      // Check TinyLlama model first
      console.log('Checking TinyLlama GGUF model...');
      const modelCheck = await fileService.checkTinyLlamaModel();
      if (!modelCheck.exists) {
        throw new Error(`TinyLlama model not found at: ${modelCheck.path}`);
      }
      console.log(`TinyLlama model found: ${(modelCheck.size / 1024 / 1024).toFixed(1)}MB`);
      console.log(`TinyLlama model path: ${modelCheck.path}`);

      // Load context file
      console.log('Loading context file...');
      const context = await fileService.readContext();
      setContextContent(context);
      setContextLoaded(true);
      console.log('Context loaded successfully');

      // Initialize LLM service with TinyLlama using the found model path
      console.log('Initializing TinyLlama GGUF model...');
      await llmService.initialize(modelCheck.path);
      console.log('TinyLlama model initialized successfully');

      // Get model information
      const info = llmService.getModelInfo();
      setModelInfo(info);

    } catch (error) {
      console.error('Initialization error:', error);
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
  }, [llmService, fileService]);

  const handleQuery = useCallback(async (query: string, context: string): Promise<string> => {
    if (!llmService.isReady()) {
      throw new Error('LLM service is not ready');
    }

    setIsQuerying(true);
    try {
      const response: LLMResponse = await llmService.query(query, context);
      return response.text;
    } catch (error) {
      console.error('Query execution error:', error);
      throw error;
    } finally {
      setIsQuerying(false);
    }
  }, [llmService]);

  const getContextPreview = useCallback((): string => {
    if (!contextContent) return '';
    
    // Return first 200 characters as preview
    return contextContent.length > 200 
      ? `${contextContent.substring(0, 200)}...`
      : contextContent;
  }, [contextContent]);

  if (isInitializing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingTitle}>Initializing TinyLlama GGUF Model</Text>
          <Text style={styles.loadingSubtitle}>
            Loading TinyLlama 1.1B model and context file...
          </Text>
          <Text style={styles.loadingDetails}>
            Model: tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf
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
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TinyLlama GGUF Query App</Text>
        <Text style={styles.headerSubtitle}>
          Ask questions using TinyLlama 1.1B model with context from your file
        </Text>
        {modelInfo && (
          <Text style={styles.modelInfo}>
            {modelInfo}
          </Text>
        )}
      </View>
      
      <QueryInterface
        onQuery={handleQuery}
        isLoading={isQuerying}
        contextLoaded={contextLoaded}
        contextPreview={getContextPreview()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  modelInfo: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    fontFamily: 'monospace',
  },
});
