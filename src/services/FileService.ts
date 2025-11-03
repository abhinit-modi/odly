import RNFS from 'react-native-fs';
import { log } from '../utils/logger';
import AssetCopyModule from './AssetCopyModule';
import { Platform } from 'react-native';

log.info('✓ RNFS loaded in FileService');

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
      log.info(`✓ Read asset file from Android assets: ${fileName} (${size} bytes)`);
    } catch (androidError) {
      // If Android method fails, try iOS method
      log.info('Android readFileAssets failed, trying iOS method...');
      const filePath = `${RNFS.MainBundlePath}/${fileName}`;
      
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        throw new Error(`Asset file not found: ${fileName}`);
      }

      content = await RNFS.readFile(filePath, 'utf8');
      const stats = await RNFS.stat(filePath);
      size = stats.size;
      log.info(`✓ Read asset file from iOS bundle: ${fileName} (${size} bytes)`);
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
        log.info(`✓ Read file: ${fileName}`);
      } catch (error) {
        log.warn(`⚠ Failed to read ${fileName}:`, error);
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
      log.error('Error reading aham files:', error);
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
      log.error('Error listing asset files:', error);
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
      log.error(`Error checking if asset file exists ${fileName}:`, error);
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
      log.error(`Error getting asset file info ${fileName}:`, error);
      return null;
    }
  }

  /**
   * Check if the TinyLlama GGUF model exists in assets or external storage
   * Copies model from assets to internal storage if needed (llama.rn needs accessible file path)
   */
  public async checkTinyLlamaModel(): Promise<{ exists: boolean; size: number; path: string }> {
    const modelFileName = 'tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf';
    
    // Internal storage path (preferred - llama.rn can access this directly)
    const internalPath = `${RNFS.DocumentDirectoryPath}/${modelFileName}`;
    
    // Check internal storage first
    log.info(`Checking model at: ${internalPath}`);
    const internalExists = await RNFS.exists(internalPath);
    if (internalExists) {
      const stats = await RNFS.stat(internalPath);
      log.info(`✓ Found model at: ${internalPath} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);
      return {
        exists: true,
        size: stats.size,
        path: internalPath,
      };
    }
    
    // Model not in internal storage - copy from assets
    // llama.rn cannot directly read from Android assets, so we must copy it to internal storage
    log.info(`Model not in internal storage, copying from assets...`);
    
    if (Platform.OS === 'android') {
      // Check if native module is available
      if (!AssetCopyModule) {
        const errorMsg = `AssetCopyModule not available. Please rebuild the app:\n` +
          `1. Stop Metro bundler\n` +
          `2. Run: cd android && ./gradlew clean\n` +
          `3. Run: npm run android\n` +
          `\nThis is required to compile the native module that copies the model from assets.`;
        log.error(errorMsg);
        return {
          exists: false,
          size: 0,
          path: internalPath,
        };
      }
      
      try {
        log.info(`Checking if model exists in assets: ${modelFileName}`);
        // Check if asset exists first
        const assetExists = await AssetCopyModule!.assetExists(modelFileName);
        
        if (!assetExists) {
          const errorMsg = `Model file not found in assets: ${modelFileName}\n` +
            `Expected location: android/app/src/main/assets/${modelFileName}\n` +
            `Make sure the file exists and rebuild the app.`;
          log.error(errorMsg);
          return {
            exists: false,
            size: 0,
            path: internalPath,
          };
        }
        
        log.info(`✓ Model found in assets, copying to internal storage...`);
        log.info(`Destination: ${internalPath}`);
        log.info(`This may take 30-60 seconds for a 600MB+ file...`);
        
        // Copy from assets to internal storage using native module
        const copyResult = await AssetCopyModule!.copyAssetToInternalStorage(modelFileName, internalPath);
        log.info(`Copy operation completed, result: ${copyResult}`);
        
        // Wait a moment for file system to sync
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify the copy was successful
        const copiedExists = await RNFS.exists(internalPath);
        if (copiedExists) {
          const stats = await RNFS.stat(internalPath);
          const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
          log.info(`✓ Successfully copied model to: ${internalPath} (${sizeMB}MB)`);
          
          // Verify file size is reasonable (at least 100MB)
          if (stats.size < 100 * 1024 * 1024) {
            log.warn(`Warning: Copied file size seems too small (${sizeMB}MB). Expected ~600MB+`);
          }
          
          return {
            exists: true,
            size: stats.size,
            path: internalPath,
          };
        } else {
          const errorMsg = `Copy completed but file not found at destination: ${internalPath}\n` +
            `The native module reported success but the file is missing.`;
          log.error(errorMsg);
          throw new Error(errorMsg);
        }
      } catch (error) {
        log.error('Error copying model from assets:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`Failed to copy model: ${errorMessage}`);
        log.error(`Please ensure:`);
        log.error(`1. Model file exists in android/app/src/main/assets/${modelFileName}`);
        log.error(`2. App has been rebuilt after adding the native module`);
        log.error(`3. Device has sufficient storage space (~1GB free)`);
        return {
          exists: false,
          size: 0,
          path: internalPath,
        };
      }
    } else {
      // iOS - try bundle path
      const bundlePath = `${RNFS.MainBundlePath}/${modelFileName}`;
      const bundleExists = await RNFS.exists(bundlePath);
      if (bundleExists) {
        const stats = await RNFS.stat(bundlePath);
        log.info(`✓ Found model in bundle: ${bundlePath} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);
        return {
          exists: true,
          size: stats.size,
          path: bundlePath,
        };
      }
      
      log.error(`Model not found in bundle: ${bundlePath}`);
      return {
        exists: false,
        size: 0,
        path: internalPath,
      };
    }
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
      log.error('Error listing GGUF models:', error);
      return [];
    }
  }

  /**
   * Get list of aham files for the file explorer (dynamically scans directory)
   */
  public async getAhamFileList(): Promise<Array<{ name: string; path: string }>> {
    const ahamDirPath = `${RNFS.DocumentDirectoryPath}/aham`;
    const assetAhamFiles = ['gig.md', 'love.md', 'play.md', 'work.md', 'random.md'];
    const fileSet = new Set<string>();
    
    // Add default asset files
    assetAhamFiles.forEach(fileName => fileSet.add(fileName));
    
    // Scan DocumentDirectory for additional .md files
    try {
      const dirExists = await RNFS.exists(ahamDirPath);
      if (dirExists) {
        const files = await RNFS.readDir(ahamDirPath);
        files.forEach(file => {
          if (file.isFile() && file.name.endsWith('.md')) {
            fileSet.add(file.name);
          }
        });
      }
    } catch (error) {
      log.warn('Error scanning aham directory:', error);
    }
    
    // Convert set to array and sort
    return Array.from(fileSet)
      .sort()
      .map(fileName => ({
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
    
    log.info(`FileService: Loading file for editing: ${filePath}`);
    
    try {
      // Check if writable copy exists
      const exists = await RNFS.exists(writablePath);
      
      if (exists) {
        // Load from writable location
        const content = await RNFS.readFile(writablePath, 'utf8');
        log.info(`FileService: Loaded from writable storage: ${writablePath}`);
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
        log.info(`FileService: Created writable copy at ${writablePath}`);
        return assetContent.content;
      }
    } catch (error) {
      log.error(`FileService: Error loading file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Save an edited file
   */
  public async saveEditedFile(filePath: string, content: string): Promise<void> {
    const writablePath = `${RNFS.DocumentDirectoryPath}/${filePath}`;
    
    log.info(`FileService: Saving file: ${filePath}`);
    
    try {
      // Ensure directory exists
      const dirPath = writablePath.substring(0, writablePath.lastIndexOf('/'));
      const dirExists = await RNFS.exists(dirPath);
      if (!dirExists) {
        await RNFS.mkdir(dirPath);
      }
      
      await RNFS.writeFile(writablePath, content, 'utf8');
      log.info(`FileService: Successfully saved to ${writablePath}`);
    } catch (error) {
      log.error(`FileService: Error saving file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Create a new markdown file in the aham directory
   * @param fileName The name of the file (without extension)
   */
  public async createAhamFile(fileName: string): Promise<void> {
    // Sanitize filename - only allow alphanumeric and hyphens
    const sanitizedName = fileName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!sanitizedName) {
      throw new Error('Invalid file name');
    }
    
    const fullFileName = `${sanitizedName}.md`;
    const ahamDirPath = `${RNFS.DocumentDirectoryPath}/aham`;
    const filePath = `${ahamDirPath}/${fullFileName}`;
    
    log.info(`FileService: Creating new file ${fullFileName}`);
    
    try {
      // Ensure aham directory exists
      const dirExists = await RNFS.exists(ahamDirPath);
      if (!dirExists) {
        await RNFS.mkdir(ahamDirPath);
        log.info(`FileService: Created aham directory at ${ahamDirPath}`);
      }
      
      // Check if file already exists
      const fileExists = await RNFS.exists(filePath);
      if (fileExists) {
        throw new Error(`File ${fullFileName} already exists`);
      }
      
      // Create file with initial content
      const initialContent = `# ${fileName.charAt(0).toUpperCase() + fileName.slice(1)}\n\nCreated on ${new Date().toLocaleString()}\n\n`;
      await RNFS.writeFile(filePath, initialContent, 'utf8');
      log.info(`FileService: Successfully created ${fullFileName} at ${filePath}`);
    } catch (error) {
      log.error(`FileService: Error creating file ${fullFileName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a markdown file from the aham directory
   * @param fileName The name of the file (with .md extension)
   */
  public async deleteAhamFile(fileName: string): Promise<void> {
    const ahamDirPath = `${RNFS.DocumentDirectoryPath}/aham`;
    const filePath = `${ahamDirPath}/${fileName}`;
    
    log.info(`FileService: Deleting file ${fileName}`);
    
    try {
      // Check if file exists in DocumentDirectory
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        throw new Error(`File ${fileName} not found or is a default file that cannot be deleted`);
      }
      
      // Delete the file
      await RNFS.unlink(filePath);
      log.info(`FileService: Successfully deleted ${fileName}`);
    } catch (error) {
      log.error(`FileService: Error deleting file ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Rename a markdown file in the aham directory
   * @param oldFileName The current name of the file (with .md extension)
   * @param newFileName The new name for the file (without extension)
   */
  public async renameAhamFile(oldFileName: string, newFileName: string): Promise<void> {
    // Sanitize new filename - only allow alphanumeric and hyphens
    const sanitizedName = newFileName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!sanitizedName) {
      throw new Error('Invalid file name');
    }
    
    const newFullFileName = `${sanitizedName}.md`;
    const ahamDirPath = `${RNFS.DocumentDirectoryPath}/aham`;
    const oldFilePath = `${ahamDirPath}/${oldFileName}`;
    const newFilePath = `${ahamDirPath}/${newFullFileName}`;
    
    log.info(`FileService: Renaming file ${oldFileName} to ${newFullFileName}`);
    
    try {
      // Check if old file exists
      const oldFileExists = await RNFS.exists(oldFilePath);
      if (!oldFileExists) {
        // If file doesn't exist in DocumentDirectory, it's an asset file
        // Copy from assets first, then rename
        try {
          const assetContent = await this.readAssetFile(`aham/${oldFileName}`);
          await RNFS.writeFile(oldFilePath, assetContent.content, 'utf8');
          log.info(`FileService: Created writable copy from asset ${oldFileName}`);
        } catch (assetError) {
          throw new Error(`File ${oldFileName} not found`);
        }
      }
      
      // Check if new filename already exists
      const newFileExists = await RNFS.exists(newFilePath);
      if (newFileExists && oldFilePath !== newFilePath) {
        throw new Error(`File ${newFullFileName} already exists`);
      }
      
      // Rename the file
      await RNFS.moveFile(oldFilePath, newFilePath);
      log.info(`FileService: Successfully renamed ${oldFileName} to ${newFullFileName}`);
    } catch (error) {
      log.error(`FileService: Error renaming file ${oldFileName}:`, error);
      throw error;
    }
  }

  /**
   * Append messages to an aham file based on tag
   * @param tag The tag that determines which file to append to (e.g., '<gig>' or '{project}' -> gig.md or project.md)
   * @param messages Array of message objects with text and timestamp
   */
  public async appendToAhamFile(
    tag: string,
    messages: Array<{ text: string; timestamp: Date }>
  ): Promise<void> {
    // Map tag to file name (remove < > { } and add .md extension)
    const tagName = tag.replace(/[<>{}]/g, '');
    const fileName = `${tagName}.md`;
    const ahamDirPath = `${RNFS.DocumentDirectoryPath}/aham`;
    const filePath = `${ahamDirPath}/${fileName}`;

    log.info(`FileService: Appending ${messages.length} messages to ${fileName}`);

    try {
      // Ensure aham directory exists
      const dirExists = await RNFS.exists(ahamDirPath);
      if (!dirExists) {
        await RNFS.mkdir(ahamDirPath);
        log.info(`FileService: Created aham directory at ${ahamDirPath}`);
      }

      // Read existing content from assets first if file doesn't exist in DocumentDirectory
      let existingContent = '';
      const fileExists = await RNFS.exists(filePath);
      
      if (!fileExists) {
        // Try to read from assets as base content
        try {
          const assetContent = await this.readAssetFile(`aham/${fileName}`);
          existingContent = assetContent.content;
          log.info(`FileService: Loaded base content from assets for ${fileName}`);
        } catch (error) {
          log.info(`FileService: No asset file found for ${fileName}, starting fresh`);
          existingContent = `# ${tagName.charAt(0).toUpperCase() + tagName.slice(1)}\n\n`;
        }
      } else {
        existingContent = await RNFS.readFile(filePath, 'utf8');
        log.info(`FileService: Read existing content from ${fileName}`);
      }

      // Format messages with timestamps and proper markdown structure
      const newContent = messages
        .map(msg => {
          const timestamp = new Date(msg.timestamp).toLocaleString();
          
          // Parse message text to format user_created tags as headers
          const lines = msg.text.split('\n').filter(line => line.trim() !== '');
          const formattedLines: string[] = [];
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            // Remove bullet prefix for checking if it's a tag
            const lineWithoutBullet = trimmedLine.replace(/^[•\-\*]\s*/, '');
            
            // Check if line is a tag (default <tag> or user_created {tag})
            const isTag = (lineWithoutBullet.startsWith('<') && lineWithoutBullet.includes('>')) ||
                         (lineWithoutBullet.startsWith('{') && lineWithoutBullet.includes('}'));
            
            if (isTag) {
              // Format as simple header line
              formattedLines.push(`\n${lineWithoutBullet}\n`);
            } else {
              // Convert bullet • to markdown * 
              const formattedLine = trimmedLine
                .replace(/^•\s*/, '* ')
                .replace(/^-\s*/, '* ');
              formattedLines.push(formattedLine);
            }
          }
          
          return `**[${timestamp}]**\n${formattedLines.join('\n')}`;
        })
        .join('\n\n');

      // Append new content
      const updatedContent = existingContent.trim() + '\n\n---\n\n' + newContent;

      // Write to DocumentDirectory (writable location)
      await RNFS.writeFile(filePath, updatedContent, 'utf8');
      log.info(`FileService: Successfully appended to ${fileName} at ${filePath}`);
    } catch (error) {
      log.error(`FileService: Error appending to ${fileName}:`, error);
      throw error;
    }
  }
}
