import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import { config } from '../../config';

// Create Winston logger
const logger = winston.createLogger({
  level: config.nodeEnv === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all errors to error.log
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Log request
  logger.info({
    type: 'request',
    method: req.method,
    url: req.url,
    query: req.query,
    body: req.method === 'POST' || req.method === 'PUT' ? '(omitted)' : undefined,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      type: 'response',
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
};

// Error logging middleware
export const errorLogger = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error({
    type: 'error',
    method: req.method,
    url: req.url,
    status: error.status || 500,
    message: error.message,
    stack: config.nodeEnv === 'development' ? error.stack : undefined,
  });

  next(error);
};

// Export logger for use in other parts of the application
export { logger }; 