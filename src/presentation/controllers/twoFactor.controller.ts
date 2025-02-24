import { Response } from 'express';
import { TwoFactorService } from '../../services/twoFactor.service';
import { AuthenticatedRequest } from '../../types/express';

export class TwoFactorController {
  private twoFactorService: TwoFactorService;

  constructor() {
    this.twoFactorService = TwoFactorService.getInstance();
  }

  public setup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const userId = req.user.id;
      const { secret, qrCodeUrl } = await this.twoFactorService.generateSecret(userId);
      
      res.json({ secret, qrCodeUrl });
    } catch (error) {
      console.error('2FA setup error:', error);
      res.status(500).json({ message: 'Failed to setup 2FA' });
    }
  };

  public verify = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const userId = req.user.id;
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ message: 'Verification token is required' });
        return;
      }

      const isValid = await this.twoFactorService.verifyToken(userId, token);
      
      if (isValid) {
        res.json({ message: '2FA enabled successfully' });
      } else {
        res.status(400).json({ message: 'Invalid verification code' });
      }
    } catch (error) {
      console.error('2FA verification error:', error);
      res.status(500).json({ message: 'Failed to verify 2FA token' });
    }
  };

  public disable = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const userId = req.user.id;
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ message: 'Verification token is required' });
        return;
      }

      const isValid = await this.twoFactorService.disable(userId, token);
      
      if (isValid) {
        res.json({ message: '2FA disabled successfully' });
      } else {
        res.status(400).json({ message: 'Invalid verification code' });
      }
    } catch (error) {
      console.error('2FA disable error:', error);
      res.status(500).json({ message: 'Failed to disable 2FA' });
    }
  };

  public getStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const userId = req.user.id;
      const status = await this.twoFactorService.getStatus(userId);
      
      res.json(status);
    } catch (error) {
      console.error('2FA status error:', error);
      res.status(500).json({ message: 'Failed to get 2FA status' });
    }
  };
} 