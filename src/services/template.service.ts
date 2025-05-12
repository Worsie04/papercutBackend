import { col, fn, Op } from 'sequelize';
import TemplateShare from '../models/template-share.model';
import Template from '../models/template.model';
import { User } from '../models/user.model';
import { EmailService } from './email.service';
import { NotificationService } from './notification.service';

interface CreateTemplateData {
  content: string;
  userId: string;
  name?: string | null;
}

type UpdateTemplateData = Partial<Omit<CreateTemplateData, 'userId'>> & { sharedUsers?: string[] };

export class TemplateService {

  static async create(data: CreateTemplateData): Promise<Template> {
    try {
      // Validasiya: content-in boş olmadığını yoxlamaq
      if (!data.content || data.content.trim() === '') {
        throw new Error('Şablon məzmunu boş ola bilməz.');
      }
  
      console.log('Creating template with content length:', data.content.length);
  
      // Template modelinin create metodunu çağırırıq
      const newTemplate = await Template.create({
        content: data.content,
        userId: data.userId,
        name: data.name ?? null, // Əgər name verilməyibsə null olsun
      });
  
      console.log('Template created successfully with ID:', newTemplate.id);
  
      return newTemplate;
  
    } catch (error) {
      console.error('Error creating template in service:', error);
      throw error;
    }
  }

  static async getAllByUserId(userId: string): Promise<Template[]> {
    try {
      return await Template.findAll({
        where: { userId },
        order: [['updatedAt', 'DESC']]
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
      const template = await Template.findOne({
        where: { id, userId }
      });

      if (!template) {
        return null;
      }

      // Şablonu yeniləyək
      if (data.content) {
        template.content = data.content;
      }

      if (data.name !== undefined) {
        template.name = data.name ?? null;
      }

      await template.save();
      return template;
    } catch (error) {
      console.error(`Error updating template with ID ${id}:`, error);
      throw error;
    }
  }

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
      const template = await Template.findOne({
        where: { id: templateId, userId: requestingUserId }
      });

      if (!template) {
        const exists = await Template.findByPk(templateId);
        if (!exists) {
          throw new Error('Şablon tapılmadı.');
        } else {
          throw new Error('Şablonu paylaşmaq üçün icazəniz yoxdur.');
        }
      }

      const finalUserIdsToShare = [...new Set(userIdsToShareWith)].filter(id => id !== requestingUserId);

      if (finalUserIdsToShare.length === 0) {
        console.log("No unique users (excluding owner) provided to share with.");
        return;
      }

      const shareEntries = finalUserIdsToShare.map(userId => ({
        templateId: templateId,
        sharedByUserId: requestingUserId,
        sharedWithUserId: userId,
      }));

      await TemplateShare.bulkCreate(shareEntries);
      console.log(`Template ${templateId} sharing action logged for users: ${finalUserIdsToShare.join(', ')} by user ${requestingUserId}`);

      const [sharedByUser, sharedWithUsers] = await Promise.all([
        User.findByPk(requestingUserId, { attributes: ['id', 'firstName', 'lastName'] }),
        User.findAll({
          where: { id: { [Op.in]: finalUserIdsToShare } },
          attributes: ['id', 'email', 'firstName', 'lastName']
        })
      ]);

      if (!sharedByUser) {
        console.error(`Critical: Sharer user with ID ${requestingUserId} not found after check. Aborting notifications.`);
        return;
      }

      const sharedByUserFullName = `${sharedByUser.firstName || ''} ${sharedByUser.lastName || ''}`.trim() || 'A user';
      const templateNameForNotification = template.name || 'Untitled Template';

      const notificationPromises = sharedWithUsers.map(async (user) => {
        if (user.email) {
          try {
            await EmailService.sendTemplateShareEmail(
              user.email,
              sharedByUserFullName,
              templateNameForNotification,
              templateId
            );
          } catch (emailError) {
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
        } catch (notificationError) {
          console.error(`Failed to create share notification for user ${user.id}:`, notificationError);
        }
      });

      await Promise.allSettled(notificationPromises);
      console.log(`Finished attempting notifications for template ${templateId} share.`);
    } catch (error) {
      console.error(`Error logging share action for template ID ${templateId}:`, error);
      throw error;
    }
  }

  static async getShareHistory(templateId: string, requestingUserId: string): Promise<any[]> {
    try {
      const template = await Template.findOne({
        where: { id: templateId, userId: requestingUserId }
      });

      if (!template) {
        throw new Error('Şablon tapılmadı və ya tarixçəyə baxmaq üçün icazəniz yoxdur.');
      }

      const history = await TemplateShare.findAll({
        where: { templateId: templateId },
        include: [
          {
            model: User,
            as: 'sharedByUser',
            attributes: ['id', 'firstName', 'lastName', 'avatar']
          },
          {
            model: User,
            as: 'sharedWithUser',
            attributes: ['id', 'firstName', 'lastName', 'avatar']
          }
        ],
        order: [['sharedAt', 'DESC']]
      });

      return history;
    } catch (error) {
      console.error(`Error fetching share history for template ID ${templateId}:`, error);
      throw error;
    }
  }

  static async getSharedWithUser(requestingUserId: string): Promise<any[]> {
    try {
      const shareEntries = await TemplateShare.findAll({
        where: { sharedWithUserId: requestingUserId },
        attributes: [[fn('DISTINCT', col('template_id')), 'templateId']],
        raw: true,
      });

      const templateIds = shareEntries.map((entry: any) => entry.templateId);

      if (templateIds.length === 0) {
        return [];
      }

      const templates = await Template.findAll({
        where: { id: { [Op.in]: templateIds } },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'avatar']
          }
        ],
        order: [['updatedAt', 'DESC']]
      });

      const formattedTemplates = templates.map(template => {
        const plainTemplate = template.get({ plain: true }) as any;
        if (plainTemplate.user) {
          plainTemplate.creator = plainTemplate.user;
          delete plainTemplate.user;
        }
        return plainTemplate;
      });

      return formattedTemplates;
    } catch (error) {
      console.error(`Error fetching templates shared with user ${requestingUserId}:`, error);
      throw error;
    }
  }

  static async findByIdShared(templateId: string, requestingUserId: string): Promise<Template> {
    try {
      const template = await Template.findByPk(templateId);

      if (!template) {
        throw new Error('Şablon tapılmadı.');
      }

      if (template.userId === requestingUserId) {
        console.log(`User ${requestingUserId} accessed template ${templateId} as owner.`);
        return template;
      }

      const shareRecord = await TemplateShare.findOne({
        where: { templateId: templateId, sharedWithUserId: requestingUserId }
      });

      if (shareRecord) {
        console.log(`User ${requestingUserId} accessed template ${templateId} via share record ${shareRecord.id}.`);
        return template;
      }

      console.warn(`User ${requestingUserId} denied access to template ${templateId}. Not owner and not shared.`);
      throw new Error('Bu şablona baxmaq üçün icazəniz yoxdur.');
    } catch (error) {
      console.error(`Error finding shared template access for ID ${templateId} by user ${requestingUserId}:`, error);
      if (error instanceof Error && (error.message.includes('tapılmadı') || error.message.includes('icazəniz yoxdur'))) {
        throw error;
      }
      throw new Error(`Şablon məlumatı alınarkən xəta baş verdi: ${error instanceof Error ? error.message : 'Bilinməyən xəta'}`);
    }
  }

  static async deleteShare(shareId: string, requestingUserId: string): Promise<void> {
    try {
      const shareRecord = await TemplateShare.findByPk(shareId, {
        include: [{
          model: Template,
          as: 'template',
          attributes: ['userId']
        }]
      });

      if (!shareRecord) {
        throw new Error('Paylaşma qeydi tapılmadı.');
      }

      if (!shareRecord.template) {
        console.error(`Data integrity issue: Share record ${shareId} has no associated template.`);
        throw new Error('Paylaşma qeydi ilə əlaqəli şablon tapılmadı.');
      }

      const templateOwnerId = shareRecord.template.userId;
      if (templateOwnerId !== requestingUserId) {
        throw new Error('Bu paylaşmanı silmək üçün icazəniz yoxdur.');
      }

      await shareRecord.destroy();
      console.log(`User ${requestingUserId} deleted share record ${shareId} for template ${shareRecord.templateId}`);
    } catch (error) {
      console.error(`Error deleting share record ${shareId}:`, error);
      if (error instanceof Error && (error.message.includes('tapılmadı') || error.message.includes('icazəniz yoxdur'))) {
        throw error;
      }
      throw new Error(`Paylaşma qeydi silinərkən xəta baş verdi: ${error instanceof Error ? error.message : 'Bilinməyən xəta'}`);
    }
  }
}