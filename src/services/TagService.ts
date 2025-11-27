import RNFS from 'react-native-fs';
import { log } from '../utils/logger';

export type TagType = 'default' | 'user_created';

export interface Tag {
  name: string; // e.g., '<gig>', '<work>' (default) or '{personal}', '{urgent}' (user_created)
  type: TagType;
  visible?: boolean; // For soft delete - if false, tag is hidden from UI (only for user_created tags)
}

const STORAGE_FILE = 'user_tags.json';

export class TagService {
  private static instance: TagService;
  private userTags: Tag[] = []; // Only visible tags (for UI)
  private allUserTags: Tag[] = []; // All tags including hidden ones (for persistence)
  private storagePath: string;
  private tagMapping: { [defaultTag: string]: string[] } = {}; // Maps default tag names (e.g., 'gig') to user-created tags (e.g., ['{project}', '{urgent}'])

  private constructor() {
    this.storagePath = `${RNFS.DocumentDirectoryPath}/${STORAGE_FILE}`;
    console.log('TagService: Storage path:', this.storagePath);
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
      
      const exists = await RNFS.exists(this.storagePath);
      if (exists) {
        const content = await RNFS.readFile(this.storagePath, 'utf8');
        this.allUserTags = JSON.parse(content);
        // Filter out tags that are marked as not visible (soft deleted)
        this.userTags = this.allUserTags.filter((tag: Tag) => tag.visible !== false);
        log.info(`TagService: Loaded ${this.userTags.length} visible user-created tags from storage`);
        log.info(`TagService: Total tags in storage (including hidden): ${this.allUserTags.length}`);
      } else {
        log.info('TagService: No stored tags found, starting fresh');
        this.allUserTags = [];
        this.userTags = [];
      }
      
      // Build tag mapping by parsing markdown files
      await this.buildTagMapping();
    } catch (error) {
      log.error('TagService: Error loading user tags:', error);
      this.allUserTags = [];
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
    
    // Check if tag already exists in all tags (including hidden ones)
    const existingTag = this.allUserTags.find(tag => tag.name === formattedName);
    if (existingTag) {
        throw new Error(`Tag ${formattedName} already exists`);
    }

    const newTag: Tag = {
      name: formattedName,
      type: 'user_created',
      visible: true,
    };

    this.userTags.push(newTag);
    this.allUserTags.push(newTag);
    await this.persistTags();
    log.info('TagService: Created new tag:', newTag);
    return newTag;
  }

  /**
   * Delete a user-created tag (soft delete - sets visible to false)
   */
  public async deleteTag(tagName: string): Promise<void> {

    // Find the tag in all tags
    const tagIndex = this.allUserTags.findIndex(tag => tag.name === tagName);
    if (tagIndex === -1) {
      throw new Error(`Tag ${tagName} not found`);
    }

    // Set visible to false (soft delete) in allUserTags
    this.allUserTags[tagIndex].visible = false;

    // Remove from the visible tags array
    this.userTags = this.userTags.filter(tag => tag.name !== tagName);

    await this.persistTags();
  }

  /**
   * Edit/rename a user-created tag
   */
  public async editTag(oldTagName: string, newTagName: string): Promise<Tag> {
    // Find the tag to edit in all tags
    const allTagIndex = this.allUserTags.findIndex(tag => tag.name === oldTagName);
    if (allTagIndex === -1) {
      throw new Error(`Tag ${oldTagName} not found`);
    }

    // Format the new tag name
    let formattedName = newTagName.trim();
    if (!formattedName.startsWith('{')) {
      formattedName = `{${formattedName}`;
    }
    if (!formattedName.endsWith('}')) {
      formattedName = `${formattedName}}`;
    }

    // Check if new tag name already exists (but not the same tag)
    if (formattedName !== oldTagName && this.allUserTags.some(tag => tag.name === formattedName)) {
      throw new Error(`Tag ${formattedName} already exists`);
    }

    // Update the tag in allUserTags
    this.allUserTags[allTagIndex] = {
      name: formattedName,
      type: 'user_created',
      visible: this.allUserTags[allTagIndex].visible !== false, // Preserve visibility
    };

    // Update in visible tags array as well
    const visibleTagIndex = this.userTags.findIndex(tag => tag.name === oldTagName);
    if (visibleTagIndex !== -1) {
      this.userTags[visibleTagIndex] = this.allUserTags[allTagIndex];
    }

    await this.persistTags();
    log.info('TagService: Edited tag:', oldTagName, '->', formattedName);
    return this.allUserTags[allTagIndex];
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
   * Persist tags to file storage (saves all tags including hidden ones)
   */
  private async persistTags(): Promise<void> {
    try {
      await RNFS.writeFile(this.storagePath, JSON.stringify(this.allUserTags), 'utf8');
      log.info('TagService: Tags persisted successfully (including hidden tags)');
      log.info(`TagService: Persisted ${this.allUserTags.length} total tags, ${this.userTags.length} visible`);
    } catch (error) {
      log.error('TagService: Error persisting tags:', error);
      throw error;
    }
  }

  /**
   * Build tag mapping by parsing markdown files in the aham directory
   */
  private async buildTagMapping(): Promise<void> {
    try {
      log.info('TagService: Building tag mapping from markdown files...');
      this.tagMapping = {};
      
      const ahamDirPath = `${RNFS.DocumentDirectoryPath}/aham`;
      const dirExists = await RNFS.exists(ahamDirPath);
      
      if (!dirExists) {
        log.info('TagService: aham directory does not exist yet, skipping tag mapping');
        return;
      }
      
      const files = await RNFS.readDir(ahamDirPath);
      const mdFiles = files.filter(file => file.isFile() && file.name.endsWith('.md'));
      
      for (const file of mdFiles) {
        const defaultTagName = file.name.replace('.md', '');
        const content = await RNFS.readFile(file.path, 'utf8');
        
        // Parse user-created tags from the file content
        const userCreatedTags = this.extractUserCreatedTags(content);
        
        if (userCreatedTags.length > 0) {
          this.tagMapping[defaultTagName] = userCreatedTags;
          log.info(`TagService: Mapped ${defaultTagName} -> [${userCreatedTags.join(', ')}]`);
        }
      }
      
      log.info(`TagService: Tag mapping built for ${Object.keys(this.tagMapping).length} default tags`);
    } catch (error) {
      log.error('TagService: Error building tag mapping:', error);
      this.tagMapping = {};
    }
  }

  /**
   * Extract user-created tags (in {} format) from markdown content
   */
  private extractUserCreatedTags(content: string): string[] {
    const tagSet = new Set<string>();
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Match tags in {tag} format
      const matches = line.match(/\{[^}]+\}/g);
      if (matches) {
        matches.forEach(tag => {
          // Only add if it's a visible user-created tag
          if (this.userTags.some(t => t.name === tag)) {
            tagSet.add(tag);
          }
        });
      }
    }
    
    return Array.from(tagSet);
  }

  /**
   * Get user-created tags for specific default tags
   * @param defaultTagNames Array of default tag names (without <> brackets, e.g., ['gig', 'work'])
   * @returns Array of user-created tags associated with these default tags
   */
  public getUserTagsForDefaultTags(defaultTagNames: string[]): Tag[] {
    if (defaultTagNames.length === 0) {
      // If no default tags selected, return all user-created tags
      return [...this.userTags];
    }
    
    const tagNameSet = new Set<string>();
    
    for (const defaultTagName of defaultTagNames) {
      const mappedTags = this.tagMapping[defaultTagName] || [];
      mappedTags.forEach(tagName => tagNameSet.add(tagName));
    }
    
    // Return Tag objects for the mapped tag names
    return this.userTags.filter(tag => tagNameSet.has(tag.name));
  }

  /**
   * Add a user-created tag to the mapping for a specific default tag
   */
  public addTagToMapping(defaultTagName: string, userCreatedTagName: string): void {
    if (!this.tagMapping[defaultTagName]) {
      this.tagMapping[defaultTagName] = [];
    }
    
    if (!this.tagMapping[defaultTagName].includes(userCreatedTagName)) {
      this.tagMapping[defaultTagName].push(userCreatedTagName);
      log.info(`TagService: Added ${userCreatedTagName} to ${defaultTagName} mapping`);
    }
  }

  /**
   * Remove a user-created tag from all mappings (when tag is deleted)
   */
  public removeTagFromAllMappings(userCreatedTagName: string): void {
    for (const defaultTagName in this.tagMapping) {
      this.tagMapping[defaultTagName] = this.tagMapping[defaultTagName].filter(
        tag => tag !== userCreatedTagName
      );
    }
    log.info(`TagService: Removed ${userCreatedTagName} from all mappings`);
  }

  /**
   * Update tag name in all mappings (when tag is renamed)
   */
  public updateTagInMappings(oldTagName: string, newTagName: string): void {
    for (const defaultTagName in this.tagMapping) {
      const index = this.tagMapping[defaultTagName].indexOf(oldTagName);
      if (index !== -1) {
        this.tagMapping[defaultTagName][index] = newTagName;
      }
    }
    log.info(`TagService: Updated ${oldTagName} to ${newTagName} in all mappings`);
  }

  /**
   * Rebuild the tag mapping (useful after file changes)
   */
  public async rebuildTagMapping(): Promise<void> {
    await this.buildTagMapping();
  }
}

