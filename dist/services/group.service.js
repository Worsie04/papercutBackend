"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupService = void 0;
const group_model_1 = require("../models/group.model");
const user_model_1 = require("../models/user.model");
const sequelize_1 = require("../infrastructure/database/sequelize");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
class GroupService {
    static async createGroup(data) {
        // Validate organization exists
        const existingGroup = await group_model_1.Group.findOne({
            where: {
                name: data.name,
                organizationId: data.organizationId
            }
        });
        if (existingGroup) {
            throw new errorHandler_1.AppError(400, 'A group with this name already exists in the organization');
        }
        const group = await group_model_1.Group.create(Object.assign(Object.assign({}, data), { isActive: true, membersCount: 0 }));
        return group;
    }
    static async getGroups(organizationId) {
        return await group_model_1.Group.findAll({
            where: { organizationId },
            include: [
                {
                    model: user_model_1.User,
                    as: 'members',
                    through: { attributes: [] },
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                },
            ],
        });
    }
    static async getGroupsByUserId(userId) {
        return await group_model_1.Group.findAll({
            include: [
                {
                    model: user_model_1.User,
                    as: 'members',
                    through: { attributes: [] },
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                    where: { id: userId },
                    required: true,
                },
            ],
        });
    }
    static async getGroupById(id) {
        const group = await group_model_1.Group.findByPk(id, {
            include: [
                {
                    model: user_model_1.User,
                    as: 'creator',
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                },
                {
                    model: user_model_1.User,
                    as: 'members',
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                    through: { attributes: [] },
                },
            ],
        });
        if (!group) {
            throw new errorHandler_1.AppError(404, 'Group not found');
        }
        return group;
    }
    static async updateGroup(id, data) {
        const group = await group_model_1.Group.findByPk(id);
        if (!group) {
            throw new errorHandler_1.AppError(404, 'Group not found');
        }
        return await group.update(data);
    }
    static async deleteGroup(id) {
        const group = await group_model_1.Group.findByPk(id);
        if (!group) {
            throw new errorHandler_1.AppError(404, 'Group not found');
        }
        await group.destroy();
    }
    static async addUsersToGroup(groupId, userIds, addedBy) {
        const t = await sequelize_1.sequelize.transaction();
        try {
            const group = await group_model_1.Group.findByPk(groupId);
            if (!group) {
                throw new errorHandler_1.AppError(404, 'Group not found');
            }
            // Verify that all users exist
            const users = await user_model_1.User.findAll({
                where: { id: userIds }
            });
            if (users.length !== userIds.length) {
                throw new errorHandler_1.AppError(400, 'One or more users not found');
            }
            // Get existing members
            const existingMembers = await sequelize_1.sequelize.query('SELECT "user_id" FROM group_members WHERE "group_id" = ?', {
                replacements: [groupId],
                type: 'SELECT',
                transaction: t
            });
            const existingMemberIds = existingMembers.map((m) => m.userId);
            const newUserIds = userIds.filter(id => !existingMemberIds.includes(id));
            if (newUserIds.length > 0) {
                // Add new members
                await sequelize_1.sequelize.query('INSERT INTO group_members (id, "group_id", "user_id", "added_by", "created_at", "updated_at") VALUES ' +
                    newUserIds.map(() => '(uuid_generate_v4(), ?, ?, ?, NOW(), NOW())').join(', '), {
                    replacements: newUserIds.flatMap(userId => [groupId, userId, addedBy]),
                    type: 'INSERT',
                    transaction: t
                });
                // Update members count
                await group.update({ membersCount: (existingMemberIds.length + newUserIds.length) }, { transaction: t });
            }
            await t.commit();
            return await group_model_1.Group.findByPk(groupId, {
                include: [
                    {
                        model: user_model_1.User,
                        as: 'members',
                        attributes: ['id', 'firstName', 'lastName', 'email'],
                        through: { attributes: [] }
                    }
                ]
            });
        }
        catch (error) {
            await t.rollback();
            throw error;
        }
    }
    static async removeUsersFromGroup(groupId, userIds) {
        const t = await sequelize_1.sequelize.transaction();
        try {
            const group = await group_model_1.Group.findByPk(groupId);
            if (!group) {
                throw new errorHandler_1.AppError(404, 'Group not found');
            }
            // Remove members
            await group.$remove('members', userIds, { transaction: t });
            // Update members count
            await group.decrement('membersCount', {
                by: userIds.length,
                transaction: t
            });
            await t.commit();
            return await this.getGroupById(groupId);
        }
        catch (error) {
            await t.rollback();
            throw error;
        }
    }
}
exports.GroupService = GroupService;
