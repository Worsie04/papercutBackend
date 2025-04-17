import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize'; // Sequelize instance yolunu düzəldin
import Template from './template.model'; // Əsas Template modelini import edin
import { User } from './user.model'; // User modelini import edin

interface TemplateReviewerAttributes {
  id: string;
  templateId: string;
  userId: string; // Reviewer olan istifadəçinin ID-si
  createdAt?: Date;
  updatedAt?: Date;
}

// `id` avtomatik yaradıldığı üçün Creation üçün Optional edirik
interface TemplateReviewerCreationAttributes extends Optional<TemplateReviewerAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class TemplateReviewer extends Model<TemplateReviewerAttributes, TemplateReviewerCreationAttributes> implements TemplateReviewerAttributes {
  public id!: string;
  public templateId!: string;
  public userId!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Əlaqəli modellər (TypeScript üçün tip təyinləri)
  public readonly template?: Template;
  public readonly reviewer?: User; // user_id -> User modelinə işarə edir
}

TemplateReviewer.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    templateId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'template_id', // Cədvəldəki sütun adı (snake_case)
      references: {
        model: Template,
        key: 'id',
      },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id', // Cədvəldəki sütun adı (snake_case)
      references: {
        model: User, // 'users' cədvəli ilə əlaqəli model
        key: 'id',
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at',
      allowNull: false,
    },
  },
  {
    tableName: 'template_reviewers',
    sequelize,
    timestamps: true,
    underscored: true, 
  }
);

TemplateReviewer.belongsTo(Template, { foreignKey: 'templateId', as: 'template' });
Template.hasMany(TemplateReviewer, { foreignKey: 'templateId', as: 'reviewers' });

TemplateReviewer.belongsTo(User, { foreignKey: 'userId', as: 'reviewer' });
User.hasMany(TemplateReviewer, { foreignKey: 'userId', as: 'reviewAssignments' });


export default TemplateReviewer;