import { CabinetFollower } from '../models/cabinet-follower.model';
import { Cabinet } from '../models/cabinet.model';
import { User } from '../models/user.model';

export class CabinetFollowerService {
  async followCabinet(userId: string, cabinetId: string): Promise<CabinetFollower> {
    return await CabinetFollower.create({
      user_id: userId,
      cabinet_id: cabinetId,
    });
  }

  async unfollowCabinet(userId: string, cabinetId: string): Promise<number> {
    return await CabinetFollower.destroy({
      where: {
        user_id: userId,
        cabinet_id: cabinetId,
      },
    });
  }

  async isFollowing(userId: string, cabinetId: string): Promise<boolean> {
    const follower = await CabinetFollower.findOne({
      where: {
        user_id: userId,
        cabinet_id: cabinetId,
      },
    });
    return !!follower;
  }

  async getFollowedCabinets(userId: string): Promise<CabinetFollower[]> {
    return await CabinetFollower.findAll({
      where: {
        user_id: userId,
      },
      include: [
        {
          model: Cabinet,
          as: 'cabinet',
        },
      ],
    });
  }

  async getCabinetFollowers(cabinetId: string): Promise<CabinetFollower[]> {
    return await CabinetFollower.findAll({
      where: {
        cabinet_id: cabinetId,
      },
      include: [
        {
          model: User,
          as: 'user',
        },
      ],
    });
  }
} 