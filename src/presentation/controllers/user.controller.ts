import { Request, Response, NextFunction } from 'express';
import { UserService } from '../../services/user.service';
import { AppError } from '../middlewares/errorHandler';
import { EmailService } from '../../services/email.service';
import bcrypt from 'bcryptjs';
import { CabinetService } from '../../services/cabinet.service';
import { GroupService } from '../../services/group.service';
import { OrganizationMemberService } from '../../services/organization-member.service';
import { OrganizationService } from '../../services/organization.service';

interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
  isActive?: boolean;
}

interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  phone?: string;
  isActive?: boolean;
}

// Add this interface for the authenticated request
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    type: string;
    role?: string;
  };
}

export class UserController {
  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      const result = await UserService.getUsers({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getSuperUsers(req: Request, res: Response, next: NextFunction) {
    try {
      // Get the current user's ID from the authenticated request
      const authenticatedReq = req as AuthenticatedRequest;
      const userId = authenticatedReq.user.id;
      
      const superUsers = await UserService.getSuperUsers(userId);
      res.json(superUsers);
    } catch (error) {
      next(error);
    }
  }

  static async getUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await UserService.getUser(id);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  static async createUser(req: Request<{}, {}, CreateUserRequest>, res: Response, next: NextFunction) {
    try {
      const user = await UserService.createUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(req: Request<{ id: string }, {}, UpdateUserRequest>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await UserService.updateUser(id, req.body);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await UserService.deleteUser(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async activateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await UserService.updateUser(id, { isActive: true });
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  static async deactivateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await UserService.updateUser(id, { isActive: false });
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  static async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const token = await UserService.generateVerificationToken(id);
      const user = await UserService.getUser(id);
      await EmailService.sendVerificationEmail(user.email, token, 'user');
      res.json({ message: 'Verification email sent' });
    } catch (error) {
      next(error);
    }
  }

  static async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const user = await UserService.getUser(userId);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  static async getUserWithRelatedData(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const includeParams = req.query.include ? (req.query.include as string).split(',') : [];
      
      const result = await UserService.getUserWithRelatedData(userId, includeParams);
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const user = await UserService.updateUser(userId, req.body);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  static async updatePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const { currentPassword, newPassword } = req.body;

      const user = await UserService.getUser(userId);
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

      if (!isPasswordValid) {
        throw new AppError(400, 'Current password is incorrect');
      }

      await UserService.updateUser(userId, { password: newPassword });
      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async getUserCabinets(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.id;
      const cabinets = await UserService.getUserCabinets(userId);
      res.json(cabinets);
    } catch (error) {
      next(error);
    }
  }

  static async getUserGroups(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.id;
      const groups = await GroupService.getGroupsByUserId(userId);
      res.json(groups);
    } catch (error) {
      next(error);
    }
  }
} 