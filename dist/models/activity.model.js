"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Activity = exports.ActivityStatus = exports.ResourceType = exports.ActivityType = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
const user_model_1 = require("./user.model");
var ActivityType;
(function (ActivityType) {
    ActivityType["CREATE"] = "CREATE";
    ActivityType["UPDATE"] = "UPDATE";
    ActivityType["DELETE"] = "DELETE";
    ActivityType["APPROVE"] = "APPROVE";
    ActivityType["REJECT"] = "REJECT";
    ActivityType["REASSIGN"] = "REASSIGN";
    ActivityType["SUBMIT"] = "SUBMIT";
    ActivityType["RESUBMIT"] = "RESUBMIT";
    ActivityType["UPDATE_PERMISSIONS"] = "UPDATE_PERMISSIONS";
})(ActivityType || (exports.ActivityType = ActivityType = {}));
var ResourceType;
(function (ResourceType) {
    ResourceType["SPACE"] = "SPACE";
    ResourceType["CABINET"] = "CABINET";
    ResourceType["RECORD"] = "RECORD";
    ResourceType["FILE"] = "FILE";
    ResourceType["LETTER"] = "LETTER";
})(ResourceType || (exports.ResourceType = ResourceType = {}));
var ActivityStatus;
(function (ActivityStatus) {
    ActivityStatus["COMPLETED"] = "completed";
    ActivityStatus["PENDING"] = "pending";
    ActivityStatus["REJECTED"] = "rejected";
    ActivityStatus["DEFAULT"] = "default";
    ActivityStatus["REASSIGNED"] = "reassigned";
})(ActivityStatus || (exports.ActivityStatus = ActivityStatus = {}));
class Activity extends sequelize_1.Model {
}
exports.Activity = Activity;
Activity.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
        field: 'user_id', // Map the camelCase property to snake_case column
    },
    action: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(ActivityType)),
        allowNull: false,
    },
    resourceType: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(ResourceType)),
        allowNull: false,
        field: 'resource_type', // Map the camelCase property to snake_case column
    },
    resourceId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        field: 'resource_id', // Map the camelCase property to snake_case column
    },
    resourceName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        field: 'resource_name', // Map the camelCase property to snake_case column
    },
    details: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(ActivityStatus)),
        allowNull: true,
    },
    timestamp: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'activities',
    modelName: 'Activity',
    underscored: true, // This tells Sequelize that columns are snake_case
    timestamps: true, // This enables createdAt and updatedAt
    createdAt: 'created_at', // Map createdAt to created_at
    updatedAt: 'updated_at', // Map updatedAt to updated_at
});
// Define associations
Activity.belongsTo(user_model_1.User, {
    foreignKey: 'userId',
    as: 'user',
});
exports.default = Activity;
