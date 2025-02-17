import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { User } from '../models/user.model';

export class TwoFactorService {
  private static instance: TwoFactorService;

  private constructor() {}

  public static getInstance(): TwoFactorService {
    if (!TwoFactorService.instance) {
      TwoFactorService.instance = new TwoFactorService();
    }
    return TwoFactorService.instance;
  }

  public async generateSecret(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const secret = authenticator.generateSecret();
      const appName = process.env.APP_NAME || 'YourApp';
      const otpauthUrl = authenticator.keyuri(user.email, appName, secret);
      
      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
      
      // Save secret temporarily (it will be confirmed after verification)
      await user.update({ twoFactorSecret: secret });

      return {
        secret,
        qrCodeUrl,
      };
    } catch (error) {
      console.error('Error generating 2FA secret:', error);
      throw error;
    }
  }

  public async verifyToken(userId: string, token: string): Promise<boolean> {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.twoFactorSecret) {
        throw new Error('Invalid setup state');
      }

      const isValid = authenticator.verify({
        token,
        secret: user.twoFactorSecret,
      });

      if (isValid) {
        // If verification is successful, enable 2FA
        await user.update({
          twoFactorEnabled: true
        });
      }

      return isValid;
    } catch (error) {
      console.error('Error verifying 2FA token:', error);
      throw error;
    }
  }

  public async disable(userId: string, token: string): Promise<boolean> {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.twoFactorSecret || !user.twoFactorEnabled) {
        throw new Error('2FA is not enabled');
      }

      const isValid = authenticator.verify({
        token,
        secret: user.twoFactorSecret,
      });

      if (isValid) {
        await user.update({
          twoFactorSecret: null,
          twoFactorEnabled: false
        });
      }

      return isValid;
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      throw error;
    }
  }

  public async getStatus(userId: string): Promise<{ isEnabled: boolean }> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        isEnabled: user.twoFactorEnabled,
      };
    } catch (error) {
      console.error('Error getting 2FA status:', error);
      throw error;
    }
  }
} 