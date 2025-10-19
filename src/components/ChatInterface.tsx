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
} from 'react-native';

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
}

const AVAILABLE_TAGS = ['#gig', '#fun', '#love', '#play', '#work'];

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
            setSelectedTags(message.tags || []);
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
                    {message.tags.map((tag, idx) => (
                      <View key={idx} style={styles.messageTag}>
                        <Text style={styles.messageTagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <Text style={styles.messageText}>{message.text}</Text>
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

      {/* Action Buttons - Above Input Area */}
      {messages.length > 0 && (
        <View style={styles.actionButtonsContainer}>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={onClearMessages}
              disabled={isGrouping || isPushing}
            >
              <Text style={styles.clearButtonText}>🧹 Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.pushButton,
                (isGrouping || isPushing) && styles.buttonDisabled
              ]}
              onPress={onPushMessages}
              disabled={isGrouping || isPushing}
            >
              {isPushing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.pushButtonText}>🧰 Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Input Bar - Fixed at Bottom */}
      <View style={styles.inputBarContainer}>
        {/* Tags Row */}
        <View style={styles.tagsRow}>
          {AVAILABLE_TAGS.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[
                styles.tagButton,
                selectedTags.includes(tag) && styles.tagButtonSelected
              ]}
              onPress={() => toggleTag(tag)}
              disabled={isGrouping}
            >
              <Text style={[
                styles.tagButtonText,
                selectedTags.includes(tag) && styles.tagButtonTextSelected
              ]}>
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputBar}>
          <View style={styles.inputContainer}>
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
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  groupButtonIcon: {
    fontSize: 38,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 2,
    borderColor: '#00BCD4',
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    paddingRight: 4,
    paddingLeft: 20,
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
  },
  sendButton: {
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 8,
    borderRadius: 24,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  sendButtonText: {
    fontSize: 28,
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
    lineHeight: 24,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 8,
  },
  messageTime: {
    fontSize: 12,
    color: '#00ACC1',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    alignSelf: 'flex-end',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
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
});

