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
   * Read all markdown files from the aham directory in assets
   */
  public async readAhamFiles(): Promise<FileContent[]> {
    const ahamFiles = ['aham/gig.md', 'aham/fun.md', 'aham/love.md', 'aham/play.md', 'aham/work.md'];
    const fileContents: FileContent[] = [];

    for (const fileName of ahamFiles) {
      try {
        const fileContent = await this.readAssetFile(fileName);
        fileContents.push(fileContent);
        console.log(`✓ Read file: ${fileName}`);
      } catch (error) {
        console.warn(`⚠ Failed to read ${fileName}:`, error);
      }
    }

    if (fileContents.length === 0) {
      throw new Error('No files found in aham directory');
    }

    return fileContents;
  }

  /**
   * Read the context file from assets (legacy support)
   * @deprecated Use readAhamFiles() instead
   */
  public async readContext(): Promise<string> {
    try {
      // Try new aham directory structure first
      const ahamFiles = await this.readAhamFiles();
      // Combine all file contents with separators
      return ahamFiles
        .map(file => `=== ${file.fileName} ===\n${file.content}`)
        .join('\n\n');
    } catch (error) {
      console.error('Error reading aham files:', error);
      throw new Error('Failed to read context files from aham directory.');
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

  /**
   * Get list of aham files for the file explorer
   */
  public async getAhamFileList(): Promise<Array<{ name: string; path: string }>> {
    const ahamFiles = ['gig.md', 'fun.md', 'love.md', 'play.md', 'work.md'];
    return ahamFiles.map(fileName => ({
      name: fileName,
      path: `aham/${fileName}`,
    }));
  }

  /**
   * Load a file for editing (creates writable copy if needed)
   */
  public async loadFileForEditing(filePath: string): Promise<string> {
    const fileName = filePath.split('/').pop() || '';
    const writablePath = `${RNFS.DocumentDirectoryPath}/${filePath}`;
    
    console.log(`FileService: Loading file for editing: ${filePath}`);
    
    try {
      // Check if writable copy exists
      const exists = await RNFS.exists(writablePath);
      
      if (exists) {
        // Load from writable location
        const content = await RNFS.readFile(writablePath, 'utf8');
        console.log(`FileService: Loaded from writable storage: ${writablePath}`);
        return content;
      } else {
        // Load from assets and create writable copy
        const assetContent = await this.readAssetFile(filePath);
        
        // Ensure directory exists
        const dirPath = writablePath.substring(0, writablePath.lastIndexOf('/'));
        const dirExists = await RNFS.exists(dirPath);
        if (!dirExists) {
          await RNFS.mkdir(dirPath);
        }
        
        // Create writable copy
        await RNFS.writeFile(writablePath, assetContent.content, 'utf8');
        console.log(`FileService: Created writable copy at ${writablePath}`);
        return assetContent.content;
      }
    } catch (error) {
      console.error(`FileService: Error loading file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Save an edited file
   */
  public async saveEditedFile(filePath: string, content: string): Promise<void> {
    const writablePath = `${RNFS.DocumentDirectoryPath}/${filePath}`;
    
    console.log(`FileService: Saving file: ${filePath}`);
    
    try {
      // Ensure directory exists
      const dirPath = writablePath.substring(0, writablePath.lastIndexOf('/'));
      const dirExists = await RNFS.exists(dirPath);
      if (!dirExists) {
        await RNFS.mkdir(dirPath);
      }
      
      await RNFS.writeFile(writablePath, content, 'utf8');
      console.log(`FileService: Successfully saved to ${writablePath}`);
    } catch (error) {
      console.error(`FileService: Error saving file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Append messages to an aham file based on tag
   * @param tag The tag that determines which file to append to (e.g., '#gig' -> gig.md)
   * @param messages Array of message objects with text and timestamp
   */
  public async appendToAhamFile(
    tag: string,
    messages: Array<{ text: string; timestamp: Date }>
  ): Promise<void> {
    // Map tag to file name (remove # and add .md extension)
    const tagName = tag.replace('#', '');
    const fileName = `${tagName}.md`;
    const ahamDirPath = `${RNFS.DocumentDirectoryPath}/aham`;
    const filePath = `${ahamDirPath}/${fileName}`;

    console.log(`FileService: Appending ${messages.length} messages to ${fileName}`);

    try {
      // Ensure aham directory exists
      const dirExists = await RNFS.exists(ahamDirPath);
      if (!dirExists) {
        await RNFS.mkdir(ahamDirPath);
        console.log(`FileService: Created aham directory at ${ahamDirPath}`);
      }

      // Read existing content from assets first if file doesn't exist in DocumentDirectory
      let existingContent = '';
      const fileExists = await RNFS.exists(filePath);
      
      if (!fileExists) {
        // Try to read from assets as base content
        try {
          const assetContent = await this.readAssetFile(`aham/${fileName}`);
          existingContent = assetContent.content;
          console.log(`FileService: Loaded base content from assets for ${fileName}`);
        } catch (error) {
          console.log(`FileService: No asset file found for ${fileName}, starting fresh`);
          existingContent = `# ${tagName.charAt(0).toUpperCase() + tagName.slice(1)}\n\n`;
        }
      } else {
        existingContent = await RNFS.readFile(filePath, 'utf8');
        console.log(`FileService: Read existing content from ${fileName}`);
      }

      // Format messages with timestamps
      const newContent = messages
        .map(msg => {
          const timestamp = new Date(msg.timestamp).toLocaleString();
          return `**[${timestamp}]**\n${msg.text}`;
        })
        .join('\n\n');

      // Append new content
      const updatedContent = existingContent.trim() + '\n\n---\n\n' + newContent;

      // Write to DocumentDirectory (writable location)
      await RNFS.writeFile(filePath, updatedContent, 'utf8');
      console.log(`FileService: Successfully appended to ${fileName} at ${filePath}`);
    } catch (error) {
      console.error(`FileService: Error appending to ${fileName}:`, error);
      throw error;
    }
  }
}
