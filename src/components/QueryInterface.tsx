import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface QueryInterfaceProps {
  onQuery: (query: string, context: string) => Promise<string>;
  isLoading: boolean;
  contextLoaded: boolean;
  contextPreview?: string;
}

export const QueryInterface: React.FC<QueryInterfaceProps> = ({
  onQuery,
  isLoading,
  contextLoaded,
  contextPreview,
}) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [hasQueried, setHasQueried] = useState(false);

  const handleQuery = useCallback(async () => {
    if (!query.trim()) {
      Alert.alert('Error', 'Please enter a query');
      return;
    }

    if (!contextLoaded) {
      Alert.alert('Error', 'Context file not loaded. Please wait for initialization.');
      return;
    }

    try {
      setHasQueried(true);
      const result = await onQuery(query.trim(), contextPreview || '');
      setResponse(result);
    } catch (error) {
      console.error('Query error:', error);
      Alert.alert('Query Error', `Failed to process query: ${error}`);
      setResponse('');
    }
  }, [query, onQuery, contextLoaded, contextPreview]);

  const clearResponse = useCallback(() => {
    setResponse('');
    setHasQueried(false);
  }, []);

  const clearAll = useCallback(() => {
    setQuery('');
    setResponse('');
    setHasQueried(false);
  }, []);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Context Status */}
        <View style={styles.contextStatus}>
          <Text style={styles.contextStatusTitle}>Context Status:</Text>
          <Text style={[
            styles.contextStatusText,
            { color: contextLoaded ? '#4CAF50' : '#FF9800' }
          ]}>
            {contextLoaded ? '✓ Context loaded' : '⏳ Loading context...'}
          </Text>
          {contextPreview && (
            <View style={styles.contextPreview}>
              <Text style={styles.contextPreviewTitle}>Context Preview:</Text>
              <Text style={styles.contextPreviewText} numberOfLines={3}>
                {contextPreview}
              </Text>
            </View>
          )}
        </View>

        {/* Query Input */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Ask a Question</Text>
          <TextInput
            style={styles.queryInput}
            placeholder="Enter your question about the context..."
            value={query}
            onChangeText={setQuery}
            multiline
            numberOfLines={4}
            editable={!isLoading && contextLoaded}
            placeholderTextColor="#999"
          />
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.queryButton,
                (!contextLoaded || isLoading || !query.trim()) && styles.buttonDisabled
              ]}
              onPress={handleQuery}
              disabled={!contextLoaded || isLoading || !query.trim()}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Query LLM</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.clearButton, (!query && !response) && styles.buttonDisabled]}
              onPress={clearAll}
              disabled={!query && !response}
            >
              <Text style={styles.buttonText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Response Section */}
        {hasQueried && (
          <View style={styles.responseSection}>
            <View style={styles.responseHeader}>
              <Text style={styles.sectionTitle}>LLM Response</Text>
              <TouchableOpacity
                style={styles.clearResponseButton}
                onPress={clearResponse}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.responseContainer}>
              {response ? (
                <Text style={styles.responseText}>{response}</Text>
              ) : (
                <Text style={styles.noResponseText}>
                  {isLoading ? 'Processing your query...' : 'No response yet'}
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  contextStatus: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contextStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  contextStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  contextPreview: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  contextPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  contextPreviewText: {
    fontSize: 13,
    color: '#777',
    lineHeight: 18,
  },
  inputSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  queryInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fafafa',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  queryButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  clearButton: {
    backgroundColor: '#757575',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  responseSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearResponseButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#ffebee',
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: '500',
  },
  responseContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  responseText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  noResponseText: {
    fontSize: 15,
    color: '#666',
    fontStyle: 'italic',
  },
});
