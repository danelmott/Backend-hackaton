import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import {
  getProfileController,
  updateProfileController,
} from './profile.controller.js';

const router = Router();

router.get('/', requireAuth, getProfileController);
router.patch('/', requireAuth, updateProfileController);

export default router;
