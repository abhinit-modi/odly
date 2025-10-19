import RNFS from 'react-native-fs';

export interface ChatMessage {
  id: string;
  text: string;
  timestamp: Date;
  tags?: string[];
}

const STORAGE_FILE = 'chat_messages.json';
const BACKUP_FILE = 'chat_messages_backup.txt';

export class ChatService {
  private static instance: ChatService;
  private messages: ChatMessage[] = [];
  private storagePath: string;
  private backupPath: string;

  private constructor() {
    this.storagePath = `${RNFS.DocumentDirectoryPath}/${STORAGE_FILE}`;
    this.backupPath = `${RNFS.DocumentDirectoryPath}/${BACKUP_FILE}`;
  }

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  /**
   * Initialize the service by loading messages from storage
   */
  public async initialize(): Promise<void> {
    try {
      console.log('ChatService: Starting initialization...');
      console.log('ChatService: Storage path:', this.storagePath);
      
      const exists = await RNFS.exists(this.storagePath);
      if (exists) {
        const content = await RNFS.readFile(this.storagePath, 'utf8');
        const parsed = JSON.parse(content);
        // Convert timestamp strings back to Date objects
        this.messages = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        console.log(`ChatService: Loaded ${this.messages.length} chat messages from storage`);
      } else {
        console.log('ChatService: No stored messages found, starting fresh');
        this.messages = [];
      }
    } catch (error) {
      console.error('ChatService: Error loading chat messages:', error);
      this.messages = [];
    }
  }

  /**
   * Save a new message
   */
  public async saveMessage(text: string, tags?: string[]): Promise<ChatMessage> {
    const message: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text,
      timestamp: new Date(),
      tags: tags && tags.length > 0 ? tags : ['#random'],
    };

    this.messages.push(message);
    await this.persistMessages();
    return message;
  }

  /**
   * Get all messages
   */
  public getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  /**
   * Delete a specific message
   */
  public async deleteMessage(id: string): Promise<void> {
    this.messages = this.messages.filter(msg => msg.id !== id);
    await this.persistMessages();
  }

  /**
   * Update an existing message
   */
  public async updateMessage(id: string, newText: string, tags?: string[]): Promise<void> {
    const messageIndex = this.messages.findIndex(msg => msg.id === id);
    if (messageIndex === -1) {
      throw new Error(`Message with id ${id} not found`);
    }

    this.messages[messageIndex] = {
      ...this.messages[messageIndex],
      text: newText,
      tags: tags && tags.length > 0 ? tags : ['#random'],
    };

    await this.persistMessages();
    console.log(`ChatService: Updated message ${id}`);
  }

  /**
   * Clear all messages
   */
  public async clearAllMessages(): Promise<void> {
    this.messages = [];
    await this.persistMessages();
  }

  /**
   * Replace all messages with a new set
   */
  public async replaceMessages(newMessages: ChatMessage[]): Promise<void> {
    this.messages = newMessages;
    await this.persistMessages();
  }

  /**
   * Backup current messages to a text file
   */
  public async backupMessages(): Promise<void> {
    try {
      const backupContent = this.messages
        .map((msg, idx) => `[${idx + 1}] ${new Date(msg.timestamp).toLocaleString()}\n${msg.text}`)
        .join('\n\n---\n\n');
      
      await RNFS.writeFile(this.backupPath, backupContent, 'utf8');
      console.log('ChatService: Messages backed up successfully');
    } catch (error) {
      console.error('ChatService: Error backing up chat messages:', error);
      throw error;
    }
  }

  /**
   * Restore messages from backup (reads from main storage, not backup file)
   */
  public async restoreFromBackup(): Promise<void> {
    try {
      console.log('ChatService: Restoring from backup...');
      const exists = await RNFS.exists(this.storagePath);
      if (exists) {
        const content = await RNFS.readFile(this.storagePath, 'utf8');
        const parsed = JSON.parse(content);
        // Convert timestamp strings back to Date objects
        this.messages = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        console.log(`ChatService: Restored ${this.messages.length} messages from backup`);
      }
    } catch (error) {
      console.error('ChatService: Error restoring from backup:', error);
      throw error;
    }
  }

  /**
   * Persist messages to file storage
   */
  private async persistMessages(): Promise<void> {
    try {
      await RNFS.writeFile(this.storagePath, JSON.stringify(this.messages), 'utf8');
      console.log('ChatService: Messages persisted successfully');
    } catch (error) {
      console.error('ChatService: Error persisting chat messages:', error);
      throw error;
    }
  }
}

