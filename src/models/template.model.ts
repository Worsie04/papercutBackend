import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { User } from './user.model';

interface TemplateSectionStructure {
  id: string;
  title: string;
  content: string;
}

interface TemplateAttributes {
  id: string;
  name?: string | null;
  sections: TemplateSectionStructure[]; // JSONB
  userId: string; 
  createdAt?: Date;
  updatedAt?: Date;
}

interface TemplateCreationAttributes extends Optional<TemplateAttributes, 'id' | 'createdAt' | 'updatedAt' | 'name'> {}

class Template extends Model<TemplateAttributes, TemplateCreationAttributes> implements TemplateAttributes {
  public id!: string;
  public name!: string | null;
  public sections!: TemplateSectionStructure[];
  public userId!: string;
  public sharedUsers!: string[] | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly user?: User;
}

Template.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sections: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
  },
  {
    tableName: 'templates',
    sequelize,
    timestamps: true,
    underscored: true,
  }
);



export default Template;
