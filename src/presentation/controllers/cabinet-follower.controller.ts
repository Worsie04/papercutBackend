import { Request, Response } from 'express';
import { CabinetFollowerService } from '../../services/cabinet-follower.service';

export class CabinetFollowerController {
  private cabinetFollowerService: CabinetFollowerService;

  constructor() {
    this.cabinetFollowerService = new CabinetFollowerService();
  }

  followCabinet = async (req: Request, res: Response): Promise<void> => {
    try {
      const { cabinetId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const follower = await this.cabinetFollowerService.followCabinet(userId, cabinetId);
      res.status(201).json(follower);
    } catch (error) {
      res.status(500).json({ message: 'Error following cabinet', error });
    }
  };

  unfollowCabinet = async (req: Request, res: Response): Promise<void> => {
    try {
      const { cabinetId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      await this.cabinetFollowerService.unfollowCabinet(userId, cabinetId);
      res.status(200).json({ message: 'Successfully unfollowed cabinet' });
    } catch (error) {
      res.status(500).json({ message: 'Error unfollowing cabinet', error });
    }
  };

  isFollowing = async (req: Request, res: Response): Promise<void> => {
    try {
      const { cabinetId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const isFollowing = await this.cabinetFollowerService.isFollowing(userId, cabinetId);
      res.status(200).json({ isFollowing });
    } catch (error) {
      res.status(500).json({ message: 'Error checking follow status', error });
    }
  };

  getFollowedCabinets = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      const followedCabinets = await this.cabinetFollowerService.getFollowedCabinets(userId);
      res.status(200).json(followedCabinets);
    } catch (error) {
      res.status(500).json({ message: 'Error getting followed cabinets', error });
    }
  };

  getCabinetFollowers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { cabinetId } = req.params;
      const followers = await this.cabinetFollowerService.getCabinetFollowers(cabinetId);
      res.status(200).json(followers);
    } catch (error) {
      res.status(500).json({ message: 'Error getting cabinet followers', error });
    }
  };
} 