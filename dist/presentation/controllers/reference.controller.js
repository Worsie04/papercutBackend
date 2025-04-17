"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferenceController = void 0;
const reference_service_1 = require("../../services/reference.service");
class ReferenceController {
    static async create(req, res) {
        try {
            const { name, type } = req.body;
            const newRef = await reference_service_1.ReferenceService.create({ name, type });
            res.status(201).json(newRef);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    static async getAll(req, res) {
        try {
            const references = await reference_service_1.ReferenceService.getAll();
            if (!Array.isArray(references)) {
                console.warn('References is not an array:', references);
                res.json([]);
            }
            else {
                res.json(references);
            }
        }
        catch (error) {
            console.error('Error in getAll controller:', error);
            res.status(500).json({ error: error.message, references: [] });
        }
    }
    static async update(req, res) {
        try {
            const { id } = req.params;
            const updated = await reference_service_1.ReferenceService.update(id, req.body);
            res.json(updated);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    static async delete(req, res) {
        try {
            const { id } = req.params;
            await reference_service_1.ReferenceService.delete(id);
            res.status(204).send();
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
exports.ReferenceController = ReferenceController;
