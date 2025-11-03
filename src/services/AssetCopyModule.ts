import { NativeModules, Platform } from 'react-native';
import { log } from '../utils/logger';

interface AssetCopyModuleInterface {
  copyAssetToInternalStorage(
    assetPath: string,
    destinationPath: string
  ): Promise<string>;
  assetExists(assetPath: string): Promise<boolean>;
}

const { AssetCopyModule } = NativeModules;

// Check if module is available
if (!AssetCopyModule && Platform.OS === 'android') {
  log.warn('AssetCopyModule not found in NativeModules. Make sure to rebuild the app after adding native modules.');
}

export default AssetCopyModule as AssetCopyModuleInterface | null;

