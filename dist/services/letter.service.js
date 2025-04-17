"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LetterService = void 0;
const pdf_lib_1 = require("pdf-lib");
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const letter_model_1 = require("../models/letter.model");
const template_model_1 = __importDefault(require("../models/template.model"));
const user_model_1 = require("../models/user.model");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
const file_model_1 = __importDefault(require("../models/file.model"));
const file_service_1 = require("./file.service");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const client_s3_1 = require("@aws-sdk/client-s3");
const axios_1 = __importDefault(require("axios"));
const template_reviewer_model_1 = __importDefault(require("../models/template-reviewer.model"));
const email_service_1 = require("./email.service");
const notification_service_1 = require("./notification.service");
const letterComment_service_1 = require("./letterComment.service");
const s3Client = new client_s3_1.S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
class LetterService {
    static async create(data) {
        var _a;
        const { templateId, userId, formData, name, logoUrl, signatureUrl, stampUrl } = data;
        // Use PENDING_REVIEW as default status for new letters from templates
        const initialStatus = letter_model_1.LetterStatus.PENDING_REVIEW;
        if (!templateId) { // Letters created via template *must* have a templateId
            throw new errorHandler_1.AppError(400, 'Template ID is required when creating a letter from a template.');
        }
        if (!userId || !formData) {
            throw new errorHandler_1.AppError(400, 'Missing required data: userId and formData are required.');
        }
        const template = await template_model_1.default.findByPk(templateId, {
            include: [{ model: user_model_1.User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }] // Include template creator info
        });
        if (!template) {
            throw new errorHandler_1.AppError(404, `Template with ID ${templateId} not found.`);
        }
        // Fetch the user creating the letter (submitter)
        const submitter = await user_model_1.User.findByPk(userId, { attributes: ['id', 'firstName', 'lastName', 'email'] });
        if (!submitter) {
            throw new errorHandler_1.AppError(404, `Submitter user with ID ${userId} not found.`);
        }
        let newLetter = null; // Declare outside try block
        try {
            console.log(`Creating letter for user ${userId} based on template ${templateId}`);
            newLetter = await letter_model_1.Letter.create({
                templateId,
                userId,
                formData,
                name: (_a = name !== null && name !== void 0 ? name : template.name) !== null && _a !== void 0 ? _a : `Letter from ${template.id.substring(0, 6)}`, // Use template name if available
                logoUrl: logoUrl !== null && logoUrl !== void 0 ? logoUrl : null,
                signatureUrl: signatureUrl !== null && signatureUrl !== void 0 ? signatureUrl : null,
                stampUrl: stampUrl !== null && stampUrl !== void 0 ? stampUrl : null,
                status: initialStatus,
            });
            console.log(`Letter created successfully with ID: ${newLetter.id}, Status: ${initialStatus}`);
            try {
                const reviewers = await template_reviewer_model_1.default.findAll({
                    where: { templateId: templateId },
                    include: [{ model: user_model_1.User, as: 'reviewer', attributes: ['id', 'email', 'firstName', 'lastName'] }]
                });
                if (reviewers && reviewers.length > 0) {
                    console.log(`Found ${reviewers.length} reviewers for template ${templateId}. Notifying...`);
                    const letterViewUrl = `${process.env.CLIENT_URL}/dashboard/Inbox/LetterReview/${newLetter.id}`; // Adjust URL as needed
                    for (const reviewerEntry of reviewers) {
                        if (reviewerEntry.reviewer) { // Ensure reviewer user data is loaded
                            const reviewer = reviewerEntry.reviewer;
                            const submitterName = `${submitter.firstName || ''} ${submitter.lastName || ''}`.trim() || submitter.email;
                            const reviewerName = `${reviewer.firstName || ''} ${reviewer.lastName || ''}`.trim() || reviewer.email;
                            await email_service_1.EmailService.sendReviewRequestEmail(reviewer.email, reviewerName, submitterName, newLetter.name || `Letter ${newLetter.id.substring(0, 6)}`, letterViewUrl);
                            await notification_service_1.NotificationService.createLetterReviewRequestNotification(reviewer.id, newLetter.id, newLetter.name || `Letter ${newLetter.id.substring(0, 6)}`, submitterName);
                            console.log(`Notification sent to reviewer ${reviewer.email} for letter ${newLetter.id}`);
                        }
                        else {
                            console.warn(`Reviewer user data not found for TemplateReviewer entry ID: ${reviewerEntry.id}`);
                        }
                    }
                }
                else {
                    console.log(`No reviewers found for template ${templateId}. Skipping notifications.`);
                }
            }
            catch (notificationError) {
                // Log the error but don't fail the entire letter creation process
                console.error(`Error during notification process for letter ${newLetter === null || newLetter === void 0 ? void 0 : newLetter.id}:`, notificationError);
                // Potentially add a flag to the letter indicating notification failure
            }
            // --- End Notification Logic ---
            // Refetch the created letter to include potential associations
            const finalLetter = await this.findById(newLetter.id, userId);
            if (!finalLetter) {
                throw new errorHandler_1.AppError(500, 'Failed to refetch the newly created letter.');
            }
            return finalLetter;
        }
        catch (error) {
            console.error('Error creating letter in service:', error);
            // Rollback or cleanup logic could go here if needed
            throw error; // Re-throw the original error
        }
    }
    static async getLettersPendingReview(userId) {
        if (!userId) {
            throw new errorHandler_1.AppError(401, 'User ID is required.');
        }
        console.log(`Service: Fetching letters pending review for user ${userId}`);
        try {
            // Find all TemplateReviewer entries for the current user
            const reviewAssignments = await template_reviewer_model_1.default.findAll({
                where: { userId: userId },
                attributes: ['templateId'] // Only need the template IDs
            });
            if (!reviewAssignments || reviewAssignments.length === 0) {
                console.log(`User ${userId} is not assigned as a reviewer for any templates.`);
                return []; // Return empty array if user isn't a reviewer for anything
            }
            const templateIdsUserReviews = reviewAssignments.map(ra => ra.templateId);
            console.log(`User ${userId} reviews templates: ${templateIdsUserReviews.join(', ')}`);
            // Find letters based on these templates that are in 'pending_review' status
            const lettersToReview = await letter_model_1.Letter.findAll({
                where: {
                    templateId: templateIdsUserReviews,
                    status: letter_model_1.LetterStatus.PENDING_REVIEW // <-- Filter by status
                },
                include: [
                    {
                        model: template_model_1.default,
                        as: 'template',
                        attributes: ['id', 'name'], // Include template name
                    },
                    {
                        model: user_model_1.User,
                        as: 'user', // 'user' is the alias for the creator/submitter
                        attributes: ['id', 'firstName', 'lastName', 'email'], // Include submitter info
                    },
                ],
                order: [['createdAt', 'ASC']], // Show oldest first
            });
            console.log(`Found ${lettersToReview.length} letters pending review for user ${userId}`);
            return lettersToReview;
        }
        catch (error) {
            console.error(`Error getting letters pending review for user ${userId}:`, error);
            throw new errorHandler_1.AppError(500, 'Could not retrieve letters pending review.');
        }
    }
    static async getAllByUserId(userId) {
        if (!userId) {
            throw new errorHandler_1.AppError(401, 'User ID is required.');
        }
        try {
            const letters = await letter_model_1.Letter.findAll({
                where: { userId },
                include: [
                    {
                        model: template_model_1.default,
                        as: 'template',
                        attributes: ['id', 'name'],
                    },
                ],
                attributes: ['id', 'name', 'templateId', 'userId', 'logoUrl', 'signatureUrl', 'stampUrl', 'createdAt', 'updatedAt'],
                order: [['createdAt', 'DESC']],
            });
            return letters;
        }
        catch (error) {
            console.error(`Error getting letters for user ${userId}:`, error);
            throw error;
        }
    }
    static async findById(id, requestingUserId) {
        if (!id || !requestingUserId) {
            // It's better to throw errors for invalid input
            throw new errorHandler_1.AppError(400, 'Letter ID and Requesting User ID are required.');
        }
        try {
            // 1. Fetch the letter by ID only first, include associations needed for checks
            const letter = await letter_model_1.Letter.findOne({
                where: { id }, // Fetch by letter ID only
                include: [
                    {
                        model: user_model_1.User,
                        as: 'user', // Creator
                        attributes: ['id', 'firstName', 'lastName', 'email']
                    },
                    {
                        model: template_model_1.default,
                        as: 'template', // Associated Template
                        attributes: ['id', 'name', 'sections']
                    },
                ],
            });
            // 2. Check if letter exists
            if (!letter) {
                console.log(`Service: Letter with ID ${id} not found.`);
                // Uncomment the throw for proper error handling
                throw new errorHandler_1.AppError(404, `Letter with ID ${id} not found.`);
            }
            // 3. Authorization Check: Allow if creator OR assigned reviewer
            // Check if the requester is the creator
            const isCreator = letter.userId === requestingUserId;
            // Check if the requester is an assigned reviewer (only if it's a template-based letter)
            let isReviewer = false;
            if (letter.templateId) { // Check requires a templateId
                const reviewerAssignment = await template_reviewer_model_1.default.findOne({
                    where: {
                        templateId: letter.templateId,
                        userId: requestingUserId // Check if the requesting user is listed as a reviewer
                    }
                });
                isReviewer = !!reviewerAssignment; // True if an assignment record exists
            }
            // Add other checks if needed (e.g., is admin?)
            const isAdmin = false; // Replace with your actual admin check logic if applicable
            // 4. Enforce Authorization
            if (!isCreator && !isReviewer && !isAdmin) {
                console.log(`Service: User ${requestingUserId} denied access to letter ${id}. Not creator or reviewer.`);
                // Uncomment the throw for proper error handling
                throw new errorHandler_1.AppError(403, `Access Denied. You are not authorized to view this letter.`);
            }
            // 5. If authorized, return the letter
            console.log(`Service: User ${requestingUserId} granted access to letter ${id}. IsCreator: ${isCreator}, IsReviewer: ${isReviewer}`);
            return letter;
        }
        catch (error) {
            console.error(`Error finding letter with ID ${id} for user ${requestingUserId}:`, error);
            // Propagate specific AppErrors, wrap others
            if (error instanceof errorHandler_1.AppError)
                throw error;
            // Throw a generic error for unexpected issues
            throw new errorHandler_1.AppError(500, 'Could not retrieve letter due to an internal error.');
        }
    }
    static async delete(id, userId) {
        if (!id || !userId) {
            throw new errorHandler_1.AppError(401, 'Letter ID and User ID are required.');
        }
        try {
            const letterToDelete = await letter_model_1.Letter.findOne({ where: { id, userId }, attributes: ['logoUrl', 'signatureUrl', 'stampUrl'] });
            const affectedRows = await letter_model_1.Letter.destroy({
                where: { id, userId },
            });
            if (affectedRows === 0) {
                throw new errorHandler_1.AppError(401, `Letter with ID ${id} not found or access denied for deletion.`);
            }
            console.log(`Letter with ID ${id} deleted successfully by user ${userId}.`);
            return true;
        }
        catch (error) {
            console.error(`Error deleting letter with ID ${id} for user ${userId}:`, error);
            if (error instanceof errorHandler_1.AppError)
                throw error;
            throw new Error('Could not delete letter.');
        }
    }
    static async createFromPdfInteractive(data) {
        var _a;
        const { originalFileId, placements, userId, name } = data;
        console.log(`Service: Processing PDF signing for original file ID: ${originalFileId}`);
        try {
            const originalFileRecord = await file_model_1.default.findByPk(originalFileId);
            if (!originalFileRecord || !originalFileRecord.path) {
                throw new errorHandler_1.AppError(404, `Original PDF file record not found or path missing for ID: ${originalFileId}`);
            }
            const originalPdfKey = originalFileRecord.path;
            console.log(`Service: Found original PDF key: ${originalPdfKey}`);
            const originalPdfBytes = await file_service_1.FileService.getFileBuffer(originalPdfKey);
            if (!originalPdfBytes) {
                throw new errorHandler_1.AppError(500, `Failed to download original PDF from R2: ${originalPdfKey}`);
            }
            console.log(`Service: Original PDF Bytes Length: ${originalPdfBytes.length}`);
            const pdfDoc = await pdf_lib_1.PDFDocument.load(originalPdfBytes);
            const pages = pdfDoc.getPages();
            console.log(`Service: Loaded PDF with ${pages.length} pages.`);
            let placementSuccessful = false;
            for (const item of placements) {
                console.log(`Service: --- Processing Placement ID (sample): ${item.url.slice(-10)} ---`);
                if (item.pageNumber < 1 || item.pageNumber > pages.length) {
                    console.warn(`Skipping placement: Invalid page number ${item.pageNumber}`);
                    continue;
                }
                let imageBytes = null;
                try {
                    console.log(`Service: Fetching image from URL using axios: ${item.url}`);
                    const response = await axios_1.default.get(item.url, {
                        responseType: 'arraybuffer'
                    });
                    imageBytes = Buffer.from(response.data);
                    if (!imageBytes || imageBytes.length === 0) {
                        throw new Error('Received empty image buffer.');
                    }
                    console.log(`Service: Fetched image ${item.url.slice(-10)} OK (${imageBytes.length} bytes) using axios`);
                }
                catch (fetchError) {
                    console.error(`Service: FAILED to fetch image ${item.url} using axios`, (_a = fetchError.response) === null || _a === void 0 ? void 0 : _a.status, fetchError.message);
                    console.warn(`Skipping placement due to image fetch error.`);
                    continue;
                }
                if (!imageBytes)
                    continue;
                let pdfImage = null;
                try {
                    if (item.url.toLowerCase().endsWith('.png')) {
                        pdfImage = await pdfDoc.embedPng(imageBytes);
                    }
                    else if (item.url.toLowerCase().endsWith('.jpg') || item.url.toLowerCase().endsWith('.jpeg')) {
                        pdfImage = await pdfDoc.embedJpg(imageBytes);
                    }
                    else {
                        console.warn(`Skipping placement: Unsupported image type for URL ${item.url}`);
                        continue;
                    }
                    console.log(`Service: Embedded image ${item.url.slice(-10)} into PDF doc.`);
                }
                catch (embedError) {
                    console.error(`Service: FAILED to embed image ${item.url}`, embedError.message);
                    continue;
                }
                if (!pdfImage)
                    continue;
                const page = pages[item.pageNumber - 1];
                const { width: pageWidth, height: pageHeight } = page.getSize();
                const pdfX = item.x;
                const pdfY = pageHeight - item.y - item.height;
                console.log(`Service: Page ${item.pageNumber} (${pageWidth}x${pageHeight}pt). Target Coords: (x:${pdfX.toFixed(2)}, y:${pdfY.toFixed(2)}). Target Size: (w:${item.width}, h:${item.height})`);
                try {
                    page.drawImage(pdfImage, {
                        x: pdfX,
                        y: pdfY,
                        width: item.width,
                        height: item.height,
                    });
                    console.log(`Service: DRAWN image ${item.url.slice(-10)} on page ${item.pageNumber}.`);
                    placementSuccessful = true;
                }
                catch (drawError) {
                    console.error(`Service: FAILED to draw image ${item.url} on page ${item.pageNumber}`, drawError.message);
                }
            }
            if (!placementSuccessful) {
                console.warn("Service: No placements were successfully drawn onto the PDF.");
            }
            const modifiedPdfBytes = await pdfDoc.save();
            console.log(`Service: Modified PDF Bytes Length: ${modifiedPdfBytes.length}`);
            console.log(`Service: Byte length difference (Modified - Original): ${modifiedPdfBytes.length - originalPdfBytes.length}`);
            const originalFilenameWithoutExt = path_1.default.basename(originalFileRecord.name || 'signed-document', path_1.default.extname(originalFileRecord.name || '.pdf'));
            const newPdfKey = `uploads/${originalFilenameWithoutExt}-signed-${(0, uuid_1.v4)()}.pdf`;
            const uploadResult = await file_service_1.FileService.uploadBuffer(Buffer.from(modifiedPdfBytes), newPdfKey, 'application/pdf');
            if (!uploadResult || !(uploadResult.key || uploadResult.url)) {
                throw new errorHandler_1.AppError(500, `Failed to upload signed PDF to R2.`);
            }
            const finalSignedPdfIdentifier = uploadResult.key || uploadResult.url;
            console.log(`Service: Uploaded signed PDF to R2. Identifier: ${finalSignedPdfIdentifier}`);
            const newLetterData = {
                userId,
                name: name !== null && name !== void 0 ? name : `Signed: ${originalFileRecord.name}`,
                templateId: null,
                formData: null,
                originalPdfFileId: originalFileId,
                signedPdfUrl: finalSignedPdfIdentifier,
            };
            const newLetterRecord = await letter_model_1.Letter.create(newLetterData);
            console.log(`Service: Created new Letter record with ID: ${newLetterRecord.id}`);
            const finalLetter = await letter_model_1.Letter.findOne({ where: { id: newLetterRecord.id, userId } });
            if (!finalLetter) {
                throw new errorHandler_1.AppError(500, 'Failed to refetch the newly created signed letter.');
            }
            return finalLetter;
        }
        catch (error) {
            console.error('Error in createFromPdfInteractive service:', error);
            if (error instanceof errorHandler_1.AppError)
                throw error;
            throw new errorHandler_1.AppError(500, 'Failed to create signed PDF letter.');
        }
    }
    static async generateSignedPdfViewUrl(letterId, userId) {
        console.log(`Service: Generating view URL for letter ${letterId}, user ${userId}`);
        if (!letterId || !userId) {
            throw new errorHandler_1.AppError(400, 'Letter ID and User ID are required.');
        }
        if (!R2_BUCKET_NAME) {
            throw new errorHandler_1.AppError(500, 'R2_BUCKET_NAME is not configured.');
        }
        try {
            const letter = await letter_model_1.Letter.findOne({
                where: { id: letterId, userId },
                attributes: ['signedPdfUrl'],
            });
            if (!letter) {
                throw new errorHandler_1.AppError(404, `Letter with ID ${letterId} not found or access denied.`);
            }
            if (!letter.signedPdfUrl) {
                throw new errorHandler_1.AppError(404, `Letter with ID ${letterId} is not a signed PDF document or URL is missing.`);
            }
            const r2Key = letter.signedPdfUrl;
            console.log(`Service: Found R2 key '${r2Key}' for letter ${letterId}`);
            const command = new client_s3_1.GetObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: r2Key,
            });
            const expiresInSeconds = 300;
            const signedUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn: expiresInSeconds });
            console.log(`Service: Generated signed URL for key '${r2Key}', expires in ${expiresInSeconds}s`);
            return signedUrl;
        }
        catch (error) {
            console.error(`Service: Error generating signed view URL for letter ${letterId}:`, error);
            if (error instanceof errorHandler_1.AppError)
                throw error;
            throw new errorHandler_1.AppError(500, 'Could not generate view URL for the signed PDF.');
        }
    }
    static async approveReview(letterId, reviewerUserId, comment) {
        const letter = await letter_model_1.Letter.findByPk(letterId, {
            include: [
                { model: user_model_1.User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'] },
                { model: template_model_1.default, as: 'template', attributes: ['id', 'name'] },
            ]
        });
        if (!letter) {
            throw new errorHandler_1.AppError(404, `Letter with ID ${letterId} not found.`);
        }
        if (letter.status !== letter_model_1.LetterStatus.PENDING_REVIEW) {
            throw new errorHandler_1.AppError(400, `Letter is not pending review (current status: ${letter.status}).`);
        }
        if (!letter.templateId) {
            throw new errorHandler_1.AppError(400, 'Cannot approve review for a letter without a template.');
        }
        const reviewerAssignment = await template_reviewer_model_1.default.findOne({
            where: { templateId: letter.templateId, userId: reviewerUserId }
        });
        if (!reviewerAssignment) {
            throw new errorHandler_1.AppError(403, 'You are not an assigned reviewer for this letter.');
        }
        const nextStatus = letter_model_1.LetterStatus.REVIEW_APPROVED; // Adjust if needed
        const updatedLetter = await letter.update({
            status: nextStatus,
            // reviewedById: reviewerUserId,
            // reviewedAt: new Date(),
            // rejectionReason: null
        });
        if (comment && comment.trim().length > 0) {
            try {
                await letterComment_service_1.LetterCommentService.createComment({
                    letterId: letter.id,
                    userId: reviewerUserId,
                    message: comment.trim(),
                    type: 'approval'
                });
            }
            catch (commentError) {
                console.error(`Error creating approval comment for letter ${letterId}:`, commentError);
            }
        }
        try {
            const reviewer = await user_model_1.User.findByPk(reviewerUserId, { attributes: ['firstName', 'lastName'] });
            const reviewerName = reviewer ? `${reviewer.firstName || ''} ${reviewer.lastName || ''}`.trim() : 'A reviewer';
            if (letter.userId) {
                await notification_service_1.NotificationService.createLetterReviewApprovedNotification(letter.userId, letter.id, letter.name || 'Untitled Letter', reviewerName);
            }
            // TODO: Notify final approver if necessary
        }
        catch (notificationError) {
            console.error(`Error sending notifications for letter ${letterId} review approval:`, notificationError);
        }
        return updatedLetter;
    }
    static async rejectReview(letterId, reviewerUserId, reason) {
        const letter = await letter_model_1.Letter.findByPk(letterId, {
            include: [
                { model: user_model_1.User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'] },
                { model: template_model_1.default, as: 'template', attributes: ['id', 'name'] },
            ]
        });
        if (!letter) {
            throw new errorHandler_1.AppError(404, `Letter with ID ${letterId} not found.`);
        }
        if (letter.status !== letter_model_1.LetterStatus.PENDING_REVIEW) {
            throw new errorHandler_1.AppError(400, `Letter is not pending review (current status: ${letter.status}).`);
        }
        if (!letter.templateId) {
            throw new errorHandler_1.AppError(400, 'Cannot reject review for a letter without a template.');
        }
        const reviewerAssignment = await template_reviewer_model_1.default.findOne({
            where: { templateId: letter.templateId, userId: reviewerUserId }
        });
        if (!reviewerAssignment) {
            throw new errorHandler_1.AppError(403, 'You are not an assigned reviewer for this letter.');
        }
        const rejectionMessage = reason || 'Letter review rejected without explicit reason.';
        const updatedLetter = await letter.update({
            status: letter_model_1.LetterStatus.REVIEW_REJECTED,
            // reviewedById: reviewerUserId,
            // reviewedAt: new Date(),
            // rejectionReason: rejectionMessage
        });
        try {
            await letterComment_service_1.LetterCommentService.createComment({
                letterId: letter.id,
                userId: reviewerUserId,
                message: rejectionMessage,
                type: 'rejection'
            });
        }
        catch (commentError) {
            console.error(`Error creating rejection comment for letter ${letterId}:`, commentError);
        }
        try {
            const reviewer = await user_model_1.User.findByPk(reviewerUserId, { attributes: ['firstName', 'lastName'] });
            const reviewerName = reviewer ? `${reviewer.firstName || ''} ${reviewer.lastName || ''}`.trim() : 'A reviewer';
            if (letter.userId) {
                await notification_service_1.NotificationService.createLetterReviewRejectedNotification(letter.userId, letter.id, letter.name || 'Untitled Letter', rejectionMessage, reviewerName);
            }
        }
        catch (notificationError) {
            console.error(`Error sending notifications for letter ${letterId} review rejection:`, notificationError);
        }
        return updatedLetter;
    }
}
exports.LetterService = LetterService;
