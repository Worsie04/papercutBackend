"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const space_controller_1 = require("../controllers/space.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const upload_middleware_1 = require("../middlewares/upload.middleware");
const router = (0, express_1.Router)();
router.use((0, auth_middleware_1.authenticate)('user'));
// Space routes 
router.get('/', space_controller_1.SpaceController.getAllSpaces);
router.get('/available-users', space_controller_1.SpaceController.getAvailableUsers);
router.post('/', upload_middleware_1.upload.single('logo'), space_controller_1.SpaceController.createSpace);
router.get('/:id', space_controller_1.SpaceController.getSpace);
// Member management routes
router.post('/:id/members', space_controller_1.SpaceController.addMember);
router.delete('/:id/members/:userId', space_controller_1.SpaceController.removeMember);
exports.default = router;
