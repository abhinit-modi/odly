import { log } from '../utils/logger';

log.info('✓ LlamaRn native module loaded successfully');

export interface LLMResponse {
  text: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class LLMService {
  private static instance: LLMService;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private modelPath: string = '';
  private context: any = null; // LlamaContext from llama.rn
  private llamaRnModule: any = null; // Keep reference to the module

  private constructor() {}

  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  /**
   * Initialize the LLM pipeline with the on-device model
   * @param modelPath Path to the model file
   */
  public async initialize(modelPath: string): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.loadModel(modelPath);
    await this.initializationPromise;
  }

  private async loadModel(modelPath: string): Promise<void> {
    log.info('Loading TinyLlama GGUF model...');
    log.info(`Model path: ${modelPath}`);
    
    this.modelPath = modelPath;
    
    try {
      // Load the GGUF model using llama.rn's initLlama API
      if (!this.llamaRnModule) {
        this.llamaRnModule = require('llama.rn');
        log.info('✓ Loaded llama.rn module');
      }
      
      // Model path should now be in internal storage (copied from assets)
      // Use the path directly as it's now a standard file system path
      const initConfig = {
        model: this.modelPath,
        use_mlock: false,       // Disable mlock to reduce memory pressure
        n_ctx: 1024,            // Reduced from 2048 to prevent memory issues - still sufficient for most queries
        n_batch: 256,           // Fast mode - good balance
        n_threads: 2,           // Fast mode - efficient threading
        n_gpu_layers: 0,        // CPU only for compatibility
      };
      
      log.info('Initializing llama.rn with config:', JSON.stringify(initConfig, null, 2));
      log.info(`Using model path: ${this.modelPath}`);
      
      const newContext = await this.llamaRnModule.initLlama(initConfig);
      
      // Store the context as a class property to prevent garbage collection
      this.context = newContext;
      
      // Verify context is accessible
      log.info('Context object type:', typeof this.context);
      log.info('Context has completion method:', typeof this.context.completion === 'function');
      
      // Test the context immediately
      try {
        // Try a simple tokenization to verify context is working
        await this.context.tokenize('test');
        log.info('✓ Context validation successful');
      } catch (validateError) {
        log.warn('Context validation failed, but continuing:', validateError);
      }
      
      this.isInitialized = true;
      log.info('✓ TinyLlama GGUF model loaded successfully!');
      log.info('✓ Context properly initialized and stored');
    } catch (error) {
      this.isInitialized = false;
      this.context = null;
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error('Failed to load TinyLlama model:', errorMessage);
      log.error('Model path attempted:', this.modelPath);
      log.error('Full error details:', error);
      
      // Provide more helpful error message
      if (errorMessage.includes('Failed to initialize context') || errorMessage.includes('initialize context')) {
        const helpfulMessage = 
          `Failed to initialize LLM context. This is often caused by:\n` +
          `1. Model file not accessible (path: ${this.modelPath})\n` +
          `2. Insufficient device memory\n` +
          `3. Model file corruption\n` +
          `\nTry:\n` +
          `- Ensure model is copied to internal storage\n` +
          `- Free up device memory\n` +
          `- Restart the app`;
        log.error(helpfulMessage);
        throw new Error(`Failed to initialize context: ${errorMessage}\n\n${helpfulMessage}`);
      }
      
      throw error;
    }
  }

  /**
   * Verify the context is still valid and reinitialize if needed
   */
  private async ensureContextValid(): Promise<void> {
    if (!this.isInitialized || !this.context) {
      log.error('Context not initialized');
      throw new Error('TinyLlama model not initialized. Call initialize() first.');
    }
    
    // Try to verify the context is still valid
    try {
      await this.context.tokenize('test');
      log.info('Context is valid');
    } catch (error) {
      log.warn('Context appears invalid, attempting to reinitialize...', error);
      
      // Try to reinitialize
      try {
        await this.loadModel(this.modelPath);
        log.info('Context successfully reinitialized');
      } catch (reinitError) {
        log.error('Failed to reinitialize context:', reinitError);
        throw new Error('Context lost and could not be reinitialized');
      }
    }
  }

  /**
   * Query the LLM with a prompt and context
   */
  public async query(prompt: string, context?: string): Promise<LLMResponse> {
    // Ensure context is valid before querying
    await this.ensureContextValid();

    // Combine context and prompt for better responses
    // Use TinyLlama chat format
    const fullPrompt = context 
      ? `<|system|>\nYou are a helpful assistant. Use the following context to answer questions.\n\nContext: ${context}\n<|user|>\n${prompt}\n<|assistant|>\n`
      : `<|user|>\n${prompt}\n<|assistant|>\n`;

    log.info('Sending query to TinyLlama...');
    log.info(`Prompt length: ${fullPrompt.length} chars`);
    
    try {
      // Run inference using llama.rn's completion API
      const result = await this.context.completion({
        prompt: fullPrompt,
        n_predict: 512,           // Fast mode - 2-3 paragraph responses (~15-20 seconds)
        temperature: 0.7,         // Sampling temperature
        top_p: 0.9,              // Standard top_p for good responses
        repeat_penalty: 1.1,     // Standard repetition penalty
        stop: ['<|user|>', '<|system|>'], // Only stop on role markers, allow full responses
      });

      // Extract the response text
      const response = result?.text?.trim() || 'No response generated';
      log.info(`LLM response length: ${response.length} chars`);

      return {
        text: response,
        usage: {
          prompt_tokens: Math.ceil(fullPrompt.length) / 4, // Rough estimation
          completion_tokens: Math.ceil(response.length / 4),
          total_tokens: Math.ceil((fullPrompt + response).length / 4),
        }
      };
    } catch (error) {
      log.error('LLM query error:', error);
      log.error('Context object status:', this.context ? 'exists' : 'null');
      log.error('Is initialized:', this.isInitialized);
      
      // Re-throw with more context
      throw new Error(`LLM query failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if the service is ready
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get model information
   */
  public getModelInfo(): string {
    return this.isInitialized 
      ? `TinyLlama GGUF model loaded and ready (${this.modelPath})`
      : 'TinyLlama model not initialized';
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    if (this.isInitialized && this.context) {
      try {
        await this.context.release();
        this.context = null;
        this.isInitialized = false;
        log.info('TinyLlama model unloaded successfully');
      } catch (error) {
        log.error('Error unloading TinyLlama model:', error);
      }
    }
  }
}
