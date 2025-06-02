import { Router } from 'express';
import { TemplateController } from '../controllers/template.controller';
import { TemplateFavoriteController } from '../controllers/template-favorite.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate(['user', 'admin', 'super_admin','super_user']));

router.post('/', TemplateController.create);
router.get('/', TemplateController.getAllByUserId);
router.get('/shared-with-me', TemplateController.getSharedWithMe);

// Template Favorite Routes - moved before specific template routes
router.get('/favorites', TemplateFavoriteController.getUserFavoriteTemplates);
router.get('/favorites/count', TemplateFavoriteController.getUserFavoriteCount);

router.delete('/shares/:shareId', TemplateController.deleteShare);
router.get('/:id', TemplateController.getById);
router.put('/:id', TemplateController.update);
router.delete('/:id', TemplateController.delete);

router.get('/:id/reviewers', TemplateController.getReviewers);
router.put('/:id/reviewers', TemplateController.updateReviewers);

router.post('/:id/share', TemplateController.share);
router.get('/:id/share-history', TemplateController.getShareHistory);
router.get('/:id/shared', TemplateController.getByIdShared);

// Template Favorite Routes for specific templates
router.post('/:id/favorite', TemplateFavoriteController.toggleFavorite);
router.get('/:id/favorite', TemplateFavoriteController.getFavoriteStatus);
router.get('/:id/favorited-by', TemplateFavoriteController.getTemplatesFavoritedByUsers);
router.get('/:id/favorites/count', TemplateFavoriteController.getTemplateFavoriteCount);

export default router;
