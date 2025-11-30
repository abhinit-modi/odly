import RNFS from 'react-native-fs';
import { logger } from '../utils/logger';

const PASSCODE_FILE = `${RNFS.DocumentDirectoryPath}/.odly_passcode`;

export class PasscodeService {
  /**
   * Set a new passcode (4 digits)
   */
  static async setPasscode(passcode: string): Promise<void> {
    try {
      if (!PasscodeService.isValidPasscode(passcode)) {
        throw new Error('Passcode must be exactly 4 digits');
      }
      await RNFS.writeFile(PASSCODE_FILE, passcode, 'utf8');
      logger.info('Passcode set successfully');
    } catch (error) {
      logger.error('Error setting passcode:', error);
      throw error;
    }
  }

  /**
   * Get the stored passcode
   */
  static async getPasscode(): Promise<string | null> {
    try {
      const exists = await RNFS.exists(PASSCODE_FILE);
      if (!exists) {
        return null;
      }
      const passcode = await RNFS.readFile(PASSCODE_FILE, 'utf8');
      return passcode;
    } catch (error) {
      logger.error('Error getting passcode:', error);
      return null;
    }
  }

  /**
   * Check if a passcode exists
   */
  static async hasPasscode(): Promise<boolean> {
    try {
      return await RNFS.exists(PASSCODE_FILE);
    } catch (error) {
      logger.error('Error checking passcode:', error);
      return false;
    }
  }

  /**
   * Verify if the entered passcode matches
   */
  static async verifyPasscode(enteredPasscode: string): Promise<boolean> {
    try {
      const storedPasscode = await PasscodeService.getPasscode();
      return storedPasscode === enteredPasscode;
    } catch (error) {
      logger.error('Error verifying passcode:', error);
      return false;
    }
  }

  /**
   * Clear the passcode (for testing or resetting)
   */
  static async clearPasscode(): Promise<void> {
    try {
      const exists = await RNFS.exists(PASSCODE_FILE);
      if (exists) {
        await RNFS.unlink(PASSCODE_FILE);
      }
      logger.info('Passcode cleared');
    } catch (error) {
      logger.error('Error clearing passcode:', error);
      throw error;
    }
  }

  /**
   * Validate if passcode format is correct (4 digits)
   */
  static isValidPasscode(passcode: string): boolean {
    return /^\d{4}$/.test(passcode);
  }
}

