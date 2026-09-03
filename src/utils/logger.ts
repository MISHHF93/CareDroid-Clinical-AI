/**
 * Structured logger — respects appConfig.logging.level and emits correlation-aware entries.
 */

import appConfig from '../config/appConfig';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

type LogContext = Record<string, unknown>;

function resolveCorrelationId(): string | undefined {
  try {
    return sessionStorage.getItem('caredroid.observability.correlation') || undefined;
  } catch {
    return undefined;
  }
}

function formatStructuredEntry(level: LogLevel, message: string, context?: LogContext) {
  return Object.freeze({
    timestamp: new Date().toISOString(),
    level,
    message,
    correlationId: resolveCorrelationId(),
    environment: appConfig.app.environment,
    ...context,
  });
}

class Logger {
  private currentLevel: LogLevel;

  constructor() {
    const configLevel = appConfig.logging.level as LogLevel;
    this.currentLevel = LOG_LEVELS[configLevel] !== undefined ? configLevel : 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.currentLevel];
  }

  private emit(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;
    const entry = formatStructuredEntry(level, message, context);
    const consoleFn =
      level === 'debug'
        ? console.debug
        : level === 'info'
          ? console.info
          : level === 'warn'
            ? console.warn
            : console.error;
    consoleFn(`[${level.toUpperCase()}] ${message}`, entry);
  }

  debug(message: string, context?: LogContext): void {
    this.emit('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.emit('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.emit('warn', message, context);
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    if (!this.shouldLog('error')) return;
    const errorContext: LogContext = { ...context };
    if (error instanceof Error) {
      errorContext.errorName = error.name;
      errorContext.errorMessage = error.message;
      errorContext.stack = error.stack;
    } else if (error !== undefined) {
      errorContext.error = error;
    }
    this.emit('error', message, errorContext);
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  getLevel(): LogLevel {
    return this.currentLevel;
  }
}

export default new Logger();
