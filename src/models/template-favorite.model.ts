import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { User } from './user.model';
import Template from './template.model';

interface TemplateFavoriteAttributes {
  id: string;
  userId: string;
  templateId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TemplateFavoriteCreationAttributes extends Optional<TemplateFavoriteAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class TemplateFavorite extends Model<TemplateFavoriteAttributes, TemplateFavoriteCreationAttributes> implements TemplateFavoriteAttributes {
  public id!: string;
  public userId!: string;
  public templateId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations - lowercase names to match Sequelize include aliases
  public user?: User;
  public template?: Template;
  
  // Uppercase associations for backwards compatibility
  public User?: User;
  public Template?: Template;
}

TemplateFavorite.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    templateId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'templates',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
  },
  {
    tableName: 'template_favorites',
    sequelize,
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'template_id'],
        name: 'unique_user_template_favorite',
      },
      {
        fields: ['user_id'],
        name: 'template_favorites_user_id_idx',
      },
      {
        fields: ['template_id'],
        name: 'template_favorites_template_id_idx',
      },
    ],
  }
);

export default TemplateFavorite; 