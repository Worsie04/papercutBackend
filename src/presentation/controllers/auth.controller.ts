import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../services/auth.service';
import { AppError } from '../middlewares/errorHandler';
import { UserService } from '../../services/user.service';
import { OrganizationService } from '../../services/organization.service';
import { EmailService } from '../../services/email.service';
import crypto from 'crypto';
import { OrganizationMemberService } from '../../services/organization-member.service';
import { JwtUtil } from '../../utils/jwt.util';

export class AuthController {

  private static getCookieOptions(maxAge = 24 * 60 * 60 * 1000) { // default 24 hours
    return {
      httpOnly: true,
      secure: true, // Always use secure
      sameSite: process.env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
      maxAge: maxAge,
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.papercut.website' : undefined
    };
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    console.log("login called")
    try {
      const { email, password, twoFactorToken } = req.body;
      console.log(`Login attempt for email: ${email}, has 2FA token: ${!!twoFactorToken}`);

      const result = await AuthService.login(email, password, twoFactorToken);

      if (result.requiresTwoFactor) {
        console.log(`2FA required for user: ${email}`);
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

      // Set proper cookie with correct settings for cross-domain
      console.log(`Setting auth cookie for user: ${email}, production mode: ${process.env.NODE_ENV === 'production'}`);
      const cookieOptions = AuthController.getCookieOptions();
      console.log('Cookie options:', cookieOptions);
      res.cookie('access_token_w', result.accessToken, cookieOptions);

      console.log(`Login successful for: ${email}`);
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

      const cookieOptions = this.getCookieOptions();
      res.cookie('access_token_w', result.accessToken, cookieOptions);

      res.json(result);
    } catch (error) {
      console.error('Admin login error:', error);
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('Token refresh requested');
      
      // Check for token in cookies first, then body as fallback
      const refreshToken = req.cookies.refresh_token_w || req.body.refreshToken;
      
      // If no token found, try to use the access token to extend session
      if (!refreshToken) {
        const accessToken = req.cookies.access_token_w;
        if (!accessToken) {
          console.log('No refresh token or access token provided');
          return res.status(401).json({ 
            success: false,
            message: 'No refresh token provided' 
          });
        }
        
        try {
          // Try to verify and extend current token
          const decoded = JwtUtil.verifyToken(accessToken);
          // If token is still valid but close to expiry, refresh it
          const result = await AuthService.extendSession(decoded.id, decoded.type as 'user' | 'admin');
          
          // Set new access token cookie
          const cookieOptions = this.getCookieOptions();
          res.cookie('access_token_w', result.accessToken, cookieOptions);
          
          console.log('Session extended successfully');
          return res.json({ accessToken: result.accessToken });
        } catch (error) {
          console.log('Failed to extend session with access token');
          return res.status(401).json({ 
            success: false,
            message: 'Invalid token. Please login again' 
          });
        }
      }
      
      // Normal refresh flow with refresh token
      const result = await AuthService.refreshToken(refreshToken);

      // Set new access token cookie
      const cookieOptions = this.getCookieOptions();
      res.cookie('access_token_w', result.accessToken, cookieOptions);
      
      // Optionally set new refresh token cookie if using rolling refresh tokens
      if (result.refreshToken) {
        const refreshCookieOptions = this.getCookieOptions(7 * 24 * 60 * 60 * 1000); // 7 days
        res.cookie('refresh_token_w', result.refreshToken, refreshCookieOptions);
      }

      console.log('Token refreshed successfully');
      res.json({ accessToken: result.accessToken }); // Only send necessary info back
    } catch (error) {
      console.error('Token refresh error:', error);
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
      // First try to get token from cookies, then header
      let token: string | undefined;
      
      if (req.cookies && req.cookies.access_token_w) {
        token = req.cookies.access_token_w;
      } else if (req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.substring(7);
      }
      
      // If no token is found, return empty user object (not authenticated)
      if (!token) {
        return res.status(200).json({ user: null });
      }

      try {
        // Verify the token
        const decoded = JwtUtil.verifyToken(token.trim());
        
        // Get user data
        const user = await AuthService.getUser(decoded.id, decoded.type as 'user' | 'admin');
        return res.json({ user });
      } catch (error) {
        // If token verification fails, return empty user object
        return res.status(200).json({ user: null });
      }
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('Logout requested');
      
      // Clear the cookie with the same settings used to set it
      res.clearCookie('access_token_w', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? undefined : undefined
      });

      // Optionally clear refresh token cookie if used
      // res.clearCookie('refresh_token_w', { ...cookie options });

      // If user information is available in request
      if (req.user) {
        try {
          await AuthService.logout(req.user.id, req.user.type as 'user' | 'admin');
          console.log(`User ${req.user.email} logged out successfully`);
        } catch (error) {
          console.error('Error updating user logout status:', error);
          // Continue with logout even if this fails
        }
      }

      console.log('Logout successful');
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
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

       // Set cookie after successful magic link verification
       res.cookie('access_token_w', accessToken, {
         httpOnly: true,
         secure: process.env.NODE_ENV === 'production',
         sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
         maxAge: 24 * 60 * 60 * 1000,
         path: '/'
       });

      return res.json({
        user,
        accessToken, // Still return token for potential use, but cookie is primary
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

       // Set cookie after setting password
       res.cookie('access_token_w', accessToken, {
         httpOnly: true,
         secure: process.env.NODE_ENV === 'production',
         sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
         maxAge: 24 * 60 * 60 * 1000,
         path: '/'
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