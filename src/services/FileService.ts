import RNFS from 'react-native-fs';

console.log('✓ RNFS loaded in FileService');

export interface FileContent {
  content: string;
  fileName: string;
  size: number;
}

export class FileService {
  private static instance: FileService;

  private constructor() {}

  public static getInstance(): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService();
    }
    return FileService.instance;
  }

  /**
   * Read content from a file in the assets directory
   */
  public async readAssetFile(fileName: string): Promise<FileContent> {
    // On Android, assets need to be read using readFileAssets
    // On iOS, use MainBundlePath
    let content: string;
    let size: number;
    
    try {
      // Try Android method first (readFileAssets)
      content = await RNFS.readFileAssets(fileName, 'utf8');
      size = content.length;
      console.log(`✓ Read asset file from Android assets: ${fileName} (${size} bytes)`);
    } catch (androidError) {
      // If Android method fails, try iOS method
      console.log('Android readFileAssets failed, trying iOS method...');
      const filePath = `${RNFS.MainBundlePath}/${fileName}`;
      
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        throw new Error(`Asset file not found: ${fileName}`);
      }

      content = await RNFS.readFile(filePath, 'utf8');
      const stats = await RNFS.stat(filePath);
      size = stats.size;
      console.log(`✓ Read asset file from iOS bundle: ${fileName} (${size} bytes)`);
    }

    return {
      content: content.trim(),
      fileName,
      size,
    };
  }

  /**
   * Read the context file from assets
   */
  public async readContext(): Promise<string> {
    try {
      const fileContent = await this.readAssetFile('context.txt');
      return fileContent.content;
    } catch (error) {
      console.error('Error reading context file:', error);
      throw new Error('Failed to read context file. Make sure context.txt exists in assets.');
    }
  }

  /**
   * List available asset files
   */
  public async listAssetFiles(): Promise<string[]> {
    try {
      const assetPath = RNFS.MainBundlePath;
      const files = await RNFS.readDir(assetPath);
      return files
        .filter(file => file.isFile())
        .map(file => file.name);
    } catch (error) {
      console.error('Error listing asset files:', error);
      return [];
    }
  }

  /**
   * Check if a specific asset file exists
   */
  public async assetFileExists(fileName: string): Promise<boolean> {
    try {
      const filePath = `${RNFS.MainBundlePath}/${fileName}`;
      return await RNFS.exists(filePath);
    } catch (error) {
      console.error(`Error checking if asset file exists ${fileName}:`, error);
      return false;
    }
  }

  /**
   * Get file information for a specific asset
   */
  public async getAssetFileInfo(fileName: string): Promise<{ size: number; exists: boolean } | null> {
    try {
      const filePath = `${RNFS.MainBundlePath}/${fileName}`;
      const exists = await RNFS.exists(filePath);
      
      if (!exists) {
        return { size: 0, exists: false };
      }

      const stats = await RNFS.stat(filePath);
      return {
        size: stats.size,
        exists: true,
      };
    } catch (error) {
      console.error(`Error getting asset file info ${fileName}:`, error);
      return null;
    }
  }

  /**
   * Check if the TinyLlama GGUF model exists in assets or external storage
   */
  public async checkTinyLlamaModel(): Promise<{ exists: boolean; size: number; path: string }> {
    const modelFileName = 'tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf';
    
    // Try multiple locations - prioritize internal storage and assets over Downloads
    const internalPath = `${RNFS.DocumentDirectoryPath}/${modelFileName}`; // App internal storage (best access)
    const assetsPath = `file:///android_asset/${modelFileName}`;          // App assets (bundled)
    
    // Check internal storage first
    console.log(`Checking model at: ${internalPath}`);
    const internalExists = await RNFS.exists(internalPath);
    if (internalExists) {
      const stats = await RNFS.stat(internalPath);
      console.log(`✓ Found model at: ${internalPath} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);
      return {
        exists: true,
        size: stats.size,
        path: internalPath,
      };
    }
    
    // For assets, RNFS.exists() doesn't work reliably on Android
    // So we assume it exists there if bundled with the app
    // The native llama.rn library will verify it can open the file
    console.log(`Model not in internal storage, will use from assets: ${assetsPath}`);
    return {
      exists: true, // Assume it exists in assets (bundled with APK)
      size: 637 * 1024 * 1024, // Approximate size in bytes (637MB)
      path: assetsPath,
    };
  }

  /**
   * Get all GGUF model files in assets
   */
  public async listGGUFModels(): Promise<string[]> {
    try {
      const assetPath = RNFS.MainBundlePath;
      const files = await RNFS.readDir(assetPath);
      return files
        .filter(file => file.isFile() && file.name.endsWith('.gguf'))
        .map(file => file.name);
    } catch (error) {
      console.error('Error listing GGUF models:', error);
      return [];
    }
  }
}
