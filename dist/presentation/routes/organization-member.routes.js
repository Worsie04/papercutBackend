"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const organization_member_controller_1 = require("../controllers/organization-member.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const organization_middleware_1 = require("../middlewares/organization.middleware");
const router = (0, express_1.Router)({ mergeParams: true }); // mergeParams allows access to organizationId from parent router
// All routes require authentication
router.use((0, auth_middleware_1.authenticate)(['user', 'admin', 'super_admin', 'super_user']));
// Get user's organization (no organization check needed)
router.get('/user/:userId/organization', organization_member_controller_1.OrganizationMemberController.getUserOrganization);
// Routes below this line require organization access
router.use(organization_middleware_1.checkOrganizationPermissions);
// Get organization members
router.get('/', organization_member_controller_1.OrganizationMemberController.getOrganizationMembers);
// Get organization users (includes user details)
router.get('/users', organization_member_controller_1.OrganizationMemberController.getOrganizationUsers);
// Add member to organization
router.post('/', (0, auth_middleware_1.authenticate)(['admin', 'super_admin', 'super_user']), organization_member_controller_1.OrganizationMemberController.addMember);
// Update member
router.patch('/:userId', (0, auth_middleware_1.authenticate)(['admin', 'super_admin', 'super_user']), organization_member_controller_1.OrganizationMemberController.updateMember);
// Remove member
router.delete('/:userId', (0, auth_middleware_1.authenticate)(['admin', 'super_admin', 'super_user']), organization_member_controller_1.OrganizationMemberController.removeMember);
// Transfer ownership
router.post('/transfer-ownership', (0, auth_middleware_1.authenticate)(['admin', 'super_admin']), organization_member_controller_1.OrganizationMemberController.transferOwnership);
// Check member permissions
router.post('/:userId/check-permissions', organization_member_controller_1.OrganizationMemberController.checkMemberPermissions);
exports.default = router;
