import { Router } from 'express';
import * as resourceController from '../controllers/resource.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/require-role.js';
import { validateResourceCreate, validateResourceQuery, validateResourceUpdate } from '../middleware/validate-resource.js';

const router = Router();
const canRead = requireRole('ADMIN', 'FACULTY', 'STUDENT');
const adminOnly = requireRole('ADMIN');

router.get('/:resource', authenticate, canRead, validateResourceQuery, resourceController.list);
router.get('/:resource/:id', authenticate, canRead, resourceController.get);
router.post('/:resource', authenticate, adminOnly, validateResourceCreate, resourceController.create);
router.patch('/:resource/:id', authenticate, adminOnly, validateResourceUpdate, resourceController.update);
router.delete('/:resource/:id', authenticate, adminOnly, resourceController.remove);

export default router;
