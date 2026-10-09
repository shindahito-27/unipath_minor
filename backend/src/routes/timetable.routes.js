import { Router } from 'express';
import * as timetableController from '../controllers/timetable.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/require-role.js';
import { validateBody } from '../middleware/validate.js';
import { validateQuery } from '../middleware/validate-query.js';
import { timetableEntrySchema, timetableGenerationSchema, timetableQuerySchema, timetableUpdateSchema } from '../services/timetable-validation.service.js';

const router = Router();
const canRead = requireRole('ADMIN', 'FACULTY', 'STUDENT');
const adminOnly = requireRole('ADMIN');

router.get('/', authenticate, canRead, validateQuery(timetableQuerySchema), timetableController.list);
router.post('/generate', authenticate, adminOnly, validateBody(timetableGenerationSchema), timetableController.generate);
router.post('/check-conflict', authenticate, adminOnly, validateBody(timetableEntrySchema), timetableController.checkConflicts);
router.post('/', authenticate, adminOnly, validateBody(timetableEntrySchema), timetableController.create);
router.delete('/', authenticate, adminOnly, timetableController.clear);
router.get('/:id', authenticate, canRead, timetableController.get);
router.patch('/:id', authenticate, adminOnly, validateBody(timetableUpdateSchema), timetableController.update);
router.delete('/:id', authenticate, adminOnly, timetableController.remove);

export default router;
