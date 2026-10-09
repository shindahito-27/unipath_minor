import { Router } from 'express';
import { z } from 'zod';
import * as eventController from '../controllers/event.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/require-role.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();
const canRead = requireRole('ADMIN', 'FACULTY', 'STUDENT');
const adminOnly = requireRole('ADMIN');
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:mm time');
const eventBaseSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(3000).optional().default(''),
  date: z.string().date(),
  startTime: time,
  endTime: time,
  venue: z.string().trim().min(1).max(160),
  organizer: z.string().trim().min(1).max(160),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
}).strict();
const eventSchema = eventBaseSchema.refine((value) => value.startTime < value.endTime, { path: ['endTime'], message: 'End time must be later than start time' });
const eventUpdateSchema = eventBaseSchema.partial().refine((value) => !value.startTime || !value.endTime || value.startTime < value.endTime, { path: ['endTime'], message: 'End time must be later than start time' });
const statusSchema = z.object({ status: z.enum(['DRAFT', 'PUBLISHED']) }).strict();

router.get('/', authenticate, canRead, eventController.list);
router.post('/', authenticate, adminOnly, validateBody(eventSchema), eventController.create);
router.patch('/:id/status', authenticate, adminOnly, validateBody(statusSchema), eventController.setStatus);
router.patch('/:id', authenticate, adminOnly, validateBody(eventUpdateSchema), eventController.update);
router.delete('/:id', authenticate, adminOnly, eventController.remove);

export default router;
