import { ChatMessage } from './ChatService';
import { LLMService } from './LLMService';
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
   * - For non-random tags: create bulleted list in timestamp order
   * - For #random tag: use LLM to cluster similar messages
   */
  public async groupMessages(messages: ChatMessage[]): Promise<ChatMessage[]> {
    log.info('GroupbyService: Starting message grouping...');
    
    // Group messages by their first tag
    const groupedByTag: { [tag: string]: ChatMessage[] } = {};
    
    for (const message of messages) {
      const firstTag = message.tags && message.tags.length > 0 ? message.tags[0] : '#random';
      if (!groupedByTag[firstTag]) {
        groupedByTag[firstTag] = [];
      }
      groupedByTag[firstTag].push(message);
    }

    log.info('GroupbyService: Groups created:', Object.keys(groupedByTag));

    const resultMessages: ChatMessage[] = [];

    // Process each group
    for (const [tag, groupMessages] of Object.entries(groupedByTag)) {
      if (tag === '#random') {
        // Use LLM for random group
        log.info(`GroupbyService: Processing ${groupMessages.length} random messages with LLM...`);
        const llmGrouped = await this.groupWithLLM(groupMessages);
        resultMessages.push(...llmGrouped);
      } else {
        // Create bulleted list for non-random groups
        log.info(`GroupbyService: Creating bulleted list for ${tag} with ${groupMessages.length} messages`);
        const bulletedMessage = this.createBulletedList(tag, groupMessages);
        resultMessages.push(bulletedMessage);
      }
    }

    log.info(`GroupbyService: Grouping complete, created ${resultMessages.length} result messages`);
    return resultMessages;
  }

  /**
   * Create a bulleted list message from a group of tagged messages
   */
  private createBulletedList(tag: string, messages: ChatMessage[]): ChatMessage {
    // Sort by timestamp
    const sortedMessages = [...messages].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Create bulleted list - don't add bullet if text already starts with one
    const bulletedText = sortedMessages
      .map(msg => {
        const trimmedText = msg.text.trim();
        // Check if already starts with a bullet
        if (trimmedText.startsWith('•') || trimmedText.startsWith('-') || trimmedText.startsWith('*')) {
          return trimmedText;
        }
        return `• ${trimmedText}`;
      })
      .join('\n\n');

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
        tags: ['#random'],
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

