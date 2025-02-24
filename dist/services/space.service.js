"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpaceService = void 0;
const space_model_1 = require("../models/space.model");
const user_model_1 = require("../models/user.model");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
const sequelize_1 = require("../infrastructure/database/sequelize");
const upload_util_1 = require("../utils/upload.util");
const spaceInvitation_model_1 = require("../models/spaceInvitation.model");
const email_util_1 = require("../utils/email.util");
const space_member_model_1 = require("../models/space-member.model");
class SpaceService {
    static async getAvailableUsers() {
        const users = await user_model_1.User.findAll({
            where: { isActive: true },
            attributes: ['id', 'firstName', 'lastName', 'email'],
        });
        return users;
    }
    static async createSpace(data) {
        const existingSpace = await space_model_1.Space.findOne({
            where: { name: data.name },
        });
        if (existingSpace) {
            throw new errorHandler_1.AppError(400, 'Space with this name already exists');
        }
        // Upload logo if provided
        let logoUrl;
        if (data.logo) {
            logoUrl = await (0, upload_util_1.uploadFile)(data.logo, 'spaces/logos');
        }
        // Create space and assign members in a transaction
        const space = await sequelize_1.sequelize.transaction(async (transaction) => {
            const newSpace = await space_model_1.Space.create({
                name: data.name,
                company: data.company,
                tags: Array.isArray(data.tags) ? data.tags : [],
                country: data.country,
                logo: logoUrl,
                requireApproval: data.requireApproval,
                description: data.description,
                type: space_model_1.SpaceType.CORPORATE,
                ownerId: data.ownerId,
                createdById: data.ownerId,
                settings: {
                    userGroup: data.userGroup,
                },
            }, { transaction });
            // Add members to the space
            if (data.users.length > 0) {
                const users = await user_model_1.User.findAll({
                    where: { id: data.users },
                    transaction,
                });
                if (users.length !== data.users.length) {
                    const foundUserIds = users.map(user => user.id);
                    const missingUserIds = data.users.filter(id => !foundUserIds.includes(id));
                    throw new errorHandler_1.AppError(400, `Users not found: ${missingUserIds.join(', ')}`);
                }
                // Create space members directly
                await Promise.all(users.map((user) => space_member_model_1.SpaceMember.create({
                    spaceId: newSpace.id,
                    userId: user.id,
                    role: data.userGroup,
                    permissions: [],
                }, { transaction })));
            }
            return newSpace;
        });
        // Fetch the space with member information
        return this.getSpace(space.id);
    }
    static async getSpace(id) {
        const space = await space_model_1.Space.findByPk(id, {
            include: [
                {
                    model: user_model_1.User,
                    as: 'spaceMembers',
                    through: {
                        attributes: ['role', 'permissions']
                    },
                },
                {
                    model: user_model_1.User,
                    as: 'owner',
                },
                {
                    model: user_model_1.User,
                    as: 'createdBy',
                }
            ],
        });
        if (!space) {
            throw new errorHandler_1.AppError(404, 'Space not found');
        }
        // Transform the response to include role directly in member object
        const transformedSpace = space.toJSON();
        transformedSpace.members = transformedSpace.spaceMembers.map((member) => {
            var _a;
            return (Object.assign(Object.assign({}, member), { role: ((_a = member.SpaceMember) === null || _a === void 0 ? void 0 : _a.role) || 'member' }));
        });
        delete transformedSpace.spaceMembers;
        return transformedSpace;
    }
    static async addMember(spaceId, userId, role = 'member') {
        const [space, user] = await Promise.all([
            space_model_1.Space.findByPk(spaceId),
            user_model_1.User.findByPk(userId),
        ]);
        if (!space) {
            throw new errorHandler_1.AppError(404, 'Space not found');
        }
        if (!user) {
            throw new errorHandler_1.AppError(404, 'User not found');
        }
        await space.addMember(user, {
            through: {
                role,
                permissions: [],
            },
        });
    }
    static async removeMember(spaceId, userId) {
        const space = await space_model_1.Space.findByPk(spaceId);
        if (!space) {
            throw new errorHandler_1.AppError(404, 'Space not found');
        }
        const removed = await space.removeMember(userId);
        if (!removed) {
            throw new errorHandler_1.AppError(404, 'User is not a member of this space');
        }
    }
    static async getAllSpaces() {
        const spaces = await space_model_1.Space.findAll({
            include: [
                {
                    model: user_model_1.User,
                    as: 'spaceMembers',
                    through: { attributes: ['role', 'permissions'] },
                },
                {
                    model: user_model_1.User,
                    as: 'owner',
                },
                {
                    model: user_model_1.User,
                    as: 'createdBy',
                }
            ],
            order: [['createdAt', 'DESC']],
        });
        // Transform each space to maintain backward compatibility
        return spaces.map(space => {
            const transformedSpace = space.toJSON();
            transformedSpace.members = transformedSpace.spaceMembers.map((member) => {
                var _a;
                return (Object.assign(Object.assign({}, member), { role: ((_a = member.SpaceMember) === null || _a === void 0 ? void 0 : _a.role) || 'member' }));
            });
            delete transformedSpace.spaceMembers;
            return transformedSpace;
        });
    }
    static async getPendingApprovals(userId) {
        try {
            console.log('Fetching pending space approvals for user:', userId);
            const pendingSpaces = await space_model_1.Space.findAll({
                where: {
                    status: 'pending'
                },
                include: [{
                        model: user_model_1.User,
                        as: 'owner',
                        attributes: ['id', 'firstName', 'lastName', 'avatar']
                    }],
                order: [['createdAt', 'DESC']]
            });
            console.log('Found pending spaces:', pendingSpaces.length);
            return pendingSpaces.map((space) => ({
                id: space.id,
                name: space.name,
                type: 'space',
                createdBy: {
                    id: space.owner.id,
                    name: `${space.owner.firstName} ${space.owner.lastName}`,
                    avatar: space.owner.avatar || '/images/avatar.png'
                },
                createdAt: space.createdAt,
                priority: 'Med'
            }));
        }
        catch (error) {
            console.error('Error fetching pending space approvals:', error);
            throw error;
        }
    }
    static async approveSpace(spaceId) {
        try {
            const space = await space_model_1.Space.findByPk(spaceId);
            if (!space) {
                throw new Error('Space not found');
            }
            await space.update({ status: 'approved' });
            return space;
        }
        catch (error) {
            console.error('Error approving space:', error);
            throw error;
        }
    }
    static async rejectSpace(spaceId, reason) {
        try {
            const space = await space_model_1.Space.findByPk(spaceId);
            if (!space) {
                throw new Error('Space not found');
            }
            await space.update({
                status: 'rejected',
                rejectionReason: reason
            });
            return space;
        }
        catch (error) {
            console.error('Error rejecting space:', error);
            throw error;
        }
    }
    static async inviteMembers(spaceId, { emails, role, message, inviterId }) {
        const results = [];
        const space = await space_model_1.Space.findByPk(spaceId);
        const inviter = await user_model_1.User.findByPk(inviterId);
        if (!space) {
            throw new errorHandler_1.AppError(404, 'Space not found');
        }
        if (!inviter) {
            throw new errorHandler_1.AppError(404, 'Inviter not found');
        }
        // Process each email
        for (const email of emails) {
            try {
                // Check if user already exists
                let user = await user_model_1.User.findOne({ where: { email } });
                if (user) {
                    // Check if user is already a member
                    const isMember = await space_member_model_1.SpaceMember.findOne({
                        where: {
                            spaceId,
                            userId: user.id
                        }
                    });
                    if (isMember) {
                        results.push({
                            email,
                            status: 'error',
                            message: 'User is already a member of this space'
                        });
                        continue;
                    }
                    // Add user as member
                    await space.addMember(user, {
                        through: {
                            role,
                            permissions: []
                        }
                    });
                    results.push({
                        email,
                        status: 'success',
                        message: 'User added as member'
                    });
                }
                else {
                    // Create invitation record
                    await spaceInvitation_model_1.SpaceInvitation.create({
                        spaceId,
                        email,
                        role,
                        inviterId,
                        status: 'pending',
                        message
                    });
                    // Send invitation email
                    await (0, email_util_1.sendInvitationEmail)({
                        to: email,
                        spaceName: space.name,
                        inviterName: `${inviter.firstName} ${inviter.lastName}`,
                        role,
                        message,
                        invitationLink: `${process.env.CLIENT_URL}/invitations/accept?space=${spaceId}&email=${encodeURIComponent(email)}`
                    });
                    results.push({
                        email,
                        status: 'success',
                        message: 'Invitation sent'
                    });
                }
            }
            catch (error) {
                console.error(`Error processing invitation for ${email}:`, error);
                results.push({
                    email,
                    status: 'error',
                    message: 'Failed to process invitation'
                });
            }
        }
        return results;
    }
    static async updateMemberRole(spaceId, userId, role) {
        const spaceMember = await space_member_model_1.SpaceMember.findOne({
            where: {
                spaceId,
                userId
            }
        });
        if (!spaceMember) {
            throw new errorHandler_1.AppError(404, 'Member not found in this space');
        }
        await spaceMember.update({ role });
    }
}
exports.SpaceService = SpaceService;
