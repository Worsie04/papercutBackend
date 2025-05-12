import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize'; // Sequelize instance yolunu düzəldin
import { User } from './user.model'; // User modelinin yolunu düzəldin

export class UserImage extends Model {
  public id!: string;
  public userId!: string;
  public filename!: string; // Orijinal və ya saxlanılan fayl adı
  public storageKey!: string; // Cloudflare ID və ya R2-dəki obyektin açarı
  public publicUrl!: string; // Şəkilə birbaşa URL (məs, Cloudflare-dən)
  public size!: number; // Bayt ilə fayl ölçüsü
  public mimeType!: string; // Məs: image/jpeg, image/png
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date; // Əgər soft delete istifadə edirsinizsə

  public user?: User;
}

UserImage.init(
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
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE', // İstifadəçi silindikdə şəkilləri də sil (və ya qeyri-aktiv et)
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    storageKey: { // Məsələn, Cloudflare Image ID
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Hər storage key unikal olmalıdır
    },
    publicUrl: { // Cloudflare-dən gələn birbaşa URL
      type: DataTypes.STRING(1024), // URL uzun ola bilər
      allowNull: false,
    },
    size: { // Fayl ölçüsü (bayt)
      type: DataTypes.INTEGER,
      allowNull: true, // Həmişə tələb olunmaya bilər
    },
    mimeType: { // Fayl tipi
      type: DataTypes.STRING,
      allowNull: true,
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
  },
  {
    sequelize,
    tableName: 'user_images',
    timestamps: true,
    paranoid: true, // Soft delete üçün
    indexes: [
      { fields: ['user_id'] },
    ]
  }
);

UserImage.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// User.hasMany(UserImage, { foreignKey: 'userId', as: 'images' }); // User modelində

export default UserImage;