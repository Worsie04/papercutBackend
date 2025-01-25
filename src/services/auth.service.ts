import { User } from '../models/user.model';
import { Admin } from '../models/admin.model';
import { JwtUtil, TokenPayload } from '../utils/jwt.util';
import { AppError } from '../presentation/middlewares/errorHandler';

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
      refreshToken: JwtUtil.generateRefreshToken(user.id, 'user'),
      user,
    };
  }

  static async loginAdmin(email: string, password: string): Promise<LoginResponse> {
    const admin = await Admin.findOne({ where: { email } });
    if (!admin) {
      throw new AppError(401, 'Invalid credentials');
    }

    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid credentials');
    }

    if (!admin.isActive) {
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

    return {
      accessToken: JwtUtil.generateToken(payload),
      refreshToken: JwtUtil.generateRefreshToken(admin.id, 'admin'),
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

    // Here you could implement token blacklisting if needed
    // For now, we'll just update the last login time
    if ('lastLoginAt' in user) {
      user.lastLoginAt = new Date();
      await user.save();
    }
  }

  static async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const decoded = JwtUtil.verifyToken(refreshToken);
    if (!decoded || !decoded.id || !decoded.type) {
      throw new AppError(401, 'Invalid refresh token');
    }

    let entity;
    if (decoded.type === 'admin') {
      entity = await Admin.findByPk(decoded.id);
    } else {
      entity = await User.findByPk(decoded.id);
    }

    if (!entity) {
      throw new AppError(401, 'Invalid refresh token');
    }

    if (!entity.isActive) {
      throw new AppError(403, 'Account is deactivated');
    }

    const payload: TokenPayload = {
      id: entity.id,
      email: entity.email,
      type: decoded.type,
      role: decoded.type === 'admin' ? (entity as Admin).role : undefined,
    };

    return {
      accessToken: JwtUtil.generateToken(payload),
      refreshToken: JwtUtil.generateRefreshToken(entity.id, decoded.type),
    };
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
} 