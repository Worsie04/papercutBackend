import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';

interface ReferenceAttributes {
  id?: string;
  name: string;
  type: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class Reference extends Model<ReferenceAttributes> implements ReferenceAttributes {
  public id!: string;
  public name!: string;
  public type!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Reference.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: 'references',
    sequelize,
    timestamps: true,
    underscored: true,
  }
);

export default Reference;
