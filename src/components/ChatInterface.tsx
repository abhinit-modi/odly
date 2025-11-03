import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  ToastAndroid,
} from 'react-native';
import { AudioRecorderButton } from './AudioRecorderButton';
import { Tag } from '../services/TagService';

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  tags?: string[];
}

interface ChatInterfaceProps {
  onSaveMessage: (message: string, tags: string[]) => void;
  onGroupMessages: () => void;
  onClearMessages: () => void;
  onPushMessages: () => void;
  onDeleteMessage: (id: string) => void;
  onUpdateMessage: (id: string, newText: string, tags: string[]) => void;
  messages: Message[];
  isGrouping: boolean;
  isPushing: boolean;
  availableTags: Tag[];
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onSaveMessage,
  onGroupMessages,
  onClearMessages,
  onPushMessages,
  onDeleteMessage,
  onUpdateMessage,
  messages,
  isGrouping,
  isPushing,
  availableTags,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!inputText.trim()) {
      return;
    }

    if (editingMessageId) {
      // Update existing message
      onUpdateMessage(editingMessageId, inputText.trim(), selectedTags);
      setEditingMessageId(null);
    } else {
      // Create new message
      onSaveMessage(inputText.trim(), selectedTags);
    }
    setInputText('');
    setSelectedTags([]);
  }, [inputText, selectedTags, editingMessageId, onSaveMessage, onUpdateMessage]);

  const handleLongPress = useCallback((message: Message) => {
    Alert.alert(
      'Message Actions',
      'What would you like to do?',
      [
        {
          text: 'Edit',
          onPress: () => {
            setEditingMessageId(message.id);
            setInputText(message.text);
            setSelectedTags((message.tags || []));
          }
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Message',
              'Are you sure you want to delete this message?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => onDeleteMessage(message.id)
                }
              ]
            );
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }, [onDeleteMessage]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  }, []);

  const handleTranscriptionComplete = useCallback((text: string) => {
    // Append transcribed text to existing input or replace if empty
    setInputText(prev => {
      if (prev.trim()) {
        return `${prev} ${text}`;
      }
      return text;
    });
  }, []);

  const handleKeyPress = useCallback(() => {
    handleSend();
  }, [handleSend]);

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  // Render message text with styled user_created hashtags
  const renderMessageText = (text: string) => {
    // Get set of user_created tag names for styling
    const userCreatedTagNames = new Set(
      availableTags.filter(t => t.type === 'user_created').map(t => t.name)
    );

    // Split text into lines and filter out empty lines
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();
      
      // Check if line is a user_created tag (may or may not have bullet)
      // Remove bullet prefix if present for checking
      const lineWithoutBullet = trimmedLine.replace(/^[•\-\*]\s*/, '');
      
      // User_created tags use {tag} syntax
      if (lineWithoutBullet.startsWith('{') && lineWithoutBullet.includes('}') && userCreatedTagNames.has(lineWithoutBullet)) {
        // Render as section divider with tag title
        elements.push(
          <View key={`section-${lineIndex}`} style={styles.sectionDivider}>
            <View style={styles.dividerLine} />
            <View style={styles.sectionTagContainer}>
              <Text style={styles.sectionTagText}>{lineWithoutBullet}</Text>
            </View>
            <View style={styles.dividerLine} />
          </View>
        );
      } else {
        // Render as regular text
        elements.push(
          <Text key={`text-${lineIndex}`} style={styles.messageText}>
            {trimmedLine}
          </Text>
        );
      }
    });

    return <View style={styles.messageTextContainer}>{elements}</View>;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Messages Section - Scrollable */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>💭</Text>
            <Text style={styles.emptyStateTitle}>Irshaad...</Text>
          </View>
        ) : (
          <View style={styles.messagesList}>
            {messages.map((message) => (
              <TouchableOpacity
                key={message.id}
                style={[
                  styles.messageCard,
                  editingMessageId === message.id && styles.messageCardEditing
                ]}
                onLongPress={() => handleLongPress(message)}
                activeOpacity={0.7}
              >
                {message.tags && message.tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {message.tags
                      .sort((a, b) => {
                        // Sort so default tags come first, then user-created tags
                        const tagObjA = availableTags.find(t => t.name === a);
                        const tagObjB = availableTags.find(t => t.name === b);
                        const isUserCreatedA = tagObjA?.type === 'user_created';
                        const isUserCreatedB = tagObjB?.type === 'user_created';
                        
                        // If both same type, maintain original order
                        if (isUserCreatedA === isUserCreatedB) return 0;
                        // Default tags (false) come before user-created (true)
                        return isUserCreatedA ? 1 : -1;
                      })
                      .map((tag, idx) => {
                        const tagObj = availableTags.find(t => t.name === tag);
                        const isUserCreated = tagObj?.type === 'user_created';
                        
                        return (
                          <View 
                            key={idx} 
                            style={[
                              styles.messageTag,
                              isUserCreated && styles.messageTagUserCreated
                            ]}
                          >
                            <Text style={styles.messageTagText}>{tag}</Text>
                          </View>
                        );
                      })}
                  </View>
                )}
                {renderMessageText(message.text)}
                <Text style={styles.messageTime}>
                  {formatTime(message.timestamp)}
                </Text>
                {editingMessageId === message.id && (
                  <Text style={styles.editingIndicator}>✏️ Editing...</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Input Bar - Fixed at Bottom */}
      <View style={styles.inputBarContainer}>
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
                  disabled={isGrouping}
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

        <View style={styles.inputBar}>
          <View style={styles.inputContainer}>
            <AudioRecorderButton
              onTranscriptionComplete={handleTranscriptionComplete}
              disabled={isGrouping || isPushing}
            />
            <TextInput
              style={styles.textInput}
              placeholder={editingMessageId ? "Edit your message..." : "Arz kiya hai..."}
              value={inputText}
              onChangeText={setInputText}
              placeholderTextColor="#80868b"
              returnKeyType="send"
              onSubmitEditing={handleKeyPress}
              multiline
              maxLength={1000}
              editable={!isGrouping && !isPushing}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isGrouping) && styles.buttonDisabled
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isGrouping}
            >
              <Text style={styles.sendButtonText}>💬</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[
              styles.groupButton,
              (isGrouping || messages.length < 2) && styles.buttonDisabled
            ]}
            onPress={onGroupMessages}
            disabled={isGrouping || messages.length < 2}
          >
            {isGrouping ? (
              <ActivityIndicator color="#00BCD4" size="small" />
            ) : (
              <Text style={styles.groupButtonIcon}>🌈</Text>
            )}
          </TouchableOpacity>
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
  inputBarContainer: {
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
  groupButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  groupButtonIcon: {
    fontSize: 28,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00BCD4',
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    paddingRight: 4,
    paddingLeft: 12,
    paddingVertical: 8,
    shadowColor: '#00ACC1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  textInput: {
    flex: 1,
    maxHeight: 80,
    fontSize: 17,
    color: '#006064',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
  },
  sendButton: {
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 6,
    borderRadius: 20,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    marginLeft: 6,
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  sendButtonText: {
    fontSize: 20,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
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
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  messagesList: {
    flex: 1,
  },
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#00BCD4',
    borderWidth: 1,
    borderColor: '#B2EBF2',
    shadowColor: '#00ACC1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  messageText: {
    fontSize: 16,
    color: '#004D40',
    lineHeight: 20,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 2,
  },
  messageTime: {
    fontSize: 12,
    color: '#00ACC1',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    alignSelf: 'flex-end',
  },
  tagsScrollView: {
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 10,
  },
  createTagButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#9C27B0',
    backgroundColor: '#FFFFFF',
    borderStyle: 'dashed',
  },
  createTagButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9C27B0',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  tagButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00BCD4',
    backgroundColor: '#FFFFFF',
  },
  tagButtonUserCreated: {
    borderColor: '#9C27B0',
    borderWidth: 2,
  },
  tagButtonSelected: {
    backgroundColor: '#00BCD4',
  },
  tagButtonUserCreatedSelected: {
    backgroundColor: '#9C27B0',
  },
  tagButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00BCD4',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  tagButtonTextUserCreated: {
    color: '#9C27B0',
  },
  tagButtonTextSelected: {
    color: '#FFFFFF',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  messageTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#00BCD4',
  },
  messageTagUserCreated: {
    backgroundColor: '#9C27B0',
  },
  messageTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  actionButtonsContainer: {
    backgroundColor: '#A8DADC',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FF6F61',
    borderWidth: 2,
    borderColor: '#E85D4F',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  pushButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#7CB342',
    borderWidth: 2,
    borderColor: '#558B2F',
  },
  pushButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  messageCardEditing: {
    borderLeftWidth: 3,
    borderLeftColor: '#FFD54F',
    backgroundColor: '#FFFBF0',
  },
  editingIndicator: {
    fontSize: 11,
    color: '#FFB300',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#9C27B0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#9C27B0',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalInput: {
    borderWidth: 2,
    borderColor: '#9C27B0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#EEEEEE',
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  modalCancelButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalCreateButton: {
    backgroundColor: '#9C27B0',
    borderWidth: 1,
    borderColor: '#7B1FA2',
  },
  modalCreateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  messageTextContainer: {
    marginBottom: 4,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#9C27B0',
  },
  sectionTagContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#9C27B0',
    borderRadius: 12,
    marginHorizontal: 8,
  },
  sectionTagText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

