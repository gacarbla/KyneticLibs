export type ConsoleLogType = 'log' | 'info' | 'success' | 'warn' | 'error' | 'ask' | 'debug' | 'trace' | 'answer';

export interface ConsoleConfig {
  logFilePath: string;
  dateFormat?: string;
  color?: boolean;
  showStats?: boolean;
  [key: string]: any;
}

export interface ConsoleLogEntry {
  type: ConsoleLogType;
  message: string;
  timestamp: Date;
  id: string;
}

export interface ConsoleStats {
  log: number;
  info: number;
  success: number;
  warn: number;
  error: number;
  total: number;
}
