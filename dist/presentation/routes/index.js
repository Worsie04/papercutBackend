"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const user_routes_1 = __importDefault(require("./user.routes"));
const space_routes_1 = __importDefault(require("./space.routes"));
const approval_routes_1 = __importDefault(require("./approval.routes"));
const record_routes_1 = __importDefault(require("./record.routes"));
const worsieorganization_routes_1 = __importDefault(require("./worsieorganization.routes"));
const role_routes_1 = __importDefault(require("./role.routes"));
const group_routes_1 = __importDefault(require("./group.routes"));
const notification_routes_1 = __importDefault(require("./notification.routes"));
const file_routes_1 = __importDefault(require("./file.routes"));
const dashboard_routes_1 = __importDefault(require("./dashboard.routes"));
const activity_routes_1 = __importDefault(require("./activity.routes"));
const chat_routes_1 = __importDefault(require("./chat.routes"));
const search_routes_1 = __importDefault(require("./search.routes"));
const reference_routes_1 = __importDefault(require("./reference.routes"));
const template_routes_1 = __importDefault(require("./template.routes"));
const letter_routes_1 = __importDefault(require("./letter.routes"));
const upload_routes_1 = __importDefault(require("./upload.routes"));
const publicLetter_routes_1 = __importDefault(require("./publicLetter.routes"));
const placeholder_routes_1 = __importDefault(require("./placeholder.routes"));
const image_routes_1 = __importDefault(require("./image.routes"));
const router = (0, express_1.Router)();
router.use('/public/letters', publicLetter_routes_1.default);
// API version prefix
const API_VERSION = '/api/v1';
// Mount routes
router.use(`${API_VERSION}/auth`, auth_routes_1.default);
router.use(`${API_VERSION}/users`, user_routes_1.default);
router.use(`${API_VERSION}/spaces`, space_routes_1.default);
router.use(`${API_VERSION}/approvals`, approval_routes_1.default);
router.use(`${API_VERSION}/records`, record_routes_1.default);
router.use(`${API_VERSION}/organizations`, worsieorganization_routes_1.default);
router.use(`${API_VERSION}/roles`, role_routes_1.default);
router.use(`${API_VERSION}/groups`, group_routes_1.default);
router.use(`${API_VERSION}/notifications`, notification_routes_1.default);
router.use(`${API_VERSION}/files`, file_routes_1.default);
router.use(`${API_VERSION}/dashboard`, dashboard_routes_1.default);
router.use(`${API_VERSION}/activities`, activity_routes_1.default);
router.use(`${API_VERSION}/chat`, chat_routes_1.default);
router.use(`${API_VERSION}/search`, search_routes_1.default);
router.use(`${API_VERSION}/references`, reference_routes_1.default);
router.use(`${API_VERSION}/templates`, template_routes_1.default);
router.use(`${API_VERSION}/letters`, letter_routes_1.default);
router.use(`${API_VERSION}/uploads`, upload_routes_1.default);
router.use(`${API_VERSION}/placeholders`, placeholder_routes_1.default);
router.use(`${API_VERSION}/images`, image_routes_1.default);
// Health check endpoint
router.get(`${API_VERSION}/health`, (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
exports.default = router;
