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

// CORS konfiqurasiya
// config.corsOrigins -> process.env.CORS_ORIGINS?.split(',') vasitəsilə siyahı oxunur
app.use(cors({
  origin: config.corsOrigins, // ['https://worsie.vercel.app', 'http://localhost:3000'] əvəzinə
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
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
    secure: config.nodeEnv === 'production', // HTTPS istifadə olunursa true qalır
    httpOnly: true,
    maxAge: config.session.maxAge,
    sameSite: 'none', 
    /*
      Cross-site mühitdə cookie ötürmək üçün sameSite: 'none' lazımdır.
      Əgər strictly “same-site” istəyirsinizsə, bunu dəyişə bilərsiniz.
    */
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

// // 404 handler (isteyirsinizsə, uncomment edin)
// // app.use((req, res) => {
// //   res.status(404).json({
// //     status: 'error',
// //     message: 'Route not found'
// //   });
// // });

export { app };
