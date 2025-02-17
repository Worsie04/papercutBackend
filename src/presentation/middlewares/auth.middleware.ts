import { Request, Response, NextFunction } from 'express';
import { JwtUtil, TokenPayload } from '../../utils/jwt.util';
import { AppError } from './errorHandler';
import { Admin, AdminRole } from '../../models/admin.model';
import { User } from '../../models/user.model';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        type: string;
        role?: string;
      };
    }
  }
}

type UserType = 'user' | 'admin' | 'super_admin' | 'super_user';

export const authenticate = (type?: UserType | UserType[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check for token in cookies or Authorization header
      const token = req.cookies?.access_token_w || req.headers.authorization?.split(' ')[1];
      
      //console.log('Cookie token:', req.cookies?.access_token_w);
      //console.log('Auth header:', req.headers.authorization);
      
      if (!token) {
        throw new AppError(401, 'No token provided');
      }

      //console.log('Using token:', token);
      const decoded = JwtUtil.verifyToken(token);
      console.log('Decoded token:', decoded);

      if (type) {
        if (Array.isArray(type)) {
          // Check if user type or role matches any of the allowed types
          const hasValidType = type.some(t => 
            decoded.type === t || decoded.role === t
          );
          console.log('hasValidType:', hasValidType);
          if (!hasValidType) {
            throw new AppError(403, 'Unauthorized access');
          }
        } else {
          // Single type check
          if (decoded.type !== type && decoded.role !== type) {
            throw new AppError(403, 'Unauthorized access');
          }
        }
      }

      req.user = decoded;
      next();
    } catch (error) {
      console.error('Auth error:', error);
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(401, 'Invalid token'));
      }
    }
  };
};

export const requireAdmin = (roles?: AdminRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || req.user.type !== 'admin') {
        throw new AppError(403, 'Admin access required');
      }

      if (roles && roles.length > 0) {
        const admin = await Admin.findByPk(req.user.id);
        if (!admin || !roles.includes(admin.role as AdminRole)) {
          throw new AppError(403, 'Insufficient permissions');
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireVerifiedEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }
    if (req.user.type === 'admin') {
      const admin = await Admin.findByPk(req.user.id);
      if (!admin || !admin.emailVerifiedAt) {
        throw new AppError(403, 'Email verification required');
      }
    } else {
      const user = await User.findByPk(req.user.id);
      if (!user || !user.emailVerifiedAt) {
        throw new AppError(403, 'Email verification required'); 
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireActive = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }
    if (req.user.type === 'admin') {
      const admin = await Admin.findByPk(req.user.id);
      if (!admin || !admin.isActive) {
        throw new AppError(403, 'Account is deactivated');
      }
    } else {
      const user = await User.findByPk(req.user.id);
      if (!user || !user.isActive) {
        throw new AppError(403, 'Account is deactivated');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for token in cookies or Authorization header
    const token = req.cookies.access_token_w || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new AppError(401, 'Unauthorized');
    }

    const decoded = await JwtUtil.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(new AppError(401, 'Unauthorized'));
  }
};