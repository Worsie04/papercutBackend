import TemplateFavorite from '../models/template-favorite.model';
import Template from '../models/template.model';
import { User } from '../models/user.model';
import { Op } from 'sequelize';

// Type for TemplateFavorite with included associations
interface TemplateFavoriteWithTemplate extends TemplateFavorite {
  template: Template;
}

interface TemplateFavoriteWithUser extends TemplateFavorite {
  user: User;
}

export class TemplateFavoriteService {
  /**
   * Toggle favorite status of a template for a user
   * @param userId - User ID
   * @param templateId - Template ID
   * @returns Promise<boolean> - true if added to favorites, false if removed
   */
  static async toggleFavorite(userId: string, templateId: string): Promise<boolean> {
    try {
      // Check if the favorite already exists
      const existingFavorite = await TemplateFavorite.findOne({
        where: {
          userId,
          templateId,
        },
      });

      if (existingFavorite) {
        // Remove from favorites
        await existingFavorite.destroy();
        return false;
      } else {
        // Add to favorites
        await TemplateFavorite.create({
          userId,
          templateId,
        });
        return true;
      }
    } catch (error: any) {
      console.error('Error toggling template favorite:', error);
      throw new Error('Favorite template funksiyasında xəta baş verdi');
    }
  }

  /**
   * Check if a template is favorited by a user
   * @param userId - User ID
   * @param templateId - Template ID
   * @returns Promise<boolean> - true if favorited, false otherwise
   */
  static async isFavorite(userId: string, templateId: string): Promise<boolean> {
    try {
      const favorite = await TemplateFavorite.findOne({
        where: {
          userId,
          templateId,
        },
      });

      return !!favorite;
    } catch (error: any) {
      console.error('Error checking favorite status:', error);
      throw new Error('Favorite status yoxlanarkən xəta baş verdi');
    }
  }

  /**
   * Get all favorite templates for a user
   * @param userId - User ID
   * @returns Promise<Template[]> - Array of favorite templates
   */
  static async getUserFavoriteTemplates(userId: string): Promise<Template[]> {
    try {
      const favoriteTemplates = await TemplateFavorite.findAll({
        where: {
          userId,
        },
        include: [
          {
            model: Template,
            as: 'template',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'firstName', 'lastName', 'email'],
              },
            ],
          },
        ],
        order: [['createdAt', 'DESC']],
      }) as TemplateFavoriteWithTemplate[];

      // Extract the templates from the favorite records
      return favoriteTemplates
        .map(favorite => favorite.template)
        .filter(template => template !== null);
    } catch (error: any) {
      console.error('Error getting user favorite templates:', error);
      throw new Error('Favorite şablonları əldə edərkən xəta baş verdi');
    }
  }

  /**
   * Get all users who favorited a specific template
   * @param templateId - Template ID
   * @returns Promise<User[]> - Array of users who favorited the template
   */
  static async getTemplatesFavoritedByUsers(templateId: string): Promise<User[]> {
    try {
      const favoritedBy = await TemplateFavorite.findAll({
        where: {
          templateId,
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'],
          },
        ],
        order: [['createdAt', 'DESC']],
      }) as TemplateFavoriteWithUser[];

      // Extract the users from the favorite records
      return favoritedBy
        .map(favorite => favorite.user)
        .filter(user => user !== null);
    } catch (error: any) {
      console.error('Error getting users who favorited template:', error);
      throw new Error('Template-i favorite edən istifadəçilər alınarkən xəta baş verdi');
    }
  }

  /**
   * Remove a template from all users' favorites (useful when deleting a template)
   * @param templateId - Template ID
   * @returns Promise<number> - Number of favorite records deleted
   */
  static async removeTemplateFromAllFavorites(templateId: string): Promise<number> {
    try {
      const deletedCount = await TemplateFavorite.destroy({
        where: {
          templateId,
        },
      });

      return deletedCount;
    } catch (error: any) {
      console.error('Error removing template from all favorites:', error);
      throw new Error('Template-i bütün favorite-lərdən silməkdə xəta baş verdi');
    }
  }

  /**
   * Get favorite templates count for a user
   * @param userId - User ID
   * @returns Promise<number> - Count of favorite templates
   */
  static async getUserFavoriteCount(userId: string): Promise<number> {
    try {
      const count = await TemplateFavorite.count({
        where: {
          userId,
        },
      });

      return count;
    } catch (error: any) {
      console.error('Error getting user favorite count:', error);
      throw new Error('Favorite template sayını alarkən xəta baş verdi');
    }
  }

  /**
   * Get template favorite count
   * @param templateId - Template ID
   * @returns Promise<number> - Count of users who favorited the template
   */
  static async getTemplateFavoriteCount(templateId: string): Promise<number> {
    try {
      const count = await TemplateFavorite.count({
        where: {
          templateId,
        },
      });

      return count;
    } catch (error: any) {
      console.error('Error getting template favorite count:', error);
      throw new Error('Template favorite sayını alarkən xəta baş verdi');
    }
  }
} 