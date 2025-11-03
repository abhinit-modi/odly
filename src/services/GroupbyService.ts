import { ChatMessage } from './ChatService';
import { LLMService } from './LLMService';
import { Tag } from './TagService';
import { log } from '../utils/logger';

export class GroupbyService {
  private static instance: GroupbyService;
  private llmService: LLMService;

  private constructor() {
    this.llmService = LLMService.getInstance();
  }

  public static getInstance(): GroupbyService {
    if (!GroupbyService.instance) {
      GroupbyService.instance = new GroupbyService();
    }
    return GroupbyService.instance;
  }

  /**
   * Group messages by their first tag
   * - For non-random tags: create bulleted list in timestamp order, grouped by user_created tags
   * - For <random> tag: use LLM to cluster similar messages
   */
  public async groupMessages(messages: ChatMessage[], availableTags: Tag[] = []): Promise<ChatMessage[]> {
    log.info('GroupbyService: Starting message grouping...');
    
    // Group messages by their first tag
    const groupedByTag: { [tag: string]: ChatMessage[] } = {};
    
    for (const message of messages) {
      const firstTag = message.tags && message.tags.length > 0 ? message.tags[0] : '<random>';
      if (!groupedByTag[firstTag]) {
        groupedByTag[firstTag] = [];
      }
      groupedByTag[firstTag].push(message);
    }

    log.info('GroupbyService: Groups created:', Object.keys(groupedByTag));

    const resultMessages: ChatMessage[] = [];

    // Process each group
    for (const [tag, groupMessages] of Object.entries(groupedByTag)) {
      if (tag === '<random>') {
        // Use LLM for random group
        log.info(`GroupbyService: Processing ${groupMessages.length} random messages with LLM...`);
        const llmGrouped = await this.groupWithLLM(groupMessages);
        resultMessages.push(...llmGrouped);
      } else {
        // Create bulleted list for non-random groups
        log.info(`GroupbyService: Creating bulleted list for ${tag} with ${groupMessages.length} messages`);
        const bulletedMessage = this.createBulletedList(tag, groupMessages, availableTags);
        resultMessages.push(bulletedMessage);
      }
    }

    log.info(`GroupbyService: Grouping complete, created ${resultMessages.length} result messages`);
    return resultMessages;
  }

  /**
   * Create a bulleted list message from a group of tagged messages
   * Groups by user_created tags within the first-tag group
   */
  private createBulletedList(tag: string, messages: ChatMessage[], availableTags: Tag[]): ChatMessage {
    // Sort by timestamp
    const sortedMessages = [...messages].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Get set of user_created tag names for quick lookup (excluding the main grouping tag)
    const userCreatedTagNames = new Set(
      availableTags.filter(t => t.type === 'user_created' && t.name !== tag).map(t => t.name)
    );

    // Group messages by user_created tags (excluding the main grouping tag)
    const messagesByUserTag: { [tagName: string]: ChatMessage[] } = {};
    const messagesWithoutUserTags: ChatMessage[] = [];

    for (const msg of sortedMessages) {
      // Find user_created tags in this message (excluding the first/main tag)
      const userTags = (msg.tags || [])
        .filter(t => t !== tag && userCreatedTagNames.has(t));
      
      if (userTags.length > 0) {
        // Group by each user_created tag
        for (const userTag of userTags) {
          if (!messagesByUserTag[userTag]) {
            messagesByUserTag[userTag] = [];
          }
          messagesByUserTag[userTag].push(msg);
        }
      } else {
        // No additional user_created tags
        messagesWithoutUserTags.push(msg);
      }
    }

    // Build the output text
    const textParts: string[] = [];

    // First, add messages without user_created tags
    if (messagesWithoutUserTags.length > 0) {
      const bulletedMessages = messagesWithoutUserTags.map(msg => {
        const trimmedText = msg.text.trim();
        if (trimmedText.startsWith('•') || trimmedText.startsWith('-') || trimmedText.startsWith('*')) {
          return trimmedText;
        }
        return `• ${trimmedText}`;
      });
      textParts.push(bulletedMessages.join('\n'));
    }
    
    // Then, add groups by user_created tags
    const userTagKeys = Object.keys(messagesByUserTag).sort();
    for (const userTag of userTagKeys) {
      const tagMessages = messagesByUserTag[userTag];
      const bulletedMessages = tagMessages.map(msg => {
        const trimmedText = msg.text.trim();
        if (trimmedText.startsWith('•') || trimmedText.startsWith('-') || trimmedText.startsWith('*')) {
          return trimmedText;
        }
        return `• ${trimmedText}`;
      });
      
      // Format: user_created tag on new line, then messages
      textParts.push(`${userTag}\n${bulletedMessages.filter(part => part.trim() !== '').join('\n')}`);
    }

    const bulletedText = textParts.filter(part => part.trim() !== '').join('\n');

    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: bulletedText,
      timestamp: new Date(),
      tags: [tag],
    };
  }

  /**
   * Use LLM to cluster random messages
   */
  private async groupWithLLM(messages: ChatMessage[]): Promise<ChatMessage[]> {
    if (messages.length === 0) {
      return [];
    }

    // Prepare messages for the LLM
    const messagesText = messages
      .map((msg, idx) => `Message ${idx + 1}: "${msg.text}"`)
      .join('\n\n');

    // Create the prompt for grouping
    const prompt = `You are a helpful assistant that groups similar messages together.

Here are the messages to analyze:

${messagesText}

Your task:
1. Read and understand each message
2. Group messages that are similar in topic, theme, or content
3. Create groups where each group contains related messages

IMPORTANT: Return the ACTUAL MESSAGE TEXT in each group, not just indices.

Return your response as a valid JSON array where each element represents a group and contains a "messages" array with the FULL TEXT of similar messages.

Format your response EXACTLY like this (no additional text):
[
  {
    "messages": ["full text of message 1", "full text of message 2"]
  },
  {
    "messages": ["full text of message 3"]
  }
]

Important: Return ONLY the JSON array with FULL MESSAGE TEXTS, no other text before or after.`;

    try {
      log.info('GroupbyService: Calling LLM for random group clustering...');
      const llmResponse = await this.llmService.query(prompt);
      const response = llmResponse.text;

      log.info('GroupbyService: LLM Response received');

      // Parse the JSON response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in LLM response');
      }
      const parsedGroups = JSON.parse(jsonMatch[0]);

      // Create new messages from groups - don't double bullet
      const groupedMessages: ChatMessage[] = parsedGroups.map((group: any) => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text: group.messages.map((msg: string) => {
          const trimmedMsg = msg.trim();
          // Check if already starts with a bullet
          if (trimmedMsg.startsWith('•') || trimmedMsg.startsWith('-') || trimmedMsg.startsWith('*')) {
            return trimmedMsg;
          }
          return `• ${trimmedMsg}`;
        }).join('\n\n'),
        timestamp: new Date(),
        tags: ['<random>'],
      }));

      log.info(`GroupbyService: Created ${groupedMessages.length} clustered groups for random messages`);
      return groupedMessages;
    } catch (error) {
      log.error('GroupbyService: Error clustering random messages:', error);
      // Fallback: return original messages as individual items
      return messages.map(msg => ({
        ...msg,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
      }));
    }
  }
}

