"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/presentation/routes/publicLetter.routes.ts
const express_1 = require("express");
const publicLetter_controller_1 = require("../controllers/publicLetter.controller"); // NEW Controller
const router = (0, express_1.Router)();
// No authentication middleware needed here
router.get('/:id', publicLetter_controller_1.PublicLetterController.getPublicLetter); // Route to get public details
router.get('/view-pdf/:key(*)', publicLetter_controller_1.PublicLetterController.getPublicPdfViewUrl); // Route to get view URL by key
exports.default = router;
