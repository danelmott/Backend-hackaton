import * as chatControllers from './controllers/chat.controllers.js'
import { requireAuth } from '../middlewares/requireAuth.js'
import { Router } from 'express';

const router = Router();

router.get('/', requireAuth, chatControllers.getUserChatsController);
router.post('/', requireAuth, chatControllers.createChatController);
router.get('/:id', requireAuth, chatControllers.getChatByIdController);
router.put('/:id', requireAuth, chatControllers.updateChatController);
router.delete('/:id', requireAuth, chatControllers.deleteChatController);

export default router;