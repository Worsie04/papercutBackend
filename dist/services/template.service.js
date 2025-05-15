"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateService = void 0;
const sequelize_1 = require("sequelize");
const template_share_model_1 = __importDefault(require("../models/template-share.model"));
const template_model_1 = __importDefault(require("../models/template.model"));
const user_model_1 = require("../models/user.model");
const email_service_1 = require("./email.service");
const notification_service_1 = require("./notification.service");
class TemplateService {
    static async create(data) {
        var _a;
        try {
            // Validasiya: content-in boş olmadığını yoxlamaq
            if (!data.content || data.content.trim() === '') {
                throw new Error('Şablon məzmunu boş ola bilməz.');
            }
            console.log('Creating template with content length:', data.content.length);
            // Template modelinin create metodunu çağırırıq
            const newTemplate = await template_model_1.default.create({
                content: data.content,
                userId: data.userId,
                name: (_a = data.name) !== null && _a !== void 0 ? _a : null, // Əgər name verilməyibsə null olsun
            });
            console.log('Template created successfully with ID:', newTemplate.id);
            return newTemplate;
        }
        catch (error) {
            console.error('Error creating template in service:', error);
            throw error;
        }
    }
    static async getAllByUserId(userId) {
        try {
            return await template_model_1.default.findAll({
                where: { userId },
                order: [['updatedAt', 'DESC']]
            });
        }
        catch (error) {
            console.error('Error getting templates for user:', error);
            throw error;
        }
    }
    static async findById(id, userId) {
        try {
            return await template_model_1.default.findOne({
                where: { id, userId }
            });
        }
        catch (error) {
            console.error(`Error finding template with ID ${id}:`, error);
            throw error;
        }
    }
    static async update(id, userId, data) {
        var _a;
        try {
            const template = await template_model_1.default.findOne({
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
                template.name = (_a = data.name) !== null && _a !== void 0 ? _a : null;
            }
            await template.save();
            return template;
        }
        catch (error) {
            console.error(`Error updating template with ID ${id}:`, error);
            throw error;
        }
    }
    static async delete(id, userId) {
        try {
            const affectedRows = await template_model_1.default.destroy({
                where: { id, userId }
            });
            return affectedRows > 0;
        }
        catch (error) {
            console.error(`Error deleting template with ID ${id}:`, error);
            throw error;
        }
    }
    static async share(templateId, userIdsToShareWith, requestingUserId) {
        try {
            const template = await template_model_1.default.findOne({
                where: { id: templateId, userId: requestingUserId }
            });
            if (!template) {
                const exists = await template_model_1.default.findByPk(templateId);
                if (!exists) {
                    throw new Error('Şablon tapılmadı.');
                }
                else {
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
            await template_share_model_1.default.bulkCreate(shareEntries);
            console.log(`Template ${templateId} sharing action logged for users: ${finalUserIdsToShare.join(', ')} by user ${requestingUserId}`);
            const [sharedByUser, sharedWithUsers] = await Promise.all([
                user_model_1.User.findByPk(requestingUserId, { attributes: ['id', 'firstName', 'lastName'] }),
                user_model_1.User.findAll({
                    where: { id: { [sequelize_1.Op.in]: finalUserIdsToShare } },
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
                        await email_service_1.EmailService.sendTemplateShareEmail(user.email, sharedByUserFullName, templateNameForNotification, templateId);
                    }
                    catch (emailError) {
                        console.error(`Failed to send share email to ${user.email} (User ID: ${user.id}):`, emailError);
                    }
                }
                else {
                    console.warn(`User ${user.id} (${user.firstName}) has no email address. Skipping share email.`);
                }
                try {
                    await notification_service_1.NotificationService.createTemplateShareNotification(user.id, sharedByUserFullName, templateId, templateNameForNotification);
                }
                catch (notificationError) {
                    console.error(`Failed to create share notification for user ${user.id}:`, notificationError);
                }
            });
            await Promise.allSettled(notificationPromises);
            console.log(`Finished attempting notifications for template ${templateId} share.`);
        }
        catch (error) {
            console.error(`Error logging share action for template ID ${templateId}:`, error);
            throw error;
        }
    }
    static async getShareHistory(templateId, requestingUserId) {
        try {
            const template = await template_model_1.default.findOne({
                where: { id: templateId, userId: requestingUserId }
            });
            if (!template) {
                throw new Error('Şablon tapılmadı və ya tarixçəyə baxmaq üçün icazəniz yoxdur.');
            }
            const history = await template_share_model_1.default.findAll({
                where: { templateId: templateId },
                include: [
                    {
                        model: user_model_1.User,
                        as: 'sharedByUser',
                        attributes: ['id', 'firstName', 'lastName', 'avatar']
                    },
                    {
                        model: user_model_1.User,
                        as: 'sharedWithUser',
                        attributes: ['id', 'firstName', 'lastName', 'avatar']
                    }
                ],
                order: [['sharedAt', 'DESC']]
            });
            return history;
        }
        catch (error) {
            console.error(`Error fetching share history for template ID ${templateId}:`, error);
            throw error;
        }
    }
    static async getSharedWithUser(requestingUserId) {
        try {
            const shareEntries = await template_share_model_1.default.findAll({
                where: { sharedWithUserId: requestingUserId },
                attributes: [[(0, sequelize_1.fn)('DISTINCT', (0, sequelize_1.col)('template_id')), 'templateId']],
                raw: true,
            });
            const templateIds = shareEntries.map((entry) => entry.templateId);
            if (templateIds.length === 0) {
                return [];
            }
            const templates = await template_model_1.default.findAll({
                where: { id: { [sequelize_1.Op.in]: templateIds } },
                include: [
                    {
                        model: user_model_1.User,
                        as: 'user',
                        attributes: ['id', 'firstName', 'lastName', 'avatar']
                    }
                ],
                order: [['updatedAt', 'DESC']]
            });
            const formattedTemplates = templates.map(template => {
                const plainTemplate = template.get({ plain: true });
                if (plainTemplate.user) {
                    plainTemplate.creator = plainTemplate.user;
                    delete plainTemplate.user;
                }
                return plainTemplate;
            });
            return formattedTemplates;
        }
        catch (error) {
            console.error(`Error fetching templates shared with user ${requestingUserId}:`, error);
            throw error;
        }
    }
    static async findByIdShared(templateId, requestingUserId) {
        try {
            const template = await template_model_1.default.findByPk(templateId);
            if (!template) {
                throw new Error('Şablon tapılmadı.');
            }
            if (template.userId === requestingUserId) {
                console.log(`User ${requestingUserId} accessed template ${templateId} as owner.`);
                return template;
            }
            const shareRecord = await template_share_model_1.default.findOne({
                where: { templateId: templateId, sharedWithUserId: requestingUserId }
            });
            if (shareRecord) {
                console.log(`User ${requestingUserId} accessed template ${templateId} via share record ${shareRecord.id}.`);
                return template;
            }
            console.warn(`User ${requestingUserId} denied access to template ${templateId}. Not owner and not shared.`);
            throw new Error('Bu şablona baxmaq üçün icazəniz yoxdur.');
        }
        catch (error) {
            console.error(`Error finding shared template access for ID ${templateId} by user ${requestingUserId}:`, error);
            if (error instanceof Error && (error.message.includes('tapılmadı') || error.message.includes('icazəniz yoxdur'))) {
                throw error;
            }
            throw new Error(`Şablon məlumatı alınarkən xəta baş verdi: ${error instanceof Error ? error.message : 'Bilinməyən xəta'}`);
        }
    }
    static async deleteShare(shareId, requestingUserId) {
        try {
            const shareRecord = await template_share_model_1.default.findByPk(shareId, {
                include: [{
                        model: template_model_1.default,
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
        }
        catch (error) {
            console.error(`Error deleting share record ${shareId}:`, error);
            if (error instanceof Error && (error.message.includes('tapılmadı') || error.message.includes('icazəniz yoxdur'))) {
                throw error;
            }
            throw new Error(`Paylaşma qeydi silinərkən xəta baş verdi: ${error instanceof Error ? error.message : 'Bilinməyən xəta'}`);
        }
    }
}
exports.TemplateService = TemplateService;
