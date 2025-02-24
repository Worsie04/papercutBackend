"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CabinetFollowerController = void 0;
const cabinet_follower_service_1 = require("../../services/cabinet-follower.service");
class CabinetFollowerController {
    constructor() {
        this.followCabinet = async (req, res) => {
            var _a;
            try {
                const { cabinetId } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ message: 'Unauthorized' });
                    return;
                }
                const follower = await this.cabinetFollowerService.followCabinet(userId, cabinetId);
                res.status(201).json(follower);
            }
            catch (error) {
                res.status(500).json({ message: 'Error following cabinet', error });
            }
        };
        this.unfollowCabinet = async (req, res) => {
            var _a;
            try {
                const { cabinetId } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ message: 'Unauthorized' });
                    return;
                }
                await this.cabinetFollowerService.unfollowCabinet(userId, cabinetId);
                res.status(200).json({ message: 'Successfully unfollowed cabinet' });
            }
            catch (error) {
                res.status(500).json({ message: 'Error unfollowing cabinet', error });
            }
        };
        this.isFollowing = async (req, res) => {
            var _a;
            try {
                const { cabinetId } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ message: 'Unauthorized' });
                    return;
                }
                const isFollowing = await this.cabinetFollowerService.isFollowing(userId, cabinetId);
                res.status(200).json({ isFollowing });
            }
            catch (error) {
                res.status(500).json({ message: 'Error checking follow status', error });
            }
        };
        this.getFollowedCabinets = async (req, res) => {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ message: 'Unauthorized' });
                    return;
                }
                const followedCabinets = await this.cabinetFollowerService.getFollowedCabinets(userId);
                res.status(200).json(followedCabinets);
            }
            catch (error) {
                res.status(500).json({ message: 'Error getting followed cabinets', error });
            }
        };
        this.getCabinetFollowers = async (req, res) => {
            try {
                const { cabinetId } = req.params;
                const followers = await this.cabinetFollowerService.getCabinetFollowers(cabinetId);
                res.status(200).json(followers);
            }
            catch (error) {
                res.status(500).json({ message: 'Error getting cabinet followers', error });
            }
        };
        this.cabinetFollowerService = new cabinet_follower_service_1.CabinetFollowerService();
    }
}
exports.CabinetFollowerController = CabinetFollowerController;
