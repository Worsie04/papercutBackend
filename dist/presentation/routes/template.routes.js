"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const template_controller_1 = require("../controllers/template.controller");
const template_favorite_controller_1 = require("../controllers/template-favorite.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.use((0, auth_middleware_1.authenticate)(['user', 'admin', 'super_admin', 'super_user']));
router.post('/', template_controller_1.TemplateController.create);
router.get('/', template_controller_1.TemplateController.getAllByUserId);
router.get('/shared-with-me', template_controller_1.TemplateController.getSharedWithMe);
// Template Favorite Routes - moved before specific template routes
router.get('/favorites', template_favorite_controller_1.TemplateFavoriteController.getUserFavoriteTemplates);
router.get('/favorites/count', template_favorite_controller_1.TemplateFavoriteController.getUserFavoriteCount);
router.delete('/shares/:shareId', template_controller_1.TemplateController.deleteShare);
router.get('/:id', template_controller_1.TemplateController.getById);
router.put('/:id', template_controller_1.TemplateController.update);
router.delete('/:id', template_controller_1.TemplateController.delete);
router.get('/:id/reviewers', template_controller_1.TemplateController.getReviewers);
router.put('/:id/reviewers', template_controller_1.TemplateController.updateReviewers);
router.post('/:id/share', template_controller_1.TemplateController.share);
router.get('/:id/share-history', template_controller_1.TemplateController.getShareHistory);
router.get('/:id/shared', template_controller_1.TemplateController.getByIdShared);
// Template Favorite Routes for specific templates
router.post('/:id/favorite', template_favorite_controller_1.TemplateFavoriteController.toggleFavorite);
router.get('/:id/favorite', template_favorite_controller_1.TemplateFavoriteController.getFavoriteStatus);
router.get('/:id/favorited-by', template_favorite_controller_1.TemplateFavoriteController.getTemplatesFavoritedByUsers);
router.get('/:id/favorites/count', template_favorite_controller_1.TemplateFavoriteController.getTemplateFavoriteCount);
exports.default = router;
