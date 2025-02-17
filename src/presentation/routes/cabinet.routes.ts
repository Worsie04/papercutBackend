import { Router } from 'express';
import { CabinetController } from '../controllers/cabinet.controller';
import { CabinetFollowerController } from '../controllers/cabinet-follower.controller';
import { RecordController } from '../controllers/record.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const cabinetFollowerController = new CabinetFollowerController();

router.use(authenticate('user'));

// Cabinet routes
router.post('/', CabinetController.createCabinet);
router.get('/approved', CabinetController.getApprovedCabinets);
router.get('/followedCabinets', cabinetFollowerController.getFollowedCabinets);
router.get('/', CabinetController.getCabinets);
router.post('/assign', CabinetController.assignCabinetsToUsers);
router.post('/assign-with-permissions', CabinetController.assignUsersWithPermissions);

// Cabinet ID specific routes
router.get('/:id', CabinetController.getCabinet);
router.post('/:id/approve', CabinetController.approveCabinet);
router.post('/:id/reject', CabinetController.rejectCabinet);

// Record routes
router.get('/:cabinetId/records', RecordController.getCabinetRecords);

// Follow/unfollow routes
router.post('/:cabinetId/follow', cabinetFollowerController.followCabinet);
router.delete('/:cabinetId/follow', cabinetFollowerController.unfollowCabinet);
router.get('/:cabinetId/follow', cabinetFollowerController.isFollowing);
router.get('/:cabinetId/followers', cabinetFollowerController.getCabinetFollowers);

export default router; 