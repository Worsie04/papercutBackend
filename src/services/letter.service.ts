import { PDFDocument, PDFImage, rgb, StandardFonts } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { Transaction, Op } from 'sequelize';
import QRCode from 'qrcode';
import puppeteer from 'puppeteer';

import { Letter, LetterFormData, LetterCreationAttributes, LetterWorkflowStatus, LetterAttributes } from '../models/letter.model';
import Template from '../models/template.model';
import { User } from '../models/user.model';
import { AppError } from '../presentation/middlewares/errorHandler';
import File from '../models/file.model';
import { FileService } from './file.service';
import { LetterReviewer, LetterReviewerStatus } from '../models/letter-reviewer.model';
import { LetterActionLog, LetterActionType } from '../models/letter-action-log.model';
import { sequelize } from '../infrastructure/database/sequelize';

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import TemplateReviewer from '../models/template-reviewer.model';
import { EmailService } from './email.service';
import { NotificationService } from './notification.service';

import { ActivityService } from './activity.service';
import { ActivityType, ResourceType } from '../models/activity.model';
import { TemplateReviewerService } from './template-reviewer.service';

const s3Client = new S3Client({
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


interface CreateLetterData {
  templateId: string;
  userId: string;
  formData: Omit<LetterFormData, 'logoUrl' | 'signatureUrl' | 'stampUrl'>;
  name?: string | null;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  stampUrl?: string | null;
}

interface PlacementInfo {
  type: 'signature' | 'stamp';
  url: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PlacementInfoFinal {
    type: 'signature' | 'stamp' | 'qrcode';
    url: string;
    pageNumber: number;
    x: number;
    y: number;
    width: number;
    height: number;
    xPct?: number;
    yPct?: number;
    widthPct?: number;
    heightPct?: number;
  }
interface CreateFromPdfData {
  originalFileId: string;
  placements: PlacementInfo[];
  userId: string;
  reviewers: string[];
  approver?: string | null;
  name?: string | null;
}


export class LetterService {

    static async create(data: CreateLetterData): Promise<Letter> {
        const { templateId, userId: submitterId, formData, name, logoUrl, signatureUrl, stampUrl } = data;
      
        if (!templateId) {
          throw new AppError(400, 'Template ID is required when creating a letter from a template.');
        }
        if (!submitterId || !formData) {
          throw new AppError(400, 'Missing required data: userId and formData are required.');
        }
      
        const transaction = await sequelize.transaction();
        let newLetter: Letter | null = null;
      
        try {
          // 1. Fetch Template and Owner (Approver)
          const template = await Template.findByPk(templateId, {
            include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }],
            transaction,
          });
          if (!template) {
            throw new AppError(404, `Template with ID ${templateId} not found.`);
          }
          const approverId = template.userId;

          if (!approverId) {
            throw new AppError(500, `Template owner user not found for template ID ${templateId}.`);
          }
      
          // 2. Fetch Reviewers from TemplateReviewers table
          const templateReviewers = await TemplateReviewerService.getReviewersForTemplate(templateId);
          const reviewerUserIds = templateReviewers
            .map(reviewer => reviewer.id)
            .filter(id => id !== submitterId && id !== approverId);
      
          // 3. Validate Submitter exists
          const submitter = await User.findByPk(submitterId, { attributes: ['id', 'firstName', 'lastName', 'email'], transaction });
          if (!submitter) {
            throw new AppError(404, `Submitter user with ID ${submitterId} not found.`);
          }
      
          // Determine initial status and next action
          let initialStatus: LetterWorkflowStatus;
          let nextStepIndex: number | null = null;
          let nextActionById: string | null = null;
          const workflowParticipants: { userId: string; sequenceOrder: number }[] = [];
      
          if (reviewerUserIds && reviewerUserIds.length > 0) {
            initialStatus = LetterWorkflowStatus.PENDING_REVIEW;
            reviewerUserIds.forEach((reviewerId, index) => {
              workflowParticipants.push({ userId: reviewerId, sequenceOrder: index + 1 });
            });
            nextStepIndex = 1;
            nextActionById = workflowParticipants[0].userId;
          } else {
            initialStatus = LetterWorkflowStatus.PENDING_APPROVAL;
            nextActionById = approverId;
          }
      
          if (approverId) {
            if (!workflowParticipants.some(p => p.userId === approverId)) {
              workflowParticipants.push({ userId: approverId, sequenceOrder: APPROVER_SEQUENCE });
            }
          } else {
            if (workflowParticipants.length === 0) {
              initialStatus = LetterWorkflowStatus.APPROVED;
              nextStepIndex = null;
              nextActionById = null;
            } else {
              throw new AppError(500, 'Template has reviewers but no designated approver (owner).');
            }
          }
      
          workflowParticipants.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      
          // 4. Create the Letter record
          newLetter = await Letter.create({
            templateId,
            userId: submitterId,
            formData, // FormData düzgün şəkildə saxlanılır
            name: name ?? template.name ?? `Letter from ${template.id.substring(0, 6)}`,
            logoUrl: logoUrl ?? null,
            signatureUrl: signatureUrl ?? null,
            stampUrl: stampUrl ?? null,
            workflowStatus: initialStatus,
            currentStepIndex: nextStepIndex,
            nextActionById: nextActionById,
            originalPdfFileId: null,
            signedPdfUrl: null,
            qrCodeUrl: null,
            publicLink: null,
            finalSignedPdfUrl: null,
            placements: null, // Əgər placements istifadə olunmursa, null olaraq qalır
          }, { transaction });
      
          // 5. Create LetterReviewer entries for all participants
          const reviewerEntries = workflowParticipants.map(p => ({
            letterId: newLetter!.id,
            userId: p.userId,
            sequenceOrder: p.sequenceOrder,
            status: LetterReviewerStatus.PENDING,
          }));
          await LetterReviewer.bulkCreate(reviewerEntries, { transaction });
      
          // 6. Log the Submission action
          await LetterActionLog.create({
            letterId: newLetter.id,
            userId: submitterId,
            actionType: LetterActionType.SUBMIT,
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
          await ActivityService.logActivity({
            userId: submitterId,
            action: ActivityType.SUBMIT,
            resourceType: ResourceType.LETTER,
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
              const nextActionUser = await User.findByPk(nextActionById, { attributes: ['id', 'email', 'firstName', 'lastName'] });
              if (nextActionUser) {
                const nextActionUserName = `${nextActionUser.firstName || ''} ${nextActionUser.lastName || ''}`.trim() || nextActionUser.email;
                if (nextActionUser.email) {
                  await EmailService.sendReviewRequestEmail(
                    nextActionUser.email,
                    nextActionUserName,
                    submitterName,
                    newLetter.name || `Letter ${newLetter.id.substring(0, 6)}`,
                    letterViewUrl,
                  );
                }
                await NotificationService.createLetterReviewRequestNotification(
                  nextActionUser.id,
                  newLetter.id,
                  newLetter.name || `Letter ${newLetter.id.substring(0, 6)}`,
                  submitterName,
                );
              }
            } else if (initialStatus === LetterWorkflowStatus.APPROVED) {
              const finalViewUrl = `${CLIENT_URL}/dashboard/MyStaff/LetterView/${newLetter.id}`;
              if (submitter.email) {
                await EmailService.sendLetterApprovedEmail(
                  submitter.email,
                  submitterName,
                  newLetter.name || `Letter ${newLetter.id.substring(0, 6)}`,
                  'System (Auto-Approved)',
                  finalViewUrl,
                );
              }
              await NotificationService.createLetterFinalApprovedNotification(
                submitter.id,
                newLetter.id,
                newLetter.name || `Letter ${newLetter.id.substring(0, 6)}`,
                'System (Auto-Approved)',
              );
            }
          } catch (notificationError) {
            console.error(`Error sending initial workflow notification for letter ${newLetter.id}:`, notificationError);
          }
      
          const finalLetter = await this.findById(newLetter.id, submitterId);
          if (!finalLetter) {
            throw new AppError(500, 'Failed to retrieve the newly created letter after workflow initiation.');
          }
      
          return finalLetter;
        } catch (error) {
          if (transaction) {
            try {
              await transaction.rollback();
              console.log(`Transaction rolled back for letter creation.`);
            } catch (rbError) {
              console.error('Error during transaction rollback:', rbError);
            }
          }
          console.error('Error initiating template letter workflow in service:', error);
          if (error instanceof AppError) throw error;
          throw new AppError(500, `Failed to create letter and initiate workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
  static async getLettersPendingReview(userId: string): Promise<Letter[]> {
     if (!userId) { throw new AppError(401, 'User ID is required.'); }
     try {
         const lettersToReview = await Letter.findAll({
             where: {
                 workflowStatus: LetterWorkflowStatus.PENDING_REVIEW,
                 nextActionById: userId
             },
             include: [
                 { model: Template, as: 'template', attributes: ['id', 'name'], required: false },
                 { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'], },
             ],
             order: [['createdAt', 'ASC']],
         });
         return lettersToReview;
     } catch (error) { console.error(`Error getting letters pending review for user ${userId}:`, error); throw new AppError(500, 'Could not retrieve letters pending review.'); }
  }

  static async getLettersPendingMyAction(userId: string): Promise<Letter[]> {
    try {
        const letters = await Letter.findAll({
            where: {
                nextActionById: userId, // Letters assigned to this user
                workflowStatus: {
                    // Where status is either PENDING_REVIEW or PENDING_APPROVAL
                    [Op.or]: [
                        LetterWorkflowStatus.PENDING_REVIEW,
                        LetterWorkflowStatus.PENDING_APPROVAL
                    ]
                }
            },
            include: [
                {
                    model: User,
                    as: 'user', // Include the original submitter info
                    attributes: ['id', 'firstName', 'lastName', 'email'] // Specify needed fields
                },
                // Optionally include last action log or template info if needed for display
                // { model: Template, as: 'template', attributes: ['id', 'name'] },
                // { model: LetterActionLog, as: 'letterActionLogs', limit: 1, order: [['createdAt', 'DESC']] }
            ],
            order: [['createdAt', 'DESC']] // Order by creation date, newest first
        });
        return letters;
    } catch (error) {
        console.error(`Error fetching letters pending action for user ${userId}:`, error);
        // Don't throw AppError here directly unless it's a specific known issue,
        // let the controller handle generic errors.
        throw new Error('Failed to retrieve letters pending your action.');
    }
}

static async finalApproveLetter(letterId: string, userId: string, placements: PlacementInfoFinal[], comment?: string): Promise<Letter> {
    if (!R2_PUB_URL) {
        throw new AppError(500, 'Server configuration error: R2 public URL is missing.');
    }

    const transaction = await sequelize.transaction();
    try {
        const letter = await Letter.findByPk(letterId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!letter) {
            await transaction.rollback();
            throw new AppError(404, `Letter not found: ${letterId}`);
        }

        if (letter.workflowStatus !== LetterWorkflowStatus.PENDING_APPROVAL) {
            await transaction.rollback();
            throw new AppError(400, `Letter must be in pending_approval status. Current status: ${letter.workflowStatus}`);
        }
        if (letter.nextActionById !== userId) {
            await transaction.rollback();
            throw new AppError(403, `User ${userId} is not the designated approver for this letter.`);
        }

        if (!letter.signedPdfUrl) {
            await transaction.rollback();
            throw new AppError(400, 'Cannot finalize approval: Intermediate PDF (with signatures/stamps) is missing.');
        }

        const intermediatePdfKey = letter.signedPdfUrl;
        const existingPdfBytes = await FileService.getFileBuffer(intermediatePdfKey);
        if (!existingPdfBytes || existingPdfBytes.length === 0) {
            await transaction.rollback();
            throw new AppError(500, 'Fetched intermediate PDF buffer is empty.');
        }
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
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

                let imageBytes: Buffer | null = null;
                try {
                    if (item.url.startsWith('http')) {
                        const response = await axios.get(item.url, { responseType: 'arraybuffer' });
                        imageBytes = Buffer.from(response.data);
                    } else {
                        imageBytes = await FileService.getFileBuffer(item.url);
                    }
                } catch (fetchError: any) {
                    console.warn(`Skipping image placement for ${item.type} due to fetch error from ${item.url}: ${fetchError.message}`);
                    continue;
                }

                if (!imageBytes) continue;

                let pdfImage: PDFImage | null = null;
                try {
                    if (item.url.toLowerCase().endsWith('.png')) {
                        pdfImage = await pdfDoc.embedPng(imageBytes);
                    } else if (item.url.toLowerCase().endsWith('.jpg') || item.url.toLowerCase().endsWith('.jpeg')) {
                        pdfImage = await pdfDoc.embedJpg(imageBytes);
                    } else {
                        try { pdfImage = await pdfDoc.embedPng(imageBytes); }
                        catch (e) {
                            try { pdfImage = await pdfDoc.embedJpg(imageBytes); }
                            catch (e2) { console.warn(`Skipping placement: Unsupported image type for ${item.type} URL ${item.url}`); continue; }
                        }
                    }
                } catch (embedError: any) {
                    console.error(`Failed to embed image ${item.url} for ${item.type}: ${embedError.message}`);
                    continue;
                }

                if (!pdfImage) continue;
                const page = pages[item.pageNumber - 1];
                const { height: pageHeight } = page.getSize();
                const pdfY = pageHeight - item.y - item.height;
                try {
                    page.drawImage(pdfImage, { x: item.x, y: pdfY, width: item.width, height: item.height });
                } catch (drawError: any) {
                    console.error(`Failed to draw ${item.type} ${item.url} on page ${item.pageNumber}: ${drawError.message}`);
                }
            }
        }

        // Embed QR code
        const finalPdfKeyForQr = `final-letters/letter-${letter.id}-final-approved.pdf`;
        const finalPdfPublicUrl = `https://${R2_PUB_URL}/${finalPdfKeyForQr}`;
        const qrCodeBuffer = await QRCode.toBuffer(finalPdfPublicUrl, {
            errorCorrectionLevel: 'H', type: 'png', margin: 1, color: { dark: '#000000', light: '#FFFFFF' },
        });
        const qrImageEmbed = await pdfDoc.embedPng(qrCodeBuffer);

        const qrPlacements = letter.placements?.filter(p => p.type === 'qrcode');
        console.log(`Found ${qrPlacements?.length || 0} QR code placements for letter ${letterId}`);

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
        } else {
            console.warn(`No QR code placeholder found for letter ${letterId}. Placing QR at default position (last page, bottom-right).`);
            const lastPage = pages[pages.length - 1];
            const { width, height } = lastPage.getSize();
            const qrSize = 50; const margin = 20;
            lastPage.drawImage(qrImageEmbed, { x: width - qrSize - margin, y: margin, width: qrSize, height: qrSize });
        }

        const finalPdfBytesWithQr = await pdfDoc.save();
        await FileService.uploadBuffer(Buffer.from(finalPdfBytesWithQr), finalPdfKeyForQr, 'application/pdf');

        const qrCodeImageFileName = `qr-images/letter-${letter.id}-qr.png`;
        const uploadedQrImageR2 = await FileService.uploadBuffer(qrCodeBuffer, qrCodeImageFileName, 'image/png');
        const qrCodeImageUrl = uploadedQrImageR2?.url;

        await letter.update({
            workflowStatus: LetterWorkflowStatus.APPROVED,
            nextActionById: null,
            currentStepIndex: null,
            finalSignedPdfUrl: finalPdfKeyForQr,
            publicLink: finalPdfPublicUrl,
            qrCodeUrl: qrCodeImageUrl,
        }, { transaction });

        await LetterActionLog.create({
            letterId,
            userId,
            actionType: LetterActionType.FINAL_APPROVE,
            comment: comment || 'Letter finally approved.',
        }, { transaction });

        await ActivityService.logActivity({
            userId,
            action: ActivityType.APPROVE,
            resourceType: ResourceType.LETTER,
            resourceId: letterId,
            resourceName: letter.name || `Letter ${letter.id.substring(0,6)}`,
            details: `Letter finally approved. ${comment ? `Comment: ${comment}` : ''}`,
            transaction
        });

        await transaction.commit();

        try {
            const submitter = await User.findByPk(letter.userId, { attributes: ['id', 'email', 'firstName', 'lastName'] });
            const approver = await User.findByPk(userId, { attributes: ['firstName', 'lastName', 'email'] });
            if (submitter && approver) {
                const approverName = `${approver.firstName || ''} ${approver.lastName || ''}`.trim() || approver.email;
                const letterName = letter.name || `Letter ${letter.id.substring(0,6)}`;
                const letterViewUrl = `${CLIENT_URL}/dashboard/MyStaff/LetterView/${letter.id}`;
                if (submitter.email) {
                    await EmailService.sendLetterApprovedEmail(submitter.email, submitter.firstName || 'User', letterName, approverName, letterViewUrl);
                }
                await NotificationService.createLetterFinalApprovedNotification(submitter.id, letterId, letterName, approverName);
            }
        } catch (notificationError) {
            console.error(`Error sending final approval notification for letter ${letterId}:`, notificationError);
        }

        const letterForReturn = await Letter.findByPk(letterId, {
            include: [
                { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: LetterReviewer, as: 'letterReviewers', include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatar'] }], order: [['sequenceOrder', 'ASC']]},
                { model: LetterActionLog, as: 'letterActionLogs', include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatar'] }], order: [['createdAt', 'DESC']] }
            ]
        });

        if (!letterForReturn) {
            throw new AppError(500, `Failed to refetch letter ${letterId} after final approval.`);
        }
        return letterForReturn;

    } catch (error) {
        console.error(`Error in finalApproveLetter service for letter ${letterId}:`, error);
        if (transaction) {
            try { await transaction.rollback(); } catch (rbError: any) {
                if (!String(rbError.message).includes('commit') && !String(rbError.message).includes('rollback')) {
                    console.error(`Error attempting to rollback transaction for letter ${letterId}:`, rbError);
                }
            }
        }
        if (error instanceof AppError) throw error;
        throw new AppError(500, `Failed to finally approve letter: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}


static async convertHtmlToPdf(htmlContent: string): Promise<Buffer> {
    try {
      // Puppeteer'i import et - eğer yoksa
      const puppeteer = require('puppeteer');
      
      console.log("Starting HTML to PDF conversion");
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: 'new'
      });
      
      console.log("Browser launched");
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      console.log("Converting to PDF");
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
      });
      
      await browser.close();
      console.log(`PDF created successfully, size: ${pdfBuffer.length} bytes`);
      return pdfBuffer;
    } catch (error) {
      console.error('HTML to PDF conversion error:', error);
      throw new Error(`HTML to PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  static async finalApproveLetterSingle(letterId: string, userId: string, placements: PlacementInfoFinal[], comment?: string): Promise<Letter> {
      if (!R2_PUB_URL) {
          throw new AppError(500, 'Server configuration error: R2 public URL is missing.');
      }
  
      const transaction = await sequelize.transaction();
      try {
          // 1. Find letter without lock on joins
          const letter = await Letter.findByPk(letterId, {
              transaction,
              // lock kaldırıldı
              include: [
                  { model: Template, as: 'template', attributes: ['id', 'name', 'content'] }
              ]
          });
  
          if (!letter) {
              await transaction.rollback();
              throw new AppError(404, `Letter not found: ${letterId}`);
          }
  
          // 2. Validate letter status and permissions
          if (letter.workflowStatus !== LetterWorkflowStatus.PENDING_APPROVAL) {
              await transaction.rollback();
              throw new AppError(400, `Letter must be in pending_approval status. Current status: ${letter.workflowStatus}`);
          }
          if (letter.nextActionById !== userId) {
              await transaction.rollback();
              throw new AppError(403, `User ${userId} is not the designated approver for this letter.`);
          }
          if (!letter.template || !letter.template.content) {
              await transaction.rollback();
              throw new AppError(400, 'Cannot finalize approval: Template content is missing.');
          }
  
          // 3. Generate HTML content from template and form data
          const templateContent = letter.template.content;
          let htmlContent = templateContent;
          if (letter.formData) {
              // Replace placeholders with form data values
              htmlContent = templateContent.replace(/#([a-zA-Z0-9-]+)#/g, (match, p1) => {
                  return letter.formData?.[p1] ?? '';
              });
          }

          console.log(`Converting HTML to PDF for letter ${letterId}`);
  
          // 4. Convert HTML to PDF
          const pdfBuffer = await LetterService.convertHtmlToPdf(htmlContent);
          console.log(`PDF buffer created, size: ${pdfBuffer?.length || 0} bytes`);
        
          if (!pdfBuffer || pdfBuffer.length === 0) {
            throw new AppError(500, "Failed to generate PDF from HTML - empty buffer returned");
        }
        
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        console.log(`PDF document loaded successfully`);
        
        const pages = pdfDoc.getPages();
        console.log(`PDF has ${pages.length} pages`);
        
        if (!pages || pages.length === 0) {
            throw new AppError(500, "PDF document has no pages");
        }
  
          // 5. Embed signatures and stamps from placements
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
  
                  let imageBytes: Buffer | null = null;
                  try {
                      if (item.url.startsWith('http')) {
                          const response = await axios.get(item.url, { responseType: 'arraybuffer' });
                          imageBytes = Buffer.from(response.data);
                      } else {
                          imageBytes = await FileService.getFileBuffer(item.url);
                      }
                  } catch (fetchError: any) {
                      console.warn(`Skipping image placement for ${item.type} due to fetch error from ${item.url}: ${fetchError.message}`);
                      continue;
                  }
  
                  if (!imageBytes) continue;
  
                  let pdfImage: PDFImage | null = null;
                  try {
                      if (item.url.toLowerCase().endsWith('.png')) {
                          pdfImage = await pdfDoc.embedPng(imageBytes);
                      } else if (item.url.toLowerCase().endsWith('.jpg') || item.url.toLowerCase().endsWith('.jpeg')) {
                          pdfImage = await pdfDoc.embedJpg(imageBytes);
                      } else {
                          try { pdfImage = await pdfDoc.embedPng(imageBytes); }
                          catch (e) {
                              try { pdfImage = await pdfDoc.embedJpg(imageBytes); }
                              catch (e2) { console.warn(`Skipping placement: Unsupported image type for ${item.type} URL ${item.url}`); continue; }
                          }
                      }
                  } catch (embedError: any) {
                      console.error(`Failed to embed image ${item.url} for ${item.type}: ${embedError.message}`);
                      continue;
                  }
  
                  if (!pdfImage) continue;
                  const page = pages[item.pageNumber - 1];
                  const { height: pageHeight } = page.getSize();
                  
                  // Handle both absolute and percentage-based positioning
                  let x = item.x;
                  let y = item.y;
                  let width = item.width;
                  let height = item.height;
                  
                  if (item.xPct !== undefined && item.yPct !== undefined && 
                      item.widthPct !== undefined && item.heightPct !== undefined) {
                      const { width: pageWidth } = page.getSize();
                      x = item.xPct * pageWidth;
                      y = item.yPct * pageHeight;
                      width = item.widthPct * pageWidth;
                      height = item.heightPct * pageHeight;
                  }
                  
                  // Convert Y coordinate from top-left to bottom-left origin
                  const pdfY = pageHeight - y - height;
                  
                  try {
                      page.drawImage(pdfImage, { 
                          x: x, 
                          y: pdfY, 
                          width: width, 
                          height: height 
                      });
                  } catch (drawError: any) {
                      console.error(`Failed to draw ${item.type} ${item.url} on page ${item.pageNumber}: ${drawError.message}`);
                  }
              }
          }
  
          // 6. Generate and embed QR code
          const finalPdfKey = `final-letters/letter-${letter.id}-final-approved.pdf`;
          const finalPdfPublicUrl = `https://${R2_PUB_URL}/${finalPdfKey}`;
          const qrCodeBuffer = await QRCode.toBuffer(finalPdfPublicUrl, {
              errorCorrectionLevel: 'H', 
              type: 'png', 
              margin: 1, 
              color: { dark: '#000000', light: '#FFFFFF' },
          });
          const qrImageEmbed = await pdfDoc.embedPng(qrCodeBuffer);
  
          // 7. Place QR code
          const qrPlacements = placements.filter(p => p.type === 'qrcode');
          console.log(`Found ${qrPlacements.length} QR code placements for letter ${letterId}`);
  
            if (qrPlacements.length > 0) {
                for (const qrPlace of qrPlacements) {
                    // Koordinat verilerini kontrol et
                    if (typeof qrPlace.x === 'undefined' || typeof qrPlace.y === 'undefined' || 
                        typeof qrPlace.width === 'undefined' || typeof qrPlace.height === 'undefined') {
                        console.warn(`QR placement missing coordinates, using default position instead`);
                        continue;
                    }
            
                    if (qrPlace.pageNumber < 1 || qrPlace.pageNumber > pages.length) {
                        console.warn(`QR placeholder on invalid page ${qrPlace.pageNumber} for letter ${letter.id}, skipping.`);
                        continue;
                    }
                    
                    const page = pages[qrPlace.pageNumber - 1];
                    if (!page) {
                        console.warn(`Page ${qrPlace.pageNumber} is undefined`);
                        continue;
                    }
                    
                    const pageSize = page.getSize();
                    const { height: pageHeight, width: pageWidth } = pageSize;
                  
                  // Handle both absolute and percentage-based positioning
                  let x = qrPlace.x;
                  let y = qrPlace.y;
                  let width = qrPlace.width;
                  let height = qrPlace.height;
                  
                  if (qrPlace.xPct !== undefined && qrPlace.yPct !== undefined && 
                      qrPlace.widthPct !== undefined && qrPlace.heightPct !== undefined) {
                      x = qrPlace.xPct * pageWidth;
                      y = qrPlace.yPct * pageHeight;
                      width = qrPlace.widthPct * pageWidth;
                      height = qrPlace.heightPct * pageHeight;
                  }
                  
                  // Convert Y coordinate from top-left to bottom-left origin
                  const qrY = pageHeight - y - height;
                  
                  console.log(`Embedding QR code on page ${qrPlace.pageNumber} at coordinates: (${x}, ${qrY}), size: ${width}x${height}`);
                  
                  page.drawImage(qrImageEmbed, {
                      x: x,
                      y: qrY,
                      width: width,
                      height: height,
                  });
              }
          } else {
              console.warn(`No QR code placeholder found for letter ${letterId}. Placing QR at default position (last page, bottom-right).`);
              const lastPage = pages[pages.length - 1];
              const { width, height } = lastPage.getSize();
              const qrSize = 50; 
              const margin = 20;
              lastPage.drawImage(qrImageEmbed, { 
                  x: width - qrSize - margin, 
                  y: margin, 
                  width: qrSize, 
                  height: qrSize 
              });
          }
  
          // 8. Save final PDF and QR image
          const finalPdfBytes = await pdfDoc.save();
          await FileService.uploadBuffer(Buffer.from(finalPdfBytes), finalPdfKey, 'application/pdf');
  
          const qrCodeImageFileName = `qr-images/letter-${letter.id}-qr.png`;
          const uploadedQrImageR2 = await FileService.uploadBuffer(qrCodeBuffer, qrCodeImageFileName, 'image/png');
          const qrCodeImageUrl = uploadedQrImageR2?.url;
  
          // 9. Update letter record
          await letter.update({
              workflowStatus: LetterWorkflowStatus.APPROVED,
              nextActionById: null,
              currentStepIndex: null,
              finalSignedPdfUrl: finalPdfKey,
              publicLink: finalPdfPublicUrl,
              qrCodeUrl: qrCodeImageUrl,
              placements: placements, // Save placements for future reference
          }, { transaction });
  
          // 10. Add action log
          await LetterActionLog.create({
              letterId,
              userId,
              actionType: LetterActionType.FINAL_APPROVE,
              comment: comment || 'Letter finally approved.',
          }, { transaction });
  
          // 11. Log activity
          await ActivityService.logActivity({
              userId,
              action: ActivityType.APPROVE,
              resourceType: ResourceType.LETTER,
              resourceId: letterId,
              resourceName: letter.name || `Letter ${letter.id.substring(0, 6)}`,
              details: `Letter finally approved. ${comment ? `Comment: ${comment}` : ''}`,
              transaction
          });
  
          // 12. Commit transaction
          await transaction.commit();
  
          // 13. Send notifications (after transaction commit)
          try {
              const submitter = await User.findByPk(letter.userId, { attributes: ['id', 'email', 'firstName', 'lastName'] });
              const approver = await User.findByPk(userId, { attributes: ['firstName', 'lastName', 'email'] });
              
              if (submitter && approver) {
                  const approverName = `${approver.firstName || ''} ${approver.lastName || ''}`.trim() || approver.email;
                  const letterName = letter.name || `Letter ${letter.id.substring(0, 6)}`;
                  const letterViewUrl = `${CLIENT_URL}/dashboard/MyStaff/LetterView/${letter.id}`;
                  
                  if (submitter.email) {
                      await EmailService.sendLetterApprovedEmail(
                          submitter.email,
                          submitter.firstName || 'User',
                          letterName,
                          approverName,
                          letterViewUrl
                      );
                  }
                  
                  await NotificationService.createLetterFinalApprovedNotification(
                      submitter.id,
                      letterId,
                      letterName,
                      approverName
                  );
              }
          } catch (notificationError) {
              console.error(`Error sending final approval notification for letter ${letterId}:`, notificationError);
          }
  
          // 14. Return updated letter
          const result = await Letter.findByPk(letterId, {
              include: [
                  { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
                  { model: LetterReviewer, as: 'letterReviewers', include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatar'] }], order: [['sequenceOrder', 'ASC']] },
                  { model: LetterActionLog, as: 'letterActionLogs', include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatar'] }], order: [['createdAt', 'DESC']] }
              ]
          });
          
          if (!result) {
              throw new AppError(404, `Letter with ID ${letterId} not found after final approval.`);
          }
          
          return result;
  
      } catch (error) {
          console.error(`Error in finalApproveLetterSingle for letter ${letterId}:`, error);
          
          if (transaction) {
              try { 
                  await transaction.rollback(); 
                  console.log(`Transaction rolled back for letter ${letterId} due to error.`);
              } catch (rbError: any) {
                  console.error(`Error rolling back transaction for letter ${letterId}:`, rbError);
              }
          }
          
          if (error instanceof AppError) throw error;
          throw new AppError(500, `Failed to finally approve template letter: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
  }

  static async getAllByUserId(userId: string): Promise<Letter[]> {
     if (!userId) { throw new AppError(401,'User ID is required.'); }
     try {
       const letters = await Letter.findAll({
         where: { userId },
         include: [ { model: Template, as: 'template', attributes: ['id', 'name'], required: false }, ],
         attributes: ['id', 'name', 'templateId', 'userId', 'logoUrl', 'signatureUrl', 'stampUrl', 'signedPdfUrl', 'workflowStatus', 'createdAt', 'updatedAt'],
         order: [['createdAt', 'DESC']],
       });
       return letters;
     } catch (error) { console.error(`Error getting letters for user ${userId}:`, error); throw error; }
  }

  static async findById(id: string, requestingUserId: string): Promise<Letter> {
    if (!id || !requestingUserId) {
      throw new AppError(400, 'Letter ID and Requesting User ID are required.');
    }
    try {
      const letter = await Letter.findOne({
        where: { id },
        include: [
          { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: Template, as: 'template', attributes: ['id', 'name', 'content'], required: false }, // content sahəsini əlavə edin
          { model: LetterReviewer, as: 'letterReviewers', include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatar'] }] },
          { model: LetterActionLog, as: 'letterActionLogs', include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatar'] }], order: [['createdAt', 'DESC']] },
        ],
      });
      if (!letter) {
        throw new AppError(404, `Letter with ID ${id} not found.`);
      }
      const isCreator = letter.userId === requestingUserId;
      let isReviewer = false;
      const letterReviewerEntry = await LetterReviewer.findOne({ where: { letterId: id, userId: requestingUserId } });
      isReviewer = !!letterReviewerEntry;
  
      const isAdmin = false;
      if (!isCreator && !isReviewer && !isAdmin && letter.workflowStatus !== LetterWorkflowStatus.APPROVED) {
        throw new AppError(403, `Access Denied. You are not authorized to view this letter.`);
      }
      return letter;
    } catch (error) {
      console.error(`Error finding letter with ID ${id} for user ${requestingUserId}:`, error);
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Could not retrieve letter due to an internal error.');
    }
  }

  static async delete(id: string, userId: string): Promise<boolean> {
     if (!id || !userId) { throw new AppError(401,'Letter ID and User ID are required.'); }
     try {
        const letterToDelete = await Letter.findOne({ where: { id, userId }});
        if (!letterToDelete) { throw new AppError(404, `Letter with ID ${id} not found or access denied.`); }
        // Add cascading delete logic or handle related records (reviewers, logs) if needed
        await LetterActionLog.destroy({ where: { letterId: id } });
        await LetterReviewer.destroy({ where: { letterId: id } });
        const affectedRows = await Letter.destroy({ where: { id, userId } });
       return true;
     } catch (error) { console.error(`Error deleting letter with ID ${id} for user ${userId}:`, error); if (error instanceof AppError) throw error; throw new AppError(500, 'Could not delete letter.'); }
  }

  static async createFromPdfInteractive(data: CreateFromPdfData): Promise<Letter> {
    const { originalFileId, placements, userId, reviewers, approver, name } = data;
    let transaction: Transaction | null = null;

    if (!reviewers || reviewers.length === 0) {
        throw new AppError(400, 'At least one reviewer must be specified.');
    }

    try {
        transaction = await sequelize.transaction();

        const originalFileRecord = await File.findByPk(originalFileId, { transaction });
        if (!originalFileRecord || !originalFileRecord.path) {
            throw new AppError(404, `Original PDF file record not found or path missing for ID: ${originalFileId}`);
        }
        const originalPdfKey = originalFileRecord.path;
        const originalPdfBytes = await FileService.getFileBuffer(originalPdfKey);
        const pdfDoc = await PDFDocument.load(originalPdfBytes);
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

                let imageBytes: Buffer | null = null;
                try {
                    if (item.url.startsWith('http')) {
                        const response = await axios.get(item.url, { responseType: 'arraybuffer' });
                        imageBytes = Buffer.from(response.data);
                    } else {
                         imageBytes = await FileService.getFileBuffer(item.url);
                    }
                } catch (fetchError: any) {
                    console.warn(`Skipping image placement for ${item.type} due to fetch error from ${item.url}: ${fetchError.message}`);
                    continue;
                }

                if (!imageBytes) continue;

                let pdfImage: PDFImage | null = null;
                try {
                    if (item.url.toLowerCase().endsWith('.png')) {
                         pdfImage = await pdfDoc.embedPng(imageBytes);
                    } else if (item.url.toLowerCase().endsWith('.jpg') || item.url.toLowerCase().endsWith('.jpeg')) {
                         pdfImage = await pdfDoc.embedJpg(imageBytes);
                    } else {
                         try { pdfImage = await pdfDoc.embedPng(imageBytes); }
                         catch (e) {
                            try { pdfImage = await pdfDoc.embedJpg(imageBytes); }
                            catch (e2) { console.warn(`Skipping placement: Unsupported image type for ${item.type} URL ${item.url}`); continue;}
                         }
                    }
                } catch (embedError: any) {
                    console.error(`Failed to embed image ${item.url} for ${item.type}: ${embedError.message}`);
                    continue;
                }

                if (!pdfImage) continue;
                const page = pages[item.pageNumber - 1];
                const { height: pageHeight } = page.getSize();
                const pdfY = pageHeight - item.y - item.height;
                try {
                    page.drawImage(pdfImage, { x: item.x, y: pdfY, width: item.width, height: item.height });
                } catch (drawError: any) {
                    console.error(`Failed to draw ${item.type} ${item.url} on page ${item.pageNumber}: ${drawError.message}`);
                }
            }
        }

        const modifiedPdfBytes = await pdfDoc.save();
        const originalFilenameWithoutExt = path.basename(originalFileRecord.name || 'interactive-doc', path.extname(originalFileRecord.name || '.pdf'));
        const intermediatePdfKey = `intermediate-signed-letters/${originalFilenameWithoutExt}-intermediate-${uuidv4()}.pdf`;
        const uploadResult = await FileService.uploadBuffer(Buffer.from(modifiedPdfBytes), intermediatePdfKey, 'application/pdf');

        if (!uploadResult || !uploadResult.key) {
            throw new AppError(500, 'Failed to upload intermediate signed PDF to R2.');
        }
        const intermediateSignedPdfIdentifier = uploadResult.key;

        const newLetter = await Letter.create({
            userId,
            name: name ?? `Interactive: ${originalFileRecord.name}`,
            templateId: null,
            formData: null,
            originalPdfFileId: originalFileId,
            signedPdfUrl: intermediateSignedPdfIdentifier,
            finalSignedPdfUrl: null,
            placements: placements,
            workflowStatus: LetterWorkflowStatus.PENDING_REVIEW,
            currentStepIndex: 1,
            nextActionById: reviewers[0],
        }, { transaction });

        const reviewerEntries = reviewers.map((reviewerId, index) => ({
            letterId: newLetter.id,
            userId: reviewerId,
            sequenceOrder: index + 1,
            status: LetterReviewerStatus.PENDING,
        }));

        if (approver) {
            reviewerEntries.push({
                letterId: newLetter.id,
                userId: approver,
                sequenceOrder: APPROVER_SEQUENCE,
                status: LetterReviewerStatus.PENDING,
            });
        }
        await LetterReviewer.bulkCreate(reviewerEntries, { transaction });

        await LetterActionLog.create({
            letterId: newLetter.id,
            userId: userId,
            actionType: LetterActionType.SUBMIT,
            comment: 'Letter submitted for review (interactive PDF).',
            details: { initialReviewerId: reviewers[0], placementsCount: placements.length }
        }, { transaction });

        await ActivityService.logActivity({
            userId: userId,
            action: ActivityType.SUBMIT,
            resourceType: ResourceType.LETTER,
            resourceId: newLetter.id,
            resourceName: newLetter.name || 'Interactive Signed Letter',
            details: `Letter submitted from interactive PDF, pending review by user ${reviewers[0]}.`,
            transaction
        });

        await transaction.commit();

        try {
            const firstReviewer = await User.findByPk(reviewers[0], { attributes: ['id', 'email', 'firstName', 'lastName'] });
            const submitterUser = await User.findByPk(userId, { attributes: ['id', 'email', 'firstName', 'lastName'] });

            if (firstReviewer && submitterUser) {
                const submitterName = `${submitterUser.firstName || ''} ${submitterUser.lastName || ''}`.trim() || submitterUser.email;
                const reviewerName = `${firstReviewer.firstName || ''} ${firstReviewer.lastName || ''}`.trim() || firstReviewer.email;
                const letterViewUrl = `${CLIENT_URL}/dashboard/Inbox/LetterReview/${newLetter.id}`;

                if (firstReviewer.email) {
                    await EmailService.sendReviewRequestEmail(
                        firstReviewer.email, reviewerName, submitterName,
                        newLetter.name || `Letter ${newLetter.id.substring(0,6)}`, letterViewUrl
                    );
                }
                await NotificationService.createLetterReviewRequestNotification(
                    firstReviewer.id, newLetter.id,
                    newLetter.name || `Letter ${newLetter.id.substring(0,6)}`, submitterName
                );
            }
        } catch (notificationError) {
            console.error(`Error sending initial review notification for interactive letter ${newLetter.id}:`, notificationError);
        }

        const letterForReturn = await Letter.findByPk(newLetter.id, {
            include: [
                { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: LetterReviewer, as: 'letterReviewers', include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatar'] }], order: [['sequenceOrder', 'ASC']]},
                { model: LetterActionLog, as: 'letterActionLogs', include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatar'] }], order: [['createdAt', 'DESC']] }
            ]
        });
         if (!letterForReturn) {
            throw new AppError(500, 'Failed to refetch the newly created interactive signed letter with associations.');
        }
        return letterForReturn;

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error in createFromPdfInteractive service:', error);
        if (error instanceof AppError) throw error;
        throw new AppError(500, 'Failed to create interactive PDF letter with workflow.');
    }
  }


  static async generateSignedPdfViewUrl(letterId: string, userId: string): Promise<string> {
     if (!letterId || !userId) { throw new AppError(400, 'Letter ID and User ID are required.'); }
     if (!R2_BUCKET_NAME) { throw new AppError(500, 'R2_BUCKET_NAME is not configured.'); }
     try {
       const letter = await Letter.findOne({ 
           where: { id: letterId }, 
           attributes: ['signedPdfUrl', 'finalSignedPdfUrl', 'userId', 'workflowStatus'] 
       }); // Fetch userId for auth check
       if (!letter) { throw new AppError(404, `Letter with ID ${letterId} not found.`); }

        // --- Authorization Check ---
        const isCreator = letter.userId === userId;
        let isReviewerOrApprover = false;
        const reviewerEntry = await LetterReviewer.findOne({ where: { letterId: letterId, userId: userId }});
        isReviewerOrApprover = !!reviewerEntry;
        const isAdmin = false; // Replace with actual admin check

        if (!isCreator && !isReviewerOrApprover && !isAdmin && letter.workflowStatus !== LetterWorkflowStatus.APPROVED) {
            throw new AppError(403, `Access Denied. You are not authorized to view this letter.`);
        }
        // --- End Authorization Check ---

       // Use finalSignedPdfUrl when available (for approved letters), otherwise use signedPdfUrl
       const pdfUrl = letter.finalSignedPdfUrl || letter.signedPdfUrl;
       
       if (!pdfUrl) { 
           throw new AppError(404, `Letter with ID ${letterId} does not have a PDF URL.`); 
       }
       
       console.log(`Generating signed URL for letter ${letterId}, using key: ${pdfUrl}`);
       
       const r2Key = pdfUrl;
       const command = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: r2Key, });
       const expiresInSeconds = 300;
       const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
       return signedUrl;
     } catch (error) { console.error(`Service: Error generating signed view URL for letter ${letterId}:`, error); if (error instanceof AppError) throw error; throw new AppError(500, 'Could not generate view URL for the signed PDF.'); }
  }

   static async approveStep(letterId: string, userId: string, comment?: string): Promise<Letter> {
       const transaction = await sequelize.transaction();
       try {
           const letter = await Letter.findByPk(letterId, { transaction });
           if (!letter) throw new AppError(404, `Letter not found: ${letterId}`);

           if (letter.workflowStatus !== LetterWorkflowStatus.PENDING_REVIEW) {
               throw new AppError(400, `Letter is not pending review. Current status: ${letter.workflowStatus}`);
           }
           if (letter.nextActionById !== userId) {
               throw new AppError(403, `Not authorized. Action required by user ${letter.nextActionById}.`);
           }

           const currentStepIndex = letter.currentStepIndex || 0;
           const currentReviewerStep = await LetterReviewer.findOne({
               where: { letterId, userId, sequenceOrder: currentStepIndex },
               transaction
           });

           if (!currentReviewerStep) {
               throw new AppError(404, `Reviewer step not found for user ${userId} at step ${currentStepIndex}.`);
           }

           await currentReviewerStep.update({ status: LetterReviewerStatus.APPROVED, actedAt: new Date() }, { transaction });

           if (comment && comment.trim()) {
               await LetterActionLog.create({
                   letterId, userId, actionType: LetterActionType.APPROVE_REVIEW, comment: comment.trim()
               }, { transaction });
           }

           const nextReviewerStep = await LetterReviewer.findOne({
               where: { letterId, sequenceOrder: { [Op.gt]: currentStepIndex }, status: LetterReviewerStatus.PENDING },
               order: [['sequenceOrder', 'ASC']],
               transaction
           });

           let nextStatus: LetterWorkflowStatus = letter.workflowStatus;
           let nextStep = letter.currentStepIndex;
           let nextActor: string | null = letter.nextActionById;
           let notificationTargetId: string | null = null;
           let notificationType: 'next_reviewer' | 'pending_approval' | 'approved' = 'next_reviewer';

           if (nextReviewerStep && nextReviewerStep.sequenceOrder < APPROVER_SEQUENCE) {
               nextStep = nextReviewerStep.sequenceOrder;
               nextActor = nextReviewerStep.userId;
               notificationTargetId = nextReviewerStep.userId;
               notificationType = 'next_reviewer';
           } else {
               const finalApproverStep = await LetterReviewer.findOne({
                   where: { letterId, sequenceOrder: APPROVER_SEQUENCE },
                   transaction
               });
               if (finalApproverStep) {
                   nextStatus = LetterWorkflowStatus.PENDING_APPROVAL;
                   nextStep = APPROVER_SEQUENCE;
                   nextActor = finalApproverStep.userId;
                   notificationTargetId = finalApproverStep.userId;
                   notificationType = 'pending_approval';
               } else {
                   nextStatus = LetterWorkflowStatus.APPROVED;
                   nextStep = 0;
                   nextActor = null;
                   notificationTargetId = letter.userId; // Notify submitter
                   notificationType = 'approved';
               }
           }

           await letter.update({
               workflowStatus: nextStatus,
               currentStepIndex: nextStep,
               nextActionById: nextActor
           }, { transaction });

           await ActivityService.logActivity({
               userId, action: ActivityType.APPROVE, resourceType: ResourceType.LETTER,
               resourceId: letterId, resourceName: letter.name || 'Signed Letter',
               details: `Review step ${currentStepIndex} approved.${comment ? ` Comment: ${comment}` : ''}`,
               transaction
           });

           await transaction.commit();

           if (notificationTargetId) {
               const targetUser = await User.findByPk(notificationTargetId, { attributes: ['id', 'email', 'firstName', 'lastName'] });
               const submitter = await User.findByPk(letter.userId, { attributes: ['id', 'email', 'firstName', 'lastName'] });
               const currentUser = await User.findByPk(userId, { attributes: ['firstName', 'lastName'] });
               const currentUserName = currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : 'A user';

               if (targetUser && submitter) {
                   const targetUserName = `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || targetUser.email;
                   const letterViewUrl = `${CLIENT_URL}/dashboard/Inbox/LetterReview/${letter.id}`;

                    if (notificationType === 'next_reviewer' || notificationType === 'pending_approval') {
                         if (targetUser.email) {
                            await EmailService.sendReviewRequestEmail(targetUser.email, targetUserName, currentUserName, letter.name || `Letter ${letter.id.substring(0,6)}`, letterViewUrl);
                         }
                        await NotificationService.createLetterReviewRequestNotification(targetUser.id, letterId, letter.name || `Letter ${letter.id.substring(0,6)}`, currentUserName);
                    } else if (notificationType === 'approved') {
                         await NotificationService.createLetterReviewApprovedNotification(targetUser.id, letterId, letter.name || 'Untitled Letter', currentUserName);
                    }
               }
           }

           return await this.findById(letterId, userId);

       } catch (error) {
           if (transaction) await transaction.rollback();
           console.error(`Error approving step for letter ${letterId} by user ${userId}:`, error);
           if (error instanceof AppError) throw error;
           throw new AppError(500, 'Failed to approve review step.');
       }
   }

   static async rejectStep(letterId: string, userId: string, reason: string): Promise<Letter> {
        const transaction = await sequelize.transaction();
        try {
            const letter = await Letter.findByPk(letterId, { transaction });
            if (!letter) throw new AppError(404, `Letter not found: ${letterId}`);

            if (letter.workflowStatus !== LetterWorkflowStatus.PENDING_REVIEW) {
                throw new AppError(400, `Letter is not pending review. Current status: ${letter.workflowStatus}`);
            }
            if (letter.nextActionById !== userId) {
                throw new AppError(403, `Not authorized. Action required by user ${letter.nextActionById}.`);
            }
            if (!reason || !reason.trim()) {
                throw new AppError(400, 'Rejection reason is required.');
            }

            const currentStepIndex = letter.currentStepIndex || 0;
            const currentReviewerStep = await LetterReviewer.findOne({
                where: { letterId, userId, sequenceOrder: currentStepIndex },
                transaction
            });

            if (!currentReviewerStep) {
                throw new AppError(404, `Reviewer step not found for user ${userId} at step ${currentStepIndex}.`);
            }

            await currentReviewerStep.update({ status: LetterReviewerStatus.REJECTED, actedAt: new Date() }, { transaction });

            await letter.update({
                workflowStatus: LetterWorkflowStatus.REJECTED,
                currentStepIndex: 0,
                nextActionById: null
            }, { transaction });

            
            await LetterActionLog.create({
                letterId, userId, actionType: LetterActionType.REJECT_REVIEW, comment: reason
            }, { transaction });

            await ActivityService.logActivity({
                userId, action: ActivityType.REJECT, resourceType: ResourceType.LETTER,
                resourceId: letterId, resourceName: letter.name || 'Signed Letter',
                details: `Review step ${currentStepIndex} rejected. Reason: ${reason}`,
                transaction
            });

            await transaction.commit();

            try {
                 const submitter = await User.findByPk(letter.userId, { attributes: ['id', 'email', 'firstName', 'lastName'] });
                 const reviewer = await User.findByPk(userId, { attributes: ['firstName', 'lastName']});
                 const reviewerName = reviewer ? `${reviewer.firstName || ''} ${reviewer.lastName || ''}`.trim() : 'A reviewer';
                 if (submitter) {
                    await NotificationService.createLetterReviewRejectedNotification(
                        submitter.id, letterId, letter.name || 'Untitled Letter', reason, reviewerName
                    );
                 }
            } catch (notificationError) {
                 console.error(`Error sending rejection notification for letter ${letterId}:`, notificationError);
            }

            return await this.findById(letterId, userId);

        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error(`Error rejecting step for letter ${letterId} by user ${userId}:`, error);
            if (error instanceof AppError) throw error;
            throw new AppError(500, 'Failed to reject review step.');
        }
   }

  static async reassignStep(letterId: string, currentUserId: string, newUserId: string, reason?: string): Promise<Letter> {
      const transaction = await sequelize.transaction();
      try {
          const letter = await Letter.findByPk(letterId, { transaction });
          if (!letter) throw new AppError(404, `Letter not found: ${letterId}`);

          if (letter.workflowStatus !== LetterWorkflowStatus.PENDING_REVIEW && letter.workflowStatus !== LetterWorkflowStatus.PENDING_APPROVAL) {
              throw new AppError(400, `Letter cannot be reassigned in its current status: ${letter.workflowStatus}`);
          }
          if (letter.nextActionById !== currentUserId) {
              throw new AppError(403, `Not authorized. Action required by user ${letter.nextActionById}.`);
          }

          const newUser = await User.findByPk(newUserId, { transaction });
          if (!newUser) throw new AppError(404, `User to reassign to not found: ${newUserId}`);

          const currentStepIndex = letter.currentStepIndex || 0;
          const currentStep = await LetterReviewer.findOne({
              where: { letterId, userId: currentUserId, sequenceOrder: currentStepIndex },
              transaction
          });

          if (!currentStep) {
              throw new AppError(404, `Current step not found for user ${currentUserId} at step ${currentStepIndex}.`);
          }

          const existingAssignment = await LetterReviewer.findOne({ where: { letterId, userId: newUserId }, transaction });
          if (existingAssignment) {
              throw new AppError(400, `User ${newUserId} is already part of this letter's workflow.`);
          }

          await currentStep.update({
              userId: newUserId, // Assign step to new user
              reassignedFromUserId: currentUserId,
              status: LetterReviewerStatus.PENDING, // Reset status for new user
              actedAt: null // Clear actedAt
          }, { transaction });

          await letter.update({ nextActionById: newUserId }, { transaction });

          const comment = reason || `Review reassigned from user ${currentUserId} to user ${newUserId}.`;
          await LetterActionLog.create({
              letterId, userId: currentUserId, actionType: LetterActionType.REASSIGN_REVIEW, comment, details: { reassignedToUserId: newUserId }
          }, { transaction });

          await ActivityService.logActivity({
              userId: currentUserId, action: ActivityType.REASSIGN, resourceType: ResourceType.LETTER,
              resourceId: letterId, resourceName: letter.name || 'Signed Letter',
              details: comment,
              transaction
          });

          await transaction.commit();

          try {
              const submitter = await User.findByPk(letter.userId, { attributes: ['id', 'email', 'firstName', 'lastName'] });
              const reassignedUser = await User.findByPk(newUserId, { attributes: ['id', 'email', 'firstName', 'lastName'] });
              const currentUser = await User.findByPk(currentUserId, { attributes: ['firstName', 'lastName'] });
              const currentUserName = currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : 'A user';

              if (reassignedUser && submitter) {
                    const reassignedUserName = `${reassignedUser.firstName || ''} ${reassignedUser.lastName || ''}`.trim() || reassignedUser.email;
                    const letterViewUrl = `${CLIENT_URL}/dashboard/Inbox/LetterReview/${letter.id}`;
                   if (reassignedUser.email) {
                      await EmailService.sendReviewRequestEmail(reassignedUser.email, reassignedUserName, currentUserName, letter.name || `Letter ${letter.id.substring(0,6)}`, letterViewUrl);
                   }
                  await NotificationService.createLetterReviewRequestNotification(reassignedUser.id, letterId, letter.name || `Letter ${letter.id.substring(0,6)}`, currentUserName);
              }
          } catch (notificationError) {
              console.error(`Error sending reassignment notification for letter ${letterId}:`, notificationError);
          }

          return await this.findById(letterId, currentUserId);

      } catch (error) {
          if (transaction) await transaction.rollback();
          console.error(`Error reassigning step for letter ${letterId}:`, error);
          if (error instanceof AppError) throw error;
          throw new AppError(500, 'Failed to reassign review step.');
      }
  }

  static async finalApprove(letterId: string, userId: string, comment?: string): Promise<Letter> {
        const transaction = await sequelize.transaction();
        try {
            // Make sure to include all fields when fetching the letter, especially placements
            const letter = await Letter.findByPk(letterId, { 
                transaction,
                // No need for special include, placements are stored directly in the Letter model as a JSONB field
            });
            if (!letter) throw new AppError(404, `Letter not found: ${letterId}`);

            if (letter.workflowStatus !== LetterWorkflowStatus.PENDING_APPROVAL) {
                throw new AppError(400, `Letter is not pending final approval. Current status: ${letter.workflowStatus}`);
            }
            if (letter.nextActionById !== userId) {
                throw new AppError(403, `Not authorized. Final approval required by user ${letter.nextActionById}.`);
            }

            const approverStep = await LetterReviewer.findOne({
                where: { letterId, userId, sequenceOrder: APPROVER_SEQUENCE },
                transaction
            });
            if (!approverStep) {
                 throw new AppError(404, `Approver step not found for user ${userId}.`);
            }

            // --- PDF Manipulation ---
            if (!letter.signedPdfUrl) throw new AppError(500, 'Signed PDF URL is missing for final approval.');
            const pdfKey = letter.signedPdfUrl;
            const pdfBytes = await FileService.getFileBuffer(pdfKey);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const pages = pdfDoc.getPages();
            
            // Generate Public Link & QR Code
            const publicLink = `${CLIENT_URL}/public/letters/${letter.id}`; // Example public link
            const qrCodeDataUrl = await QRCode.toDataURL(publicLink, { errorCorrectionLevel: 'M', margin: 2, scale: 4 });
            const qrCodeImageBytes = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
            const qrCodeImage = await pdfDoc.embedPng(qrCodeImageBytes);
            
            // Check if we have QR code placements defined
            const qrPlacements = letter.placements?.filter(p => p.type === 'qrcode') || [];
            
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
                    } else {
                        console.warn(`QR code placement on invalid page ${placement.pageNumber} for letter ${letterId}`);
                    }
                }
            } else {
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
             const finalPdfKey = `approved-letters/letter-${letter.id}-final-${uuidv4()}.pdf`;
             await FileService.uploadBuffer(Buffer.from(finalPdfBytes), finalPdfKey, 'application/pdf');
            // --- End PDF Manipulation ---


            await approverStep.update({ status: LetterReviewerStatus.APPROVED, actedAt: new Date() }, { transaction });

            await letter.update({
                workflowStatus: LetterWorkflowStatus.APPROVED,
                currentStepIndex: 0,
                nextActionById: null,
                finalSignedPdfUrl: finalPdfKey,
                qrCodeUrl: qrCodeDataUrl, // Store Data URL or link to generated image
                publicLink: publicLink
            }, { transaction });

            await LetterActionLog.create({
                letterId, userId, actionType: LetterActionType.FINAL_APPROVE, comment
            }, { transaction });

            await ActivityService.logActivity({
                userId, action: ActivityType.APPROVE, resourceType: ResourceType.LETTER,
                resourceId: letterId, resourceName: letter.name || 'Signed Letter',
                details: `Letter finally approved. ${comment ? `Comment: ${comment}`: ''}`,
                transaction
            });

            await transaction.commit();

            try {
                const submitter = await User.findByPk(letter.userId, { attributes: ['id', 'email'] });
                const approver = await User.findByPk(userId, { attributes: ['firstName', 'lastName'] });
                const approverName = approver ? `${approver.firstName || ''} ${approver.lastName || ''}`.trim() : 'Approver';
                if (submitter) {
                    await NotificationService.createLetterFinalApprovedNotification(
                         submitter.id, letterId, letter.name || 'Untitled Letter', approverName
                    );
                }
            } catch (notificationError) {
                console.error(`Error sending final approval notification for letter ${letterId}:`, notificationError);
            }

            return await this.findById(letterId, userId);

        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error(`Error during final approval for letter ${letterId}:`, error);
            if (error instanceof AppError) throw error;
            throw new AppError(500, 'Failed to finally approve letter.');
        }
   }


   static async finalReject(letterId: string, userId: string, reason: string): Promise<Letter> {
        const transaction = await sequelize.transaction();
        try {
            const letter = await Letter.findByPk(letterId, { transaction });
            if (!letter) throw new AppError(404, `Letter not found: ${letterId}`);

            if (letter.workflowStatus !== LetterWorkflowStatus.PENDING_APPROVAL) {
                throw new AppError(400, `Letter is not pending final approval. Current status: ${letter.workflowStatus}`);
            }
            if (letter.nextActionById !== userId) {
                throw new AppError(403, `Not authorized. Final approval required by user ${letter.nextActionById}.`);
            }
            if (!reason || !reason.trim()) {
                throw new AppError(400, 'Rejection reason is required.');
            }

            const approverStep = await LetterReviewer.findOne({
                where: { letterId, userId, sequenceOrder: APPROVER_SEQUENCE },
                transaction
            });
            if (!approverStep) {
                 throw new AppError(404, `Approver step not found for user ${userId}.`);
            }

            await approverStep.update({ status: LetterReviewerStatus.REJECTED, actedAt: new Date() }, { transaction });

            await letter.update({
                workflowStatus: LetterWorkflowStatus.REJECTED,
                currentStepIndex: 0,
                nextActionById: null
            }, { transaction });

            
            await LetterActionLog.create({
                letterId, userId, actionType: LetterActionType.FINAL_REJECT, comment: reason
            }, { transaction });

             await ActivityService.logActivity({
                 userId, action: ActivityType.REJECT, resourceType: ResourceType.LETTER,
                 resourceId: letterId, resourceName: letter.name || 'Signed Letter',
                 details: `Letter finally rejected. Reason: ${reason}`,
                 transaction
             });

            await transaction.commit();

            try {
                 const submitter = await User.findByPk(letter.userId, { attributes: ['id', 'email', 'firstName', 'lastName'] });
                 const approver = await User.findByPk(userId, { attributes: ['firstName', 'lastName']});
                 const approverName = approver ? `${approver.firstName || ''} ${approver.lastName || ''}`.trim() : 'Approver';
                 if (submitter) {
                    await NotificationService.createLetterFinalRejectedNotification(
                         submitter.id, letterId, letter.name || 'Untitled Letter', reason, approverName
                    );
                 }
            } catch (notificationError) {
                 console.error(`Error sending final rejection notification for letter ${letterId}:`, notificationError);
            }

            return await this.findById(letterId, userId);

        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error(`Error during final rejection for letter ${letterId}:`, error);
            if (error instanceof AppError) throw error;
            throw new AppError(500, 'Failed to finally reject letter.');
        }
   }

   static async resubmitRejectedLetter(letterId: string, userId: string, newSignedFileId?: string, comment?: string): Promise<Letter> {
    const transaction = await sequelize.transaction();
    try {
        const letter = await Letter.findByPk(letterId, { transaction });
        if (!letter) throw new AppError(404, `Letter not found: ${letterId}`);

        // 1. Validation
        if (letter.workflowStatus !== LetterWorkflowStatus.REJECTED) {
             throw new AppError(400, `Letter must be in rejected status to resubmit. Current status: ${letter.workflowStatus}`);
        }
        if (letter.userId !== userId) {
             throw new AppError(403, `Only the original submitter can resubmit the letter.`);
        }
         if (!comment || !comment.trim()) {
             throw new AppError(400, 'A comment explaining the changes is required for resubmission.');
        }

        // 2. Handle New File (if provided)
        let updateData: Partial<LetterAttributes> = {};
        if (newSignedFileId) {
             console.log(`Resubmitting with new file ID: ${newSignedFileId}`);
             const newFile = await File.findByPk(newSignedFileId, { transaction });
             if (!newFile || !newFile.path) {
                console.error(`New file record not found or path missing for ID: ${newSignedFileId}`);
                throw new AppError(404, `New file record not found or path missing for ID: ${newSignedFileId}`);
             }

             // Update the 'signedPdfUrl' with the path of the *newly signed* PDF
             updateData.signedPdfUrl = newFile.path;
             // Mark the new file as allocated
             await newFile.update({ isAllocated: true }, { transaction });
             console.log(`Updated letter signedPdfUrl to: ${newFile.path} and marked file as allocated.`);
        } else {
            console.log('Resubmitting without a new file.');
            // Ensure signedPdfUrl is not accidentally cleared if no new file
            updateData.signedPdfUrl = letter.signedPdfUrl;
        }

        // 3. Find First Reviewer
        const firstReviewerStep = await LetterReviewer.findOne({
             where: { letterId },
             order: [['sequenceOrder', 'ASC']],
             transaction
        });
        if (!firstReviewerStep) {
            console.error(`Could not find the first reviewer for letter ${letterId}`);
            throw new AppError(500, 'Could not find the first reviewer for the workflow.');
        }
        console.log(`First reviewer found: User ${firstReviewerStep.userId} at step ${firstReviewerStep.sequenceOrder}`);

        // 4. Reset LetterReviewer statuses
        const [updatedRowCount] = await LetterReviewer.update(
             { status: LetterReviewerStatus.PENDING, actedAt: null, reassignedFromUserId: null },
             { where: { letterId }, transaction }
        );
        console.log(`Reset status for ${updatedRowCount} reviewers.`);

        // 5. Update Letter Status and Workflow Fields
        const nextStepIndex = firstReviewerStep.sequenceOrder; // Start from the first step
        await letter.update({
             ...updateData, // Apply file update if any
             workflowStatus: LetterWorkflowStatus.PENDING_REVIEW,
             currentStepIndex: nextStepIndex,
             nextActionById: firstReviewerStep.userId
        }, { transaction });
        console.log(`Letter status updated to PENDING_REVIEW, next action by ${firstReviewerStep.userId}`);

        // 6. Create Action Log
        await LetterActionLog.create({
            letterId, userId, actionType: LetterActionType.RESUBMIT, comment
        }, { transaction });
        console.log('Created RESUBMIT action log.');

        // 7. Log Activity
         await ActivityService.logActivity({
             userId, action: ActivityType.RESUBMIT, resourceType: ResourceType.LETTER,
             resourceId: letterId, resourceName: letter.name || 'Signed Letter',
             details: `Letter resubmitted after rejection. Comment: ${comment}`,
             transaction
         });
         console.log('Logged RESUBMIT activity.');

        await transaction.commit();
        console.log('Transaction committed successfully.');

        // 8. Send Notifications (after commit)
         try {
             const firstReviewer = await User.findByPk(firstReviewerStep.userId, { attributes: ['id', 'email', 'firstName', 'lastName'] });
             const submitter = await User.findByPk(userId, { attributes: ['firstName', 'lastName', 'email'] });
             if (firstReviewer && submitter) {
                 const submitterName = `${submitter.firstName || ''} ${submitter.lastName || ''}`.trim() || submitter.email;
                 const reviewerName = `${firstReviewer.firstName || ''} ${firstReviewer.lastName || ''}`.trim() || firstReviewer.email;
                 const letterViewUrl = `${CLIENT_URL}/dashboard/Inbox/LetterReview/${letter.id}`;
                 console.log(`Attempting to send notifications to reviewer ${firstReviewer.id} (${firstReviewer.email})`);

                  if (firstReviewer.email) {
                     await EmailService.sendReviewRequestEmail(firstReviewer.email, reviewerName, submitterName, letter.name || `Letter ${letter.id.substring(0,6)}`, letterViewUrl);
                     console.log('Sent review request email.');
                  }
                 await NotificationService.createLetterReviewRequestNotification(firstReviewer.id, letterId, letter.name || `Letter ${letter.id.substring(0,6)}`, submitterName);
                 console.log('Created review request notification.');
             } else {
                console.warn(`Could not find user details for notification. Reviewer: ${!!firstReviewer}, Submitter: ${!!submitter}`);
             }
         } catch (notificationError) {
             console.error(`Error sending resubmission notification for letter ${letterId}:`, notificationError);
             // Do not fail the request if notification fails
         }

        // Return the updated letter, fetching it again to include associations
        return await this.findById(letterId, userId);

    } catch (error) {
         console.error(`Error in resubmitRejectedLetter service for letter ${letterId}:`, error);
         if (transaction) await transaction.rollback();
         if (error instanceof AppError) throw error;
         throw new AppError(500, 'Failed to resubmit letter.');
    }
}
   static async getMyRejectedLetters(userId: string): Promise<Letter[]> {
    if (!userId) {
        throw new AppError(401, 'User ID is required.');
    }
    try {
        const letters = await Letter.findAll({
            where: {
                userId: userId,
                workflowStatus: LetterWorkflowStatus.REJECTED
            },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                },
                {
                    model: LetterActionLog,
                    as: 'letterActionLogs',
                    attributes: ['comment', 'createdAt'],
                    where: {
                        actionType: {
                            [Op.or]: [LetterActionType.REJECT_REVIEW, LetterActionType.FINAL_REJECT]
                        }
                    },
                    order: [['createdAt', 'DESC']],
                    limit: 1,
                    required: false
                },
                 { model: Template, as: 'template', attributes: ['id', 'name'], required: false },
            ],
            order: [['updatedAt', 'DESC']],
        });
        return letters;
    } catch (error) {
        console.error(`Error getting rejected letters for user ${userId}:`, error);
        throw new AppError(500, 'Could not retrieve rejected letters.');
    }
  }
}