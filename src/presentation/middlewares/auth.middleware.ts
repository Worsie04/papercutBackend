import { Request, Response, NextFunction } from 'express';
import { JwtUtil, TokenPayload } from '../../utils/jwt.util'; // JwtUtil import etdiyinizdən əmin olun
import { AppError } from './errorHandler';
import { Admin, AdminRole } from '../../models/admin.model';
import { User } from '../../models/user.model';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken'; // jwt kitabxanasını import edin

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
    let token: string | undefined; // Tokeni try-catch xaricində əlçatan etmək üçün

    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }

      if (!token) {
        if (!req.cookies) {
           console.warn('Cookies not parsed. Ensure cookie-parser middleware is used before authentication.');
           cookieParser()(req, res, () => {});
        }
        token = req.cookies?.access_token_w;
      }

      if (!token) {
        throw new AppError(401, 'No token provided');
      }

      if (typeof token !== 'string' || token.trim() === '') {
        throw new AppError(401, 'Invalid token format');
      }

      try {
        const decoded = await JwtUtil.verifyToken(token.trim()); // verifyToken özü xəta ata bilər
        req.user = {
          id: decoded.id,
          email: decoded.email,
          type: decoded.type,
          role: decoded.role
        };
        next();
      } catch (error: any) { // verification xətasını burada tuturuq
         res.clearCookie('access_token_w', {
           httpOnly: true,
           secure: process.env.NODE_ENV === 'production',
           sameSite: 'lax'
         });

         // Xətanın detallarını və tokenin məzmununu log edək
         console.error('JWT Verification Error Caught:', error.message);
         if (token) { // Əgər token varsa, onu dekodlayaq
             try {
                 const decodedPayload = jwt.decode(token.trim()); // Yalnız dekodlama, yoxlama yox
                 console.error('Decoded token payload (on error):', decodedPayload);
                 if (decodedPayload && typeof decodedPayload === 'object' && decodedPayload.exp) {
                    console.error(`Token expiration timestamp (exp): ${decodedPayload.exp} (${new Date(decodedPayload.exp * 1000).toISOString()})`);
                    console.error(`Current server time: ${Math.floor(Date.now() / 1000)} (${new Date().toISOString()})`);
                 }
             } catch (decodeError) {
                 console.error('Could not decode the token:', decodeError);
             }
         }

         // Xətanın növünə görə mesaj verək (JwtUtil içindəki error handling artıq bunu edir)
         if (error.message.startsWith('Token has expired')) {
             throw new AppError(401, 'Token has expired');
         } else if (error.message.startsWith('Invalid token')) {
              throw new AppError(401, `Invalid token: ${error.message}`);
         } else {
             throw new AppError(401, `Token verification failed: ${error.message}`);
         }
      }
    } catch (error) { // Ümumi xətaları tutmaq üçün (məs. "No token provided")
      next(error);
    }
  };
};


// --- Digər middleware funksiyaları (requireAdmin, requireVerifiedEmail, etc.) olduğu kimi qalır ---
// ... (əvvəlki cavabdakı kimi) ...


export const requireAdmin = (roles?: AdminRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }
      if (req.user.type !== 'admin' && req.user.role !== 'super_admin') {
         throw new AppError(403, 'Admin access required');
       }

       if (roles && roles.length > 0) {
          if (req.user.role === 'super_admin') {
             return next();
          }
          if (req.user.type === 'admin') {
             const admin = await Admin.findByPk(req.user.id);
             if (!admin || !roles.includes(admin.role as AdminRole)) {
               throw new AppError(403, 'You do not have the required permissions for this action');
             }
          } else {
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
  // Bu funksiya authenticate ilə çox oxşar olduğu üçün,
  // çaşqınlıq yaratmamaq adına bütün route-larda yalnız birini (məsələn, authenticate)
  // istifadə etməyi nəzərdən keçirin. Əgər fərqli məqsədlər üçün saxlanılıbsa,
  // onda bu funksiyanı da yuxarıdakı kimi loglama ilə yeniləmək olar.
  // Hazırda dəyişikliksiz saxlanılır:
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      if (!req.cookies) { cookieParser()(req, res, () => {}); }
      token = req.cookies?.access_token_w;
    }

    if (!token) {
      throw new AppError(401, 'Authentication required. Please login.');
    }

    try {
      const decoded = await JwtUtil.verifyToken(token.trim());
      req.user = decoded;
      next();
    } catch (error: any) {
      res.clearCookie('access_token_w', {
         httpOnly: true,
         secure: process.env.NODE_ENV === 'production',
         sameSite: 'lax' // Use lax
      });
      console.error('JWT Verification Error (requireAuth):', error);
      if (error.name === 'TokenExpiredError') {
        throw new AppError(401, 'Your session has expired. Please login again.');
      } else if (error.name === 'JsonWebTokenError') {
         throw new AppError(401, `Invalid token: ${error.message}`);
      }
      else {
        throw new AppError(401, 'Invalid authentication token. Please login again.');
      }
    }
  } catch (error) {
    next(error);
  }
};