import { z } from 'zod';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate.middleware';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(6, 'Password must be at least 6 characters'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const verifyEmailSchema = z.object({
  token: z.string(),
});

export const checkEmailSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const magicLinkSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const verifyMagicLinkSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const setPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const validateRegisterRequest = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name must be at most 50 characters'),
  
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name must be at most 50 characters'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('role')
    .trim()
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['member_full', 'member_read', 'owner', 'co_owner', 'guest'])
    .withMessage('Invalid role'),
  
  body('organizationId')
    .trim()
    .notEmpty()
    .withMessage('Organization ID is required'),
  
    //validate,
]; 