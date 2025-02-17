import { Request, Response } from 'express';
import { TwoFactorService } from '../../services/twoFactor.service';

export class TwoFactorController {
  private twoFactorService: TwoFactorService;

  constructor() {
    this.twoFactorService = TwoFactorService.getInstance();
  }

  public setup = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user.id; // Assuming user is attached by auth middleware
      const { secret, qrCodeUrl } = await this.twoFactorService.generateSecret(userId);
      
      res.json({ secret, qrCodeUrl });
    } catch (error) {
      console.error('2FA setup error:', error);
      res.status(500).json({ message: 'Failed to setup 2FA' });
    }
  };

  public verify = async (req: Request, res: Response): Promise<void> => {
    try {
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

  public disable = async (req: Request, res: Response): Promise<void> => {
    try {
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

  public getStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;
      const status = await this.twoFactorService.getStatus(userId);
      
      res.json(status);
    } catch (error) {
      console.error('2FA status error:', error);
      res.status(500).json({ message: 'Failed to get 2FA status' });
    }
  };
} 