"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/search.routes.ts
const express_1 = require("express");
const search_controller_1 = require("../controllers/search.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.use((0, auth_middleware_1.authenticate)());
router.post('/', search_controller_1.SearchController.searchRecords);
exports.default = router;
