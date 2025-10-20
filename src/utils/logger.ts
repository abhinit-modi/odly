import { logger, consoleTransport } from 'react-native-logs';

// Logger configuration
const config = {
  levels: {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  },
  severity: __DEV__ ? 'debug' : 'info',
  transport: consoleTransport,
  transportOptions: {
    colors: {
      debug: 'white' as const,
      info: 'blueBright' as const,
      warn: 'yellowBright' as const,
      error: 'redBright' as const,
    },
  },
  async: true,
  dateFormat: 'time',
  printLevel: true,
  printDate: true,
  enabled: true,
};

export const log = logger.createLogger(config);

// Export convenience functions for common operations
export const logInfo = (tag: string, message: string, ...args: any[]) => {
  log.info(`${tag}: ${message}`, ...args);
};

export const logError = (tag: string, message: string, error?: any) => {
  log.error(`${tag}: ${message}`, error);
};

export const logWarn = (tag: string, message: string, ...args: any[]) => {
  log.warn(`${tag}: ${message}`, ...args);
};

export const logDebug = (tag: string, message: string, ...args: any[]) => {
  log.debug(`${tag}: ${message}`, ...args);
};

