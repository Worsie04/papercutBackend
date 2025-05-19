import { User } from '../models/user.model';
import { Admin } from '../models/admin.model';
import { JwtUtil, TokenPayload } from '../utils/jwt.util';
import { AppError } from '../presentation/middlewares/errorHandler';
import { authenticator } from 'otplib';
import crypto from 'crypto';
import { Op } from 'sequelize';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User | Admin;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  static async login(email: string, password: string, twoFactorToken?: string): Promise<{ user: User; accessToken: string; requiresTwoFactor: boolean }> {
    try {
      const user = await User.findOne({ where: { email } });
      if (!user || !user.isActive) {
        throw new AppError(401, 'Invalid credentials');
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new AppError(401, 'Invalid credentials');
      }

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        // If 2FA token is not provided, return flag indicating 2FA is required
        if (!twoFactorToken) {
          return {
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
            } as User,
            accessToken: '',
            requiresTwoFactor: true
          };
        }

        // Verify 2FA token
        const isValid = authenticator.verify({
          token: twoFactorToken,
          secret: user.twoFactorSecret!
        });

        if (!isValid) {
          throw new AppError(401, 'Invalid 2FA code');
        }
      }

      // Generate JWT token
      const accessToken = JwtUtil.generateToken({
        id: user.id,
        email: user.email,
        type: 'user'
      });

      return {
        user,
        accessToken,
        requiresTwoFactor: false
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  static async loginUser(email: string, password: string): Promise<LoginResponse> {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid credentials');
    }

    if (!user.isActive) {
      throw new AppError(403, 'Account is deactivated');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    const payload: TokenPayload = {
      id: user.id,
      email: user.email,
      type: 'user',
    };

    return {
      accessToken: JwtUtil.generateToken(payload),
      refreshToken: JwtUtil.generateRefreshToken(payload),
      user,
    };
  }

  static async loginAdmin(email: string, password: string): Promise<LoginResponse> {
    //console.log('AuthService.loginAdmin called with email:', email);
    
    const admin = await Admin.findOne({ where: { email } });
    //console.log('Admin found:', admin ? 'yes' : 'no');
    
    if (!admin) {
      //console.log('Admin not found for email:', email);
      throw new AppError(401, 'Invalid credentials');
    }

    //console.log('Comparing passwords...');
    const isPasswordValid = await admin.comparePassword(password);
    //console.log('Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      //console.log('Invalid password for admin:', email);
      throw new AppError(401, 'Invalid credentials');
    }

    if (!admin.isActive) {
      //console.log('Admin account is not active:', email);
      throw new AppError(403, 'Account is deactivated');
    }

    // Update last login
    admin.lastLoginAt = new Date();
    await admin.save();

    const payload: TokenPayload = {
      id: admin.id,
      email: admin.email,
      type: 'admin',
      role: admin.role,
    };

    //console.log('Generating tokens for admin:', email);
    return {
      accessToken: JwtUtil.generateToken(payload),
      refreshToken: JwtUtil.generateRefreshToken(payload),
      user: admin,
    };
  }

  static async getUser(id: string, type: 'user' | 'admin'): Promise<User | Admin> {
    if (type === 'admin') {
      const admin = await Admin.findByPk(id);
      if (!admin) {
        throw new AppError(404, 'Admin not found');
      }
      return admin;
    } else {
      const user = await User.findByPk(id);
      if (!user) {
        throw new AppError(404, 'User not found'); 
      }
      return user;
    }

  }

  static async logout(id: string, type: 'user' | 'admin'): Promise<void> {
    let user;
    if (type === 'admin') {
      user = await Admin.findByPk(id);
      if (!user) {
        throw new AppError(404, 'Admin not found');
      }
    } else {
      user = await User.findByPk(id);
      if (!user) {
        throw new AppError(404, 'User not found');
      }
    }

    if ('lastLoginAt' in user) {
      user.lastLoginAt = new Date();
      await user.save();
    }
  }

  static async extendSession(userId: string, userType: 'user' | 'admin'): Promise<TokenResponse> {
    try {
      const user = await this.getUser(userId, userType);
      
      if (!user) {
        throw new AppError(401, 'User not found');
      }
      
      // Generate new tokens
      const tokenPayload: TokenPayload = {
        id: user.id,
        email: user.email,
        type: userType,
        // Role is optional in TokenPayload so we can safely add it if available
        ...(userType === 'admin' && (user as any).role && { role: (user as any).role })
      };
      
      const accessToken = JwtUtil.generateToken(tokenPayload);
      const refreshToken = JwtUtil.generateRefreshToken(tokenPayload);
      
      console.log(`Session extended for user ${user.email}`);
      
      return {
        accessToken,
        refreshToken
      };
    } catch (error) {
      console.error('Extend session error:', error);
      throw new AppError(401, 'Failed to extend session');
    }
  }
  
  static async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const decoded = JwtUtil.verifyRefreshToken(refreshToken);
      const user = await this.getUser(decoded.id, decoded.type as 'user' | 'admin');
      
      if (!user) {
        throw new AppError(401, 'Invalid refresh token');
      }
      
      // Generate new tokens
      const tokenPayload: TokenPayload = {
        id: user.id,
        email: user.email,
        type: decoded.type,
        // Role is optional in TokenPayload so we can safely add it if available
        ...(decoded.type === 'admin' && (user as any).role && { role: (user as any).role })
      };
      
      const accessToken = JwtUtil.generateToken(tokenPayload);
      const newRefreshToken = JwtUtil.generateRefreshToken(tokenPayload);
      
      return {
        accessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      console.error('Refresh token error:', error);
      throw new AppError(401, 'Invalid or expired refresh token');
    }
  }

  static async verifyEmail(token: string): Promise<void> {
    const decoded = JwtUtil.verifyToken(token);
    if (!decoded || !decoded.id || !decoded.type) {
      throw new AppError(401, 'Invalid verification token');
    }

    let entity;
    if (decoded.type === 'admin') {
      entity = await Admin.findByPk(decoded.id);
    } else {
      entity = await User.findByPk(decoded.id);
    }

    if (!entity) {
      throw new AppError(404, 'User not found');
    }

    if (entity.emailVerifiedAt) {
      throw new AppError(400, 'Email already verified');
    }

    entity.emailVerifiedAt = new Date();
    await entity.save();
  }

  static async changePassword(
    userId: string,
    type: 'user' | 'admin',
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    let entity;
    if (type === 'admin') {
      entity = await Admin.findByPk(userId);
    } else {
      entity = await User.findByPk(userId);
    }

    if (!entity) {
      throw new AppError(404, 'User not found');
    }

    const isPasswordValid = await entity.comparePassword(oldPassword);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid current password');
    }

    entity.password = newPassword;
    await entity.save();
  }

  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const decoded = JwtUtil.verifyToken(token);
    if (!decoded || !decoded.id || !decoded.type) {
      throw new AppError(401, 'Invalid reset token');
    }

    let entity;
    if (decoded.type === 'admin') {
      entity = await Admin.findByPk(decoded.id);
    } else {
      entity = await User.findByPk(decoded.id);
    }

    if (!entity) {
      throw new AppError(404, 'User not found');
    }

    entity.password = newPassword;
    await entity.save();
  }

  static async generatePasswordResetToken(email: string, type: 'user' | 'admin'): Promise<string> {
    let entity;
    if (type === 'admin') {
      entity = await Admin.findOne({ where: { email } });
    } else {
      entity = await User.findOne({ where: { email } });
    }

    if (!entity) {
      throw new AppError(404, 'User not found');
    }

    const payload: TokenPayload = {
      id: entity.id,
      email: entity.email,
      type,
    };

    return JwtUtil.generateToken(payload);
  }

  static async generateEmailVerificationToken(userId: string, type: 'user' | 'admin'): Promise<string> {
    let entity;
    if (type === 'admin') {
      entity = await Admin.findByPk(userId);
    } else {
      entity = await User.findByPk(userId);
    }

    if (!entity) {
      throw new AppError(404, 'User not found');
    }

    if (entity.emailVerifiedAt) {
      throw new AppError(400, 'Email already verified');
    }

    const payload: TokenPayload = {
      id: entity.id,
      email: entity.email,
      type,
    };

    return JwtUtil.generateToken(payload);
  }

  static async generateMagicLinkToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store the token in the database
    await User.update(
      { magicLinkToken: token, magicLinkTokenExpiresAt: expiresAt },
      { where: { id: userId } }
    );

    return token;
  }

  static async verifyMagicLinkToken(token: string): Promise<string | null> {
    const user = await User.findOne({
      where: {
        magicLinkToken: token,
        magicLinkTokenExpiresAt: {
          [Op.gt]: new Date(),
        },
      },
    });

    if (!user) {
      return null;
    }

    // // Clear the used token
    // await User.update(
    //   { 
    //     magicLinkToken: '',
    //     magicLinkTokenExpiresAt: undefined 
    //   },
    //   { where: { id: user.id } }
    // );

    return user.id;
  }

  static async clearMagicLinkToken(userId: string): Promise<void> {
    await User.update(
      { magicLinkToken: '', magicLinkTokenExpiresAt: undefined },
      { where: { id: userId } }
    );
  }

  static async isTwoFactorEnabled(userId: string): Promise<boolean> {
    const user = await User.findByPk(userId);
    return user?.twoFactorEnabled || false;
  }

  static async generateAccessToken(user: User): Promise<string> {
    const payload: TokenPayload = {
      id: user.id,
      email: user.email,
      type: 'user',
    };

    return JwtUtil.generateToken(payload);
  }
}