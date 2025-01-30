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
import { setupAssociations } from './models/associations';

const app = express();

// Setup database associations
setupAssociations();

// Security middleware
app.use(helmet());

app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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

// Global rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMax,
  message: 'Too many requests from this IP, please try again later'
});
app.use(limiter);

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

// Error logging
app.use(errorLogger);

// Error handling
app.use(errorHandler);

export { app };
