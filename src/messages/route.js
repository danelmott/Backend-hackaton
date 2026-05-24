import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import * as messageControllers from './controllers/message.controllers.js';

const router = Router();

router.post('/:id', requireAuth, messageControllers.sendMessageController);
//aun no se utiliza
router.delete('/:id', requireAuth, messageControllers.deleteMessageController);

export default router;