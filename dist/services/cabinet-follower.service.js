"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CabinetFollowerService = void 0;
const cabinet_follower_model_1 = require("../models/cabinet-follower.model");
const cabinet_model_1 = require("../models/cabinet.model");
const user_model_1 = require("../models/user.model");
class CabinetFollowerService {
    async followCabinet(userId, cabinetId) {
        return await cabinet_follower_model_1.CabinetFollower.create({
            user_id: userId,
            cabinet_id: cabinetId,
        });
    }
    async unfollowCabinet(userId, cabinetId) {
        return await cabinet_follower_model_1.CabinetFollower.destroy({
            where: {
                user_id: userId,
                cabinet_id: cabinetId,
            },
        });
    }
    async isFollowing(userId, cabinetId) {
        const follower = await cabinet_follower_model_1.CabinetFollower.findOne({
            where: {
                user_id: userId,
                cabinet_id: cabinetId,
            },
        });
        return !!follower;
    }
    async getFollowedCabinets(userId) {
        return await cabinet_follower_model_1.CabinetFollower.findAll({
            where: {
                user_id: userId,
            },
            include: [
                {
                    model: cabinet_model_1.Cabinet,
                    as: 'cabinet',
                },
            ],
        });
    }
    async getCabinetFollowers(cabinetId) {
        return await cabinet_follower_model_1.CabinetFollower.findAll({
            where: {
                cabinet_id: cabinetId,
            },
            include: [
                {
                    model: user_model_1.User,
                    as: 'user',
                },
            ],
        });
    }
}
exports.CabinetFollowerService = CabinetFollowerService;
