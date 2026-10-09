import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/require-role.js';

const router = Router();
router.get('/', authenticate, requireRole('ADMIN'), (_request, response) => {
  response.json({ success: true, message: 'Admin access granted' });
});

export default router;
