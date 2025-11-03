import { FileService, FileContent } from './FileService';
import { LLMService } from './LLMService';
import { log } from '../utils/logger';

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
   * @param query The user's search query
   * @param selectedFileNames Optional array of file names to filter (e.g., ['gig.md', 'fun.md']). If empty or undefined, uses all files.
   */
  public async answerQuery(query: string, selectedFileNames?: string[]): Promise<AnswerResponse> {
    log.info('AnswerService: Processing query:', query);
    if (selectedFileNames && selectedFileNames.length > 0) {
      selectedFileNames = selectedFileNames.map(name => name);
      log.info('AnswerService: Filtering to specific files:', selectedFileNames);
    }

    // Step 1: Get list of all aham files (includes both assets and user-created files)
    log.info('AnswerService: Getting list of aham files...');
    let fileList = await this.fileService.getAhamFileList();
    log.info('AnswerService: File list:', fileList);
    
    // Step 2: Filter files if specific files are requested
    if (selectedFileNames && selectedFileNames.length > 0) {
      fileList = fileList.filter(file => selectedFileNames.includes(file.name));
      log.info('AnswerService: Filtered to files:', fileList.map(f => f.name));
    } else {
      log.info('AnswerService: Using all files:', fileList.map(f => f.name));
    }
    
    // Step 3: Read content from each file
    const fileContents: Array<{ fileName: string; content: string }> = [];
    for (const file of fileList) {
      try {
        // Use loadFileForEditing to read from writable location or assets
        const content = await this.fileService.loadFileForEditing(file.path);
        fileContents.push({
          fileName: file.name,
          content: content,
        });
        log.info(`AnswerService: Loaded content from ${file.name}`);
      } catch (error) {
        log.warn(`AnswerService: Failed to load ${file.name}:`, error);
      }
    }
    
    // Track source files
    const sources = fileContents.map(fc => fc.fileName);
    log.info('AnswerService: Successfully loaded files:', sources);

    // Step 4: Combine file contents into a concise context string
    const combinedContext = fileContents
      .map(file => {
        return `${file.fileName}:\n${file.content}`;
      })
      .join('\n\n');

    // Step 5: Call the LLM service with context passed separately for optimal formatting
    log.info('AnswerService: Querying LLM...');
    const llmResponse = await this.llmService.query(query, combinedContext);

    return {
      answer: llmResponse.text,
      sources,
      usage: llmResponse.usage,
    };
  }

  /**
   * Get a preview of available files
   */
  public async getAvailableFiles(): Promise<string[]> {
    try {
      const fileContents = await this.fileService.readAhamFiles();
      return fileContents.map(fc => fc.fileName);
    } catch (error) {
      log.error('AnswerService: Error getting available files:', error);
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

