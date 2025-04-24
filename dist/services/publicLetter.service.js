"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicLetterService = void 0;
// src/services/publicLetter.service.ts
const letter_model_1 = require("../models/letter.model"); //
const errorHandler_1 = require("../presentation/middlewares/errorHandler"); //
class PublicLetterService {
    static async getPublicLetterDetails(letterId) {
        try {
            const letter = await letter_model_1.Letter.findByPk(letterId, {
                // Only select fields needed publicly
                attributes: ['id', 'name', 'finalSignedPdfUrl', 'workflowStatus', 'createdAt']
            });
            if (!letter) {
                throw new errorHandler_1.AppError(404, 'Letter not found.');
            }
            // IMPORTANT: Only return details if the letter is actually APPROVED
            if (letter.workflowStatus !== letter_model_1.LetterWorkflowStatus.APPROVED) { //
                // Return 404 even if it exists but isn't approved, to avoid leaking info
                throw new errorHandler_1.AppError(404, 'Approved letter not found or access denied.');
            }
            // Only return safe, public data
            const publicData = {
                id: letter.id,
                name: letter.name,
                finalSignedPdfUrl: letter.finalSignedPdfUrl, // Return the key/path
                createdAt: letter.createdAt
            };
            return publicData;
        }
        catch (error) {
            console.error(`Error fetching public letter details for ID ${letterId}:`, error);
            if (error instanceof errorHandler_1.AppError) {
                // Re-throw AppErrors (like 404) to be handled by controller/error middleware
                throw error;
            }
            // Wrap other errors
            throw new errorHandler_1.AppError(500, 'Failed to retrieve public letter information.');
        }
    }
}
exports.PublicLetterService = PublicLetterService;
