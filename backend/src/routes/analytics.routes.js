import { Router } from 'express';
import { getAdminDashboard } from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/require-role.js';

const router = Router();
router.get('/admin', authenticate, requireRole('ADMIN'), getAdminDashboard);
export default router;
