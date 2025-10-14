import { NativeModules } from 'react-native';

// Conditionally import native modules
let LlamaRn: any = null;
let RNFS: any = null;

try {
  // Import RNFS properly - it's a CommonJS module
  RNFS = require('react-native-fs');
  
  // The llama.rn module is registered as 'RNLlama' in NativeModules
  LlamaRn = NativeModules.RNLlama;
  
  if (LlamaRn) {
    console.log('✓ LlamaRn native module loaded successfully');
  } else {
    console.warn('⚠ LlamaRn native module not found in NativeModules');
  }
  
  if (RNFS) {
    console.log('✓ RNFS native module loaded successfully');
  } else {
    console.warn('⚠ RNFS native module not found');
  }
} catch (error) {
  console.warn('Error loading native modules:', error);
}

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
   * @param modelPath Optional path to the model file. If not provided, will search for it.
   */
  public async initialize(modelPath?: string): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.loadModel(modelPath);
    await this.initializationPromise;
  }

  private async loadModel(providedModelPath?: string): Promise<void> {
    try {
      console.log('Loading TinyLlama GGUF model...');
      
      // Check if llama.rn is available
      if (!LlamaRn) {
        console.warn('LlamaRn native module not available. Running in demo mode with mock responses.');
        this.isInitialized = true; // Mark as initialized to allow mock responses
        throw new Error('LlamaRn native module not available');
      }
      
      // Use the provided model path if available, otherwise search for it
      if (providedModelPath) {
        console.log(`Using provided model path: ${providedModelPath}`);
        
        // If the provided path is an asset path, copy it to internal storage first
        if (providedModelPath.includes('android_asset')) {
          console.log('Model is in assets, copying to internal storage for better access...');
          const modelFileName = 'tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf';
          const internalPath = `${RNFS.DocumentDirectoryPath}/${modelFileName}`;
          
          // Check if already copied
          const internalExists = await RNFS.exists(internalPath);
          if (!internalExists) {
            console.log('Copying model from assets to internal storage (this may take a minute)...');
            try {
              // Copy from assets to internal storage
              await RNFS.copyFileAssets(modelFileName, internalPath);
              console.log('✓ Model copied to internal storage successfully');
              this.modelPath = internalPath;
            } catch (copyError) {
              console.error('Failed to copy model from assets:', copyError);
              // Fall back to using asset path
              this.modelPath = providedModelPath;
            }
          } else {
            console.log('✓ Model already exists in internal storage');
            this.modelPath = internalPath;
          }
        } else {
          this.modelPath = providedModelPath;
        }
      } else {
        // Try to find the model file in multiple locations
        const modelFileName = 'tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf';
        const internalPath = `${RNFS.DocumentDirectoryPath}/${modelFileName}`;
        const downloadPath = `${RNFS.DownloadDirectoryPath}/${modelFileName}`;
        // On Android, llama.rn expects assets with file:// prefix and full path
        const assetsPath = `file:///android_asset/${modelFileName}`;
        
        // Priority order: internal storage > assets > download
        // For assets, we try to load directly without checking existence first
        // because RNFS.exists() doesn't work reliably with assets on Android
        
        // First check if model exists in app's internal storage (best for access)
        const internalExists = await RNFS.exists(internalPath);
        console.log(`Internal storage check: ${internalExists}`);
        
        if (internalExists) {
          this.modelPath = internalPath;
          console.log(`✓ Found model in app storage: ${internalPath}`);
        } 
        // Try assets path (bundled with APK) - assume it exists if we built with it
        else {
          // On Android, assets use a special path format
          this.modelPath = assetsPath;
          console.log(`Using model from assets: ${assetsPath}`);
        }
      }
      
      console.log(`Loading model from: ${this.modelPath}`);
      
      // Load the GGUF model using llama.rn's initLlama API
      const llamaRnModule = require('llama.rn');
      const modelFileName = 'tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf';
      const isAsset = this.modelPath.includes('android_asset');
      
      // Always use full path for better compatibility
      // llama.rn should handle both asset and file paths
      const initConfig = {
        model: this.modelPath,  // Use full path for all cases
        use_mlock: false,       // Disable mlock to reduce memory pressure
        n_ctx: 256,             // Minimal context size for mobile (reduced from 512)
        n_batch: 64,            // Minimal batch size for mobile (reduced from 128)
        n_threads: 1,           // Single thread to reduce overhead (reduced from 2)
        n_gpu_layers: 0,        // CPU only for compatibility
      };
      
      console.log('Initializing llama.rn with config:', JSON.stringify(initConfig, null, 2));
      
      try {
        this.context = await llamaRnModule.initLlama(initConfig);
        
        if (!this.context) {
          throw new Error('initLlama returned null or undefined context');
        }
        
        this.isInitialized = true;
        console.log('✓ TinyLlama GGUF model loaded successfully!');
      } catch (initError: any) {
        console.error('initLlama failed with error:', initError);
        console.error('Error details:', {
          message: initError?.message,
          stack: initError?.stack,
          code: initError?.code,
        });
        throw new Error(`Failed to initialize context: ${initError?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to load TinyLlama GGUF model:', error);
      // If it's a native module error, mark as initialized for demo mode
      if (!LlamaRn) {
        this.isInitialized = true;
      }
      throw new Error(`Failed to initialize TinyLlama model: ${error}`);
    }
  }

  /**
   * Query the LLM with a prompt and context
   */
  public async query(prompt: string, context?: string): Promise<LLMResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.isInitialized) {
      throw new Error('TinyLlama model not initialized');
    }

    // Check if native module is available
    if (!LlamaRn || !this.context) {
      console.warn('LlamaRn native module not available or context not initialized, using mock response');
      return this.getMockResponse(prompt, context);
    }

    try {
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
    } catch (error) {
      console.error('Error querying TinyLlama:', error);
      throw new Error(`Query failed: ${error}`);
    }
  }

  /**
   * Check if the service is ready
   */
  public isReady(): boolean {
    // In demo mode, we're ready even without LlamaRn
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

  private async getMockResponse(prompt: string, context?: string): Promise<LLMResponse> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockResponse = this.generateMockResponse(prompt, context);
    
    return {
      text: mockResponse,
      usage: {
        prompt_tokens: prompt.length,
        completion_tokens: mockResponse.length,
        total_tokens: prompt.length + mockResponse.length,
      },
    };
  }

  private generateMockResponse(prompt: string, context?: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi')) {
      return "Hello! I'm TinyLlama, your on-device AI assistant. How can I help you today?";
    }
    
    if (lowerPrompt.includes('what') && lowerPrompt.includes('context')) {
      if (context) {
        return `Based on the provided context, I can see information about: ${context.substring(0, 100)}... Let me help you understand this better.`;
      }
      return "I don't have any context to work with. Please provide some context or ask a specific question.";
    }
    
    if (lowerPrompt.includes('test')) {
      return "Test successful! This is a mock response from TinyLlama. The native LLM modules are not yet properly linked, so I'm providing this placeholder response.";
    }
    
    if (lowerPrompt.includes('help')) {
      return "I'm here to help! You can ask me questions about your files, request summaries, or get assistance with various tasks. What would you like to know?";
    }
    
    if (lowerPrompt.includes('file') || lowerPrompt.includes('document')) {
      return "I can help you analyze files and documents. The file system access is currently using mock data, but I can still provide assistance with your queries.";
    }
    
    // Generate a more intelligent mock response based on the prompt
    const responses = [
      `Based on your question "${prompt}", here's what I can tell you: This is a mock response from TinyLlama. The native modules need to be properly configured for full functionality.`,
      `I understand you're asking about "${prompt}". While the native LLM isn't fully configured yet, I can still provide helpful responses using mock data.`,
      `Regarding "${prompt}": This is a placeholder response from TinyLlama. The app is working, but the native LLM integration needs to be completed.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }
}
