"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Record = exports.RecordStatus = void 0;
const sequelize_1 = require("sequelize");
const base_model_1 = require("./base.model");
const sequelize_2 = require("../infrastructure/database/sequelize");
var RecordStatus;
(function (RecordStatus) {
    RecordStatus["DRAFT"] = "draft";
    RecordStatus["PENDING"] = "pending";
    RecordStatus["APPROVED"] = "approved";
    RecordStatus["REJECTED"] = "rejected";
    RecordStatus["ARCHIVED"] = "archived";
})(RecordStatus || (exports.RecordStatus = RecordStatus = {}));
class Record extends base_model_1.BaseModel {
    // Helper methods
    async incrementVersion() {
        this.version += 1;
        await this.save();
    }
    async updateStatus(status, userId) {
        this.status = status;
        this.lastModifiedBy = userId;
        await this.save();
    }
    async addTag(tag) {
        if (!this.tags.includes(tag)) {
            this.tags = [...this.tags, tag];
            await this.save();
        }
    }
    async removeTag(tag) {
        this.tags = this.tags.filter(t => t !== tag);
        await this.save();
    }
}
exports.Record = Record;
Record.init(Object.assign(Object.assign({}, base_model_1.baseModelConfig), { title: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    }, description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    }, cabinetId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'cabinets',
            key: 'id',
        },
        field: 'cabinet_id',
    }, creatorId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
        field: 'creator_id',
    }, filePath: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'file_path',
    }, fileName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'file_name',
    }, fileSize: {
        type: sequelize_1.DataTypes.BIGINT,
        allowNull: true,
        field: 'file_size',
    }, fileType: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'file_type',
    }, fileHash: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'file_hash',
    }, version: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    }, status: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(RecordStatus)),
        allowNull: false,
        defaultValue: RecordStatus.DRAFT,
    }, metadata: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: true,
    }, customFields: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
        field: 'custom_fields',
    }, tags: {
        type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
    }, isTemplate: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_template',
    }, isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active',
    }, lastModifiedBy: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
        field: 'last_modified_by',
    } }), {
    sequelize: sequelize_2.sequelize,
    modelName: 'Record',
    tableName: 'records',
    paranoid: true,
});
// ... rest of the file ... 
