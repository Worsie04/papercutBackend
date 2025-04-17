import { Op } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import TemplateReviewer from '../models/template-reviewer.model';
import { User } from '../models/user.model'; 
import Template from '../models/template.model'; 

export class TemplateReviewerService {

  static async getReviewersForTemplate(templateId: string): Promise<User[]> {
    try {
      const reviewersAssignments = await TemplateReviewer.findAll({
        where: { templateId },
        include: [{
          model: User,
          as: 'reviewer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'],
        }],
        attributes: [],
      });

      return reviewersAssignments.map(assignment => assignment.reviewer).filter(user => user != null) as User[];

    } catch (error) {
      console.error(`Error getting reviewers for template ${templateId}:`, error);
      throw new Error('Reviewer-ləri gətirərkən xəta baş verdi.');
    }
  }

  static async updateReviewersForTemplate(templateId: string, reviewerUserIds: string[], requestingUserId: string): Promise<void> {
    const template = await Template.findByPk(templateId);
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
      const existingUsersCount = await User.count({
        where: {
          id: { [Op.in]: reviewerUserIds },
        }
      });
      if (existingUsersCount !== reviewerUserIds.length) {
        throw new Error('Təyin edilməyə çalışılan bəzi istifadəçilər sistemdə tapılmadı.');
      }
    }

    const transaction = await sequelize.transaction();

    try {
      await TemplateReviewer.destroy({
        where: { templateId },
        transaction,
      });

      if (reviewerUserIds.length > 0) {
        const newAssignments = reviewerUserIds.map(userId => ({
          templateId,
          userId,
        }));
        await TemplateReviewer.bulkCreate(newAssignments, { transaction });
      }

      await transaction.commit();

    } catch (error) {
      await transaction.rollback();
      console.error(`Error updating reviewers for template ${templateId}:`, error);
      if (error instanceof Error && error.name === 'SequelizeUniqueConstraintError') {
           throw new Error('Bir istifadəçi yalnız bir dəfə reviewer olaraq təyin edilə bilər.');
      }
      throw new Error('Reviewer siyahısını yeniləyərkən xəta baş verdi.');
    }
  }
}