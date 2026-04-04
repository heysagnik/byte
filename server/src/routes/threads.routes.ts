import { Router } from 'express';
import { authMiddleware, sseAuthMiddleware } from '../middleware/auth.middleware';
import {
  createThread,
  getThreads,
  sendMessage,
  approveOption,
  getMessages,
  deleteThread,
  streamThread,
} from '../controllers/threads.controller';

const router = Router();

// SSE stream is registered before the global authMiddleware because
// EventSource can't send headers — auth is handled via ?token= query param
router.get('/:id/events', sseAuthMiddleware, streamThread);

router.use(authMiddleware);

router.post('/', createThread);
router.get('/', getThreads);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);
router.post('/:id/approve', approveOption);
router.delete('/:id', deleteThread);

export default router;
