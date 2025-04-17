"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferenceService = void 0;
const reference_model_1 = __importDefault(require("../models/reference.model"));
class ReferenceService {
    static async create(data) {
        return reference_model_1.default.create(data);
    }
    static async getAll() {
        try {
            const references = await reference_model_1.default.findAll();
            // JSON massivini və raw data-nı qaytarırıq
            return references.map(ref => ref.get({ plain: true }));
        }
        catch (error) {
            console.error('Error fetching references:', error);
            return []; // Xəta olsa da boş array qaytarırıq
        }
    }
    static async update(id, data) {
        const ref = await reference_model_1.default.findByPk(id);
        if (!ref)
            throw new Error('Reference not found');
        return ref.update(data);
    }
    static async delete(id) {
        const ref = await reference_model_1.default.findByPk(id);
        if (!ref)
            throw new Error('Reference not found');
        return ref.destroy();
    }
}
exports.ReferenceService = ReferenceService;
