import RNFS from 'react-native-fs';
import { log } from '../utils/logger';

export type TagType = 'default' | 'user_created';

export interface Tag {
  name: string; // e.g., '<gig>', '<work>' (default) or '{personal}', '{urgent}' (user_created)
  type: TagType;
}

const STORAGE_FILE = 'user_tags.json';

export class TagService {
  private static instance: TagService;
  private userTags: Tag[] = [];
  private storagePath: string;

  private constructor() {
    this.storagePath = `${RNFS.DocumentDirectoryPath}/${STORAGE_FILE}`;
  }

  public static getInstance(): TagService {
    if (!TagService.instance) {
      TagService.instance = new TagService();
    }
    return TagService.instance;
  }

  /**
   * Initialize the service by loading user-created tags from storage
   */
  public async initialize(): Promise<void> {
    try {
      log.info('TagService: Starting initialization...');
      log.info('TagService: Storage path:', this.storagePath);
      
      const exists = await RNFS.exists(this.storagePath);
      if (exists) {
        const content = await RNFS.readFile(this.storagePath, 'utf8');
        this.userTags = JSON.parse(content);
        log.info(`TagService: Loaded ${this.userTags.length} user-created tags from storage`);
      } else {
        log.info('TagService: No stored tags found, starting fresh');
        this.userTags = [];
      }
    } catch (error) {
      log.error('TagService: Error loading user tags:', error);
      this.userTags = [];
    }
  }

  /**
   * Create a new user-created tag
   */
  public async createTag(tagName: string): Promise<Tag> {
    // Ensure tag has proper format {tag} for user_created tags
    let formattedName = tagName.trim();
    if (!formattedName.startsWith('{')) {
      formattedName = `{${formattedName}`;
    }
    if (!formattedName.endsWith('}')) {
      formattedName = `${formattedName}}`;
    }
    
    // Check if tag already exists
    if (this.userTags.some(tag => tag.name === formattedName)) {
      throw new Error(`Tag ${formattedName} already exists`);
    }

    const newTag: Tag = {
      name: formattedName,
      type: 'user_created',
    };

    this.userTags.push(newTag);
    await this.persistTags();
    log.info('TagService: Created new tag:', newTag);
    return newTag;
  }

  /**
   * Delete a user-created tag
   */
  public async deleteTag(tagName: string): Promise<void> {
    const initialLength = this.userTags.length;
    this.userTags = this.userTags.filter(tag => tag.name !== tagName);
    
    if (this.userTags.length === initialLength) {
      throw new Error(`Tag ${tagName} not found`);
    }

    await this.persistTags();
    log.info('TagService: Deleted tag:', tagName);
  }

  /**
   * Get all user-created tags
   */
  public getUserTags(): Tag[] {
    return [...this.userTags];
  }

  /**
   * Get all tags (both default and user-created)
   */
  public getAllTags(defaultTags: Tag[]): Tag[] {
    return [...defaultTags, ...this.userTags];
  }

  /**
   * Convert file names to default tags
   */
  public static createDefaultTagsFromFiles(fileNames: string[]): Tag[] {
    return fileNames.map(fileName => ({
      name: `<${fileName.replace('.md', '')}>`,
      type: 'default' as TagType,
    }));
  }

  /**
   * Persist tags to file storage
   */
  private async persistTags(): Promise<void> {
    try {
      await RNFS.writeFile(this.storagePath, JSON.stringify(this.userTags), 'utf8');
      log.info('TagService: Tags persisted successfully');
    } catch (error) {
      log.error('TagService: Error persisting tags:', error);
      throw error;
    }
  }
}

