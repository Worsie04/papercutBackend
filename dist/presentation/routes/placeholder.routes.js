"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// placeholder.routes.ts
const express_1 = require("express");
const placeholder_controller_1 = require("../controllers/placeholder.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.use((0, auth_middleware_1.authenticate)('user'));
router.get('/check/:placeholderName', placeholder_controller_1.PlaceholderController.checkAndFindPlaceholder);
router.get('/', placeholder_controller_1.PlaceholderController.getPlaceholders);
router.post('/', placeholder_controller_1.PlaceholderController.createPlaceholder);
router.delete('/:id', placeholder_controller_1.PlaceholderController.deletePlaceholder);
router.put('/:id', placeholder_controller_1.PlaceholderController.updatePlaceholder);
exports.default = router;
