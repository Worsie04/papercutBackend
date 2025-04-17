import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize'; // Adjust path
import Template from './template.model'; // Adjust path
import { User } from './user.model'; // Adjust path

interface TemplateShareAttributes {
  id: string; // Or number if using INTEGER PK
  templateId: string;
  sharedByUserId: string;
  sharedWithUserId: string;
  sharedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Make id, sharedAt, createdAt, updatedAt optional on creation
interface TemplateShareCreationAttributes extends Optional<TemplateShareAttributes, 'id' | 'sharedAt' | 'createdAt' | 'updatedAt'> {}

class TemplateShare extends Model<TemplateShareAttributes, TemplateShareCreationAttributes> implements TemplateShareAttributes {
  public id!: string; // Or number
  public templateId!: string;
  public sharedByUserId!: string;
  public sharedWithUserId!: string;
  public sharedAt!: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Define associations if needed
  public readonly template?: Template;
  public readonly sharedByUser?: User;
  public readonly sharedWithUser?: User;
}

TemplateShare.init(
  {
    id: {
      type: DataTypes.UUID, // Or DataTypes.INTEGER + autoIncrement: true
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    templateId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'template_id',
    },
    sharedByUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'shared_by_user_id',
    },
    sharedWithUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'shared_with_user_id',
    },
    sharedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'shared_at',
    },
    // Sequelize automatically handles createdAt and updatedAt if timestamps: true
    createdAt: {
       type: DataTypes.DATE,
       allowNull: false,
       field: 'created_at'
    },
    updatedAt: {
       type: DataTypes.DATE,
       allowNull: false,
       field: 'updated_at'
    }
  },
  {
    tableName: 'template_shares',
    sequelize,
    timestamps: true,
    underscored: true,
  }
);


export default TemplateShare;