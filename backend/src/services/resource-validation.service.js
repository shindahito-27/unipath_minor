import { z } from 'zod';
import { ROOM_TYPES } from '../models/room.model.js';
import { SUBJECT_TYPES } from '../models/subject.model.js';
import { AppError } from '../utils/app-error.js';

const roomSchema = z.object({
  name: z.string().trim().min(1).max(100),
  building: z.string().trim().min(1).max(100),
  floor: z.coerce.number().int().min(-5).max(200),
  capacity: z.coerce.number().int().min(1).max(10000),
  type: z.enum(ROOM_TYPES),
  isActive: z.boolean().optional(),
}).strict();
const facultySchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  department: z.string().trim().min(1).max(100),
  availability: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
}).strict();
const subjectSchema = z.object({
  code: z.string().trim().min(1).max(20).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(150),
  department: z.string().trim().min(1).max(100),
  credits: z.coerce.number().int().min(1).max(12),
  type: z.enum(SUBJECT_TYPES),
}).strict();
const sectionSchema = z.object({
  name: z.string().trim().min(1).max(100),
  department: z.string().trim().min(1).max(100),
  semester: z.coerce.number().int().min(1).max(16),
  studentCount: z.coerce.number().int().min(0).max(10000),
  sectionType: z.enum(['LECTURE', 'LAB']).default('LECTURE'),
  cohort: z.string().trim().max(100).default(''),
  parentSection: z.union([z.string().regex(/^[a-f\d]{24}$/i), z.literal(''), z.null()]).optional().transform((value) => value || null),
  rollNumberStart: z.coerce.number().int().min(1).optional(),
  rollNumberEnd: z.coerce.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  curriculum: z.array(z.object({
    subject: z.string().regex(/^[a-f\d]{24}$/i),
    lecturesPerWeek: z.coerce.number().int().min(0).max(20),
    labsPerWeek: z.coerce.number().int().min(0).max(20),
    lectureDurationHours: z.coerce.number().min(1).max(4).default(1),
    labDurationHours: z.coerce.number().min(1).max(4),
  }).strict()).max(50).default([]),
}).strict();

const schemas = Object.freeze({ rooms: roomSchema, faculty: facultySchema, subjects: subjectSchema, sections: sectionSchema });
const querySchema = z.object({
  search: z.string().trim().max(100).optional(),
  department: z.string().trim().max(100).optional(),
  semester: z.coerce.number().int().min(1).max(16).optional(),
  type: z.string().trim().max(30).optional(),
  isActive: z.enum(['true', 'false']).optional(),
}).strict();

export function getResourceSchema(resource, partial = false) {
  const schema = schemas[resource];
  if (!schema) throw new AppError(404, 'Resource type not found');
  if (!partial) return schema;
  return schema.partial().refine((value) => Object.keys(value).length > 0, 'At least one field is required');
}

export function getResourceQuerySchema() {
  return querySchema;
}
