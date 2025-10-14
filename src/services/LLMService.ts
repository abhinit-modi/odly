console.log('✓ LlamaRn native module loaded successfully');

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
    console.log('Loading TinyLlama GGUF model...');
    console.log(`Model path: ${modelPath}`);
    
    this.modelPath = modelPath;
    
    // Load the GGUF model using llama.rn's initLlama API
    const llamaRnModule = require('llama.rn');
    
    const initConfig = {
      model: this.modelPath,
      use_mlock: false,       // Disable mlock to reduce memory pressure
      n_ctx: 256,             // Minimal context size for mobile
      n_batch: 64,            // Minimal batch size for mobile
      n_threads: 1,           // Single thread to reduce overhead
      n_gpu_layers: 0,        // CPU only for compatibility
    };
    
    console.log('Initializing llama.rn with config:', JSON.stringify(initConfig, null, 2));
    
    this.context = await llamaRnModule.initLlama(initConfig);
    
    if (!this.context) {
      throw new Error('initLlama returned null or undefined context');
    }
    
    this.isInitialized = true;
    console.log('✓ TinyLlama GGUF model loaded successfully!');
  }

  /**
   * Query the LLM with a prompt and context
   */
  public async query(prompt: string, context?: string): Promise<LLMResponse> {
    if (!this.isInitialized || !this.context) {
      throw new Error('TinyLlama model not initialized. Call initialize() first.');
    }

    // Combine context and prompt for better responses
    // Use TinyLlama chat format
    const fullPrompt = context 
      ? `<|system|>\nYou are a helpful assistant. Use the following context to answer questions.\n\nContext: ${context}\n<|user|>\n${prompt}\n<|assistant|>\n`
      : `<|user|>\n${prompt}\n<|assistant|>\n`;

    console.log('Sending query to TinyLlama...');
    
    // Run inference using llama.rn's completion API
    const result = await this.context.completion({
      prompt: fullPrompt,
      n_predict: 256,           // Maximum tokens to generate
      temperature: 0.7,         // Sampling temperature
      top_p: 0.9,              // Top-p sampling
      repeat_penalty: 1.1,     // Repetition penalty
      stop: ['<|user|>', '<|system|>', '\n\n'], // Stop sequences
    });

    // Extract the response text
    const response = result?.text?.trim() || 'No response generated';

    return {
      text: response,
      usage: {
        prompt_tokens: Math.ceil(fullPrompt.length / 4), // Rough estimation
        completion_tokens: Math.ceil(response.length / 4),
        total_tokens: Math.ceil((fullPrompt + response).length / 4),
      }
    };
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
        console.log('TinyLlama model unloaded successfully');
      } catch (error) {
        console.error('Error unloading TinyLlama model:', error);
      }
    }
  }
}
