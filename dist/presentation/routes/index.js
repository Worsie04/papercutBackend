"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const user_routes_1 = __importDefault(require("./user.routes"));
const space_routes_1 = __importDefault(require("./space.routes"));
const cabinet_routes_1 = __importDefault(require("./cabinet.routes"));
const cabinet_member_routes_1 = __importDefault(require("./cabinet-member.routes"));
const approval_routes_1 = __importDefault(require("./approval.routes"));
const record_routes_1 = __importDefault(require("./record.routes"));
const worsieorganization_routes_1 = __importDefault(require("./worsieorganization.routes"));
const role_routes_1 = __importDefault(require("./role.routes"));
const group_routes_1 = __importDefault(require("./group.routes"));
const router = (0, express_1.Router)();
// API version prefix
const API_VERSION = '/api/v1';
// Mount routes
router.use(`${API_VERSION}/auth`, auth_routes_1.default);
router.use(`${API_VERSION}/users`, user_routes_1.default);
router.use(`${API_VERSION}/spaces`, space_routes_1.default);
router.use(`${API_VERSION}/cabinets`, cabinet_routes_1.default);
router.use(`${API_VERSION}/cabinet-members`, cabinet_member_routes_1.default);
router.use(`${API_VERSION}/approvals`, approval_routes_1.default);
router.use(`${API_VERSION}/records`, record_routes_1.default);
router.use(`${API_VERSION}/organizations`, worsieorganization_routes_1.default);
router.use(`${API_VERSION}/roles`, role_routes_1.default);
router.use(`${API_VERSION}/groups`, group_routes_1.default);
// Health check endpoint
router.get(`${API_VERSION}/health`, (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
exports.default = router;
