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
import { log } from '../utils/logger';
import { Tag } from '../services/TagService';

interface QueryInterfaceProps {
  onQuery: (query: string, selectedTags: string[]) => Promise<{ answer: string; sources: string[] }>;
  isLoading: boolean;
  filesLoaded: boolean;
  availableFiles: string[];
  availableTags: Tag[];
}

export const QueryInterface: React.FC<QueryInterfaceProps> = ({
  onQuery,
  isLoading,
  filesLoaded,
  availableFiles,
  availableTags,
}) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [sources, setSources] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      Alert.alert('Error', 'Please enter a search query');
      return;
    }

    if (!filesLoaded) {
      Alert.alert('Error', 'Files not loaded. Please wait for initialization.');
      return;
    }

    try {
      setHasSearched(true);
      const result = await onQuery(query.trim(), selectedTags);
      setResponse(result.answer);
      setSources(result.sources);
    } catch (error) {
      log.error('Search error:', error);
      Alert.alert('Search Error', `Failed to process search: ${error}`);
      setResponse('');
      setSources([]);
    }
  }, [query, selectedTags, onQuery, filesLoaded]);

  const handleKeyPress = useCallback(() => {
    if (!isLoading) {
      handleSearch();
    }
  }, [handleSearch, isLoading]);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Results Section - Scrollable */}
      <ScrollView 
        style={styles.resultsContainer}
        contentContainerStyle={styles.resultsContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!hasSearched && !isLoading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🧞</Text>
            <Text style={styles.emptyStateTitle}>Hukum...</Text>
          </View>
        )}

        {isLoading && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#00BCD4" />
            <Text style={styles.loadingText}>Consulting the oracle...</Text>
          </View>
        )}

        {hasSearched && !isLoading && response && (
          <View style={styles.resultsSection}>
            {/* Search Query Display */}
            <View style={styles.queryDisplay}>
              <Text style={styles.queryLabel}>Your query:</Text>
              <Text style={styles.queryText}>{query}</Text>
            </View>

            {/* Answer Card */}
            <View style={styles.answerCard}>
              <Text style={styles.answerLabel}>Revelation</Text>
              <Text style={styles.answerText}>{response}</Text>
            </View>

            {/* Sources */}
            {sources.length > 0 && (
              <View style={styles.sourcesCard}>
                <Text style={styles.sourcesLabel}>From the scrolls:</Text>
                {sources.map((source, index) => (
                  <View key={index} style={styles.sourceItem}>
                    <Text style={styles.sourceBullet}>•</Text>
                    <Text style={styles.sourceText}>{source}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* New Search Button */}
            <TouchableOpacity
              style={styles.newSearchButton}
              onPress={() => {
                setQuery('');
                setResponse('');
                setSources([]);
                setHasSearched(false);
              }}
            >
              <Text style={styles.newSearchButtonIcon}>➕</Text>
              <Text style={styles.newSearchButtonText}>New Thread</Text>
            </TouchableOpacity>
          </View>
        )}

        {hasSearched && !isLoading && !response && (
          <View style={styles.noResultsState}>
            <Text style={styles.noResultsIcon}>😕</Text>
            <Text style={styles.noResultsTitle}>No Results</Text>
            <Text style={styles.noResultsText}>
              Unable to generate an answer. Try rephrasing your question.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Search Bar - Fixed at Bottom */}
      <View style={styles.searchBarContainer}>
        {/* Default Tags Row */}
        {availableTags.filter(tag => tag.type === 'default').length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.tagsScrollView}
            contentContainerStyle={styles.tagsRow}
            keyboardShouldPersistTaps="handled"
          >
            {availableTags.filter(tag => tag.type === 'default').map((tag) => {
              const isSelected = selectedTags.includes(tag.name);
              
              return (
                <TouchableOpacity
                  key={tag.name}
                  style={[
                    styles.tagButton,
                    isSelected && styles.tagButtonSelected
                  ]}
                  onPress={() => toggleTag(tag.name)}
                  disabled={isLoading}
                >
                  <Text style={[
                    styles.tagButtonText,
                    isSelected && styles.tagButtonTextSelected
                  ]}>
                    {tag.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.searchBar}>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Khoj"
              value={query}
              onChangeText={setQuery}
              editable={!isLoading && filesLoaded}
              placeholderTextColor="#80868b"
              returnKeyType="search"
              onSubmitEditing={handleKeyPress}
            />
            <TouchableOpacity
              style={[
                styles.searchButtonInside,
                (!filesLoaded || isLoading || !query.trim()) && styles.buttonDisabled
              ]}
              onPress={handleSearch}
              disabled={!filesLoaded || isLoading || !query.trim()}
            >
              {isLoading ? (
                <ActivityIndicator color="#00BCD4" size="small" />
              ) : (
                <Text style={styles.searchButtonText}>🐬</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5DEB3',
  },
  searchBarContainer: {
    backgroundColor: '#A8DADC',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 2,
    borderTopColor: '#00ACC1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00BCD4',
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    paddingRight: 4,
    shadowColor: '#00ACC1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 20,
    fontSize: 17,
    color: '#006064',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  searchButtonInside: {
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 8,
    borderRadius: 24,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  searchButtonText: {
    fontSize: 28,
  },
  sourcesInfo: {
    marginTop: 12,
    paddingTop: 8,
  },
  sourcesInfoText: {
    fontSize: 12,
    color: '#5f6368',
    lineHeight: 18,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsContent: {
    flexGrow: 1,
    padding: 20,
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
    fontSize: 28,
    fontWeight: '700',
    color: '#00838F',
    marginBottom: 8,
    letterSpacing: 2,
  },
  emptyStateText: {
    fontSize: 17,
    color: '#0097A7',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif-medium',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 18,
    color: '#00838F',
    marginTop: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  resultsSection: {
    flex: 1,
  },
  queryDisplay: {
    marginBottom: 20,
  },
  queryLabel: {
    fontSize: 13,
    color: '#00ACC1',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  queryText: {
    fontSize: 19,
    color: '#006064',
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  answerCard: {
    backgroundColor: '#B2EBF2',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#00838F',
    borderWidth: 2,
    borderColor: '#00BCD4',
    shadowColor: '#00ACC1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  answerLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#006064',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  answerText: {
    fontSize: 17,
    color: '#004D40',
    lineHeight: 28,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  sourcesCard: {
    backgroundColor: '#E0F2F1',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#26A69A',
    shadowColor: '#00897B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sourcesLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00695C',
    marginBottom: 12,
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  sourceBullet: {
    fontSize: 18,
    color: '#00BCD4',
    marginRight: 8,
    marginTop: 2,
  },
  sourceText: {
    flex: 1,
    fontSize: 14,
    color: '#004D40',
    lineHeight: 22,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  newSearchButton: {
    backgroundColor: '#FFD54F',
    borderWidth: 2,
    borderColor: '#00ACC1',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 10,
    shadowColor: '#00BCD4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  newSearchButtonIcon: {
    fontSize: 22,
    color: '#00695C',
  },
  newSearchButtonText: {
    color: '#00695C',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  noResultsState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  noResultsIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  noResultsTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#00838F',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  noResultsText: {
    fontSize: 17,
    color: '#0097A7',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  tagsScrollView: {
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 10,
  },
  tagButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00BCD4',
    backgroundColor: '#FFFFFF',
  },
  tagButtonSelected: {
    backgroundColor: '#00BCD4',
  },
  tagButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00BCD4',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  tagButtonTextSelected: {
    color: '#FFFFFF',
  },
});
