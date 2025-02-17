import { Request, Response } from 'express';
import { Role } from '../../models/role.model';
import { AppError } from '../middlewares/errorHandler';

export class RoleController {
  async getRoles(req: Request, res: Response) {
    try {
      const roles = await Role.findAll();
      return res.json(roles);
    } catch (error) {
      throw new AppError(500, 'Error fetching roles');
    }
  }

  async getRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const role = await Role.findByPk(id);
      
      if (!role) {
        throw new AppError(404, 'Role not found');
      }

      return res.json(role);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Error fetching role');
    }
  }

  async createRole(req: Request, res: Response) {
    try {
      const { name, description, permissions } = req.body;
      const role = await Role.create({
        name,
        description,
        permissions,
        isSystem: false
      });

      return res.status(201).json(role);
    } catch (error) {
      throw new AppError(500, 'Error creating role');
    }
  }

  async updateRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, permissions } = req.body;
      
      const role = await Role.findByPk(id);
      
      if (!role) {
        throw new AppError(404, 'Role not found');
      }

      if (role.isSystem) {
        throw new AppError(403, 'System roles cannot be modified');
      }

      await role.update({
        name,
        description,
        permissions
      });

      return res.json(role);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Error updating role');
    }
  }

  async deleteRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const role = await Role.findByPk(id);
      
      if (!role) {
        throw new AppError(404, 'Role not found');
      }

      if (role.isSystem) {
        throw new AppError(403, 'System roles cannot be deleted');
      }

      await role.destroy();
      return res.status(204).send();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Error deleting role');
    }
  }
}