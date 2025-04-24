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

// In auth.middleware.ts
export const authenticate = (type?: UserType | UserType[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let token: string | undefined;
      
      // Check Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
      
      // Fallback to cookie if no valid Authorization header
      // if (!token) {
      //   token = req.cookies?.access_token_w;
      // }

      if (!token) {
        throw new AppError(401, 'No token provided');
      }

      // Validate token format before verification
      if (typeof token !== 'string' || token.trim() === '') {
        throw new AppError(401, 'Invalid token format');
      }

      try {
        const decoded = await JwtUtil.verifyToken(token.trim());
        req.user = {
          id: decoded.id,
          email: decoded.email,
          type: decoded.type,
          role: decoded.role
        };
        next();
      } catch (error) {
        throw new AppError(401, 'Invalid or expired token');
      }
    } catch (error) {
      next(error);
    }
  };
};


export const requireAdmin = (roles?: AdminRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Checking admin access...',req.user);
      // if (!req.user || (req.user.type !== 'admin' && req.user.role !== 'super_admin')) {
      //   throw new AppError(403, 'Admin access required');
      // }

      // if (roles && roles.length > 0) {
      //   const admin = await Admin.findByPk(req.user.id);
      //   if (!admin || !roles.includes(admin.role as AdminRole)) {
      //     throw new AppError(403, 'You do not have the required permissions for this action');
      //   }
      // }

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
        throw new AppError(403, 'Please verify your email address before continuing');
      }
    } else {
      const user = await User.findByPk(req.user.id);
      if (!user || !user.emailVerifiedAt) {
        throw new AppError(403, 'Please verify your email address before continuing'); 
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
        throw new AppError(403, 'Your account has been deactivated. Please contact support.');
      }
    } else {
      const user = await User.findByPk(req.user.id);
      if (!user || !user.isActive) {
        throw new AppError(403, 'Your account has been deactivated. Please contact support.');
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
    //const token = req.cookies.access_token_w || req.headers.authorization?.split(' ')[1];
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new AppError(401, 'Authentication required. Please login.');
    }

    try {
      const decoded = await JwtUtil.verifyToken(token);
      req.user = decoded;
      next();
    } catch (error: any) {
      // Handle specific JWT errors
      if (error.name === 'TokenExpiredError') {
        throw new AppError(401, 'Your session has expired. Please login again.');
      } else {
        throw new AppError(401, 'Invalid authentication token. Please login again.');
      }
    }
  } catch (error) {
    next(error);
  }
};
