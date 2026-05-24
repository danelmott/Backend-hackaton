import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import * as adminControllers from './admin.controllers.js';

const router = Router();

router.use(requireAuth);
router.use(requireRole('ADMIN'));

router.get('/dashboard', adminControllers.dashboardController);
router.get('/leads', adminControllers.leadsController);
router.get('/notifications/stream', adminControllers.notificationsStreamController);
router.get('/users/:userId', adminControllers.userDetailController);

export default router;
