import fs from 'fs';
import path from 'path';

type LoggingConfig = {
  enabled: boolean;
  file?: string;
} | undefined;

export class Logger {
  private static logToFile = false;
  private static logFilePath = path.join(process.cwd(), 'trackerman.log');

  static configure(config: LoggingConfig) {
    if (!config) {
      this.logToFile = false;
      return;
    }
    this.logToFile = !!config.enabled;
    if (config.file) {
      this.logFilePath = path.isAbsolute(config.file)
        ? config.file
        : path.join(process.cwd(), config.file);
    }
  }

  private static write(level: string, message: string, meta?: unknown) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level}] ${message}${meta !== undefined ? ` | ${safeStringify(meta)}` : ''}`;
    // Console always
    // eslint-disable-next-line no-console
    console.log(line);
    if (this.logToFile) {
      try {
        fs.appendFileSync(this.logFilePath, line + '\n', { encoding: 'utf-8' });
      } catch {
        // noop
      }
    }
  }

  static info(message: string, meta?: unknown) {
    this.write('INFO', message, meta);
  }
  static warn(message: string, meta?: unknown) {
    this.write('WARN', message, meta);
  }
  static error(message: string, meta?: unknown) {
    this.write('ERROR', message, meta);
  }
}

function safeStringify(value: unknown) {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}


