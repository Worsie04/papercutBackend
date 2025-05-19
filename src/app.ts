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

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});


app.use(cors({
  origin: function(origin, callback) {
    console.log(`CORS request from origin: ${origin || 'No origin'}`);
    
    // Allow requests with no origin (like mobile apps, curl requests, or same-origin)
    if(!origin) {
      console.log('No origin - allowing request');
      return callback(null, true);
    }
    
    // Get the list of allowed origins
    const allowedOrigins = Array.isArray(config.corsOrigins) 
      ? config.corsOrigins 
      : config.corsOrigins ? [config.corsOrigins] : [];
    
    // Also allow papercut.website domains in production
    if (process.env.NODE_ENV === 'production') {
      allowedOrigins.push(
        'https://www.papercut.website',
        'https://papercut.website',
        'https://admin.papercut.website'
      );
    }
    
    try {
      // Check if the origin matches any allowed origin
      const originUrl = new URL(origin);
      const matchesAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed !== 'string') return false;
        
        // Match exact origins or wildcards like *.domain.com
        if (allowed.startsWith('*.')) {
          const domain = allowed.substring(2);
          return originUrl.hostname.endsWith(domain);
        }
        return allowed === origin;
      });
      
      if(matchesAllowed) {
        console.log(`Origin ${origin} allowed by CORS`);
        return callback(null, true);
      } else {
        console.log(`Origin ${origin} not allowed by CORS. Allowed origins:`, allowedOrigins);
        return callback(new Error('Not allowed by CORS'));
      }
    } catch (err) {
      console.error(`Error parsing origin: ${origin}`, err);
      return callback(new Error('Invalid origin'));
    }
  },
  credentials: true, // Critical for cross-origin cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'X-Requested-With',
    'Content-Length',
    'Accept-Encoding',
    'X-CSRF-Token',
    'Cookie'
  ],
  exposedHeaders: [
    'Set-Cookie', 
    'set-cookie', 
    'Authorization',
    'Access-Control-Allow-Credentials',
    'Access-Control-Allow-Origin'
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
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    path: '/'
  }
}));

// Logging middleware
app.use(requestLogger);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routes
app.use(routes);

app.set('trust proxy', 1); // Proxy arxasında işləmək üçün

// Error logging
app.use(errorLogger);

// Error handling
app.use(errorHandler);

export { app };
