import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { registerAs } from '@nestjs/config';
import { getEnvironmentConfig } from './environment.config';

/**
 * Winston Logger Configuration
 * Configures structured logging with multiple transports:
 * - Console (development)
 * JSON formatting for structured logging
 */

// JSON formatter for structured logging
const jsonFormatter = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

// Console formatter with colors (development)
const consoleFormatter = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...rest }) => {
    return `[${timestamp}] ${level}: ${message} ${Object.keys(rest).length ? JSON.stringify(rest) : ''}`;
  }),
);

export default registerAs('logger', () => {
  const config = getEnvironmentConfig();
  const isProduction = config.server.nodeEnv === 'production';
  const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');
  const logDir = process.env.LOG_DIR || 'logs';
  const maxSize = process.env.LOG_MAX_SIZE || '20m';
  const maxDaysCombined = isProduction
    ? process.env.LOG_MAX_DAYS_PROD_COMBINED || '30'
    : process.env.LOG_MAX_DAYS_COMBINED || '7';
  const maxDaysErrors = isProduction
    ? process.env.LOG_MAX_DAYS_PROD_ERRORS || '60'
    : process.env.LOG_MAX_DAYS_ERRORS || '14';

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: consoleFormatter,
      level: isProduction ? 'warn' : logLevel,
    }),
  ];

  if (logDir) {
    transports.push(
      new winston.transports.DailyRotateFile({
        dirname: logDir,
        filename: 'combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize,
        maxFiles: maxDaysCombined,
        level: logLevel,
        format: jsonFormatter,
      }) as any,
      new winston.transports.DailyRotateFile({
        dirname: logDir,
        filename: 'error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize,
        maxFiles: maxDaysErrors,
        level: 'error',
        format: jsonFormatter,
      }) as any,
    );
  }

  return {
    level: logLevel,
    format: jsonFormatter,
    createLogger: () =>
      winston.createLogger({
        level: logLevel,
        format: jsonFormatter,
        defaultMeta: {
          service: 'caredroid-backend',
          environment: config.server.nodeEnv,
        },
        transports,
      }),
  };
});
