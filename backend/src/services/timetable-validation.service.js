import { z } from 'zod';
import { WEEK_DAYS } from '../models/timetable.model.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Expected a valid resource ID');
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Time must use 24-hour HH:mm format');

const entryFields = {
  section: objectId,
  subject: objectId,
  faculty: objectId,
  room: objectId,
  day: z.enum(WEEK_DAYS),
  startTime: time,
  endTime: time,
};

export const timetableEntrySchema = z.object(entryFields).strict().refine((entry) => entry.startTime < entry.endTime, {
  message: 'endTime must be later than startTime', path: ['endTime'],
});

export const timetableUpdateSchema = z.object(entryFields).partial().strict()
  .refine((entry) => Object.keys(entry).length > 0, 'At least one field is required')
  .refine((entry) => !entry.startTime || !entry.endTime || entry.startTime < entry.endTime, {
    message: 'endTime must be later than startTime', path: ['endTime'],
  });

const idList = (max = 100) => z.array(objectId).min(1).max(max)
  .refine((values) => new Set(values).size === values.length, 'Resource IDs must be unique');
const timeSlot = z.object({ startTime: time, endTime: time }).strict()
  .refine((slot) => slot.startTime < slot.endTime, { message: 'endTime must be later than startTime', path: ['endTime'] })
  .refine((slot) => !(slot.startTime < '14:00' && slot.endTime > '13:00'), { message: 'Time slots cannot overlap lunch (13:00–14:00)', path: ['startTime'] });

export const timetableGenerationSchema = z.object({
  sections: idList(100),
  subjects: idList(100),
  faculty: idList(100),
  rooms: idList(100),
  availableDays: z.array(z.enum(WEEK_DAYS)).min(1).max(5)
    .refine((values) => new Set(values).size === values.length, 'Days must be unique'),
  timeSlots: z.array(timeSlot).min(1).max(30),
  weeklyLoads: z.array(z.object({
    subject: objectId,
    lecturesPerWeek: z.coerce.number().int().min(0).max(20),
    labsPerWeek: z.coerce.number().int().min(0).max(20),
    labDurationHours: z.coerce.number().min(1).max(4),
    lectureDurationHours: z.coerce.number().min(1).max(4).optional(),
  }).strict()).max(100).optional(),
  replaceExisting: z.boolean().optional(),
}).strict();

export const timetableQuerySchema = z.object({
  section: objectId.optional(),
  faculty: objectId.optional(),
  room: objectId.optional(),
  day: z.enum(WEEK_DAYS).optional(),
}).strict();
