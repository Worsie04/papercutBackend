"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateReviewerService = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
const template_reviewer_model_1 = __importDefault(require("../models/template-reviewer.model"));
const user_model_1 = require("../models/user.model");
const template_model_1 = __importDefault(require("../models/template.model"));
class TemplateReviewerService {
    static async getReviewersForTemplate(templateId) {
        try {
            const reviewersAssignments = await template_reviewer_model_1.default.findAll({
                where: { templateId },
                include: [{
                        model: user_model_1.User,
                        as: 'reviewer',
                        attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'],
                    }],
                attributes: [],
            });
            return reviewersAssignments.map(assignment => assignment.reviewer).filter(user => user != null);
        }
        catch (error) {
            console.error(`Error getting reviewers for template ${templateId}:`, error);
            throw new Error('Reviewer-ləri gətirərkən xəta baş verdi.');
        }
    }
    static async updateReviewersForTemplate(templateId, reviewerUserIds, requestingUserId) {
        const template = await template_model_1.default.findByPk(templateId);
        if (!template) {
            throw new Error('Şablon tapılmadı.');
        }
        if (template.userId !== requestingUserId) {
            throw new Error('Bu əməliyyat üçün icazəniz yoxdur.');
        }
        if (reviewerUserIds.length > 5) {
            throw new Error('Bir şablona maksimum 5 reviewer təyin edilə bilər.');
        }
        if (reviewerUserIds.length > 0) {
            const existingUsersCount = await user_model_1.User.count({
                where: {
                    id: { [sequelize_1.Op.in]: reviewerUserIds },
                }
            });
            if (existingUsersCount !== reviewerUserIds.length) {
                throw new Error('Təyin edilməyə çalışılan bəzi istifadəçilər sistemdə tapılmadı.');
            }
        }
        const transaction = await sequelize_2.sequelize.transaction();
        try {
            await template_reviewer_model_1.default.destroy({
                where: { templateId },
                transaction,
            });
            if (reviewerUserIds.length > 0) {
                const newAssignments = reviewerUserIds.map(userId => ({
                    templateId,
                    userId,
                }));
                await template_reviewer_model_1.default.bulkCreate(newAssignments, { transaction });
            }
            await transaction.commit();
        }
        catch (error) {
            await transaction.rollback();
            console.error(`Error updating reviewers for template ${templateId}:`, error);
            if (error instanceof Error && error.name === 'SequelizeUniqueConstraintError') {
                throw new Error('Bir istifadəçi yalnız bir dəfə reviewer olaraq təyin edilə bilər.');
            }
            throw new Error('Reviewer siyahısını yeniləyərkən xəta baş verdi.');
        }
    }
}
exports.TemplateReviewerService = TemplateReviewerService;
