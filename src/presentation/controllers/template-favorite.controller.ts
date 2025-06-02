import { Request, Response } from 'express';
import { TemplateFavoriteService } from '../../services/template-favorite.service';

export class TemplateFavoriteController {
  /**
   * Toggle favorite status of a template
   * POST /api/templates/:id/favorite
   */
  static async toggleFavorite(req: Request, res: Response): Promise<void> {
    try {
      const { id: templateId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: 'Unauthorized - İstifadəçi ID-si tapılmadı' 
        });
        return;
      }

      if (!templateId) {
        res.status(400).json({ 
          success: false, 
          error: 'Template ID tələb olunur' 
        });
        return;
      }

      const isFavorite = await TemplateFavoriteService.toggleFavorite(userId, templateId);

      res.status(200).json({
        success: true,
        isFavorite,
        message: isFavorite 
          ? 'Template favorite-lərə əlavə edildi' 
          : 'Template favorite-lərdən silindi'
      });
    } catch (error: any) {
      console.error('Error in toggleFavorite controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Favorite əməliyyatında xəta baş verdi'
      });
    }
  }

  /**
   * Get favorite status of a template
   * GET /api/templates/:id/favorite
   */
  static async getFavoriteStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id: templateId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: 'Unauthorized - İstifadəçi ID-si tapılmadı' 
        });
        return;
      }

      if (!templateId) {
        res.status(400).json({ 
          success: false, 
          error: 'Template ID tələb olunur' 
        });
        return;
      }

      const isFavorite = await TemplateFavoriteService.isFavorite(userId, templateId);

      res.status(200).json({
        success: true,
        isFavorite
      });
    } catch (error: any) {
      console.error('Error in getFavoriteStatus controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Favorite status yoxlanarkən xəta baş verdi'
      });
    }
  }

  /**
   * Get all favorite templates for the current user
   * GET /api/templates/favorites
   */
  static async getUserFavoriteTemplates(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: 'Unauthorized - İstifadəçi ID-si tapılmadı' 
        });
        return;
      }

      const favoriteTemplates = await TemplateFavoriteService.getUserFavoriteTemplates(userId);

      res.status(200).json({
        success: true,
        templates: favoriteTemplates,
        count: favoriteTemplates.length,
        currentUserId: userId
      });
    } catch (error: any) {
      console.error('Error in getUserFavoriteTemplates controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Favorite şablonları alınarkən xəta baş verdi'
      });
    }
  }

  /**
   * Get users who favorited a specific template
   * GET /api/templates/:id/favorited-by
   */
  static async getTemplatesFavoritedByUsers(req: Request, res: Response): Promise<void> {
    try {
      const { id: templateId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: 'Unauthorized - İstifadəçi ID-si tapılmadı' 
        });
        return;
      }

      if (!templateId) {
        res.status(400).json({ 
          success: false, 
          error: 'Template ID tələb olunur' 
        });
        return;
      }

      const users = await TemplateFavoriteService.getTemplatesFavoritedByUsers(templateId);

      res.status(200).json({
        success: true,
        users: users,
        count: users.length
      });
    } catch (error: any) {
      console.error('Error in getTemplatesFavoritedByUsers controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Template-i favorite edən istifadəçilər alınarkən xəta baş verdi'
      });
    }
  }

  /**
   * Get favorite count for current user
   * GET /api/templates/favorites/count
   */
  static async getUserFavoriteCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: 'Unauthorized - İstifadəçi ID-si tapılmadı' 
        });
        return;
      }

      const count = await TemplateFavoriteService.getUserFavoriteCount(userId);

      res.status(200).json({
        success: true,
        count
      });
    } catch (error: any) {
      console.error('Error in getUserFavoriteCount controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Favorite sayını alarkən xəta baş verdi'
      });
    }
  }

  /**
   * Get favorite count for a specific template
   * GET /api/templates/:id/favorites/count
   */
  static async getTemplateFavoriteCount(req: Request, res: Response): Promise<void> {
    try {
      const { id: templateId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: 'Unauthorized - İstifadəçi ID-si tapılmadı' 
        });
        return;
      }

      if (!templateId) {
        res.status(400).json({ 
          success: false, 
          error: 'Template ID tələb olunur' 
        });
        return;
      }

      const count = await TemplateFavoriteService.getTemplateFavoriteCount(templateId);

      res.status(200).json({
        success: true,
        count
      });
    } catch (error: any) {
      console.error('Error in getTemplateFavoriteCount controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Template favorite sayını alarkən xəta baş verdi'
      });
    }
  }
} 