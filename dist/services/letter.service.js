"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LetterService = void 0;
const pdf_lib_1 = require("pdf-lib");
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const sequelize_1 = require("sequelize");
const qrcode_1 = __importDefault(require("qrcode"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const letter_model_1 = require("../models/letter.model");
const template_model_1 = __importDefault(require("../models/template.model"));
const user_model_1 = require("../models/user.model");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
const file_model_1 = __importDefault(require("../models/file.model"));
const file_service_1 = require("./file.service");
const letter_reviewer_model_1 = require("../models/letter-reviewer.model");
const letter_action_log_model_1 = require("../models/letter-action-log.model");
const sequelize_2 = require("../infrastructure/database/sequelize");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const client_s3_1 = require("@aws-sdk/client-s3");
const axios_1 = __importDefault(require("axios"));
const email_service_1 = require("./email.service");
const notification_service_1 = require("./notification.service");
const activity_service_1 = require("./activity.service");
const activity_model_1 = require("../models/activity.model");
const template_reviewer_service_1 = require("./template-reviewer.service");
const s3Client = new client_s3_1.S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const R2_PUB_URL = process.env.R2_PUB_URL;
const APPROVER_SEQUENCE = 999;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const QR_PLACEHOLDER_IDENTIFIER_BACKEND = 'QR_PLACEHOLDER_INTERNAL_ID';
class LetterService {
    static async create(data) {
        var _a;
        const { templateId, userId: submitterId, formData, name, logoUrl, signatureUrl, stampUrl } = data;
        if (!templateId) {
            throw new errorHandler_1.AppError(400, 'Template ID is required when creating a letter from a template.');
        }
        if (!submitterId || !formData) {
            throw new errorHandler_1.AppError(400, 'Missing required data: userId and formData are required.');
        }
        const transaction = await sequelize_2.sequelize.transaction();
        let newLetter = null;
        try {
            // 1. Fetch Template and Owner (Approver)
            const template = await template_model_1.default.findByPk(templateId, {
                include: [{ model: user_model_1.User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }],
                transaction,
            });
            if (!template) {
                throw new errorHandler_1.AppError(404, `Template with ID ${templateId} not found.`);
            }
            const approverId = template.userId;
            if (!approverId) {
                throw new errorHandler_1.AppError(500, `Template owner user not found for template ID ${templateId}.`);
            }
            // 2. Fetch Reviewers from TemplateReviewers table
            const templateReviewers = await template_reviewer_service_1.TemplateReviewerService.getReviewersForTemplate(templateId);
            const reviewerUserIds = templateReviewers
                .map(reviewer => reviewer.id)
                .filter(id => id !== submitterId && id !== approverId);
            // 3. Validate Submitter exists
            const submitter = await user_model_1.User.findByPk(submitterId, { attributes: ['id', 'firstName', 'lastName', 'email'], transaction });
            if (!submitter) {
                throw new errorHandler_1.AppError(404, `Submitter user with ID ${submitterId} not found.`);
            }
            // Determine initial status and next action
            let initialStatus;
            let nextStepIndex = null;
            let nextActionById = null;
            const workflowParticipants = [];
            if (reviewerUserIds && reviewerUserIds.length > 0) {
                initialStatus = letter_model_1.LetterWorkflowStatus.PENDING_REVIEW;
                reviewerUserIds.forEach((reviewerId, index) => {
                    workflowParticipants.push({ userId: reviewerId, sequenceOrder: index + 1 });
                });
                nextStepIndex = 1;
                nextActionById = workflowParticipants[0].userId;
            }
            else {
                initialStatus = letter_model_1.LetterWorkflowStatus.PENDING_APPROVAL;
                nextActionById = approverId;
            }
            if (approverId) {
                if (!workflowParticipants.some(p => p.userId === approverId)) {
                    workflowParticipants.push({ userId: approverId, sequenceOrder: APPROVER_SEQUENCE });
                }
            }
            else {
                if (workflowParticipants.length === 0) {
                    initialStatus = letter_model_1.LetterWorkflowStatus.APPROVED;
                    nextStepIndex = null;
                    nextActionById = null;
                }
                else {
                    throw new errorHandler_1.AppError(500, 'Template has reviewers but no designated approver (owner).');
                }
            }
            workflowParticipants.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
            // 4. Create the Letter record
            newLetter = await letter_model_1.Letter.create({
                templateId,
                userId: submitterId,
                formData,
                name: (_a = name !== null && name !== void 0 ? name : template.name) !== null && _a !== void 0 ? _a : `Letter from ${template.id.substring(0, 6)}`,
                logoUrl: logoUrl !== null && logoUrl !== void 0 ? logoUrl : null,
                signatureUrl: signatureUrl !== null && signatureUrl !== void 0 ? signatureUrl : null,
                stampUrl: stampUrl !== null && stampUrl !== void 0 ? stampUrl : null,
                workflowStatus: initialStatus,
                currentStepIndex: nextStepIndex,
                nextActionById: nextActionById,
                originalPdfFileId: null,
                signedPdfUrl: null,
                qrCodeUrl: null,
                publicLink: null,
                finalSignedPdfUrl: null,
                placements: null,
            }, { transaction });
            // 5. Create LetterReviewer entries for all participants
            const reviewerEntries = workflowParticipants.map(p => ({
                letterId: newLetter.id,
                userId: p.userId,
                sequenceOrder: p.sequenceOrder,
                status: letter_reviewer_model_1.LetterReviewerStatus.PENDING,
            }));
            await letter_reviewer_model_1.LetterReviewer.bulkCreate(reviewerEntries, { transaction });
            // 6. Log the Submission action
            await letter_action_log_model_1.LetterActionLog.create({
                letterId: newLetter.id,
                userId: submitterId,
                actionType: letter_action_log_model_1.LetterActionType.SUBMIT,
                comment: 'Letter submitted from template.',
                details: {
                    templateId: templateId,
                    initialStatus: initialStatus,
                    nextActionById: nextActionById,
                    reviewerIds: reviewerUserIds,
                    approverId: approverId,
                },
            }, { transaction });
            // 7. Log Activity
            await activity_service_1.ActivityService.logActivity({
                userId: submitterId,
                action: activity_model_1.ActivityType.SUBMIT,
                resourceType: activity_model_1.ResourceType.LETTER,
                resourceId: newLetter.id,
                resourceName: newLetter.name || `Letter ${newLetter.id.substring(0, 6)}`,
                details: `Letter submitted from template "${template.name}".`,
                transaction,
            });
            await transaction.commit();
            // 8. Send Notifications (after transaction commit)
            try {
                const letterViewUrl = `${CLIENT_URL}/dashboard/Inbox/LetterReview/${newLetter.id}`;
                const submitterName = `${submitter.firstName || ''} ${submitter.lastName || ''}`.trim() || submitter.email;
                if (nextActionById && nextActionById !== submitterId) {
                    const nextActionUser = await user_model_1.User.findByPk(nextActionById, { attributes: ['id', 'email', 'firstName', 'lastName'] });
                    if (nextActionUser) {
                        const nextActionUserName = `${nextActionUser.firstName || ''} ${nextActionUser.lastName || ''}`.trim() || nextActionUser.email;
                        if (nextActionUser.email) {
                            await email_service_1.EmailService.sendReviewRequestEmail(nextActionUser.email, nextActionUserName, submitterName, newLetter.name || `Letter ${newLetter.id.substring(0, 6)}`, letterViewUrl);
                        }
                        await notification_service_1.NotificationService.createLetterReviewRequestNotification(nextActionUser.id, newLetter.id, newLetter.name || `Letter ${newLetter.id.substring(0, 6)}`, submitterName);
                    }
                }
                else if (initialStatus === letter_model_1.LetterWorkflowStatus.APPROVED) {
                    const finalViewUrl = `${CLIENT_URL}/dashboard/MyStaff/LetterView/${newLetter.id}`;
                    if (submitter.email) {
                        await email_service_1.EmailService.sendLetterApprovedEmail(submitter.email, submitterName, newLetter.name || `Letter ${newLetter.id.substring(0, 6)}`, 'System (Auto-Approved)', finalViewUrl);
                    }
                    await notification_service_1.NotificationService.createLetterFinalApprovedNotification(submitter.id, newLetter.id, newLetter.name || `Letter ${newLetter.id.substring(0, 6)}`, 'System (Auto-Approved)');
                }
            }
            catch (notificationError) {
                console.error(`Error sending initial workflow notification for letter ${newLetter.id}:`, notificationError);
            }
            const finalLetter = await this.findById(newLetter.id, submitterId);
            if (!finalLetter) {
                throw new errorHandler_1.AppError(500, 'Failed to retrieve the newly created letter after workflow initiation.');
            }
            return finalLetter;
        }
        catch (error) {
            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log(`Transaction rolled back for letter creation.`);
                }
                catch (rbError) {
                    console.error('Error during transaction rollback:', rbError);
                }
            }
            console.error('Error initiating template letter workflow in service:', error);
            if (error instanceof errorHandler_1.AppError)
                throw error;
            throw new errorHandler_1.AppError(500, `Failed to create letter and initiate workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    static async getLettersPendingReview(userId) {
        if (!userId) {
            throw new errorHandler_1.AppError(401, 'User ID is required.');
        }
        try {
            const lettersToReview = await letter_model_1.Letter.findAll({
                where: {
                    workflowStatus: letter_model_1.LetterWorkflowStatus.PENDING_REVIEW,
                    nextActionById: userId
                },
                include: [
                    { model: template_model_1.default, as: 'template', attributes: ['id', 'name'], required: false },
                    { model: user_model_1.User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'], },
                ],
                order: [['createdAt', 'ASC']],
            });
            return lettersToReview;
        }
        catch (error) {
            console.error(`Error getting letters pending review for user ${userId}:`, error);
            throw new errorHandler_1.AppError(500, 'Could not retrieve letters pending review.');
        }
    }
    static async getLettersPendingMyAction(userId) {
        try {
            const letters = await letter_model_1.Letter.findAll({
                where: {
                    nextActionById: userId, // Letters assigned to this user
                    workflowStatus: {
                        // Where status is either PENDING_REVIEW or PENDING_APPROVAL
                        [sequelize_1.Op.or]: [
                            letter_model_1.LetterWorkflowStatus.PENDING_REVIEW,
                            letter_model_1.LetterWorkflowStatus.PENDING_APPROVAL
                        ]
                    }
                },
                include: [
                    {
                        model: user_model_1.User,
                        as: 'user', // Include the original submitter info
                        attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'] // Specify needed fields
                    },
                    // Optionally include last action log or template info if needed for display
                    // { model: Template, as: 'template', attributes: ['id', 'name'] },
                    // { model: LetterActionLog, as: 'letterActionLogs', limit: 1, order: [['createdAt', 'DESC']] }
                ],
                order: [['createdAt', 'DESC']] // Order by creation date, newest first
            });
            console.log(`Fetched ${letters} letters pending action for user ${userId}`);
            return letters;
        }
        catch (error) {
            console.error(`Error fetching letters pending action for user ${userId}:`, error);
            // Don't throw AppError here directly unless it's a specific known issue,
            // let the controller handle generic errors.
            throw new Error('Failed to retrieve letters pending your action.');
        }
    }
    static async finalApproveLetter(letterId, userId, placements, comment, name) {
        var _a;
        if (!R2_PUB_URL) {
            throw new errorHandler_1.AppError(500, 'Server configuration error: R2 public URL is missing.');
        }
        const transaction = await sequelize_2.sequelize.transaction();
        try {
            const letter = await letter_model_1.Letter.findByPk(letterId, { transaction, lock: transaction.LOCK.UPDATE });
            if (!letter) {
                await transaction.rollback();
                throw new errorHandler_1.AppError(404, `Letter not found: ${letterId}`);
            }
            if (letter.workflowStatus !== letter_model_1.LetterWorkflowStatus.PENDING_APPROVAL) {
                await transaction.rollback();
                throw new errorHandler_1.AppError(400, `Letter must be in pending_approval status. Current status: ${letter.workflowStatus}`);
            }
            if (letter.nextActionById !== userId) {
                await transaction.rollback();
                throw new errorHandler_1.AppError(403, `User ${userId} is not the designated approver for this letter.`);
            }
            if (!letter.signedPdfUrl) {
                await transaction.rollback();
                throw new errorHandler_1.AppError(400, 'Cannot finalize approval: Intermediate PDF (with signatures/stamps) is missing.');
            }
            const intermediatePdfKey = letter.signedPdfUrl;
            const existingPdfBytes = await file_service_1.FileService.getFileBuffer(intermediatePdfKey);
            if (!existingPdfBytes || existingPdfBytes.length === 0) {
                await transaction.rollback();
                throw new errorHandler_1.AppError(500, 'Fetched intermediate PDF buffer is empty.');
            }
            const pdfDoc = await pdf_lib_1.PDFDocument.load(existingPdfBytes);
            const pages = pdfDoc.getPages();
            // Embed signatures and stamps from placements
            for (const item of placements) {
                if (item.type === 'signature' || item.type === 'stamp') {
                    if (item.pageNumber < 1 || item.pageNumber > pages.length) {
                        console.warn(`Skipping placement: Invalid page ${item.pageNumber} for item ${item.type} in letter ${letterId}.`);
                        continue;
                    }
                    if (!item.url) {
                        console.warn(`Skipping image placement: URL missing for ${item.type} in letter ${letterId}`);
                        continue;
                    }
                    let imageBytes = null;
                    try {
                        if (item.url.startsWith('http')) {
                            const response = await axios_1.default.get(item.url, { responseType: 'arraybuffer' });
                            imageBytes = Buffer.from(response.data);
                        }
                        else {
                            imageBytes = await file_service_1.FileService.getFileBuffer(item.url);
                        }
                    }
                    catch (fetchError) {
                        console.warn(`Skipping image placement for ${item.type} due to fetch error from ${item.url}: ${fetchError.message}`);
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
                            try {
                                pdfImage = await pdfDoc.embedPng(imageBytes);
                            }
                            catch (e) {
                                try {
                                    pdfImage = await pdfDoc.embedJpg(imageBytes);
                                }
                                catch (e2) {
                                    console.warn(`Skipping placement: Unsupported image type for ${item.type} URL ${item.url}`);
                                    continue;
                                }
                            }
                        }
                    }
                    catch (embedError) {
                        console.error(`Failed to embed image ${item.url} for ${item.type}: ${embedError.message}`);
                        continue;
                    }
                    if (!pdfImage)
                        continue;
                    const page = pages[item.pageNumber - 1];
                    const { height: pageHeight } = page.getSize();
                    const pdfY = pageHeight - item.y - item.height;
                    try {
                        page.drawImage(pdfImage, { x: item.x, y: pdfY, width: item.width, height: item.height });
                    }
                    catch (drawError) {
                        console.error(`Failed to draw ${item.type} ${item.url} on page ${item.pageNumber}: ${drawError.message}`);
                    }
                }
            }
            // Embed QR code
            const finalPdfKeyForQr = `final-letters/letter-${letter.id}-final-approved.pdf`;
            const finalPdfPublicUrl = `https://${R2_PUB_URL}/${finalPdfKeyForQr}`;
            const qrCodeBuffer = await qrcode_1.default.toBuffer(finalPdfPublicUrl, {
                errorCorrectionLevel: 'H', type: 'png', margin: 1, color: { dark: '#000000', light: '#FFFFFF' },
            });
            const qrImageEmbed = await pdfDoc.embedPng(qrCodeBuffer);
            const qrPlacements = (_a = letter.placements) === null || _a === void 0 ? void 0 : _a.filter(p => p.type === 'qrcode');
            console.log(`Found ${(qrPlacements === null || qrPlacements === void 0 ? void 0 : qrPlacements.length) || 0} QR code placements for letter ${letterId}`);
            if (qrPlacements && qrPlacements.length > 0) {
                for (const qrPlace of qrPlacements) {
                    if (qrPlace.pageNumber < 1 || qrPlace.pageNumber > pages.length) {
                        console.warn(`QR placeholder on invalid page ${qrPlace.pageNumber} for letter ${letter.id}, skipping.`);
                        continue;
                    }
                    const page = pages[qrPlace.pageNumber - 1];
                    const { height: pageHeight } = page.getSize();
                    const qrY = pageHeight - qrPlace.y - qrPlace.height;
                    console.log(`Embedding QR code on page ${qrPlace.pageNumber} at coordinates: (${qrPlace.x}, ${qrY}), size: ${qrPlace.width}x${qrPlace.height}`);
                    page.drawImage(qrImageEmbed, {
                        x: qrPlace.x,
                        y: qrY,
                        width: qrPlace.width,
                        height: qrPlace.height,
                    });
                }
            }
            else {
                console.warn(`No QR code placeholder found for letter ${letterId}. Placing QR at default position (last page, bottom-right).`);
                const lastPage = pages[pages.length - 1];
                const { width, height } = lastPage.getSize();
                const qrSize = 50;
                const margin = 20;
                lastPage.drawImage(qrImageEmbed, { x: width - qrSize - margin, y: margin, width: qrSize, height: qrSize });
            }
            const finalPdfBytesWithQr = await pdfDoc.save();
            await file_service_1.FileService.uploadBuffer(Buffer.from(finalPdfBytesWithQr), finalPdfKeyForQr, 'application/pdf');
            const qrCodeImageFileName = `qr-images/letter-${letter.id}-qr.png`;
            const uploadedQrImageR2 = await file_service_1.FileService.uploadBuffer(qrCodeBuffer, qrCodeImageFileName, 'image/png');
            const qrCodeImageUrl = uploadedQrImageR2 === null || uploadedQrImageR2 === void 0 ? void 0 : uploadedQrImageR2.url;
            await letter.update({
                workflowStatus: letter_model_1.LetterWorkflowStatus.APPROVED,
                nextActionById: null,
                currentStepIndex: null,
                finalSignedPdfUrl: finalPdfKeyForQr,
                publicLink: finalPdfPublicUrl,
                qrCodeUrl: qrCodeImageUrl,
            }, { transaction });
            await letter_action_log_model_1.LetterActionLog.create({
                letterId,
                userId,
                actionType: letter_action_log_model_1.LetterActionType.FINAL_APPROVE,
                comment: comment || 'Letter finally approved.',
            }, { transaction });
            await activity_service_1.ActivityService.logActivity({
                userId,
                action: activity_model_1.ActivityType.APPROVE,
                resourceType: activity_model_1.ResourceType.LETTER,
                resourceId: letterId,
                resourceName: letter.name || `Letter ${letter.id.substring(0, 6)}`,
                details: `Letter finally approved. ${comment ? `Comment: ${comment}` : ''}`,
                transaction
            });
            await transaction.commit();
            try {
                const submitter = await user_model_1.User.findByPk(letter.userId, { attributes: ['id', 'email', 'firstName', 'lastName'] });
                const approver = await user_model_1.User.findByPk(userId, { attributes: ['firstName', 'lastName', 'email'] });
                if (submitter && approver) {
                    const approverName = `${approver.firstName || ''} ${approver.lastName || ''}`.trim() || approver.email;
                    const letterName = letter.name || `Letter ${letter.id.substring(0, 6)}`;
                    const letterViewUrl = `${CLIENT_URL}/dashboard/MyStaff/LetterView/${letter.id}`;
                    if (submitter.email) {
                        await email_service_1.EmailService.sendLetterApprovedEmail(submitter.email, submitter.firstName || 'User', letterName, approverName, letterViewUrl);
                    }
                    await notification_service_1.NotificationService.createLetterFinalApprovedNotification(submitter.id, letterId, letterName, approverName);
                }
            }
            catch (notificationError) {
                console.error(`Error sending final approval notification for letter ${letterId}:`, notificationError);
            }
            const letterForReturn = await letter_model_1.Letter.findByPk(letterId, {
                include: [
                    { model: user_model_1.User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
                    { model: letter_reviewer_model_1.LetterReviewer, as: 'letterReviewers', include: [{ model: user_model_1.User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatar'] }], order: [['sequenceOrder', 'ASC']] },
                    { model: letter_action_log_model_1.LetterActionLog, as: 'letterActionLogs', include: [{ model: user_model_1.User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatar'] }], order: [['createdAt', 'DESC']] }
                ]
            });
            if (!letterForReturn) {
                throw new errorHandler_1.AppError(500, `Failed to refetch letter ${letterId} after final approval.`);
            }
            return letterForReturn;
        }
        catch (error) {
            console.error(`Error in finalApproveLetter service for letter ${letterId}:`, error);
            if (transaction) {
                try {
                    await transaction.rollback();
                }
                catch (rbError) {
                    if (!String(rbError.message).includes('commit') && !String(rbError.message).includes('rollback')) {
                        console.error(`Error attempting to rollback transaction for letter ${letterId}:`, rbError);
                    }
                }
            }
            if (error instanceof errorHandler_1.AppError)
                throw error;
            throw new errorHandler_1.AppError(500, `Failed to finally approve letter: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    static async convertHtmlToPdf(htmlContent) {
        console.log("Starting HTML to PDF conversion");
        // Preserve CKEditor specific styling
        if (!htmlContent.includes('<!DOCTYPE html>')) {
            htmlContent = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <style>
                  body {
                    font-family: Arial, sans-serif;
                    font-size: 12pt;
                    color: #000000 !important;
                    position: relative;
                    line-height: 1.5;
                    padding: 20px;
                  }
                  
                  p, div, span, h1, h2, h3, h4, h5, h6 {
                    color: #000000 !important;
                    visibility: visible !important;
                    margin-bottom: 8px;
                  }
                  
                  /* Handle CKEditor image alignment classes */
                  .image-style-align-right {
                    float: right;
                    margin-left: 20px;
                    margin-bottom: 10px;
                  }
                  
                  .image-style-align-left {
                    float: left;
                    margin-right: 20px;
                    margin-bottom: 10px;
                  }
                  
                  .image-style-align-center {
                    margin-left: auto;
                    margin-right: auto;
                    display: block;
                  }
                  
                  /* Control max image sizes */
                  img {
                    max-width: 300px !important;
                    height: auto !important;
                    object-fit: contain !important;
                  }
                  
                  /* Support resized images */
                  .image_resized {
                    display: block;
                    box-sizing: border-box;
                  }
                  
                  .image_resized img {
                    width: 100%;
                    height: auto;
                  }
                  
                  figure {
                    display: table;
                    margin: 1em 0;
                  }
                  
                  figure.image {
                    clear: both;
                    text-align: center;
                  }
                  
                  figure.image img {
                    display: block;
                    margin: 0 auto;
                    max-width: 100%;
                    min-width: 50px;
                  }
                  
                  /* Set precise page dimensions */
                  @page {
                    margin: 1cm;
                    size: A4;
                  }
                </style>
              </head>
              <body>${htmlContent}</body>
            </html>
        `;
        }
        let browser;
        try {
            browser = await puppeteer_1.default.launch({
                headless: true, // Yeni headless rejimi
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--font-render-hinting=none'
                ],
                //executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
            });
            const page = await browser.newPage();
            // Set viewport size to match A4 dimensions
            await page.setViewport({
                width: 794, // A4 width in pixels (approximately)
                height: 1123, // A4 height in pixels (approximately)
                deviceScaleFactor: 1,
            });
            // Set longer timeout for content loading
            await page.setDefaultNavigationTimeout(60000);
            // Wait longer for content to fully load
            await page.setContent(htmlContent, {
                waitUntil: ['networkidle0', 'load', 'domcontentloaded']
            });
            // Debug - take a screenshot to see how the page looks before PDF generation
            // Uncomment if needed for debugging
            // await page.screenshot({ path: 'debug-preview.png' });
            // Ensure all images are loaded correctly
            await page.evaluate(() => {
                return new Promise((resolve) => {
                    const images = Array.from(document.querySelectorAll('img'));
                    if (images.length === 0) {
                        resolve();
                        return;
                    }
                    let loadedImages = 0;
                    images.forEach((img) => {
                        if (img.complete) {
                            loadedImages++;
                            if (loadedImages === images.length) {
                                resolve();
                            }
                        }
                        else {
                            img.onload = () => {
                                loadedImages++;
                                if (loadedImages === images.length) {
                                    resolve();
                                }
                            };
                            img.onerror = () => {
                                console.warn(`Failed to load image: ${img.src}`);
                                loadedImages++;
                                if (loadedImages === images.length) {
                                    resolve();
                                }
                            };
                        }
                        // Apply specific styles for better PDF rendering
                        if (img.parentElement && img.parentElement.classList.contains('image-style-align-right')) {
                            img.style.float = 'right';
                            img.style.marginLeft = '20px';
                        }
                        else if (img.parentElement && img.parentElement.classList.contains('image-style-align-left')) {
                            img.style.float = 'left';
                            img.style.marginRight = '20px';
                        }
                    });
                });
            });
            // Apply CKEditor specific styling directly to elements
            await page.evaluate(() => {
                // Fix right-aligned images
                const rightAlignedFigures = document.querySelectorAll('.image-style-align-right');
                rightAlignedFigures.forEach((element) => {
                    // Type cast the element to HTMLElement
                    const fig = element;
                    fig.style.float = 'right';
                    fig.style.marginLeft = '20px';
                    fig.style.marginBottom = '10px';
                });
                // Fix left-aligned images
                const leftAlignedFigures = document.querySelectorAll('.image-style-align-left');
                leftAlignedFigures.forEach((element) => {
                    // Type cast the element to HTMLElement
                    const fig = element;
                    fig.style.float = 'left';
                    fig.style.marginRight = '20px';
                    fig.style.marginBottom = '10px';
                });
                // Fix centered images
                const centeredFigures = document.querySelectorAll('.image-style-align-center');
                centeredFigures.forEach((element) => {
                    // Type cast the element to HTMLElement
                    const fig = element;
                    fig.style.marginLeft = 'auto';
                    fig.style.marginRight = 'auto';
                    fig.style.display = 'block';
                    fig.style.textAlign = 'center';
                });
                // Fix resized images
                const resizedImages = document.querySelectorAll('.image_resized');
                resizedImages.forEach((element) => {
                    // Type cast the element to HTMLElement
                    const container = element;
                    if (container.style.width) {
                        // Keep the inline width from CKEditor
                        const imgs = container.querySelectorAll('img');
                        imgs.forEach((imgElement) => {
                            const img = imgElement;
                            img.style.maxWidth = '100%';
                            img.style.width = '100%';
                            img.style.height = 'auto';
                        });
                    }
                });
                // Ensure all elements have proper text color
                const allElements = document.querySelectorAll('*');
                allElements.forEach((element) => {
                    const el = element;
                    if (el.style) {
                        el.style.color = '#000000';
                        el.style.visibility = 'visible';
                    }
                });
            });
            // Generate PDF with precise settings
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
                preferCSSPageSize: true,
                displayHeaderFooter: false,
            });
            console.log(`PDF created successfully, size: ${pdfBuffer.length} bytes`);
            // Convert Uint8Array to Buffer
            return Buffer.from(pdfBuffer);
        }
        catch (error) {
            console.error('HTML to PDF conversion error:', error);
            throw new Error(`HTML to PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        finally {
            if (browser) {
                await browser.close();
            }
        }
    }
    static async finalApproveLetterSingle(letterId, userId, placements, comment, name) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        if (!R2_PUB_URL) {
            throw new errorHandler_1.AppError(500, 'Server configuration error: R2 public URL is missing.');
        }
        const transaction = await sequelize_2.sequelize.transaction();
        try {
            // Fetch the letter with its template
            const letter = await letter_model_1.Letter.findByPk(letterId, {
                transaction,
                include: [
                    { model: template_model_1.default, as: 'template', attributes: ['id', 'name', 'content'] }
                ]
            });
            if (!letter) {
                await transaction.rollback();
                throw new errorHandler_1.AppError(404, `Letter not found: ${letterId}`);
            }
            // Validate letter status and permissions
            if (letter.workflowStatus !== letter_model_1.LetterWorkflowStatus.PENDING_APPROVAL) {
                await transaction.rollback();
                throw new errorHandler_1.AppError(400, `Letter must be in pending_approval status. Current status: ${letter.workflowStatus}`);
            }
            if (letter.nextActionById !== userId) {
                await transaction.rollback();
                throw new errorHandler_1.AppError(403, `User ${userId} is not the designated approver for this letter.`);
            }
            if (!letter.template || !letter.template.content) {
                await transaction.rollback();
                throw new errorHandler_1.AppError(400, 'Cannot finalize approval: Template content is missing.');
            }
            // Process template content - replace placeholders with actual values
            const templateContent = letter.template.content;
            let htmlContent = templateContent;
            if (letter.formData) {
                htmlContent = templateContent.replace(/#([a-zA-Z0-9-]+)#/g, (match, p1) => {
                    var _a, _b;
                    return (_b = (_a = letter.formData) === null || _a === void 0 ? void 0 : _a[p1]) !== null && _b !== void 0 ? _b : '';
                });
            }
            // IMPROVED: Add custom CSS to prevent large logo issues and ensure proper element sizing
            htmlContent = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <style>
                  body {
                    font-family: Arial, sans-serif;
                    font-size: 12pt;
                    color: #000000 !important;
                    position: relative;
                  }
                  p, div, span, h1, h2, h3, h4, h5, h6 {
                    color: #000000 !important;
                    visibility: visible !important;
                  }
                  img {
                    max-width: 300px !important; /* Prevent oversized images */
                    height: auto !important;
                    object-fit: contain !important;
                  }
                  @page {
                    margin: 1cm;
                    size: A4;
                  }
                </style>
              </head>
              <body>${htmlContent}</body>
            </html>
        `;
            // Convert HTML to PDF
            console.log(`Converting HTML to PDF for letter ${letterId}`);
            const pdfBuffer = await LetterService.convertHtmlToPdf(htmlContent);
            console.log(`PDF buffer created, size: ${(pdfBuffer === null || pdfBuffer === void 0 ? void 0 : pdfBuffer.length) || 0} bytes`);
            if (!pdfBuffer || pdfBuffer.length === 0) {
                throw new errorHandler_1.AppError(500, "Failed to generate PDF from HTML - empty buffer returned");
            }
            // Load the PDF and get pages
            const pdfDoc = await pdf_lib_1.PDFDocument.load(pdfBuffer);
            console.log(`PDF document loaded successfully`);
            const pages = pdfDoc.getPages();
            console.log(`PDF has ${pages.length} pages`);
            if (!pages || pages.length === 0) {
                throw new errorHandler_1.AppError(500, "PDF document has no pages");
            }
            // IMPROVED: Capture page dimensions for consistent positioning
            const pageDetails = pages.map(page => {
                const { width, height } = page.getSize();
                return { width, height };
            });
            // Get first page dimensions as reference
            const refPageWidth = pageDetails[0].width;
            const refPageHeight = pageDetails[0].height;
            // Group placements by type for better handling
            const signatures = placements.filter(p => p.type === 'signature');
            const stamps = placements.filter(p => p.type === 'stamp');
            const qrCodes = placements.filter(p => p.type === 'qrcode');
            console.log(`Processing ${signatures.length} signatures, ${stamps.length} stamps, and ${qrCodes.length} QR codes`);
            // Function to safely get page number (1-based), defaulting to 1 if invalid
            const getSafePage = (pageNum) => {
                if (!pageNum || pageNum < 1 || pageNum > pages.length) {
                    return 1;
                }
                return pageNum;
            };
            // IMPROVED: Fixed aspect ratio calculation
            // 1. First process signatures
            for (const signature of signatures) {
                try {
                    // Skip invalid URLs
                    if (!signature.url || signature.url === 'QR_PLACEHOLDER') {
                        console.warn(`Skipping signature: missing URL`);
                        continue;
                    }
                    // Determine page to place signature on
                    const pageIndex = getSafePage(signature.pageNumber) - 1;
                    const page = pages[pageIndex];
                    const { width: pageWidth, height: pageHeight } = page.getSize();
                    // Get signature image
                    let imageBytes;
                    try {
                        if (signature.url.startsWith('http')) {
                            const response = await axios_1.default.get(signature.url, { responseType: 'arraybuffer' });
                            imageBytes = Buffer.from(response.data);
                        }
                        else {
                            const fileBuffer = await file_service_1.FileService.getFileBuffer(signature.url);
                            if (!fileBuffer) {
                                throw new Error(`Failed to get file buffer for ${signature.url}`);
                            }
                            imageBytes = fileBuffer;
                        }
                    }
                    catch (error) {
                        // Fixed: Type error handling for unknown error type
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        console.error(`Failed to load signature image: ${errorMessage}`);
                        continue;
                    }
                    // Embed image
                    let pdfImage;
                    try {
                        // Try PNG first, then JPG
                        try {
                            pdfImage = await pdfDoc.embedPng(imageBytes);
                        }
                        catch (_m) {
                            pdfImage = await pdfDoc.embedJpg(imageBytes);
                        }
                    }
                    catch (error) {
                        // Fixed: Type error handling for unknown error type
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        console.error(`Failed to embed signature: ${errorMessage}`);
                        continue;
                    }
                    // CRITICAL FIX: Calculate exact position using percentages when available
                    let x, y, width, height;
                    if (signature.xPct !== undefined && signature.yPct !== undefined) {
                        // Use percentage values when available
                        x = signature.xPct * pageWidth;
                        y = signature.yPct * pageHeight;
                        // For width and height, compute proportionally if percentages are available
                        if (signature.widthPct !== undefined) {
                            width = signature.widthPct * pageWidth;
                        }
                        else {
                            width = 100; // Default signature width
                        }
                        if (signature.heightPct !== undefined) {
                            height = signature.heightPct * pageHeight;
                        }
                        else {
                            height = 40; // Default signature height
                        }
                    }
                    else {
                        // Fall back to absolute values if available
                        x = (_a = signature.x) !== null && _a !== void 0 ? _a : 50;
                        y = (_b = signature.y) !== null && _b !== void 0 ? _b : 50;
                        width = (_c = signature.width) !== null && _c !== void 0 ? _c : 100;
                        height = (_d = signature.height) !== null && _d !== void 0 ? _d : 40;
                    }
                    // Maintain aspect ratio for signature
                    const aspectRatio = pdfImage.width / pdfImage.height;
                    height = width / aspectRatio;
                    // CRITICAL FIX: Convert y-coordinate from top-left (HTML) to bottom-left (PDF)
                    const pdfY = pageHeight - y - height;
                    // Draw the signature
                    page.drawImage(pdfImage, {
                        x: x,
                        y: pdfY,
                        width: width,
                        height: height
                    });
                    console.log(`Placed signature at (${x}, ${pdfY}) with size ${width}x${height} on page ${pageIndex + 1}`);
                }
                catch (error) {
                    // Fixed: Type error handling for unknown error type
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error(`Error processing signature: ${errorMessage}`);
                }
            }
            // 2. Next process stamps (similar approach but different defaults)
            for (const stamp of stamps) {
                try {
                    // Skip invalid URLs
                    if (!stamp.url || stamp.url === 'QR_PLACEHOLDER') {
                        console.warn(`Skipping stamp: missing URL`);
                        continue;
                    }
                    // Determine page to place stamp on
                    const pageIndex = getSafePage(stamp.pageNumber) - 1;
                    const page = pages[pageIndex];
                    const { width: pageWidth, height: pageHeight } = page.getSize();
                    // Get stamp image
                    let imageBytes;
                    try {
                        if (stamp.url.startsWith('http')) {
                            const response = await axios_1.default.get(stamp.url, { responseType: 'arraybuffer' });
                            imageBytes = Buffer.from(response.data);
                        }
                        else {
                            const fileBuffer = await file_service_1.FileService.getFileBuffer(stamp.url);
                            if (!fileBuffer) {
                                throw new Error(`Failed to get file buffer for ${stamp.url}`);
                            }
                            imageBytes = fileBuffer;
                        }
                    }
                    catch (error) {
                        // Fixed: Type error handling for unknown error type
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        console.error(`Failed to load stamp image: ${errorMessage}`);
                        continue;
                    }
                    // Embed image
                    let pdfImage;
                    try {
                        // Try PNG first, then JPG
                        try {
                            pdfImage = await pdfDoc.embedPng(imageBytes);
                        }
                        catch (_o) {
                            pdfImage = await pdfDoc.embedJpg(imageBytes);
                        }
                    }
                    catch (error) {
                        // Fixed: Type error handling for unknown error type
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        console.error(`Failed to embed stamp: ${errorMessage}`);
                        continue;
                    }
                    // Calculate position and size (for stamps, we make them square-ish)
                    let x, y, width, height;
                    if (stamp.xPct !== undefined && stamp.yPct !== undefined) {
                        // Use percentage values when available
                        x = stamp.xPct * pageWidth;
                        y = stamp.yPct * pageHeight;
                        // For width and height, compute proportionally if percentages are available
                        if (stamp.widthPct !== undefined) {
                            width = stamp.widthPct * pageWidth;
                        }
                        else {
                            width = 60; // Default stamp width
                        }
                        if (stamp.heightPct !== undefined) {
                            height = stamp.heightPct * pageHeight;
                        }
                        else {
                            height = 60; // Default stamp height
                        }
                    }
                    else {
                        // Fall back to absolute values if available
                        x = (_e = stamp.x) !== null && _e !== void 0 ? _e : 50;
                        y = (_f = stamp.y) !== null && _f !== void 0 ? _f : 50;
                        width = (_g = stamp.width) !== null && _g !== void 0 ? _g : 60;
                        height = (_h = stamp.height) !== null && _h !== void 0 ? _h : 60;
                    }
                    // Maintain aspect ratio for stamp
                    const aspectRatio = pdfImage.width / pdfImage.height;
                    const targetWidth = width;
                    const targetHeight = width / aspectRatio;
                    // Ensure stamp fits within allocated space
                    if (targetHeight > height) {
                        height = height;
                        width = height * aspectRatio;
                    }
                    else {
                        width = targetWidth;
                        height = targetHeight;
                    }
                    // Convert y-coordinate from top-left (HTML) to bottom-left (PDF)
                    const pdfY = pageHeight - y - height;
                    // Draw the stamp
                    page.drawImage(pdfImage, {
                        x: x,
                        y: pdfY,
                        width: width,
                        height: height
                    });
                    console.log(`Placed stamp at (${x}, ${pdfY}) with size ${width}x${height} on page ${pageIndex + 1}`);
                }
                catch (error) {
                    // Fixed: Type error handling for unknown error type
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error(`Error processing stamp: ${errorMessage}`);
                }
            }
            // 3. Process QR codes
            // Generate QR code for letter URL
            const finalPdfKey = `final-letters/letter-${letter.id}-final-approved.pdf`;
            const finalPdfPublicUrl = `https://${R2_PUB_URL}/${finalPdfKey}`;
            const qrCodeBuffer = await qrcode_1.default.toBuffer(finalPdfPublicUrl, {
                errorCorrectionLevel: 'H',
                type: 'png',
                margin: 1,
                color: { dark: '#000000', light: '#FFFFFF' },
                scale: 10 // Higher scale for better quality
            });
            const qrImageEmbed = await pdfDoc.embedPng(qrCodeBuffer);
            // Place QR codes at specified positions
            if (qrCodes.length > 0) {
                for (const qrCode of qrCodes) {
                    try {
                        // Determine page to place QR code on
                        const pageIndex = getSafePage(qrCode.pageNumber) - 1;
                        const page = pages[pageIndex];
                        const { width: pageWidth, height: pageHeight } = page.getSize();
                        // Calculate position and fixed size for QR code
                        let x, y;
                        let width = 50; // Fixed QR code size
                        let height = 50;
                        if (qrCode.xPct !== undefined && qrCode.yPct !== undefined) {
                            // Use percentage values when available
                            x = qrCode.xPct * pageWidth;
                            y = qrCode.yPct * pageHeight;
                            // For width and height, compute proportionally if percentages are available
                            if (qrCode.widthPct !== undefined) {
                                width = qrCode.widthPct * pageWidth;
                                height = width; // Keep QR code square
                            }
                        }
                        else {
                            // Fall back to absolute values if available
                            x = (_j = qrCode.x) !== null && _j !== void 0 ? _j : (pageWidth - 70); // Default to right side
                            y = (_k = qrCode.y) !== null && _k !== void 0 ? _k : 20; // Default to near bottom
                            width = (_l = qrCode.width) !== null && _l !== void 0 ? _l : 50;
                            height = width; // Keep QR code square
                        }
                        // Convert y-coordinate from top-left (HTML) to bottom-left (PDF)
                        const pdfY = pageHeight - y - height;
                        // Draw the QR code
                        page.drawImage(qrImageEmbed, {
                            x: x,
                            y: pdfY,
                            width: width,
                            height: height
                        });
                        console.log(`Placed QR code at (${x}, ${pdfY}) with size ${width}x${height} on page ${pageIndex + 1}`);
                    }
                    catch (error) {
                        // Fixed: Type error handling for unknown error type
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        console.error(`Error processing QR code: ${errorMessage}`);
                    }
                }
            }
            else {
                // Default QR placement if none specified
                console.warn(`No QR code placement specified for letter ${letterId}, using default position`);
                const lastPage = pages[pages.length - 1];
                const { width: pageWidth, height: pageHeight } = lastPage.getSize();
                const qrSize = 50;
                const margin = 20;
                lastPage.drawImage(qrImageEmbed, {
                    x: pageWidth - qrSize - margin,
                    y: margin, // Bottom margin in PDF coordinates
                    width: qrSize,
                    height: qrSize
                });
            }
            // Save the PDF and upload to storage
            const finalPdfBytes = await pdfDoc.save();
            await file_service_1.FileService.uploadBuffer(Buffer.from(finalPdfBytes), finalPdfKey, 'application/pdf');
            // Save the QR code image separately
            const qrCodeImageFileName = `qr-images/letter-${letter.id}-qr.png`;
            const uploadedQrImageR2 = await file_service_1.FileService.uploadBuffer(qrCodeBuffer, qrCodeImageFileName, 'image/png');
            const qrCodeImageUrl = uploadedQrImageR2 === null || uploadedQrImageR2 === void 0 ? void 0 : uploadedQrImageR2.url;
            // Update the letter record
            await letter.update({
                workflowStatus: letter_model_1.LetterWorkflowStatus.APPROVED,
                nextActionById: null,
                currentStepIndex: null,
                finalSignedPdfUrl: finalPdfKey,
                publicLink: finalPdfPublicUrl,
                qrCodeUrl: qrCodeImageUrl,
                placements: placements, // Store the placements for future reference
                name: name || letter.name,
            }, { transaction });
            // Create an action log
            await letter_action_log_model_1.LetterActionLog.create({
                letterId,
                userId,
                actionType: letter_action_log_model_1.LetterActionType.FINAL_APPROVE,
                comment: comment || 'Letter finally approved.',
            }, { transaction });
            // Log the activity
            await activity_service_1.ActivityService.logActivity({
                userId,
                action: activity_model_1.ActivityType.APPROVE,
                resourceType: activity_model_1.ResourceType.LETTER,
                resourceId: letterId,
                resourceName: letter.name || `Letter ${letter.id.substring(0, 6)}`,
                details: `Letter finally approved. ${comment ? `Comment: ${comment}` : ''}`,
                transaction
            });
            // Commit the transaction
            await transaction.commit();
            // Send notifications
            try {
                const submitter = await user_model_1.User.findByPk(letter.userId, { attributes: ['id', 'email', 'firstName', 'lastName'] });
                const approver = await user_model_1.User.findByPk(userId, { attributes: ['firstName', 'lastName', 'email'] });
                if (submitter && approver) {
                    const approverName = `${approver.firstName || ''} ${approver.lastName || ''}`.trim() || approver.email;
                    const letterName = letter.name || `Letter ${letter.id.substring(0, 6)}`;
                    const letterViewUrl = `${CLIENT_URL}/dashboard/MyStaff/LetterView/${letter.id}`;
                    if (submitter.email) {
                        await email_service_1.EmailService.sendLetterApprovedEmail(submitter.email, submitter.firstName || 'User', letterName, approverName, letterViewUrl);
                    }
                    await notification_service_1.NotificationService.createLetterFinalApprovedNotification(submitter.id, letterId, letterName, approverName);
                }
            }
            catch (notificationError) {
                console.error(`Error sending notification: ${notificationError}`);
                // Don't fail if notifications fail
            }
            // Return the full letter with associations
            const result = await letter_model_1.Letter.findByPk(letterId, {
                include: [
                    { model: user_model_1.User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
                    { model: letter_reviewer_model_1.LetterReviewer, as: 'letterReviewers', include: [{ model: user_model_1.User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatar'] }], order: [['sequenceOrder', 'ASC']] },
                    { model: letter_action_log_model_1.LetterActionLog, as: 'letterActionLogs', include: [{ model: user_model_1.User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatar'] }], order: [['createdAt', 'DESC']] }
                ]
            });
            if (!result) {
                throw new errorHandler_1.AppError(404, `Letter with ID ${letterId} not found after final approval.`);
            }
            return result;
        }
        catch (error) {
            console.error(`Error in finalApproveLetterSingle for letter ${letterId}:`, error);
            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log(`Transaction rolled back for letter ${letterId} due to error.`);
                }
                catch (rbError) {
                    console.error(`Error rolling back transaction: ${rbError.message}`);
                }
            }
            if (error instanceof errorHandler_1.AppError)
                throw error;
            throw new errorHandler_1.AppError(500, `Failed to finally approve template letter: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    static async getAllByUserId(userId) {
        if (!userId) {
            throw new errorHandler_1.AppError(401, 'User ID is required.');
        }
        try {
            // Get unique letter IDs from action logs where this user was involved
            const letterIdsFromActionLogs = await letter_action_log_model_1.LetterActionLog.findAll({
                where: { userId },
                attributes: ['letterId'],
                group: ['letterId'],
            }).then(logs => logs.map(log => log.letterId));
            // Combine all letter IDs from different sources
            const allLetterIds = [...new Set([...letterIdsFromActionLogs])];
            // Find letters where user is creator OR user participated in workflow OR user was a reviewer/approver
            const letters = await letter_model_1.Letter.findAll({
                where: {
                    [sequelize_1.Op.or]: [
                        { userId }, // User is creator
                        { id: { [sequelize_1.Op.in]: allLetterIds } } // User participated in workflow or was assigned as reviewer/approver
                    ]
                },
                include: [
                    { model: template_model_1.default, as: 'template', attributes: ['id', 'name'], required: false },
                    { model: user_model_1.User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'], required: false }
                ],
                attributes: ['id', 'name', 'templateId', 'userId', 'logoUrl', 'signatureUrl', 'stampUrl', 'signedPdfUrl', 'workflowStatus', 'finalSignedPdfUrl', 'qrCodeUrl', 'createdAt', 'updatedAt'],
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
            throw new errorHandler_1.AppError(400, 'Letter ID and Requesting User ID are required.');
        }
        try {
            const letter = await letter_model_1.Letter.findOne({
                where: { id },
                include: [
                    { model: user_model_1.User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
                    { model: template_model_1.default, as: 'template', attributes: ['id', 'name', 'content'], required: false }, // content sahəsini əlavə edin
                    { model: letter_reviewer_model_1.LetterReviewer, as: 'letterReviewers', include: [{ model: user_model_1.User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatar'] }] },
                    { model: letter_action_log_model_1.LetterActionLog, as: 'letterActionLogs', include: [{ model: user_model_1.User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatar'] }], order: [['createdAt', 'DESC']] },
                ],
            });
            if (!letter) {
                throw new errorHandler_1.AppError(404, `Letter with ID ${id} not found.`);
            }
            const isCreator = letter.userId === requestingUserId;
            let isReviewer = false;
            const letterReviewerEntry = await letter_reviewer_model_1.LetterReviewer.findOne({ where: { letterId: id, userId: requestingUserId } });
            isReviewer = !!letterReviewerEntry;
            const isAdmin = false;
            if (!isCreator && !isReviewer && !isAdmin && letter.workflowStatus !== letter_model_1.LetterWorkflowStatus.APPROVED) {
                throw new errorHandler_1.AppError(403, `Access Denied. You are not authorized to view this letter.`);
            }
            return letter;
        }
        catch (error) {
            console.error(`Error finding letter with ID ${id} for user ${requestingUserId}:`, error);
            if (error instanceof errorHandler_1.AppError)
                throw error;
            throw new errorHandler_1.AppError(500, 'Could not retrieve letter due to an internal error.');
        }
    }
    static async delete(id, userId) {
        if (!id || !userId) {
            throw new errorHandler_1.AppError(401, 'Letter ID and User ID are required.');
        }
        try {
            const letterToDelete = await letter_model_1.Letter.findOne({ where: { id, userId } });
            if (!letterToDelete) {
                throw new errorHandler_1.AppError(404, `Letter with ID ${id} not found or access denied.`);
            }
            // Add cascading delete logic or handle related records (reviewers, logs) if needed
            await letter_action_log_model_1.LetterActionLog.destroy({ where: { letterId: id } });
            await letter_reviewer_model_1.LetterReviewer.destroy({ where: { letterId: id } });
            const affectedRows = await letter_model_1.Letter.destroy({ where: { id, userId } });
            return true;
        }
        catch (error) {
            console.error(`Error deleting letter with ID ${id} for user ${userId}:`, error);
            if (error instanceof errorHandler_1.AppError)
                throw error;
            throw new errorHandler_1.AppError(500, 'Could not delete letter.');
        }
    }
    static async createFromPdfInteractive(data) {
        const { originalFileId, placements, userId, reviewers, approver, name } = data;
        let transaction = null;
        if (!reviewers || reviewers.length === 0) {
            throw new errorHandler_1.AppError(400, 'At least one reviewer must be specified.');
        }
        try {
            transaction = await sequelize_2.sequelize.transaction();
            const originalFileRecord = await file_model_1.default.findByPk(originalFileId, { transaction });
            if (!originalFileRecord || !originalFileRecord.path) {
                throw new errorHandler_1.AppError(404, `Original PDF file record not found or path missing for ID: ${originalFileId}`);
            }
            const originalPdfKey = originalFileRecord.path;
            const originalPdfBytes = await file_service_1.FileService.getFileBuffer(originalPdfKey);
            const pdfDoc = await pdf_lib_1.PDFDocument.load(originalPdfBytes);
            const pages = pdfDoc.getPages();
            for (const item of placements) {
                if (item.type === 'signature' || item.type === 'stamp') {
                    if (item.pageNumber < 1 || item.pageNumber > pages.length) {
                        console.warn(`Skipping placement: Invalid page ${item.pageNumber} for item ${item.type} in letter.`);
                        continue;
                    }
                    if (!item.url || item.url === QR_PLACEHOLDER_IDENTIFIER_BACKEND) {
                        console.warn(`Skipping image placement: URL missing or invalid for ${item.type}`);
                        continue;
                    }
                    let imageBytes = null;
                    try {
                        if (item.url.startsWith('http')) {
                            const response = await axios_1.default.get(item.url, { responseType: 'arraybuffer' });
                            imageBytes = Buffer.from(response.data);
                        }
                        else {
                            imageBytes = await file_service_1.FileService.getFileBuffer(item.url);
                        }
                    }
                    catch (fetchError) {
                        console.warn(`Skipping image placement for ${item.type} due to fetch error from ${item.url}: ${fetchError.message}`);
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
                            try {
                                pdfImage = await pdfDoc.embedPng(imageBytes);
                            }
                            catch (e) {
                                try {
                                    pdfImage = await pdfDoc.embedJpg(imageBytes);
                                }
                                catch (e2) {
                                    console.warn(`Skipping placement: Unsupported image type for ${item.type} URL ${item.url}`);
                                    continue;
                                }
                            }
                        }
                    }
                    catch (embedError) {
                        console.error(`Failed to embed image ${item.url} for ${item.type}: ${embedError.message}`);
                        continue;
                    }
                    if (!pdfImage)
                        continue;
                    const page = pages[item.pageNumber - 1];
                    const { height: pageHeight } = page.getSize();
                    const pdfY = pageHeight - item.y - item.height;
                    try {
                        page.drawImage(pdfImage, { x: item.x, y: pdfY, width: item.width, height: item.height });
                    }
                    catch (drawError) {
                        console.error(`Failed to draw ${item.type} ${item.url} on page ${item.pageNumber}: ${drawError.message}`);
                    }
                }
            }
            const modifiedPdfBytes = await pdfDoc.save();
            const originalFilenameWithoutExt = path_1.default.basename(originalFileRecord.name || 'interactive-doc', path_1.default.extname(originalFileRecord.name || '.pdf'));
            const intermediatePdfKey = `intermediate-signed-letters/${originalFilenameWithoutExt}-intermediate-${(0, uuid_1.v4)()}.pdf`;
            const uploadResult = await file_service_1.FileService.uploadBuffer(Buffer.from(modifiedPdfBytes), intermediatePdfKey, 'application/pdf');
            if (!uploadResult || !uploadResult.key) {
                throw new errorHandler_1.AppError(500, 'Failed to upload intermediate signed PDF to R2.');
            }
            const intermediateSignedPdfIdentifier = uploadResult.key;
            const newLetter = await letter_model_1.Letter.create({
                userId,
                name: name !== null && name !== void 0 ? name : `Interactive: ${originalFileRecord.name}`,
                templateId: null,
                formData: null,
                originalPdfFileId: originalFileId,
                signedPdfUrl: intermediateSignedPdfIdentifier,
                finalSignedPdfUrl: null,
                placements: placements,
                workflowStatus: letter_model_1.LetterWorkflowStatus.PENDING_REVIEW,
                currentStepIndex: 1,
                nextActionById: reviewers[0],
            }, { transaction });
            const reviewerEntries = reviewers.map((reviewerId, index) => ({
                letterId: newLetter.id,
                userId: reviewerId,
                sequenceOrder: index + 1,
                status: letter_reviewer_model_1.LetterReviewerStatus.PENDING,
            }));
            if (approver) {
                reviewerEntries.push({
                    letterId: newLetter.id,
                    userId: approver,
                    sequenceOrder: APPROVER_SEQUENCE,
                    status: letter_reviewer_model_1.LetterReviewerStatus.PENDING,
                });
            }
            await letter_reviewer_model_1.LetterReviewer.bulkCreate(reviewerEntries, { transaction });
            await letter_action_log_model_1.LetterActionLog.create({
                letterId: newLetter.id,
                userId: userId,
                actionType: letter_action_log_model_1.LetterActionType.SUBMIT,
                comment: 'Letter submitted for review (interactive PDF).',
                details: { initialReviewerId: reviewers[0], placementsCount: placements.length }
            }, { transaction });
            await activity_service_1.ActivityService.logActivity({
                userId: userId,
                action: activity_model_1.ActivityType.SUBMIT,
                resourceType: activity_model_1.ResourceType.LETTER,
                resourceId: newLetter.id,
                resourceName: newLetter.name || 'Interactive Signed Letter',
                details: `Letter submitted from interactive PDF, pending review by user ${reviewers[0]}.`,
                transaction
            });
            await transaction.commit();
            try {
                const firstReviewer = await user_model_1.User.findByPk(reviewers[0], { attributes: ['id', 'email', 'firstName', 'lastName'] });
                const submitterUser = await user_model_1.User.findByPk(userId, { attributes: ['id', 'email', 'firstName', 'lastName'] });
                if (firstReviewer && submitterUser) {
                    const submitterName = `${submitterUser.firstName || ''} ${submitterUser.lastName || ''}`.trim() || submitterUser.email;
                    const reviewerName = `${firstReviewer.firstName || ''} ${firstReviewer.lastName || ''}`.trim() || firstReviewer.email;
                    const letterViewUrl = `${CLIENT_URL}/dashboard/Inbox/LetterReview/${newLetter.id}`;
                    if (firstReviewer.email) {
                        await email_service_1.EmailService.sendReviewRequestEmail(firstReviewer.email, reviewerName, submitterName, newLetter.name || `Letter ${newLetter.id.substring(0, 6)}`, letterViewUrl);
                    }
                    await notification_service_1.NotificationService.createLetterReviewRequestNotification(firstReviewer.id, newLetter.id, newLetter.name || `Letter ${newLetter.id.substring(0, 6)}`, submitterName);
                }
            }
            catch (notificationError) {
                console.error(`Error sending initial review notification for interactive letter ${newLetter.id}:`, notificationError);
            }
            const letterForReturn = await letter_model_1.Letter.findByPk(newLetter.id, {
                include: [
                    { model: user_model_1.User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
                    { model: letter_reviewer_model_1.LetterReviewer, as: 'letterReviewers', include: [{ model: user_model_1.User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatar'] }], order: [['sequenceOrder', 'ASC']] },
                    { model: letter_action_log_model_1.LetterActionLog, as: 'letterActionLogs', include: [{ model: user_model_1.User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatar'] }], order: [['createdAt', 'DESC']] }
                ]
            });
            if (!letterForReturn) {
                throw new errorHandler_1.AppError(500, 'Failed to refetch the newly created interactive signed letter with associations.');
            }
            return letterForReturn;
        }
        catch (error) {
            if (transaction)
                await transaction.rollback();
            console.error('Error in createFromPdfInteractive service:', error);
            if (error instanceof errorHandler_1.AppError)
                throw error;
            throw new errorHandler_1.AppError(500, 'Failed to create interactive PDF letter with workflow.');
        }
    }
    static async generateSignedPdfViewUrl(letterId, userId) {
        if (!letterId || !userId) {
            throw new errorHandler_1.AppError(400, 'Letter ID and User ID are required.');
        }
        if (!R2_BUCKET_NAME) {
            throw new errorHandler_1.AppError(500, 'R2_BUCKET_NAME is not configured.');
        }
        try {
            const letter = await letter_model_1.Letter.findOne({
                where: { id: letterId },
                attributes: ['signedPdfUrl', 'finalSignedPdfUrl', 'userId', 'workflowStatus']
            }); // Fetch userId for auth check
            if (!letter) {
                throw new errorHandler_1.AppError(404, `Letter with ID ${letterId} not found.`);
            }
            // --- Authorization Check ---
            const isCreator = letter.userId === userId;
            let isReviewerOrApprover = false;
            const reviewerEntry = await letter_reviewer_model_1.LetterReviewer.findOne({ where: { letterId: letterId, userId: userId } });
            isReviewerOrApprover = !!reviewerEntry;
            const isAdmin = false; // Replace with actual admin check
            if (!isCreator && !isReviewerOrApprover && !isAdmin && letter.workflowStatus !== letter_model_1.LetterWorkflowStatus.APPROVED) {
                throw new errorHandler_1.AppError(403, `Access Denied. You are not authorized to view this letter.`);
            }
            // --- End Authorization Check ---
            // Use finalSignedPdfUrl when available (for approved letters), otherwise use signedPdfUrl
            const pdfUrl = letter.finalSignedPdfUrl || letter.signedPdfUrl;
            if (!pdfUrl) {
                throw new errorHandler_1.AppError(404, `Letter with ID ${letterId} does not have a PDF URL.`);
            }
            console.log(`Generating signed URL for letter ${letterId}, using key: ${pdfUrl}`);
            const r2Key = pdfUrl;
            const command = new client_s3_1.GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: r2Key, });
            const expiresInSeconds = 300;
            const signedUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn: expiresInSeconds });
            return signedUrl;
        }
        catch (error) {
            console.error(`Service: Error generating signed view URL for letter ${letterId}:`, error);
            if (error instanceof errorHandler_1.AppError)
                throw error;
            throw new errorHandler_1.AppError(500, 'Could not generate view URL for the signed PDF.');
        }
    }
    static async approveStep(letterId, userId, comment, name) {
        const transaction = await sequelize_2.sequelize.transaction();
        try {
            const letter = await letter_model_1.Letter.findByPk(letterId, { transaction });
            if (!letter)
                throw new errorHandler_1.AppError(404, `Letter not found: ${letterId}`);
            if (letter.workflowStatus !== letter_model_1.LetterWorkflowStatus.PENDING_REVIEW) {
                throw new errorHandler_1.AppError(400, `Letter is not pending review. Current status: ${letter.workflowStatus}`);
            }
            if (letter.nextActionById !== userId) {
                throw new errorHandler_1.AppError(403, `Not authorized. Action required by user ${letter.nextActionById}.`);
            }
            const currentStepIndex = letter.currentStepIndex || 0;
            const currentReviewerStep = await letter_reviewer_model_1.LetterReviewer.findOne({
                where: { letterId, userId, sequenceOrder: currentStepIndex },
                transaction
            });
            if (!currentReviewerStep) {
                throw new errorHandler_1.AppError(404, `Reviewer step not found for user ${userId} at step ${currentStepIndex}.`);
            }
            await currentReviewerStep.update({ status: letter_reviewer_model_1.LetterReviewerStatus.APPROVED, actedAt: new Date() }, { transaction });
            if (comment && comment.trim()) {
                await letter_action_log_model_1.LetterActionLog.create({
                    letterId, userId, actionType: letter_action_log_model_1.LetterActionType.APPROVE_REVIEW, comment: comment.trim()
                }, { transaction });
            }
            const nextReviewerStep = await letter_reviewer_model_1.LetterReviewer.findOne({
                where: { letterId, sequenceOrder: { [sequelize_1.Op.gt]: currentStepIndex }, status: letter_reviewer_model_1.LetterReviewerStatus.PENDING },
                order: [['sequenceOrder', 'ASC']],
                transaction
            });
            let nextStatus = letter.workflowStatus;
            let nextStep = letter.currentStepIndex;
            let nextActor = letter.nextActionById;
            let notificationTargetId = null;
            let notificationType = 'next_reviewer';
            if (nextReviewerStep && nextReviewerStep.sequenceOrder < APPROVER_SEQUENCE) {
                nextStep = nextReviewerStep.sequenceOrder;
                nextActor = nextReviewerStep.userId;
                notificationTargetId = nextReviewerStep.userId;
                notificationType = 'next_reviewer';
            }
            else {
                const finalApproverStep = await letter_reviewer_model_1.LetterReviewer.findOne({
                    where: { letterId, sequenceOrder: APPROVER_SEQUENCE },
                    transaction
                });
                if (finalApproverStep) {
                    nextStatus = letter_model_1.LetterWorkflowStatus.PENDING_APPROVAL;
                    nextStep = APPROVER_SEQUENCE;
                    nextActor = finalApproverStep.userId;
                    notificationTargetId = finalApproverStep.userId;
                    notificationType = 'pending_approval';
                }
                else {
                    nextStatus = letter_model_1.LetterWorkflowStatus.APPROVED;
                    nextStep = 0;
                    nextActor = null;
                    notificationTargetId = letter.userId; // Notify submitter
                    notificationType = 'approved';
                }
            }
            await letter.update({
                workflowStatus: nextStatus,
                currentStepIndex: nextStep,
                nextActionById: nextActor,
                name: name || letter.name,
            }, { transaction });
            await activity_service_1.ActivityService.logActivity({
                userId, action: activity_model_1.ActivityType.APPROVE, resourceType: activity_model_1.ResourceType.LETTER,
                resourceId: letterId, resourceName: letter.name || 'Signed Letter',
                details: `Review step ${currentStepIndex} approved.${comment ? ` Comment: ${comment}` : ''}`,
                transaction
            });
            await transaction.commit();
            if (notificationTargetId) {
                const targetUser = await user_model_1.User.findByPk(notificationTargetId, { attributes: ['id', 'email', 'firstName', 'lastName'] });
                const submitter = await user_model_1.User.findByPk(letter.userId, { attributes: ['id', 'email', 'firstName', 'lastName'] });
                const currentUser = await user_model_1.User.findByPk(userId, { attributes: ['firstName', 'lastName'] });
                const currentUserName = currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : 'A user';
                if (targetUser && submitter) {
                    const targetUserName = `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || targetUser.email;
                    const letterViewUrl = `${CLIENT_URL}/dashboard/Inbox/LetterReview/${letter.id}`;
                    if (notificationType === 'next_reviewer' || notificationType === 'pending_approval') {
                        if (targetUser.email) {
                            await email_service_1.EmailService.sendReviewRequestEmail(targetUser.email, targetUserName, currentUserName, letter.name || `Letter ${letter.id.substring(0, 6)}`, letterViewUrl);
                        }
                        await notification_service_1.NotificationService.createLetterReviewRequestNotification(targetUser.id, letterId, letter.name || `Letter ${letter.id.substring(0, 6)}`, currentUserName);
                    }
                    else if (notificationType === 'approved') {
                        await notification_service_1.NotificationService.createLetterReviewApprovedNotification(targetUser.id, letterId, letter.name || 'Untitled Letter', currentUserName);
                    }
                }
            }
            return await this.findById(letterId, userId);
        }
        catch (error) {
            if (transaction)
                await transaction.rollback();
            console.error(`Error approving step for letter ${letterId} by user ${userId}:`, error);
            if (error instanceof errorHandler_1.AppError)
                throw error;
            throw new errorHandler_1.AppError(500, 'Failed to approve review step.');
        }
    }
    static async rejectStep(letterId, userId, reason) {
        const transaction = await sequelize_2.sequelize.transaction();
        try {
            const letter = await letter_model_1.Letter.findByPk(letterId, { transaction });
            if (!letter)
                throw new errorHandler_1.AppError(404, `Letter not found: ${letterId}`);
            if (letter.workflowStatus !== letter_model_1.LetterWorkflowStatus.PENDING_REVIEW) {
                throw new errorHandler_1.AppError(400, `Letter is not pending review. Current status: ${letter.workflowStatus}`);
            }
            if (letter.nextActionById !== userId) {
                throw new errorHandler_1.AppError(403, `Not authorized. Action required by user ${letter.nextActionById}.`);
            }
            if (!reason || !reason.trim()) {
                throw new errorHandler_1.AppError(400, 'Rejection reason is required.');
            }
            const currentStepIndex = letter.currentStepIndex || 0;
            const currentReviewerStep = await letter_reviewer_model_1.LetterReviewer.findOne({
                where: { letterId, userId, sequenceOrder: currentStepIndex },
                transaction
            });
            if (!currentReviewerStep) {
                throw new errorHandler_1.AppError(404, `Reviewer step not found for user ${userId} at step ${currentStepIndex}.`);
            }
            await currentReviewerStep.update({ status: letter_reviewer_model_1.LetterReviewerStatus.REJECTED, actedAt: new Date() }, { transaction });
            await letter.update({
                workflowStatus: letter_model_1.LetterWorkflowStatus.REJECTED,
                currentStepIndex: 0,
                nextActionById: null
            }, { transaction });
            await letter_action_log_model_1.LetterActionLog.create({
                letterId, userId, actionType: letter_action_log_model_1.LetterActionType.REJECT_REVIEW, comment: reason
            }, { transaction });
            await activity_service_1.ActivityService.logActivity({
                userId, action: activity_model_1.ActivityType.REJECT, resourceType: activity_model_1.ResourceType.LETTER,
                resourceId: letterId, resourceName: letter.name || 'Signed Letter',
                details: `Review step ${currentStepIndex} rejected. Reason: ${reason}`,
                transaction
            });
            await transaction.commit();
            try {
                const submitter = await user_model_1.User.findByPk(letter.userId, { attributes: ['id', 'email', 'firstName', 'lastName'] });
                const reviewer = await user_model_1.User.findByPk(userId, { attributes: ['firstName', 'lastName'] });
                const reviewerName = reviewer ? `${reviewer.firstName || ''} ${reviewer.lastName || ''}`.trim() : 'A reviewer';
                if (submitter) {
                    await notification_service_1.NotificationService.createLetterReviewRejectedNotification(submitter.id, letterId, letter.name || 'Untitled Letter', reason, reviewerName);
                }
            }
            catch (notificationError) {
                console.error(`Error sending rejection notification for letter ${letterId}:`, notificationError);
            }
            return await this.findById(letterId, userId);
        }
        catch (error) {
            if (transaction)
                await transaction.rollback();
            console.error(`Error rejecting step for letter ${letterId} by user ${userId}:`, error);
            if (error instanceof errorHandler_1.AppError)
                throw error;
            throw new errorHandler_1.AppError(500, 'Failed to reject review step.');
        }
    }
    static async reassignStep(letterId, currentUserId, newUserId, reason) {
        const transaction = await sequelize_2.sequelize.transaction();
        try {
            const letter = await letter_model_1.Letter.findByPk(letterId, { transaction });
            if (!letter)
                throw new errorHandler_1.AppError(404, `Letter not found: ${letterId}`);
            if (letter.workflowStatus !== letter_model_1.LetterWorkflowStatus.PENDING_REVIEW && letter.workflowStatus !== letter_model_1.LetterWorkflowStatus.PENDING_APPROVAL) {
                throw new errorHandler_1.AppError(400, `Letter cannot be reassigned in its current status: ${letter.workflowStatus}`);
            }
            if (letter.nextActionById !== currentUserId) {
                throw new errorHandler_1.AppError(403, `Not authorized. Action required by user ${letter.nextActionById}.`);
            }
            const newUser = await user_model_1.User.findByPk(newUserId, { transaction });
            if (!newUser)
                throw new errorHandler_1.AppError(404, `User to reassign to not found: ${newUserId}`);
            const currentStepIndex = letter.currentStepIndex || 0;
            const currentStep = await letter_reviewer_model_1.LetterReviewer.findOne({
                where: { letterId, userId: currentUserId, sequenceOrder: currentStepIndex },
                transaction
            });
            if (!currentStep) {
                throw new errorHandler_1.AppError(404, `Current step not found for user ${currentUserId} at step ${currentStepIndex}.`);
            }
            const existingAssignment = await letter_reviewer_model_1.LetterReviewer.findOne({ where: { letterId, userId: newUserId }, transaction });
            if (existingAssignment) {
                throw new errorHandler_1.AppError(400, `User ${newUserId} is already part of this letter's workflow.`);
            }
            await currentStep.update({
                userId: newUserId, // Assign step to new user
                reassignedFromUserId: currentUserId,
                status: letter_reviewer_model_1.LetterReviewerStatus.PENDING, // Reset status for new user
                actedAt: null // Clear actedAt
            }, { transaction });
            await letter.update({ nextActionById: newUserId }, { transaction });
            const comment = reason || `Review reassigned from user ${currentUserId} to user ${newUserId}.`;
            await letter_action_log_model_1.LetterActionLog.create({
                letterId, userId: currentUserId, actionType: letter_action_log_model_1.LetterActionType.REASSIGN_REVIEW, comment, details: { reassignedToUserId: newUserId }
            }, { transaction });
            await activity_service_1.ActivityService.logActivity({
                userId: currentUserId, action: activity_model_1.ActivityType.REASSIGN, resourceType: activity_model_1.ResourceType.LETTER,
                resourceId: letterId, resourceName: letter.name || 'Signed Letter',
                details: comment,
                transaction
            });
            await transaction.commit();
            try {
                const submitter = await user_model_1.User.findByPk(letter.userId, { attributes: ['id', 'email', 'firstName', 'lastName'] });
                const reassignedUser = await user_model_1.User.findByPk(newUserId, { attributes: ['id', 'email', 'firstName', 'lastName'] });
                const currentUser = await user_model_1.User.findByPk(currentUserId, { attributes: ['firstName', 'lastName'] });
                const currentUserName = currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : 'A user';
                if (reassignedUser && submitter) {
                    const reassignedUserName = `${reassignedUser.firstName || ''} ${reassignedUser.lastName || ''}`.trim() || reassignedUser.email;
                    const letterViewUrl = `${CLIENT_URL}/dashboard/Inbox/LetterReview/${letter.id}`;
                    if (reassignedUser.email) {
                        await email_service_1.EmailService.sendReviewRequestEmail(reassignedUser.email, reassignedUserName, currentUserName, letter.name || `Letter ${letter.id.substring(0, 6)}`, letterViewUrl);
                    }
                    await notification_service_1.NotificationService.createLetterReviewRequestNotification(reassignedUser.id, letterId, letter.name || `Letter ${letter.id.substring(0, 6)}`, currentUserName);
                }
            }
            catch (notificationError) {
                console.error(`Error sending reassignment notification for letter ${letterId}:`, notificationError);
            }
            return await this.findById(letterId, currentUserId);
        }
        catch (error) {
            if (transaction)
                await transaction.rollback();
            console.error(`Error reassigning step for letter ${letterId}:`, error);
            if (error instanceof errorHandler_1.AppError)
                throw error;
            throw new errorHandler_1.AppError(500, 'Failed to reassign review step.');
        }
    }
    static async finalApprove(letterId, userId, comment) {
        var _a;
        const transaction = await sequelize_2.sequelize.transaction();
        try {
            // Make sure to include all fields when fetching the letter, especially placements
            const letter = await letter_model_1.Letter.findByPk(letterId, {
                transaction,
                // No need for special include, placements are stored directly in the Letter model as a JSONB field
            });
            if (!letter)
                throw new errorHandler_1.AppError(404, `Letter not found: ${letterId}`);
            if (letter.workflowStatus !== letter_model_1.LetterWorkflowStatus.PENDING_APPROVAL) {
                throw new errorHandler_1.AppError(400, `Letter is not pending final approval. Current status: ${letter.workflowStatus}`);
            }
            if (letter.nextActionById !== userId) {
                throw new errorHandler_1.AppError(403, `Not authorized. Final approval required by user ${letter.nextActionById}.`);
            }
            const approverStep = await letter_reviewer_model_1.LetterReviewer.findOne({
                where: { letterId, userId, sequenceOrder: APPROVER_SEQUENCE },
                transaction
            });
            if (!approverStep) {
                throw new errorHandler_1.AppError(404, `Approver step not found for user ${userId}.`);
            }
            // --- PDF Manipulation ---
            if (!letter.signedPdfUrl)
                throw new errorHandler_1.AppError(500, 'Signed PDF URL is missing for final approval.');
            const pdfKey = letter.signedPdfUrl;
            const pdfBytes = await file_service_1.FileService.getFileBuffer(pdfKey);
            const pdfDoc = await pdf_lib_1.PDFDocument.load(pdfBytes);
            const pages = pdfDoc.getPages();
            // Generate Public Link & QR Code
            const publicLink = `${CLIENT_URL}/public/letters/${letter.id}`; // Example public link
            const qrCodeDataUrl = await qrcode_1.default.toDataURL(publicLink, { errorCorrectionLevel: 'M', margin: 2, scale: 4 });
            const qrCodeImageBytes = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
            const qrCodeImage = await pdfDoc.embedPng(qrCodeImageBytes);
            // Check if we have QR code placements defined
            const qrPlacements = ((_a = letter.placements) === null || _a === void 0 ? void 0 : _a.filter(p => p.type === 'qrcode')) || [];
            console.log(`Found ${qrPlacements.length} QR code placements for letter ${letterId}`);
            console.log(`Letter placements data:`, JSON.stringify(letter.placements || []));
            if (qrPlacements.length > 0) {
                // Place QR codes at each defined placement
                for (const placement of qrPlacements) {
                    // Page index is 0-based in PDF.js but 1-based in our data
                    const pageIndex = placement.pageNumber - 1;
                    if (pageIndex >= 0 && pageIndex < pages.length) {
                        const page = pages[pageIndex];
                        const { height: pageHeight } = page.getSize();
                        // Convert Y coordinate (PDF origin is bottom-left, our data uses top-left)
                        const adjustedY = pageHeight - placement.y - placement.height;
                        console.log(`Drawing QR code on page ${pageIndex + 1} at position (${placement.x}, ${adjustedY}), size: ${placement.width}x${placement.height}`);
                        // Draw QR code at the exact placement position with adjusted Y
                        page.drawImage(qrCodeImage, {
                            x: placement.x,
                            y: adjustedY,
                            width: placement.width,
                            height: placement.height
                        });
                    }
                    else {
                        console.warn(`QR code placement on invalid page ${placement.pageNumber} for letter ${letterId}`);
                    }
                }
            }
            else {
                // Fallback: If no placements defined, put QR on the last page (bottom-right)
                console.warn(`No QR code placements found for letter ${letterId}, using fallback position`);
                const lastPage = pages[pages.length - 1];
                const { width, height } = lastPage.getSize();
                const qrSize = 50;
                const margin = 20;
                lastPage.drawImage(qrCodeImage, {
                    x: width - qrSize - margin,
                    y: margin,
                    width: qrSize,
                    height: qrSize,
                });
            }
            // TODO: Embed final approver's signature/stamp if needed
            // Similar logic to createFromPdfInteractive, fetching signature/stamp URLs
            // const approver = await User.findByPk(userId);
            // if (approver.signatureUrl) { ... fetch and embed ... }
            const finalPdfBytes = await pdfDoc.save();
            const finalPdfKey = `approved-letters/letter-${letter.id}-final-${(0, uuid_1.v4)()}.pdf`;
            await file_service_1.FileService.uploadBuffer(Buffer.from(finalPdfBytes), finalPdfKey, 'application/pdf');
            // --- End PDF Manipulation ---
            await approverStep.update({ status: letter_reviewer_model_1.LetterReviewerStatus.APPROVED, actedAt: new Date() }, { transaction });
            await letter.update({
                workflowStatus: letter_model_1.LetterWorkflowStatus.APPROVED,
                currentStepIndex: 0,
                nextActionById: null,
                finalSignedPdfUrl: finalPdfKey,
                qrCodeUrl: qrCodeDataUrl, // Store Data URL or link to generated image
                publicLink: publicLink
            }, { transaction });
            await letter_action_log_model_1.LetterActionLog.create({
                letterId, userId, actionType: letter_action_log_model_1.LetterActionType.FINAL_APPROVE, comment
            }, { transaction });
            await activity_service_1.ActivityService.logActivity({
                userId, action: activity_model_1.ActivityType.APPROVE, resourceType: activity_model_1.ResourceType.LETTER,
                resourceId: letterId, resourceName: letter.name || 'Signed Letter',
                details: `Letter finally approved. ${comment ? `Comment: ${comment}` : ''}`,
                transaction
            });
            await transaction.commit();
            try {
                const submitter = await user_model_1.User.findByPk(letter.userId, { attributes: ['id', 'email'] });
                const approver = await user_model_1.User.findByPk(userId, { attributes: ['firstName', 'lastName'] });
                const approverName = approver ? `${approver.firstName || ''} ${approver.lastName || ''}`.trim() : 'Approver';
                if (submitter) {
                    await notification_service_1.NotificationService.createLetterFinalApprovedNotification(submitter.id, letterId, letter.name || 'Untitled Letter', approverName);
                }
            }
            catch (notificationError) {
                console.error(`Error sending final approval notification for letter ${letterId}:`, notificationError);
            }
            return await this.findById(letterId, userId);
        }
        catch (error) {
            if (transaction)
                await transaction.rollback();
            console.error(`Error during final approval for letter ${letterId}:`, error);
            if (error instanceof errorHandler_1.AppError)
                throw error;
            throw new errorHandler_1.AppError(500, 'Failed to finally approve letter.');
        }
    }
    static async finalReject(letterId, userId, reason) {
        const transaction = await sequelize_2.sequelize.transaction();
        try {
            const letter = await letter_model_1.Letter.findByPk(letterId, { transaction });
            if (!letter)
                throw new errorHandler_1.AppError(404, `Letter not found: ${letterId}`);
            if (letter.workflowStatus !== letter_model_1.LetterWorkflowStatus.PENDING_APPROVAL) {
                throw new errorHandler_1.AppError(400, `Letter is not pending final approval. Current status: ${letter.workflowStatus}`);
            }
            if (letter.nextActionById !== userId) {
                throw new errorHandler_1.AppError(403, `Not authorized. Final approval required by user ${letter.nextActionById}.`);
            }
            if (!reason || !reason.trim()) {
                throw new errorHandler_1.AppError(400, 'Rejection reason is required.');
            }
            const approverStep = await letter_reviewer_model_1.LetterReviewer.findOne({
                where: { letterId, userId, sequenceOrder: APPROVER_SEQUENCE },
                transaction
            });
            if (!approverStep) {
                throw new errorHandler_1.AppError(404, `Approver step not found for user ${userId}.`);
            }
            await approverStep.update({ status: letter_reviewer_model_1.LetterReviewerStatus.REJECTED, actedAt: new Date() }, { transaction });
            await letter.update({
                workflowStatus: letter_model_1.LetterWorkflowStatus.REJECTED,
                currentStepIndex: 0,
                nextActionById: null
            }, { transaction });
            await letter_action_log_model_1.LetterActionLog.create({
                letterId, userId, actionType: letter_action_log_model_1.LetterActionType.FINAL_REJECT, comment: reason
            }, { transaction });
            await activity_service_1.ActivityService.logActivity({
                userId, action: activity_model_1.ActivityType.REJECT, resourceType: activity_model_1.ResourceType.LETTER,
                resourceId: letterId, resourceName: letter.name || 'Signed Letter',
                details: `Letter finally rejected. Reason: ${reason}`,
                transaction
            });
            await transaction.commit();
            try {
                const submitter = await user_model_1.User.findByPk(letter.userId, { attributes: ['id', 'email', 'firstName', 'lastName'] });
                const approver = await user_model_1.User.findByPk(userId, { attributes: ['firstName', 'lastName'] });
                const approverName = approver ? `${approver.firstName || ''} ${approver.lastName || ''}`.trim() : 'Approver';
                if (submitter) {
                    await notification_service_1.NotificationService.createLetterFinalRejectedNotification(submitter.id, letterId, letter.name || 'Untitled Letter', reason, approverName);
                }
            }
            catch (notificationError) {
                console.error(`Error sending final rejection notification for letter ${letterId}:`, notificationError);
            }
            return await this.findById(letterId, userId);
        }
        catch (error) {
            if (transaction)
                await transaction.rollback();
            console.error(`Error during final rejection for letter ${letterId}:`, error);
            if (error instanceof errorHandler_1.AppError)
                throw error;
            throw new errorHandler_1.AppError(500, 'Failed to finally reject letter.');
        }
    }
    static async resubmitRejectedLetter(letterId, userId, newSignedFileId, comment) {
        const transaction = await sequelize_2.sequelize.transaction();
        try {
            const letter = await letter_model_1.Letter.findByPk(letterId, { transaction });
            if (!letter)
                throw new errorHandler_1.AppError(404, `Letter not found: ${letterId}`);
            // 1. Validation
            if (letter.workflowStatus !== letter_model_1.LetterWorkflowStatus.REJECTED) {
                throw new errorHandler_1.AppError(400, `Letter must be in rejected status to resubmit. Current status: ${letter.workflowStatus}`);
            }
            if (letter.userId !== userId) {
                throw new errorHandler_1.AppError(403, `Only the original submitter can resubmit the letter.`);
            }
            if (!comment || !comment.trim()) {
                throw new errorHandler_1.AppError(400, 'A comment explaining the changes is required for resubmission.');
            }
            // 2. Handle New File (if provided)
            let updateData = {};
            if (newSignedFileId) {
                console.log(`Resubmitting with new file ID: ${newSignedFileId}`);
                const newFile = await file_model_1.default.findByPk(newSignedFileId, { transaction });
                if (!newFile || !newFile.path) {
                    console.error(`New file record not found or path missing for ID: ${newSignedFileId}`);
                    throw new errorHandler_1.AppError(404, `New file record not found or path missing for ID: ${newSignedFileId}`);
                }
                // Update the 'signedPdfUrl' with the path of the *newly signed* PDF
                updateData.signedPdfUrl = newFile.path;
                // Mark the new file as allocated
                await newFile.update({ isAllocated: true }, { transaction });
                console.log(`Updated letter signedPdfUrl to: ${newFile.path} and marked file as allocated.`);
            }
            else {
                console.log('Resubmitting without a new file.');
                // Ensure signedPdfUrl is not accidentally cleared if no new file
                updateData.signedPdfUrl = letter.signedPdfUrl;
            }
            // 3. Find First Reviewer
            const firstReviewerStep = await letter_reviewer_model_1.LetterReviewer.findOne({
                where: { letterId },
                order: [['sequenceOrder', 'ASC']],
                transaction
            });
            if (!firstReviewerStep) {
                console.error(`Could not find the first reviewer for letter ${letterId}`);
                throw new errorHandler_1.AppError(500, 'Could not find the first reviewer for the workflow.');
            }
            console.log(`First reviewer found: User ${firstReviewerStep.userId} at step ${firstReviewerStep.sequenceOrder}`);
            // 4. Reset LetterReviewer statuses
            const [updatedRowCount] = await letter_reviewer_model_1.LetterReviewer.update({ status: letter_reviewer_model_1.LetterReviewerStatus.PENDING, actedAt: null, reassignedFromUserId: null }, { where: { letterId }, transaction });
            console.log(`Reset status for ${updatedRowCount} reviewers.`);
            // 5. Update Letter Status and Workflow Fields
            const nextStepIndex = firstReviewerStep.sequenceOrder; // Start from the first step
            await letter.update(Object.assign(Object.assign({}, updateData), { workflowStatus: letter_model_1.LetterWorkflowStatus.PENDING_REVIEW, currentStepIndex: nextStepIndex, nextActionById: firstReviewerStep.userId }), { transaction });
            console.log(`Letter status updated to PENDING_REVIEW, next action by ${firstReviewerStep.userId}`);
            // 6. Create Action Log
            await letter_action_log_model_1.LetterActionLog.create({
                letterId, userId, actionType: letter_action_log_model_1.LetterActionType.RESUBMIT, comment
            }, { transaction });
            console.log('Created RESUBMIT action log.');
            // 7. Log Activity
            await activity_service_1.ActivityService.logActivity({
                userId, action: activity_model_1.ActivityType.RESUBMIT, resourceType: activity_model_1.ResourceType.LETTER,
                resourceId: letterId, resourceName: letter.name || 'Signed Letter',
                details: `Letter resubmitted after rejection. Comment: ${comment}`,
                transaction
            });
            console.log('Logged RESUBMIT activity.');
            await transaction.commit();
            console.log('Transaction committed successfully.');
            // 8. Send Notifications (after commit)
            try {
                const firstReviewer = await user_model_1.User.findByPk(firstReviewerStep.userId, { attributes: ['id', 'email', 'firstName', 'lastName'] });
                const submitter = await user_model_1.User.findByPk(userId, { attributes: ['firstName', 'lastName', 'email'] });
                if (firstReviewer && submitter) {
                    const submitterName = `${submitter.firstName || ''} ${submitter.lastName || ''}`.trim() || submitter.email;
                    const reviewerName = `${firstReviewer.firstName || ''} ${firstReviewer.lastName || ''}`.trim() || firstReviewer.email;
                    const letterViewUrl = `${CLIENT_URL}/dashboard/Inbox/LetterReview/${letter.id}`;
                    console.log(`Attempting to send notifications to reviewer ${firstReviewer.id} (${firstReviewer.email})`);
                    if (firstReviewer.email) {
                        await email_service_1.EmailService.sendReviewRequestEmail(firstReviewer.email, reviewerName, submitterName, letter.name || `Letter ${letter.id.substring(0, 6)}`, letterViewUrl);
                        console.log('Sent review request email.');
                    }
                    await notification_service_1.NotificationService.createLetterReviewRequestNotification(firstReviewer.id, letterId, letter.name || `Letter ${letter.id.substring(0, 6)}`, submitterName);
                    console.log('Created review request notification.');
                }
                else {
                    console.warn(`Could not find user details for notification. Reviewer: ${!!firstReviewer}, Submitter: ${!!submitter}`);
                }
            }
            catch (notificationError) {
                console.error(`Error sending resubmission notification for letter ${letterId}:`, notificationError);
                // Do not fail the request if notification fails
            }
            // Return the updated letter, fetching it again to include associations
            return await this.findById(letterId, userId);
        }
        catch (error) {
            console.error(`Error in resubmitRejectedLetter service for letter ${letterId}:`, error);
            if (transaction)
                await transaction.rollback();
            if (error instanceof errorHandler_1.AppError)
                throw error;
            throw new errorHandler_1.AppError(500, 'Failed to resubmit letter.');
        }
    }
    static async getMyRejectedLetters(userId) {
        if (!userId) {
            throw new errorHandler_1.AppError(401, 'User ID is required.');
        }
        try {
            const letters = await letter_model_1.Letter.findAll({
                where: {
                    userId: userId,
                    workflowStatus: letter_model_1.LetterWorkflowStatus.REJECTED
                },
                include: [
                    {
                        model: user_model_1.User,
                        as: 'user',
                        attributes: ['id', 'firstName', 'lastName', 'email'],
                    },
                    {
                        model: letter_action_log_model_1.LetterActionLog,
                        as: 'letterActionLogs',
                        attributes: ['comment', 'createdAt'],
                        where: {
                            actionType: {
                                [sequelize_1.Op.or]: [letter_action_log_model_1.LetterActionType.REJECT_REVIEW, letter_action_log_model_1.LetterActionType.FINAL_REJECT]
                            }
                        },
                        order: [['createdAt', 'DESC']],
                        limit: 1,
                        required: false
                    },
                    { model: template_model_1.default, as: 'template', attributes: ['id', 'name'], required: false },
                ],
                order: [['updatedAt', 'DESC']],
            });
            return letters;
        }
        catch (error) {
            console.error(`Error getting rejected letters for user ${userId}:`, error);
            throw new errorHandler_1.AppError(500, 'Could not retrieve rejected letters.');
        }
    }
}
exports.LetterService = LetterService;
