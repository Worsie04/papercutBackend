import { Request } from 'express';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      type: string;
      role?: string;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user?: Express.User;
} 