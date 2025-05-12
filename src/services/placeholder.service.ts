// placeholder.service.ts
import { UserPlaceholder } from '../models/user-placeholder.model';
import { AppError } from '../presentation/middlewares/errorHandler';
import { StatusCodes } from 'http-status-codes';

interface CreatePlaceholderDto {
  name: string;
  type: string;
  initialValue?: string | null;
}

type UpdatePlaceholderDto = Partial<CreatePlaceholderDto>;

export class PlaceholderService {
  async getAllForUser(userId: string): Promise<any[]> {
    try {
      const placeholders = await UserPlaceholder.findAll({
        where: { userId },
        order: [['name', 'ASC']],
      });
      // Map to include placeholder field
      return placeholders.map((ph) => ({
        id: ph.id,
        name: ph.name,
        type: ph.type,
        initialValue: ph.initialValue,
        placeholder: ph.placeholder, // Computed dynamically
      }));
    } catch (error) {
      throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Placeholders could not be retrieved.');
    }
  }

  async create(userId: string, data: CreatePlaceholderDto): Promise<any> {
    const { name, type, initialValue } = data;
    if (!name || !type) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Name and type are required.');
    }
    try {
      const newPlaceholder = await UserPlaceholder.create({
        userId,
        name,
        type,
        initialValue,
      });
      return {
        id: newPlaceholder.id,
        name: newPlaceholder.name,
        type: newPlaceholder.type,
        initialValue: newPlaceholder.initialValue,
        placeholder: newPlaceholder.placeholder,
      };
    } catch (error: any) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new AppError(StatusCodes.CONFLICT, `Placeholder "${name}" already exists.`);
      }
      throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Placeholder could not be created.');
    }
  }

  async deleteById(userId: string, placeholderId: string): Promise<boolean> {
    if (!placeholderId) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Placeholder ID is required.');
    }
    try {
      const result = await UserPlaceholder.destroy({
        where: { id: placeholderId, userId },
      });
      if (result === 0) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Placeholder not found or access denied.');
      }
      return true;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Placeholder could not be deleted.');
    }
  }

  // Update method remains optional but included for completeness
  async updateById(userId: string, placeholderId: string, data: UpdatePlaceholderDto): Promise<any> {
    const { name, type, initialValue } = data;
    if (!placeholderId) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Placeholder ID is required.');
    }
    if (name === undefined && type === undefined && initialValue === undefined) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'At least one field must be provided.');
    }
    try {
      const placeholder = await UserPlaceholder.findOne({
        where: { id: placeholderId, userId },
      });
      if (!placeholder) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Placeholder not found or access denied.');
      }
      if (name !== undefined) placeholder.name = name;
      if (type !== undefined) placeholder.type = type;
      if (initialValue !== undefined) placeholder.initialValue = initialValue;
      await placeholder.save();
      return {
        id: placeholder.id,
        name: placeholder.name,
        type: placeholder.type,
        initialValue: placeholder.initialValue,
        placeholder: placeholder.placeholder,
      };
    } catch (error: any) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new AppError(StatusCodes.CONFLICT, `Placeholder "${name}" already exists.`);
      }
      throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Placeholder could not be updated.');
    }
  }
}

export const placeholderService = new PlaceholderService();