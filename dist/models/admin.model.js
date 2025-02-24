"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Admin = exports.AdminRole = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
var AdminRole;
(function (AdminRole) {
    AdminRole["SUPER_ADMIN"] = "super_admin";
    AdminRole["ADMIN"] = "admin";
    AdminRole["MODERATOR"] = "moderator";
})(AdminRole || (exports.AdminRole = AdminRole = {}));
class Admin extends sequelize_1.Model {
    // Helper methods
    async comparePassword(candidatePassword) {
        console.log('Comparing password...');
        console.log('Stored hash:', this.password);
        const result = await bcryptjs_1.default.compare(candidatePassword, this.password);
        console.log('Password comparison result:', result);
        return result;
    }
    getFullName() {
        return `${this.firstName} ${this.lastName}`;
    }
    hasPermission(permission) {
        return this.permissions.includes(permission);
    }
    toJSON() {
        const values = Object.assign({}, this.get());
        delete values.password;
        return values;
    }
}
exports.Admin = Admin;
Admin.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    firstName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        field: 'first_name',
    },
    lastName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        field: 'last_name',
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    password: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    role: {
        type: sequelize_1.DataTypes.ENUM('admin', 'super_admin'),
        allowNull: false,
        defaultValue: 'admin',
    },
    // status: {
    //   type: DataTypes.ENUM('active', 'inactive'),
    //   allowNull: false,
    //   defaultValue: 'active',
    // },
    lastLoginAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: 'last_login_at',
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
    phone: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    permissions: {
        type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
    },
    isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active',
    },
    emailVerifiedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: 'email_verified_at',
    },
    avatar: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
}, {
    sequelize: sequelize_2.sequelize,
    modelName: 'Admin',
    tableName: 'admins',
    hooks: {
        beforeSave: async (admin) => {
            if (admin.changed('password')) {
                const salt = await bcryptjs_1.default.genSalt(10);
                admin.password = await bcryptjs_1.default.hash(admin.password, salt);
            }
        },
    },
});
