import { Router } from 'express';
import { z } from 'zod';
import * as quizController from '../controllers/quiz.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/require-role.js';
import { validateBody } from '../middleware/validate.js';
import { validateQuery } from '../middleware/validate-query.js';

const router = Router();
const canRead = requireRole('ADMIN', 'FACULTY', 'STUDENT');
const adminOnly = requireRole('ADMIN');
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:mm time');
const availabilityQuery = z.object({ date: z.string().date(), startTime: time, endTime: time }).strict().refine((value) => value.startTime < value.endTime, { path: ['endTime'], message: 'End time must be later than start time' });
const createQuizSchema = z.object({
  title: z.string().trim().min(1).max(160),
  subject: z.string().regex(/^[a-f\d]{24}$/i),
  section: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  sections: z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1).max(20).optional(),
  date: z.string().date(),
  startTime: time,
  endTime: time,
  studentCount: z.number().int().min(1).max(10000).optional(),
}).strict().refine((value) => value.sections?.length || value.section, { path: ['sections'], message: 'Select at least one section' }).refine((value) => value.startTime < value.endTime, { path: ['endTime'], message: 'End time must be later than start time' });
const allocateSchema = z.object({ availableRooms: z.array(z.string().regex(/^[a-f\d]{24}$/i)).optional(), facultyIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(100).optional() }).strict();

router.get('/', authenticate, canRead, quizController.list);
router.get('/availability', authenticate, adminOnly, validateQuery(availabilityQuery), quizController.availability);
router.post('/', authenticate, adminOnly, validateBody(createQuizSchema), quizController.create);
router.delete('/:id', authenticate, adminOnly, quizController.remove);
router.post('/:id/allocate', authenticate, adminOnly, validateBody(allocateSchema), quizController.allocate);

export default router;
