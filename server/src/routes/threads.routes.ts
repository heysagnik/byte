import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  createThread,
  getThreads,
  sendMessage,
  approveOption,
  getMessages,
} from '../controllers/threads.controller';

const router = Router();

router.use(authMiddleware);

router.post('/', createThread);
router.get('/', getThreads);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);
router.post('/:id/approve', approveOption);

export default router;
