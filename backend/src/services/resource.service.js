import Faculty from '../models/faculty.model.js';
import Room from '../models/room.model.js';
import Section from '../models/section.model.js';
import Subject from '../models/subject.model.js';
import Timetable from '../models/timetable.model.js';
import Quiz from '../models/quiz.model.js';
import VenueAllocation from '../models/venue-allocation.model.js';
import { AppError } from '../utils/app-error.js';
import { withTimetableWriteLock } from './timetable-write-lock.service.js';

export const RESOURCE_DEFINITIONS = Object.freeze({
  rooms: { model: Room, searchFields: ['name', 'building', 'type'], fields: ['name', 'building', 'floor', 'capacity', 'type', 'isActive'] },
  faculty: { model: Faculty, searchFields: ['name', 'email', 'department'], fields: ['name', 'email', 'department', 'availability'] },
  subjects: { model: Subject, searchFields: ['code', 'name', 'department', 'type'], fields: ['code', 'name', 'department', 'credits', 'type'] },
  sections: { model: Section, searchFields: ['name', 'department', 'cohort'], fields: ['name', 'department', 'semester', 'studentCount', 'sectionType', 'cohort', 'parentSection', 'rollNumberStart', 'rollNumberEnd', 'isActive', 'curriculum'] },
});

export function getResourceDefinition(resource) {
  const definition = RESOURCE_DEFINITIONS[resource];
  if (!definition) throw new AppError(404, 'Resource type not found');
  return definition;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function departmentPattern(value) {
  return new RegExp(`^${escapeRegex(value.trim())}$`, 'i');
}

function buildScope(resource, user) {
  if (user.role !== 'STUDENT') return {};
  if (resource === 'rooms') return { isActive: true };
  if (!user.department) return { _id: null };
  if (resource === 'sections') {
    return user.semester == null ? { _id: null } : { department: departmentPattern(user.department), semester: user.semester };
  }
  if (resource === 'faculty' || resource === 'subjects') return { department: departmentPattern(user.department) };
  return { _id: null };
}

function buildFilter(resource, user, filters = {}) {
  const definition = getResourceDefinition(resource);
  const query = { ...buildScope(resource, user) };
  if (resource === 'sections') query.isActive = filters.isActive === 'false' ? false : true;

  if (filters.search) {
    const pattern = new RegExp(escapeRegex(filters.search.trim()), 'i');
    query.$or = definition.searchFields.map((field) => ({ [field]: pattern }));
  }
  if (user.role !== 'STUDENT') {
    if (filters.department) query.department = filters.department;
    if (filters.semester) query.semester = Number(filters.semester);
    if (filters.type) query.type = filters.type;
    if (filters.isActive != null && filters.isActive !== '') query.isActive = filters.isActive === 'true';
  }
  return query;
}

export async function listResources(resource, user, filters) {
  const { model } = getResourceDefinition(resource);
  const data = await model.find(buildFilter(resource, user, filters)).sort({ name: 1 }).lean();
  if (resource === 'sections') {
    const parents = await Section.find({ _id: { $in: data.map((item) => item.parentSection).filter(Boolean) } }).select('_id name').lean();
    const names = new Map(parents.map((item) => [String(item._id), item.name]));
    for (const item of data) item.parentSectionName = names.get(String(item.parentSection)) || null;
  }
  return { data, count: data.length };
}

export async function getResource(resource, id, user) {
  const { model } = getResourceDefinition(resource);
  const item = await model.findOne({ _id: id, ...buildScope(resource, user) }).lean();
  if (!item) throw new AppError(404, 'Resource not found');
  return item;
}

export async function createResource(resource, input) {
  const { model } = getResourceDefinition(resource);
  return model.create(input);
}

export async function updateResource(resource, id, input) {
  return withTimetableWriteLock(async () => {
    const { model } = getResourceDefinition(resource);
    const current = await model.findById(id).lean();
    if (!current) throw new AppError(404, 'Resource not found');
    const updated = { ...current, ...input };
    const referenceField = { rooms: 'room', faculty: 'faculty', subjects: 'subject', sections: 'section' }[resource];
    const scheduled = await Timetable.find({ [referenceField]: id })
      .populate('section', 'name studentCount')
      .populate('subject', 'code type')
      .populate('room', 'name capacity type').lean();

    const conflicts = [];
    if (resource === 'rooms') {
      for (const entry of scheduled) {
        if (entry.section.studentCount > updated.capacity) conflicts.push({ type: 'ROOM_CAPACITY_VIOLATION', message: `Room capacity cannot be reduced below the ${entry.section.name} section size (${entry.section.studentCount}).` });
        if (entry.subject.type === 'LAB' && updated.type !== 'LAB') conflicts.push({ type: 'LAB_ROOM_MISMATCH', message: `Room ${updated.name} is assigned to lab subject ${entry.subject.code} and must remain a LAB.` });
      }
    }
    if (resource === 'sections') {
      for (const entry of scheduled) {
        if (entry.room.capacity < updated.studentCount) conflicts.push({ type: 'ROOM_CAPACITY_VIOLATION', message: `Section ${updated.name} has a scheduled room with capacity ${entry.room.capacity}, below the new size ${updated.studentCount}.` });
      }
    }
    if (resource === 'subjects' && updated.type === 'LAB') {
      for (const entry of scheduled) {
        if (entry.room.type !== 'LAB') conflicts.push({ type: 'LAB_ROOM_MISMATCH', message: `Subject ${updated.code} is assigned to non-LAB room ${entry.room.name}.` });
      }
    }
    if (resource === 'rooms') {
      const allocations = await VenueAllocation.find({ room: id }).populate('quiz', 'status').lean();
      for (const allocation of allocations) {
        if (allocation.quiz?.status !== 'CANCELLED' && (!updated.isActive || updated.capacity < allocation.allocatedStudents)) {
          conflicts.push({ type: 'VENUE_ALLOCATION_INVALIDATION', message: `Room ${current.name} is assigned ${allocation.allocatedStudents} quiz students and must remain active with sufficient capacity.` });
        }
      }
    }
    if (conflicts.length) throw new AppError(409, 'Resource change would invalidate existing timetable entries', { conflicts });

    return model.findByIdAndUpdate(id, input, { new: true, runValidators: true });
  });
}

export async function deleteResource(resource, id) {
  return withTimetableWriteLock(async () => {
    const { model } = getResourceDefinition(resource);
    const referenceField = { rooms: 'room', faculty: 'faculty', subjects: 'subject', sections: 'section' }[resource];
    const referenced = await Timetable.exists({ [referenceField]: id });
    if (referenced) throw new AppError(409, 'Resource is referenced by timetable entries and cannot be deleted');
    const quizReferenced = resource === 'rooms'
      ? await VenueAllocation.exists({ room: id })
      : resource === 'subjects'
        ? await Quiz.exists({ subject: id })
        : resource === 'sections'
          ? await Quiz.exists({ $or: [{ section: id }, { sections: id }] })
        : false;
    if (quizReferenced) throw new AppError(409, 'Resource is referenced by quizzes or venue allocations and cannot be deleted');
    const item = await model.findByIdAndDelete(id);
    if (!item) throw new AppError(404, 'Resource not found');
    return item;
  });
}
