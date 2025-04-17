import { col, fn, Op } from 'sequelize';
import TemplateShare from '../models/template-share.model';
import Template from '../models/template.model';
import { User } from '../models/user.model';
import { EmailService } from './email.service';
import { NotificationService } from './notification.service';

interface TemplateSection { 
  id: string; 
  title: string; 
  content: string; 
  isEditing?: boolean;
}

interface CreateTemplateData {
  sections: TemplateSection[];
  userId: string;
  name?: string | null;
}

type UpdateTemplateData = Partial<Omit<CreateTemplateData, 'userId'>> & { sharedUsers?: string[] };

export class TemplateService {

  static async create(data: CreateTemplateData): Promise<Template> {
    try {
      // Make sure we're not saving any isEditing field in the database
      const cleanedSections = data.sections.map(section => ({
        id: section.id,
        title: section.title,
        content: section.content
      }));

      // Validasiya: sections array-inin boş olmadığını yoxlamaq
      if (!cleanedSections || cleanedSections.length === 0) {
        throw new Error('Şablon bölmələri boş ola bilməz.');
      }

      console.log('Creating template with sections:', cleanedSections.length);

      // Template modelinin create metodunu çağırırıq
      const newTemplate = await Template.create({
        sections: cleanedSections,
        userId: data.userId,
        name: data.name ?? null, // Əgər name verilməyibsə null olsun
      });

      console.log('Template created successfully with ID:', newTemplate.id);

      return newTemplate;

    } catch (error) {
      // Xəta baş verərsə, loglayıb yenidən throw edirik ki, controller tuta bilsin
      console.error('Error creating template in service:', error);
      throw error; // Xətanı yuxarı ötürürük
    }
  }

  static async getAllByUserId(userId: string): Promise<Template[]> {
    try {
      return await Template.findAll({
        where: { userId },
        order: [['updatedAt', 'DESC']] // Ən son yenilənənlər birinci
      });
    } catch (error) {
      console.error('Error getting templates for user:', error);
      throw error;
    }
  }

  static async findById(id: string, userId: string): Promise<Template | null> {
    try {
      return await Template.findOne({
        where: { id, userId }
      });
    } catch (error) {
      console.error(`Error finding template with ID ${id}:`, error);
      throw error;
    }
  }

  static async update(id: string, userId: string, data: UpdateTemplateData): Promise<Template | null> {
    try {
      // Şablonu tapaq
      const template = await Template.findOne({
        where: { id, userId }
      });

      if (!template) {
        return null; // Şablon tapılmadı və ya bu istifadəçiyə aid deyil
      }

      // Şablonu yeniləyək
      if (data.sections) {
        // Clean sections
        const cleanedSections = data.sections.map(section => ({
          id: section.id,
          title: section.title,
          content: section.content
        }));
        template.sections = cleanedSections;
      }

      if (data.name !== undefined) {
        template.name = data.name ?? null;
      }

      // Yenilikləri yadda saxlayaq
      await template.save();
      return template;
    } catch (error) {
      console.error(`Error updating template with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Şablonu silir
   * @param id - Şablon ID-si
   * @param userId - İstifadəçi ID-si (təhlükəsizlik üçün)
   * @returns Promise<boolean> - Əməliyyatın uğurlu olub-olmadığını göstərir
   */
  static async delete(id: string, userId: string): Promise<boolean> {
    try {
      const affectedRows = await Template.destroy({
        where: { id, userId }
      });

      return affectedRows > 0;
    } catch (error) {
      console.error(`Error deleting template with ID ${id}:`, error);
      throw error;
    }
  }

  static async share(templateId: string, userIdsToShareWith: string[], requestingUserId: string): Promise<void> {
    try {
      // 1. Verify the template exists and the user has permission to share
      //    (Using the same logic as before: only owner can share)
      const template = await Template.findOne({
        where: { id: templateId, userId: requestingUserId }
      });

      if (!template) {
        const exists = await Template.findByPk(templateId);
        if (!exists) {
            throw new Error('Şablon tapılmadı.'); // 404
        } else {
            throw new Error('Şablonu paylaşmaq üçün icazəniz yoxdur.'); // 403
        }
      }


      const finalUserIdsToShare = [...new Set(userIdsToShareWith)].filter(id => id !== requestingUserId);

      if (finalUserIdsToShare.length === 0) {
        console.log("No unique users (excluding owner) provided to share with.");
         return;
      }

      // 2. Prepare data for template_shares table
      const shareEntries = finalUserIdsToShare.map(userId => ({
        templateId: templateId,
        sharedByUserId: requestingUserId,
        sharedWithUserId: userId,
      }));

      // 3. Create records in the template_shares table
      await TemplateShare.bulkCreate(shareEntries);
      console.log(`Template ${templateId} sharing action logged for users: ${finalUserIdsToShare.join(', ')} by user ${requestingUserId}`);

      // --- 4. Send Notifications and Emails ---
      // Fetch details needed for notifications efficiently
      const [sharedByUser, sharedWithUsers] = await Promise.all([
        User.findByPk(requestingUserId, { attributes: ['id', 'firstName', 'lastName'] }),
        User.findAll({
            where: { id: { [Op.in]: finalUserIdsToShare } },
            attributes: ['id', 'email', 'firstName', 'lastName'] // Include email
        })
     ]);

     if (!sharedByUser) {
        console.error(`Critical: Sharer user with ID ${requestingUserId} not found after check. Aborting notifications.`);
        // This case should ideally not happen due to earlier checks, but good to handle
        return;
     }

     // Prepare common info
     const sharedByUserFullName = `${sharedByUser.firstName || ''} ${sharedByUser.lastName || ''}`.trim() || 'A user';
     const templateNameForNotification = template.name || 'Untitled Template';

     // Trigger notifications/emails for each recipient
     // We run these in parallel but don't wait for all to finish - log errors individually
     const notificationPromises = sharedWithUsers.map(async (user) => {
        // Send Email (if email exists)
        if (user.email) {
             try {
                await EmailService.sendTemplateShareEmail(
                    user.email,
                    sharedByUserFullName,
                    templateNameForNotification,
                    templateId
                );
             } catch(emailError) {
                console.error(`Failed to send share email to ${user.email} (User ID: ${user.id}):`, emailError);
             }
        } else {
            console.warn(`User ${user.id} (${user.firstName}) has no email address. Skipping share email.`);
        }

        try {
           await NotificationService.createTemplateShareNotification(
               user.id,
               sharedByUserFullName,
               templateId,
               templateNameForNotification
           );
        } catch(notificationError) {
           console.error(`Failed to create share notification for user ${user.id}:`, notificationError);
        }
     });

     // Wait for all notification attempts to settle (optional, but good for logging completion)
      await Promise.allSettled(notificationPromises);
      console.log(`Finished attempting notifications for template ${templateId} share.`);
     // --- End Notifications ---

    } catch (error) {
      console.error(`Error logging share action for template ID ${templateId}:`, error);
      throw error;
    }
  }

  static async getShareHistory(templateId: string, requestingUserId: string): Promise<any[]> { // Return type 'any[]' for simplicity, define a proper interface later
    try {
        // 1. Verify template exists and user has permission to view history
        //    (Owner or perhaps anyone it's shared with? For now, only owner)
        const template = await Template.findOne({
          where: { id: templateId, userId: requestingUserId }
        });

        if (!template) {
            // Add permission check logic here if needed
            throw new Error('Şablon tapılmadı və ya tarixçəyə baxmaq üçün icazəniz yoxdur.');
        }

        // 2. Fetch history, joining with Users table for names/avatars
        const history = await TemplateShare.findAll({
            where: { templateId: templateId },
            include: [
                {
                    model: User, // Assuming 'User' model is imported
                    as: 'sharedByUser', // Use the alias defined in association
                    attributes: ['id', 'firstName', 'lastName', 'avatar'] // Select needed fields
                },
                {
                    model: User,
                    as: 'sharedWithUser', // Use the alias defined in association
                    attributes: ['id', 'firstName', 'lastName', 'avatar']
                }
            ],
            order: [['sharedAt', 'DESC']], // Show most recent first
            // Add limit/pagination later if needed
        });

        return history;

    } catch (error) {
        console.error(`Error fetching share history for template ID ${templateId}:`, error);
        throw error;
    }
  }

  static async getSharedWithUser(requestingUserId: string): Promise<any[]> { // Using any[] for simplicity, refine with TemplateWithCreator[] later
    try {
      // 1. Find distinct template IDs shared with the user
      const shareEntries = await TemplateShare.findAll({
        where: { sharedWithUserId: requestingUserId },
        attributes: [
          // Use sequelize functions for distinct selection
          [fn('DISTINCT', col('template_id')), 'templateId']
        ],
        raw: true, // Get plain results
      });

      const templateIds = shareEntries.map((entry: any) => entry.templateId);

      if (templateIds.length === 0) {
        return []; // No templates shared with this user
      }

      const templates = await Template.findAll({
        where: {
          id: { [Op.in]: templateIds }
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'avatar'] // Specify fields to include
          }
        ],
        order: [['updatedAt', 'DESC']] // Order by most recently updated
      });

       const formattedTemplates = templates.map(template => {
           const plainTemplate = template.get({ plain: true }) as any; 
           if (plainTemplate.user) {
                plainTemplate.creator = plainTemplate.user;
                delete plainTemplate.user; // Remove the original 'user' field
           }
           return plainTemplate;
       });


      return formattedTemplates; // Return the enriched templates

    } catch (error) {
      console.error(`Error fetching templates shared with user ${requestingUserId}:`, error);
      throw error; // Re-throw error to be caught by the controller/error handler
    }
  }

  static async findByIdShared(templateId: string, requestingUserId: string): Promise<Template> {
    try {
      // 1. Find the template by primary key
      const template = await Template.findByPk(templateId, {
          // Optionally include associated data needed for display here if not done on frontend
          // include: [{ model: User, as: 'user', attributes: [...] }] // Example
      });

      if (!template) {
        throw new Error('Şablon tapılmadı.'); // Throw 404 error
      }

      // 2. Check if the requesting user is the owner
      if (template.userId === requestingUserId) {
        console.log(`User ${requestingUserId} accessed template ${templateId} as owner.`);
        return template; // Owner has access
      }

      // 3. If not the owner, check if it was shared with the user
      const shareRecord = await TemplateShare.findOne({
        where: {
          templateId: templateId,
          sharedWithUserId: requestingUserId
        }
      });

      if (shareRecord) {
        console.log(`User ${requestingUserId} accessed template ${templateId} via share record ${shareRecord.id}.`);
        return template; // User has access because it was shared
      }

      // 4. If neither owner nor shared with, deny access
      console.warn(`User ${requestingUserId} denied access to template ${templateId}. Not owner and not shared.`);
      throw new Error('Bu şablona baxmaq üçün icazəniz yoxdur.'); // Throw 403 error

    } catch (error) {
      console.error(`Error finding shared template access for ID ${templateId} by user ${requestingUserId}:`, error);
      // Re-throw specific errors or generic ones
      if (error instanceof Error && (error.message.includes('tapılmadı') || error.message.includes('icazəniz yoxdur'))) {
          throw error; // Re-throw known error types
      }
      throw new Error(`Şablon məlumatı alınarkən xəta baş verdi: ${error instanceof Error ? error.message : 'Bilinməyən xəta'}`); // Throw generic error otherwise
    }
  }

  static async deleteShare(shareId: string, requestingUserId: string): Promise<void> {
    try {
        // 1. Find the share record and its associated template to check the owner
        const shareRecord = await TemplateShare.findByPk(shareId, {
            include: [{
                model: Template,
                as: 'template', // Must match the alias in TemplateShare associations
                attributes: ['userId'] // We need the template's owner ID
            }]
        });

        if (!shareRecord) {
            throw new Error('Paylaşma qeydi tapılmadı.'); // 404
        }

        // 2. Verify the template association exists
        if (!shareRecord.template) {
            console.error(`Data integrity issue: Share record ${shareId} has no associated template.`);
            throw new Error('Paylaşma qeydi ilə əlaqəli şablon tapılmadı.'); // Potentially 500
        }

        // 3. Check permission: Only the owner of the template can delete the share
        const templateOwnerId = shareRecord.template.userId;
        if (templateOwnerId !== requestingUserId) {
            throw new Error('Bu paylaşmanı silmək üçün icazəniz yoxdur.'); // 403
        }

        // 4. Delete the record
        await shareRecord.destroy();
        console.log(`User ${requestingUserId} deleted share record ${shareId} for template ${shareRecord.templateId}`);

    } catch (error) {
        console.error(`Error deleting share record ${shareId}:`, error);
        // Re-throw specific errors if they are handled in the controller
        if (error instanceof Error && (error.message.includes('tapılmadı') || error.message.includes('icazəniz yoxdur'))) {
            throw error;
        }
        // Throw a generic error otherwise
        throw new Error(`Paylaşma qeydi silinərkən xəta baş verdi: ${error instanceof Error ? error.message : 'Bilinməyən xəta'}`);
    }
  }
  

}
