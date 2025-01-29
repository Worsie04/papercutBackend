import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../services/auth.service';
import { AppError } from '../middlewares/errorHandler';

export class AuthController {
  static async loginUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.loginUser(email, password);
      
      // Set token in cookie
      res.cookie('access_token_w', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      // res.json(result);
      res.json({
        ...result,
        token: result.accessToken
      });
    } catch (error) {
      next(error);
    }
  }

  static async loginAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.loginAdmin(email, password);
      
      // Set token in cookie
      res.cookie('access_token_w', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refreshToken(refreshToken);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      await AuthService.verifyEmail(token);
      res.json({ message: 'Email verified successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async verifyToken(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(401, 'Invalid token');
      }
      const user = await AuthService.getUser(req.user.id, req.user.type as 'user' | 'admin');
      res.json({ user });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(401, 'Not authenticated');
      }
      await AuthService.logout(req.user.id, req.user.type as 'user' | 'admin');
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }

      const { oldPassword, newPassword } = req.body;
      await AuthService.changePassword(
        req.user.id,
        req.user.type as 'user' | 'admin',
        oldPassword,
        newPassword
      );
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, type = 'user' } = req.body;
      const token = await AuthService.generatePasswordResetToken(email, type);
      // TODO: Send email with reset token
      res.json({ message: 'Password reset instructions sent to email' });
    } catch (error) {
      // Don't expose whether the email exists
      res.json({ message: 'If the email exists, reset instructions will be sent' });
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;
      await AuthService.resetPassword(token, newPassword);
      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }

      const token = await AuthService.generateEmailVerificationToken(
        req.user.id,
        req.user.type as 'user' | 'admin'
      );
      // TODO: Send verification email
      res.json({ message: 'Verification email sent' });
    } catch (error) {
      next(error);
    }
  }
} 