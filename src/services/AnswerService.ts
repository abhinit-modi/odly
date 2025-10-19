import { FileService, FileContent } from './FileService';
import { LLMService } from './LLMService';

export interface AnswerResponse {
  answer: string;
  sources: string[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class AnswerService {
  private static instance: AnswerService;
  private fileService: FileService;
  private llmService: LLMService;

  private constructor() {
    this.fileService = FileService.getInstance();
    this.llmService = LLMService.getInstance();
  }

  public static getInstance(): AnswerService {
    if (!AnswerService.instance) {
      AnswerService.instance = new AnswerService();
    }
    return AnswerService.instance;
  }

  /**
   * Answer a query using context from all files in the aham directory
   * and the LLM's internal knowledge
   */
  public async answerQuery(query: string): Promise<AnswerResponse> {
    console.log('AnswerService: Processing query:', query);

    // Step 1: Read all files from the aham directory
    console.log('AnswerService: Reading files from aham directory...');
    const fileContents: FileContent[] = await this.fileService.readAhamFiles();
    
    // Track source files
    const sources = fileContents.map(fc => fc.fileName);
    console.log('AnswerService: Files loaded:', sources);

    // Step 2: Combine file contents into a single context string
    const combinedContext = fileContents
      .map(file => {
        return `File: ${file.fileName}\n${file.content}`;
      })
      .join('\n\n---\n\n');

    // Step 3: Create a prompt that asks the LLM to answer based on files + common sense
    const prompt = this.createAnswerPrompt(query, combinedContext);

    // Step 4: Call the LLM service
    console.log('AnswerService: Querying LLM...');
    const llmResponse = await this.llmService.query(prompt);

    return {
      answer: llmResponse.text,
      sources,
      usage: llmResponse.usage,
    };
  }

  /**
   * Create a well-structured prompt for the LLM
   */
  private createAnswerPrompt(query: string, context: string): string {
    return `You are a helpful assistant that answers questions based on provided context and your general knowledge.

CONTEXT FROM FILES:
${context}

USER QUESTION:
${query}

INSTRUCTIONS:
- Use the information from the files above when relevant
- Also use your general knowledge and common sense
- Provide a clear, concise answer
- If the files contain relevant information, mention it
- If the answer requires common knowledge beyond the files, use your understanding

ANSWER:`;
  }

  /**
   * Get a preview of available files
   */
  public async getAvailableFiles(): Promise<string[]> {
    try {
      const fileContents = await this.fileService.readAhamFiles();
      return fileContents.map(fc => fc.fileName);
    } catch (error) {
      console.error('AnswerService: Error getting available files:', error);
      return [];
    }
  }

  /**
   * Check if the service is ready (LLM initialized)
   */
  public isReady(): boolean {
    return this.llmService.isReady();
  }
}

