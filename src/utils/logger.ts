import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

// Mask sensitive data
const maskData = winston.format((info) => {
  if (info.message && typeof info.message === 'string') {
    // Basic redaction of JWTs (Header.Payload.Signature)
    info.message = info.message.replace(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[MASKED_JWT]');
  }
  return info;
});

const customFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let metaStr = Object.keys(metadata).length ? JSON.stringify(metadata) : '';
  return `[${timestamp}] ${level}: ${message} ${metaStr}`;
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    maskData(),
    winston.format.json() // Production structured logging
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        customFormat
      )
    })
  ]
});
