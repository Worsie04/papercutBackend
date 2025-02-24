"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const organization_controller_1 = require("../controllers/organization.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const organization_member_routes_1 = __importDefault(require("./organization-member.routes"));
const router = (0, express_1.Router)();
// All routes require admin or super_admin authentication by default
router.use((0, auth_middleware_1.authenticate)(['admin', 'super_admin', 'super_user', 'user']));
// Organization routes
// Create organization (admin and super_admin)
router.post('/', (0, auth_middleware_1.authenticate)(['admin', 'super_admin']), organization_controller_1.OrganizationController.createOrganization);
// Get all organizations (admin and super_admin)
router.get('/', organization_controller_1.OrganizationController.getOrganizations); //authenticate(['admin', 'super_admin'])
// Get user's organizations (available to all authenticated users)
router.get('/user', (0, auth_middleware_1.authenticate)(['user', 'admin', 'super_admin', 'super_user']), organization_controller_1.OrganizationController.getUserOrganizations);
router.get('/findDomainByUserId/:userId', (0, auth_middleware_1.authenticate)(['user', 'admin', 'super_admin', 'super_user']), organization_controller_1.OrganizationController.findDomainByUserId);
// Get specific organization (admin and super_admin)
router.get('/:id', (0, auth_middleware_1.authenticate)(['admin', 'super_admin', 'super_user']), organization_controller_1.OrganizationController.getOrganization);
// Update organization (admin and super_admin)
router.patch('/:id', (0, auth_middleware_1.authenticate)(['admin', 'super_admin']), organization_controller_1.OrganizationController.updateOrganization);
// Delete organization (super_admin only)
router.delete('/:id', (0, auth_middleware_1.authenticate)('super_admin'), organization_controller_1.OrganizationController.deleteOrganization);
// Organization member management routes
// Allow access to organization members
router.use('/:organizationId/members', organization_member_routes_1.default);
exports.default = router;
