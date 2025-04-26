import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});


export const updateProfileSchema = z.object({
  firstName: z.string().min(2, 'First name requires at least 2 characters').max(50).optional(),
  lastName: z.string().min(2, 'Last name requires at least 2 characters').max(50).optional(),
  phone: z.string()
           .regex(/^\+?[\d\s()-]+$/, { message: "Invalid phone number format" })
           .max(25, 'Phone number too long')
           .optional()
           .nullable(), // Allow null or undefined
  company: z.string()
            .max(100, 'Company name cannot exceed 100 characters')
            .optional()
            .nullable(), // Allow null or undefined
  timeZone: z.string()
             .max(100, 'Time zone name cannot exceed 100 characters')
             .optional()
             .nullable(), // Allow null or undefined
  avatar: z.string()
           .url({ message: "Invalid URL format for avatar" })
           .max(512, 'Avatar URL too long')
           .optional()
           .nullable(), // Allow null or undefined
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'), // Use min(1) for required check
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});