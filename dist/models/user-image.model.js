"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserImage = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize"); // Sequelize instance yolunu düzəldin
const user_model_1 = require("./user.model"); // User modelinin yolunu düzəldin
class UserImage extends sequelize_1.Model {
}
exports.UserImage = UserImage;
UserImage.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
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
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    storageKey: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true, // Hər storage key unikal olmalıdır
    },
    publicUrl: {
        type: sequelize_1.DataTypes.STRING(1024), // URL uzun ola bilər
        allowNull: false,
    },
    size: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true, // Həmişə tələb olunmaya bilər
    },
    mimeType: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
    },
    deletedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at',
    },
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'user_images',
    timestamps: true,
    paranoid: true, // Soft delete üçün
    indexes: [
        { fields: ['user_id'] },
    ]
});
UserImage.belongsTo(user_model_1.User, {
    foreignKey: 'userId',
    as: 'user',
});
// User.hasMany(UserImage, { foreignKey: 'userId', as: 'images' }); // User modelində
exports.default = UserImage;
