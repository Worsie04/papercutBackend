// src/services/publicLetter.service.ts
import { Letter, LetterWorkflowStatus } from '../models/letter.model'; //
import { AppError } from '../presentation/middlewares/errorHandler'; //

// Define the structure of the data returned publicly
interface PublicLetterData {
    id: string;
    name?: string | null;
    finalSignedPdfUrl?: string | null; // Crucially, return the path/key
    // Add any other fields you deem safe to be public (e.g., createdAt)
    createdAt?: Date;
}

export class PublicLetterService {

    static async getPublicLetterDetails(letterId: string): Promise<PublicLetterData> {
        try {
            const letter = await Letter.findByPk(letterId, {
                // Only select fields needed publicly
                attributes: ['id', 'name', 'finalSignedPdfUrl', 'workflowStatus', 'createdAt']
            });

            if (!letter) {
                throw new AppError(404, 'Letter not found.');
            }

            // IMPORTANT: Only return details if the letter is actually APPROVED
            if (letter.workflowStatus !== LetterWorkflowStatus.APPROVED) { //
                // Return 404 even if it exists but isn't approved, to avoid leaking info
                throw new AppError(404, 'Approved letter not found or access denied.');
            }

            // Only return safe, public data
            const publicData: PublicLetterData = {
                id: letter.id,
                name: letter.name,
                finalSignedPdfUrl: letter.finalSignedPdfUrl, // Return the key/path
                createdAt: letter.createdAt
            };

            return publicData;

        } catch (error) {
            console.error(`Error fetching public letter details for ID ${letterId}:`, error);
            if (error instanceof AppError) {
                 // Re-throw AppErrors (like 404) to be handled by controller/error middleware
                 throw error;
            }
            // Wrap other errors
            throw new AppError(500, 'Failed to retrieve public letter information.');
        }
    }
}