import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import {
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  resetPasswordSchema,
  forgotPasswordSchema,
  verifyEmailSchema,
} from '../validators/auth.validator';
import { authenticate, requireActive } from '../middlewares/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: 'Too many attempts, please try again later',
});

const tokenLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per windowMs
  message: 'Too many token refresh attempts, please try again later',
});

// Public routes
router.post('/login', authLimiter, validate(loginSchema), AuthController.loginUser);
router.post('/admin/login', authLimiter, validate(loginSchema), AuthController.loginAdmin);
router.post('/refresh-token', tokenLimiter, validate(refreshTokenSchema), AuthController.refreshToken);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), AuthController.resetPassword);
router.post('/verify-email', validate(verifyEmailSchema), AuthController.verifyEmail);

// Token verification endpoint
router.get('/verify', authenticate(), AuthController.verifyToken);

// Protected routes
router.post(
  '/change-password',
  authenticate(),
  requireActive,
  validate(changePasswordSchema),
  AuthController.changePassword
);

router.post(
  '/resend-verification',
  authenticate(),
  AuthController.resendVerification
);

// Logout endpoint
router.post('/logout', authenticate(), AuthController.logout);

export default router; 