"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordController = void 0;
const record_service_1 = require("../../services/record.service");
const record_model_1 = require("../../models/record.model");
const errorHandler_1 = require("../middlewares/errorHandler");
class RecordController {
    static async createRecord(req, res) {
        var _a;
        try {
            const { title, cabinetId, customFields, status, isTemplate, isActive, tags } = req.body;
            const creatorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!creatorId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            if (!title) {
                return res.status(400).json({ error: 'Title is required' });
            }
            const record = await record_service_1.RecordService.createRecord({
                title,
                cabinetId,
                creatorId,
                customFields,
                status: status,
                isTemplate,
                isActive,
                tags
            });
            res.status(201).json(record);
        }
        catch (error) {
            console.error('Error creating record:', error);
            if (error instanceof errorHandler_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to create record' });
            }
        }
    }
    static async getRecord(req, res) {
        try {
            const { id } = req.params;
            const record = await record_service_1.RecordService.getRecordById(id);
            res.json(record);
        }
        catch (error) {
            console.error('Error getting record:', error);
            if (error instanceof errorHandler_1.AppError && error.name === 'NotFoundError') {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to get record' });
            }
        }
    }
    static async updateRecord(req, res) {
        var _a;
        try {
            const { id } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const record = await record_service_1.RecordService.updateRecord(id, req.body, userId);
            res.json(record);
        }
        catch (error) {
            console.error('Error updating record:', error);
            if (error instanceof errorHandler_1.AppError && error.name === 'NotFoundError') {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to update record' });
            }
        }
    }
    static async deleteRecord(req, res) {
        try {
            const { id } = req.params;
            await record_service_1.RecordService.deleteRecord(id);
            res.json({ message: 'Record deleted successfully' });
        }
        catch (error) {
            console.error('Error deleting record:', error);
            if (error instanceof errorHandler_1.AppError && error.name === 'NotFoundError') {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to delete record' });
            }
        }
    }
    static async getRecordsByStatus(req, res) {
        var _a;
        try {
            const { status } = req.query;
            const creatorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!status) {
                return res.status(400).json({ error: 'Status is required' });
            }
            if (!creatorId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // Handle comma-separated status values and ensure they're strings
            const statusValues = (typeof status === 'string' ? status.split(',') : [status.toString()])
                .map(s => s.trim())
                .filter(s => s.length > 0);
            // Validate status values
            const validStatuses = Object.values(record_model_1.RecordStatus);
            const invalidStatuses = statusValues.filter(s => !validStatuses.includes(s));
            if (invalidStatuses.length > 0) {
                return res.status(400).json({ error: `Invalid status values: ${invalidStatuses.join(', ')}` });
            }
            const records = await record_service_1.RecordService.getRecordsByStatus(statusValues, creatorId);
            res.json(records);
        }
        catch (error) {
            console.error('Error getting records by status:', error);
            if (error instanceof errorHandler_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to get records' });
            }
        }
    }
}
exports.RecordController = RecordController;
