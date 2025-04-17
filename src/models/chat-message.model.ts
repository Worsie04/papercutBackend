import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';

interface ChatMessageAttributes {
  id: string;
  recordId: string;
  userId: string;
  message: string;
  mentions: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChatMessageCreationAttributes extends Optional<ChatMessageAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class ChatMessage extends Model<ChatMessageAttributes, ChatMessageCreationAttributes> implements ChatMessageAttributes {
  public id!: string;
  public recordId!: string;
  public userId!: string;
  public message!: string;
  public mentions!: string[];
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Virtual fields that will be populated by including associations
  public user?: any;
}

ChatMessage.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    recordId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'record_id',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    mentions: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    modelName: 'ChatMessage',
    tableName: 'chat_messages',
    timestamps: true,
    underscored: true,
  }
);

export default ChatMessage;