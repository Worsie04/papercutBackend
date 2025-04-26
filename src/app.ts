import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { errorHandler } from './presentation/middlewares/errorHandler';
import { requestLogger, errorLogger } from './presentation/middlewares/logger.middleware';
import routes from './presentation/routes';
import { initializeDatabase } from './infrastructure/database/sequelize';

const app = express();

/* ---------  1 TRUST THE RENDER PROXY *BEFORE* COOKIES -------- */
app.set('trust proxy', 1);      // ← moved to the top

/* ---------  2 SECURITY MIDDLEWARES --------------------------- */
app.use(helmet());

/* ---------  3 CORS  ------------------------------------------ */
const allowedOrigins = Array.isArray(config.corsOrigins)
  ? config.corsOrigins.map((o: string) => o.trim()).filter(Boolean)
  : (typeof config.corsOrigins === 'string'
      ? config.corsOrigins
      : '')
      .split(',')
      .map((o: string) => o.trim())
      .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'Content-Length',
      'Accept-Encoding',
      'X-CSRF-Token',
    ],
  }),
);

/* ---------  4 COOKIES & SESSION ------------------------------ */
app.use(cookieParser());

app.use(
  session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,               // always HTTPS on Render
      sameSite: 'none',           // cross-site cookie
      domain: '.onrender.com',    // any sub-domain (api., client.)
      maxAge: config.session.maxAge,
    },
  }),
);

/* ---------  5 LOGGING & BODY PARSERS ------------------------- */
app.use(requestLogger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------  6 ROUTES & ERROR HANDLERS ------------------------ */
app.use(routes);
app.use(errorLogger);
app.use(errorHandler);

export { app };

/* database initialiser stays unchanged ----------------------- */
let isInitialized = false;
export const initializeApp = async () => {
  if (!isInitialized) {
    await initializeDatabase();
    isInitialized = true;
  }
};
