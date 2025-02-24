import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { errorHandler } from './presentation/middlewares/errorHandler';
import { requestLogger, errorLogger } from './presentation/middlewares/logger.middleware';
import routes from './presentation/routes';
import { initializeDatabase } from './infrastructure/database/sequelize';

const app = express();

// Initialize database and models before starting the server
let isInitialized = false;

export const initializeApp = async () => {
  if (!isInitialized) {
    try {
      await initializeDatabase();
      isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      process.exit(1);
    }
  }
};

// Security middleware
app.use(helmet());

app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'X-Requested-With',
    'Content-Length',
    'Accept-Encoding',
    'X-CSRF-Token'
  ]
}));

// Cookie parser middleware
app.use(cookieParser());

// Global rate limiting to prevent abuse
// const limiter = rateLimit({
//   windowMs: config.security.rateLimitWindowMs,
//   max: config.security.rateLimitMax,
//   message: 'Too many requests from this IP, please try again later'
// });
// app.use(limiter);

// Session middleware
app.use(session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.nodeEnv === 'production',
    httpOnly: true,
    maxAge: config.session.maxAge,
    sameSite: 'none', 
  }
}));

// Logging middleware
app.use(requestLogger);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routes
app.use(routes);
process.stdout.write('Registered routes: ' + JSON.stringify(app._router.stack
  .filter((r: any) => r.route)
  .map((r: any) => `${r.route.path} - ${r.route.methods}`)) + '\n');

app.set('trust proxy', 1); // Proxy arxasında işləmək üçün

// Error logging
app.use(errorLogger);

// Error handling
app.use(errorHandler);

export { app };
