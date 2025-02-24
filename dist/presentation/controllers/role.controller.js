"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleController = void 0;
const role_model_1 = require("../../models/role.model");
const errorHandler_1 = require("../middlewares/errorHandler");
class RoleController {
    async getRoles(req, res) {
        try {
            const roles = await role_model_1.Role.findAll();
            return res.json(roles);
        }
        catch (error) {
            throw new errorHandler_1.AppError(500, 'Error fetching roles');
        }
    }
    async getRole(req, res) {
        try {
            const { id } = req.params;
            const role = await role_model_1.Role.findByPk(id);
            if (!role) {
                throw new errorHandler_1.AppError(404, 'Role not found');
            }
            return res.json(role);
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError)
                throw error;
            throw new errorHandler_1.AppError(500, 'Error fetching role');
        }
    }
    async createRole(req, res) {
        try {
            const { name, description, permissions } = req.body;
            const role = await role_model_1.Role.create({
                name,
                description,
                permissions,
                isSystem: false
            });
            return res.status(201).json(role);
        }
        catch (error) {
            throw new errorHandler_1.AppError(500, 'Error creating role');
        }
    }
    async updateRole(req, res) {
        try {
            const { id } = req.params;
            const { name, description, permissions } = req.body;
            const role = await role_model_1.Role.findByPk(id);
            if (!role) {
                throw new errorHandler_1.AppError(404, 'Role not found');
            }
            if (role.isSystem) {
                throw new errorHandler_1.AppError(403, 'System roles cannot be modified');
            }
            await role.update({
                name,
                description,
                permissions
            });
            return res.json(role);
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError)
                throw error;
            throw new errorHandler_1.AppError(500, 'Error updating role');
        }
    }
    async deleteRole(req, res) {
        try {
            const { id } = req.params;
            const role = await role_model_1.Role.findByPk(id);
            if (!role) {
                throw new errorHandler_1.AppError(404, 'Role not found');
            }
            if (role.isSystem) {
                throw new errorHandler_1.AppError(403, 'System roles cannot be deleted');
            }
            await role.destroy();
            return res.status(204).send();
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError)
                throw error;
            throw new errorHandler_1.AppError(500, 'Error deleting role');
        }
    }
}
exports.RoleController = RoleController;
