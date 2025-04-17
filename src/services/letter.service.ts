import { PDFDocument, PDFImage } from 'pdf-lib'; 
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

import { Letter, LetterFormData, LetterCreationAttributes, LetterStatus } from '../models/letter.model';
import Template from '../models/template.model';
import { User } from '../models/user.model';
import { AppError } from '../presentation/middlewares/errorHandler'

import File from '../models/file.model';
import { FileService } from './file.service';

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import TemplateReviewer from '../models/template-reviewer.model';
import { EmailService } from './email.service';
import { NotificationService } from './notification.service';
import { LetterCommentService } from './letterComment.service';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';

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

interface CreateFromPdfData {
  originalFileId: string;
  placements: PlacementInfo[];
  userId: string;
  name?: string | null;
}


export class LetterService {

  static async create(data: CreateLetterData): Promise<Letter> {
    const { templateId, userId, formData, name, logoUrl, signatureUrl, stampUrl } = data;

    // Use PENDING_REVIEW as default status for new letters from templates
    const initialStatus = LetterStatus.PENDING_REVIEW;

    if (!templateId) { // Letters created via template *must* have a templateId
        throw new AppError(400, 'Template ID is required when creating a letter from a template.');
    }
    if (!userId || !formData) {
      throw new AppError(400,'Missing required data: userId and formData are required.');
    }

    const template = await Template.findByPk(templateId, {
        include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }] // Include template creator info
    });
    if (!template) {
        throw new AppError(404,`Template with ID ${templateId} not found.`);
    }

    // Fetch the user creating the letter (submitter)
    const submitter = await User.findByPk(userId, { attributes: ['id', 'firstName', 'lastName', 'email'] });
    if (!submitter) {
        throw new AppError(404, `Submitter user with ID ${userId} not found.`);
    }

    let newLetter: Letter | null = null; // Declare outside try block

    try {
      console.log(`Creating letter for user ${userId} based on template ${templateId}`);
      newLetter = await Letter.create({
        templateId,
        userId,
        formData,
        name: name ?? template.name ?? `Letter from ${template.id.substring(0, 6)}`, // Use template name if available
        logoUrl: logoUrl ?? null,
        signatureUrl: signatureUrl ?? null,
        stampUrl: stampUrl ?? null,
        status: initialStatus,
      });
      console.log(`Letter created successfully with ID: ${newLetter.id}, Status: ${initialStatus}`);

      try {
         const reviewers = await TemplateReviewer.findAll({
            where: { templateId: templateId },
            include: [{ model: User, as: 'reviewer', attributes: ['id', 'email', 'firstName', 'lastName'] }]
         });

         if (reviewers && reviewers.length > 0) {
            console.log(`Found ${reviewers.length} reviewers for template ${templateId}. Notifying...`);
            const letterViewUrl = `${process.env.CLIENT_URL}/dashboard/Inbox/LetterReview/${newLetter.id}`; // Adjust URL as needed

            for (const reviewerEntry of reviewers) {
                if (reviewerEntry.reviewer) { // Ensure reviewer user data is loaded
                    const reviewer = reviewerEntry.reviewer;
                    const submitterName = `${submitter.firstName || ''} ${submitter.lastName || ''}`.trim() || submitter.email;
                    const reviewerName = `${reviewer.firstName || ''} ${reviewer.lastName || ''}`.trim() || reviewer.email;


                    await EmailService.sendReviewRequestEmail(
                        reviewer.email,
                        reviewerName,
                        submitterName,
                        newLetter.name || `Letter ${newLetter.id.substring(0,6)}`,
                        letterViewUrl
                    );
                    
                    await NotificationService.createLetterReviewRequestNotification(
                      reviewer.id, 
                      newLetter.id, 
                      newLetter.name || `Letter ${newLetter.id.substring(0,6)}`,
                      submitterName
                  );
                    
                   console.log(`Notification sent to reviewer ${reviewer.email} for letter ${newLetter.id}`);
                } else {
                     console.warn(`Reviewer user data not found for TemplateReviewer entry ID: ${reviewerEntry.id}`);
                }
            }
         } else {
            console.log(`No reviewers found for template ${templateId}. Skipping notifications.`);
         }

      } catch (notificationError) {
          // Log the error but don't fail the entire letter creation process
          console.error(`Error during notification process for letter ${newLetter?.id}:`, notificationError);
          // Potentially add a flag to the letter indicating notification failure
      }
      // --- End Notification Logic ---


      // Refetch the created letter to include potential associations
      const finalLetter = await this.findById(newLetter.id, userId);
      if (!finalLetter) {
           throw new AppError(500, 'Failed to refetch the newly created letter.');
      }
      return finalLetter;

    } catch (error) {
      console.error('Error creating letter in service:', error);
      // Rollback or cleanup logic could go here if needed
      throw error; // Re-throw the original error
    }
  }


  static async getLettersPendingReview(userId: string): Promise<Letter[]> {
    if (!userId) {
        throw new AppError(401, 'User ID is required.');
    }
    console.log(`Service: Fetching letters pending review for user ${userId}`);
    try {
        // Find all TemplateReviewer entries for the current user
        const reviewAssignments = await TemplateReviewer.findAll({
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
        const lettersToReview = await Letter.findAll({
            where: {
                templateId: templateIdsUserReviews,
                status: LetterStatus.PENDING_REVIEW // <-- Filter by status
            },
            include: [
                {
                    model: Template,
                    as: 'template',
                    attributes: ['id', 'name'], // Include template name
                },
                {
                    model: User,
                    as: 'user', // 'user' is the alias for the creator/submitter
                    attributes: ['id', 'firstName', 'lastName', 'email'], // Include submitter info
                },
            ],
            order: [['createdAt', 'ASC']], // Show oldest first
        });

        console.log(`Found ${lettersToReview.length} letters pending review for user ${userId}`);
        return lettersToReview;

    } catch (error) {
        console.error(`Error getting letters pending review for user ${userId}:`, error);
        throw new AppError(500, 'Could not retrieve letters pending review.');
    }
}




  static async getAllByUserId(userId: string): Promise<Letter[]> {
    if (!userId) {
        throw new AppError(401,'User ID is required.');
    }
    try {
      const letters = await Letter.findAll({
        where: { userId },
        include: [
          {
            model: Template,
            as: 'template',
            attributes: ['id', 'name'],
          },
        ],
        attributes: ['id', 'name', 'templateId', 'userId', 'logoUrl', 'signatureUrl', 'stampUrl', 'createdAt', 'updatedAt'],
        order: [['createdAt', 'DESC']],
      });
      return letters;
    } catch (error) {
      console.error(`Error getting letters for user ${userId}:`, error);
      throw error;
    }
  }

  static async findById(id: string, requestingUserId: string): Promise<Letter> { // Rename userId to requestingUserId for clarity
    if (!id || !requestingUserId) {
       // It's better to throw errors for invalid input
       throw new AppError(400,'Letter ID and Requesting User ID are required.');
   }
   try {
     // 1. Fetch the letter by ID only first, include associations needed for checks
     const letter = await Letter.findOne({
       where: { id }, // Fetch by letter ID only
       include: [
         {
           model: User,
           as: 'user', // Creator
           attributes: ['id', 'firstName', 'lastName', 'email']
         },
         {
           model: Template,
           as: 'template', // Associated Template
           attributes: ['id', 'name','sections']
         },
       ],
     });

     // 2. Check if letter exists
     if (!letter) {
       console.log(`Service: Letter with ID ${id} not found.`);
       // Uncomment the throw for proper error handling
       throw new AppError(404, `Letter with ID ${id} not found.`);
     }

     // 3. Authorization Check: Allow if creator OR assigned reviewer

     // Check if the requester is the creator
     const isCreator = letter.userId === requestingUserId;

     // Check if the requester is an assigned reviewer (only if it's a template-based letter)
     let isReviewer = false;
     if (letter.templateId) { // Check requires a templateId
        const reviewerAssignment = await TemplateReviewer.findOne({
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
        throw new AppError(403, `Access Denied. You are not authorized to view this letter.`);
     }

     // 5. If authorized, return the letter
     console.log(`Service: User ${requestingUserId} granted access to letter ${id}. IsCreator: ${isCreator}, IsReviewer: ${isReviewer}`);
     return letter;

   } catch (error) {
     console.error(`Error finding letter with ID ${id} for user ${requestingUserId}:`, error);
     // Propagate specific AppErrors, wrap others
     if (error instanceof AppError) throw error;
     // Throw a generic error for unexpected issues
     throw new AppError(500, 'Could not retrieve letter due to an internal error.');
   }
 }

  static async delete(id: string, userId: string): Promise<boolean> {
     if (!id || !userId) {
        throw new AppError(401,'Letter ID and User ID are required.');
    }
    try {
       const letterToDelete = await Letter.findOne({ where: { id, userId }, attributes: ['logoUrl', 'signatureUrl', 'stampUrl']});

      const affectedRows = await Letter.destroy({
        where: { id, userId },
      });

      if (affectedRows === 0) {
          throw new AppError(401,`Letter with ID ${id} not found or access denied for deletion.`);
      }

      console.log(`Letter with ID ${id} deleted successfully by user ${userId}.`);
      return true;
    } catch (error) {
      console.error(`Error deleting letter with ID ${id} for user ${userId}:`, error);
       if (error instanceof AppError) throw error;
      throw new Error('Could not delete letter.');
    }
  }

  static async createFromPdfInteractive(data: CreateFromPdfData): Promise<Letter> {
    const { originalFileId, placements, userId, name } = data;
    console.log(`Service: Processing PDF signing for original file ID: ${originalFileId}`);

    try {
        const originalFileRecord = await File.findByPk(originalFileId);
        if (!originalFileRecord || !originalFileRecord.path) {
            throw new AppError(404, `Original PDF file record not found or path missing for ID: ${originalFileId}`);
        }
        const originalPdfKey = originalFileRecord.path;
        console.log(`Service: Found original PDF key: ${originalPdfKey}`);

        const originalPdfBytes = await FileService.getFileBuffer(originalPdfKey);
        if (!originalPdfBytes) {
             throw new AppError(500, `Failed to download original PDF from R2: ${originalPdfKey}`);
        }
        console.log(`Service: Original PDF Bytes Length: ${originalPdfBytes.length}`);

        const pdfDoc = await PDFDocument.load(originalPdfBytes);
        const pages = pdfDoc.getPages();
        console.log(`Service: Loaded PDF with ${pages.length} pages.`);

        let placementSuccessful = false;

        for (const item of placements) {
            console.log(`Service: --- Processing Placement ID (sample): ${item.url.slice(-10)} ---`);
            if (item.pageNumber < 1 || item.pageNumber > pages.length) {
                console.warn(`Skipping placement: Invalid page number ${item.pageNumber}`);
                continue;
            }

            let imageBytes: Buffer | null = null;
            try {
                console.log(`Service: Fetching image from URL using axios: ${item.url}`);
                const response = await axios.get(item.url, {
                    responseType: 'arraybuffer'
                });
                imageBytes = Buffer.from(response.data);
                if (!imageBytes || imageBytes.length === 0) {
                     throw new Error('Received empty image buffer.');
                }
                console.log(`Service: Fetched image ${item.url.slice(-10)} OK (${imageBytes.length} bytes) using axios`);

            } catch (fetchError: any) {
                 console.error(`Service: FAILED to fetch image ${item.url} using axios`, fetchError.response?.status, fetchError.message);
                 console.warn(`Skipping placement due to image fetch error.`);
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
                    console.warn(`Skipping placement: Unsupported image type for URL ${item.url}`);
                    continue;
                }
                 console.log(`Service: Embedded image ${item.url.slice(-10)} into PDF doc.`);
             } catch(embedError: any) {
                  console.error(`Service: FAILED to embed image ${item.url}`, embedError.message);
                  continue;
             }

            if (!pdfImage) continue;

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
            } catch (drawError: any) {
                 console.error(`Service: FAILED to draw image ${item.url} on page ${item.pageNumber}`, drawError.message);
            }
        }

        if (!placementSuccessful) {
             console.warn("Service: No placements were successfully drawn onto the PDF.");
         }

        const modifiedPdfBytes = await pdfDoc.save();
        console.log(`Service: Modified PDF Bytes Length: ${modifiedPdfBytes.length}`);
        console.log(`Service: Byte length difference (Modified - Original): ${modifiedPdfBytes.length - originalPdfBytes.length}`);


        const originalFilenameWithoutExt = path.basename(originalFileRecord.name || 'signed-document', path.extname(originalFileRecord.name || '.pdf'));
        const newPdfKey = `uploads/${originalFilenameWithoutExt}-signed-${uuidv4()}.pdf`;

        const uploadResult = await FileService.uploadBuffer(
            Buffer.from(modifiedPdfBytes),
            newPdfKey,
            'application/pdf'
        );
         if (!uploadResult || !(uploadResult.key || uploadResult.url)) {
            throw new AppError(500, `Failed to upload signed PDF to R2.`);
        }
        const finalSignedPdfIdentifier = uploadResult.key || uploadResult.url;
        console.log(`Service: Uploaded signed PDF to R2. Identifier: ${finalSignedPdfIdentifier}`);


        const newLetterData: LetterCreationAttributes = {
            userId,
            name: name ?? `Signed: ${originalFileRecord.name}`,
            templateId: null,
            formData: null,
            originalPdfFileId: originalFileId,
            signedPdfUrl: finalSignedPdfIdentifier,
        };

        const newLetterRecord = await Letter.create(newLetterData);
        console.log(`Service: Created new Letter record with ID: ${newLetterRecord.id}`);

        const finalLetter = await Letter.findOne({ where: {id: newLetterRecord.id, userId}});

        if (!finalLetter) {
             throw new AppError(500, 'Failed to refetch the newly created signed letter.');
        }

        return finalLetter;

    } catch (error) {
        console.error('Error in createFromPdfInteractive service:', error);
        if (error instanceof AppError) throw error;
        throw new AppError(500, 'Failed to create signed PDF letter.');
    }
  }

  static async generateSignedPdfViewUrl(letterId: string, userId: string): Promise<string> {
    console.log(`Service: Generating view URL for letter ${letterId}, user ${userId}`);
    if (!letterId || !userId) {
      throw new AppError(400, 'Letter ID and User ID are required.');
    }
    if (!R2_BUCKET_NAME) {
       throw new AppError(500, 'R2_BUCKET_NAME is not configured.');
    }

    try {
      const letter = await Letter.findOne({
        where: { id: letterId, userId },
        attributes: ['signedPdfUrl'], 
      });

      if (!letter) {
        throw new AppError(404, `Letter with ID ${letterId} not found or access denied.`);
      }

      if (!letter.signedPdfUrl) {
        throw new AppError(404, `Letter with ID ${letterId} is not a signed PDF document or URL is missing.`);
      }

      const r2Key = letter.signedPdfUrl; 
      console.log(`Service: Found R2 key '${r2Key}' for letter ${letterId}`);

      const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: r2Key,
      });

      const expiresInSeconds = 300; 
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });

      console.log(`Service: Generated signed URL for key '${r2Key}', expires in ${expiresInSeconds}s`);
      return signedUrl;

    } catch (error) {
      console.error(`Service: Error generating signed view URL for letter ${letterId}:`, error);
      if (error instanceof AppError) throw error; 
      throw new AppError(500, 'Could not generate view URL for the signed PDF.'); 
    }
  }

  static async approveReview(letterId: string, reviewerUserId: string, comment?: string): Promise<Letter> {
    const letter = await Letter.findByPk(letterId, {
        include: [
             { model: User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'] },
             { model: Template, as: 'template', attributes: ['id', 'name'] },
        ]
    });

    if (!letter) {
      throw new AppError(404, `Letter with ID ${letterId} not found.`);
    }

    if (letter.status !== LetterStatus.PENDING_REVIEW) {
      throw new AppError(400, `Letter is not pending review (current status: ${letter.status}).`);
    }

    if (!letter.templateId) {
       throw new AppError(400, 'Cannot approve review for a letter without a template.');
    }

    const reviewerAssignment = await TemplateReviewer.findOne({
      where: { templateId: letter.templateId, userId: reviewerUserId }
    });
    if (!reviewerAssignment) {
      throw new AppError(403, 'You are not an assigned reviewer for this letter.');
    }

    const nextStatus = LetterStatus.REVIEW_APPROVED; // Adjust if needed

    const updatedLetter = await letter.update({
      status: nextStatus,
      // reviewedById: reviewerUserId,
      // reviewedAt: new Date(),
      // rejectionReason: null
    });

    if (comment && comment.trim().length > 0) {
        try {
            await LetterCommentService.createComment({
                letterId: letter.id,
                userId: reviewerUserId,
                message: comment.trim(),
                type: 'approval'
            });
        } catch (commentError) {
             console.error(`Error creating approval comment for letter ${letterId}:`, commentError);
        }
    }

    try {
      const reviewer = await User.findByPk(reviewerUserId, { attributes: ['firstName', 'lastName']});
      const reviewerName = reviewer ? `${reviewer.firstName || ''} ${reviewer.lastName || ''}`.trim() : 'A reviewer';

      if (letter.userId) {
        await NotificationService.createLetterReviewApprovedNotification(
          letter.userId,
          letter.id,
          letter.name || 'Untitled Letter',
          reviewerName
        );
      }
      // TODO: Notify final approver if necessary
    } catch (notificationError) {
      console.error(`Error sending notifications for letter ${letterId} review approval:`, notificationError);
    }

    return updatedLetter;
  }


  static async rejectReview(letterId: string, reviewerUserId: string, reason?: string): Promise<Letter> {
     const letter = await Letter.findByPk(letterId, {
         include: [
              { model: User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'] },
              { model: Template, as: 'template', attributes: ['id', 'name'] },
         ]
     });

    if (!letter) {
      throw new AppError(404, `Letter with ID ${letterId} not found.`);
    }

    if (letter.status !== LetterStatus.PENDING_REVIEW) {
      throw new AppError(400, `Letter is not pending review (current status: ${letter.status}).`);
    }

    if (!letter.templateId) {
       throw new AppError(400, 'Cannot reject review for a letter without a template.');
    }

    const reviewerAssignment = await TemplateReviewer.findOne({
      where: { templateId: letter.templateId, userId: reviewerUserId }
    });
    if (!reviewerAssignment) {
      throw new AppError(403, 'You are not an assigned reviewer for this letter.');
    }

    const rejectionMessage = reason || 'Letter review rejected without explicit reason.';

    const updatedLetter = await letter.update({
      status: LetterStatus.REVIEW_REJECTED,
      // reviewedById: reviewerUserId,
      // reviewedAt: new Date(),
      // rejectionReason: rejectionMessage
    });

    try {
        await LetterCommentService.createComment({
            letterId: letter.id,
            userId: reviewerUserId,
            message: rejectionMessage,
            type: 'rejection'
        });
    } catch (commentError) {
         console.error(`Error creating rejection comment for letter ${letterId}:`, commentError);
    }

    try {
       const reviewer = await User.findByPk(reviewerUserId, { attributes: ['firstName', 'lastName']});
       const reviewerName = reviewer ? `${reviewer.firstName || ''} ${reviewer.lastName || ''}`.trim() : 'A reviewer';

      if (letter.userId) {
        await NotificationService.createLetterReviewRejectedNotification(
          letter.userId,
          letter.id,
          letter.name || 'Untitled Letter',
          rejectionMessage,
          reviewerName
        );
      }
    } catch (notificationError) {
       console.error(`Error sending notifications for letter ${letterId} review rejection:`, notificationError);
    }

    return updatedLetter;
  }
}
