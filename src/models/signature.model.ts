import { Model, DataTypes, Optional, Association } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { User } from './user.model';

export enum SignatureType {
  DRAWN = 'drawn',
  UPLOADED = 'uploaded'
}

interface SignatureAttributes {
  id: string;
  userId: string;
  filename: string;
  storageKey: string;
  publicUrl: string;
  size?: number;
  mimeType?: string;
  signatureType: SignatureType;
  createdAt: Date;
  updatedAt: Date;
}

interface SignatureCreationAttributes extends Optional<SignatureAttributes, 'id' | 'createdAt' | 'updatedAt' | 'size' | 'mimeType'> {}

class Signature extends Model<SignatureAttributes, SignatureCreationAttributes> implements SignatureAttributes {
  public id!: string;
  public userId!: string;
  public filename!: string;
  public storageKey!: string;
  public publicUrl!: string;
  public size?: number;
  public mimeType?: string;
  public signatureType!: SignatureType;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Association
  public readonly user?: User;

  public static associations: {
    user: Association<Signature, User>;
  };
}

Signature.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    storageKey: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'storage_key',
    },
    publicUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'public_url',
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'mime_type',
    },
    signatureType: {
      type: DataTypes.ENUM(...Object.values(SignatureType)),
      allowNull: false,
      defaultValue: SignatureType.DRAWN,
      field: 'signature_type',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    modelName: 'Signature',
    tableName: 'signatures',
    underscored: true,
    timestamps: true,
  }
);

export { Signature, SignatureAttributes, SignatureCreationAttributes }; 