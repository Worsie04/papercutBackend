// auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../services/auth.service';
import { AppError } from '../middlewares/errorHandler';
import { UserService } from '../../services/user.service';
import { OrganizationService } from '../../services/organization.service';
import { EmailService } from '../../services/email.service';
import crypto from 'crypto';
import { OrganizationMemberService } from '../../services/organization-member.service';
import { threadId } from 'worker_threads';

export class AuthController {


  static async login(req: Request, res: Response, next: NextFunction) {
    console.log("login called")
    try {
      const { email, password, twoFactorToken } = req.body;

      const result = await AuthService.login(email, password, twoFactorToken);

      if (result.requiresTwoFactor) {
        res.json({
          requiresTwoFactor: true,
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
          }
        });
        return;
      }

      res.cookie('access_token_w', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });

      res.json({
        user: result.user,
        accessToken: result.accessToken,
        requiresTwoFactor: false
      });
    } catch (error) {
      console.error('Login error:', error);
      next(error); 
    }
  };

  static async loginAdmin(req: Request, res: Response, next: NextFunction) {
    console.log("loginAdmin called")
    try {
      const { email, password } = req.body;
      console.log('Login attempt for admin:', email);

      const result = await AuthService.loginAdmin(email, password);
      console.log('Login successful for admin:', email);

      res.cookie('access_token_w', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });

      res.json(result);
    } catch (error) {
      console.error('Admin login error:', error);
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body; 
      if (!refreshToken) {
        throw new AppError(401, 'Refresh token not provided');
      }
      const result = await AuthService.refreshToken(refreshToken);

       res.cookie('access_token_w', result.accessToken, {
         httpOnly: true,
         secure: process.env.NODE_ENV === 'production',
         sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
         maxAge: 24 * 60 * 60 * 1000 
       });

      res.json({ accessToken: result.accessToken }); 
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
        return res.status(401).json({ message: 'Authentication required' });

        //throw new AppError(401, 'Invalid token');
      }
      console.log('User verified:', req.user);
      const user = await AuthService.getUser(req.user.id, req.user.type as 'user' | 'admin');
      res.json({ user });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      res.clearCookie('access_token_w', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
      });

      res.status(200).json({ message: 'Logged out successfully' });
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

  static async checkEmail(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const user = await UserService.findByEmail(email);
      const organization = email?.includes('@') ? await OrganizationService.findByDomain(email.split('@')[1]) : null;

      return res.json({
        exists: !!user,
        hasPassword: user?.password ? true : false,
        organization: organization ? {
          id: organization.id,
          name: organization.name,
          domain: organization.domain,
        } : null,
      });
    } catch (error) {
      console.error('Check email error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async sendMagicLink(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email || !email.includes('@')) {
           throw new AppError(400, 'Invalid email address');
       }
      const domain = email.split('@')[1];

      const organization = await OrganizationService.findByDomain(domain);
      if (!organization) {
        return res.status(403).json({ message: 'Email domain not associated with any organization' });
      }

      let user = await UserService.findByEmail(email);
      if (!user) {
        user = await UserService.createUser({
          email,
          password: '',
          firstName: email.split('@')[0],
          lastName: 'User',
          role: 'member_full',
        });
      }

      const token = await AuthService.generateMagicLinkToken(user.id);

      await UserService.updateUser(user.id, {
        magicLinkToken: token,
        magicLinkTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      console.log('Generated token:', token);
      console.log('CLIENT_URL:', process.env.CLIENT_URL);
      const magicLink = `${process.env.CLIENT_URL}/login?token=${token}`;
      console.log('Generated magic link:', magicLink);
      await EmailService.sendMagicLink(email, magicLink);

      return res.json({ message: 'Magic link sent successfully' });
    } catch (error) {
      console.error('Send magic link error:', error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async verifyMagicLink(req: Request, res: Response) {
    try {
      const { token } = req.body;

      const userId = await AuthService.verifyMagicLinkToken(token);
      if (!userId) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }

      const user = await UserService.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const requiresTwoFactor = await AuthService.isTwoFactorEnabled(user.id);

      const accessToken = await AuthService.generateAccessToken(user);

       res.cookie('access_token_w', accessToken, {
         httpOnly: true,
         secure: process.env.NODE_ENV === 'production',
         sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
         maxAge: 24 * 60 * 60 * 1000
       });

      return res.json({
        user,
        accessToken, 
        requiresTwoFactor,
      });
    } catch (error) {
      console.error('Verify magic link error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async setPassword(req: Request, res: Response) {
    try {
      const { token, password } = req.body;

      const userId = await AuthService.verifyMagicLinkToken(token);
      if (!userId) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }

      const user = await UserService.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      await UserService.updateUser(userId, { password, isActive: true });

      const accessToken = await AuthService.generateAccessToken(user);

      await AuthService.clearMagicLinkToken(userId);

       res.cookie('access_token_w', accessToken, {
         httpOnly: true,
         secure: process.env.NODE_ENV === 'production',
         sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
         maxAge: 24 * 60 * 60 * 1000
       });

      return res.json({
        user,
        accessToken,
      });
    } catch (error) {
      console.error('Set password error:', error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async register(req: Request, res: Response) {
    try {
      const { firstName, lastName, email, role, position } = req.body;

      const temporaryPassword = crypto.randomBytes(20).toString('hex');
      const user = await UserService.createUser({
        email,
        firstName,
        lastName,
        role,
        password: temporaryPassword,
        isActive: false,
        position,
      });

      const token = await AuthService.generateMagicLinkToken(user.id);


      await UserService.updateUser(user.id, {
        magicLinkToken: token,
        magicLinkTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      const magicLinkUrl = `${process.env.CLIENT_URL}/create-password?token=${token}`;
      await EmailService.sendMagicLink(email, magicLinkUrl);

      res.status(201).json({
        message: 'User registered successfully. Magic link has been sent to the email.',
        userId: user.id,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Failed to register user' });
      }
    }
  }
}