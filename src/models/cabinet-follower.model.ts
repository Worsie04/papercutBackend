import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { User } from './user.model';
import { Cabinet } from './cabinet.model';

export class CabinetFollower extends Model {
  public id!: string;
  public user_id!: string;
  public cabinet_id!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

CabinetFollower.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    cabinet_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'cabinets',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    modelName: 'cabinet_follower',
    tableName: 'cabinet_followers',
    timestamps: true,
    underscored: true,
  }
);

// Define associations
CabinetFollower.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

CabinetFollower.belongsTo(Cabinet, {
  foreignKey: 'cabinet_id',
  as: 'cabinet',
});

export default CabinetFollower; 