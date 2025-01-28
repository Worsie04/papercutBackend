"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Admin = exports.AdminRole = void 0;
const sequelize_1 = require("sequelize");
const base_model_1 = require("./base.model");
const sequelize_2 = require("../infrastructure/database/sequelize");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
var AdminRole;
(function (AdminRole) {
    AdminRole["SUPER_ADMIN"] = "super_admin";
    AdminRole["ADMIN"] = "admin";
    AdminRole["MODERATOR"] = "moderator";
})(AdminRole || (exports.AdminRole = AdminRole = {}));
class Admin extends base_model_1.BaseModel {
    // Helper methods
    async comparePassword(candidatePassword) {
        return bcryptjs_1.default.compare(candidatePassword, this.password);
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
Admin.init(Object.assign(Object.assign({}, base_model_1.baseModelConfig), { email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    }, password: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    }, firstName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        field: 'first_name',
    }, lastName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        field: 'last_name',
    }, phone: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    }, role: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(AdminRole)),
        allowNull: false,
        defaultValue: AdminRole.ADMIN,
    }, permissions: {
        type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
    }, isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active',
    }, lastLoginAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: 'last_login_at',
    }, emailVerifiedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: 'email_verified_at',
    }, avatar: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    } }), {
    sequelize: sequelize_2.sequelize,
    modelName: 'Admin',
    tableName: 'admins',
    paranoid: true,
    hooks: {
        beforeSave: async (admin) => {
            if (admin.changed('password')) {
                const salt = await bcryptjs_1.default.genSalt(10);
                admin.password = await bcryptjs_1.default.hash(admin.password, salt);
            }
        },
    },
});
