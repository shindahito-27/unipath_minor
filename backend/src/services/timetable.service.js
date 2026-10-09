import Faculty from '../models/faculty.model.js';
import Section from '../models/section.model.js';
import Timetable from '../models/timetable.model.js';
import { AppError } from '../utils/app-error.js';
import { detectConflicts } from './conflict-detection.service.js';
import { generateTimetable } from './timetable-generation.service.js';
import { withTimetableWriteLock } from './timetable-write-lock.service.js';
import { notifyStudentsInSections } from './notification.service.js';

const populateEntries = (query) => query
  .populate('section', 'name department semester studentCount')
  .populate('subject', 'code name department credits type')
  .populate('faculty', 'name email department')
  .populate('room', 'name building floor capacity type')
  .populate('createdBy', 'name');

function idOf(value) { return String(value?._id ?? value); }
function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

async function getReadScope(user) {
  if (user.role === 'ADMIN') return {};
  if (user.role === 'STUDENT') {
    if (!user.department || user.semester == null) return { section: { $in: [] } };
    const department = new RegExp(`^${escapeRegex(user.department.trim())}$`, 'i');
    const sections = await Section.find({ department, semester: user.semester }).select('_id').lean();
    return { section: { $in: sections.map(({ _id }) => _id) } };
  }
  if (user.role === 'FACULTY') {
    const faculty = await Faculty.findOne({ email: user.email }).select('_id').lean();
    return faculty ? { faculty: faculty._id } : { _id: null };
  }
  return { _id: null };
}

async function expandSectionFilters(filters) {
  if (!filters.section) return filters;
  const selected = await Section.findById(filters.section).select('_id parentSection').lean();
  if (!selected) return filters;
  if (selected.parentSection) return { ...filters, section: undefined, sectionIds: [selected._id, selected.parentSection] };
  const children = await Section.find({ parentSection: selected._id }).select('_id').lean();
  return { ...filters, section: undefined, sectionIds: [selected._id, ...children.map(({ _id }) => _id)] };
}

function buildReadFilter(scope, filters) {
  const clauses = [scope];
  for (const key of ['section', 'faculty', 'room', 'day']) {
    if (filters[key]) clauses.push({ [key]: filters[key] });
  }
  if (filters.sectionIds?.length) clauses.push({ section: { $in: filters.sectionIds } });
  return clauses.length === 1 ? clauses[0] : { $and: clauses };
}

function ensureValidRange(entry) {
  if (!(entry.startTime < entry.endTime)) throw new AppError(400, 'endTime must be later than startTime');
  if (entry.startTime < '14:00' && entry.endTime > '13:00') throw new AppError(400, 'Classes cannot overlap the reserved lunch break (13:00–14:00)');
}

async function createCheckedEntry(entry, user) {
  ensureValidRange(entry);
  const result = await detectConflicts(entry);
  if (result.hasConflict) throw new AppError(409, 'Timetable entry violates hard constraints', { hasConflict: true, conflicts: result.conflicts });
  const created = await Timetable.create({ ...entry, createdBy: user._id });
  await notifyStudentsInSections([entry.section], { title: 'Timetable updated', message: 'A class was added to your section timetable. Review your latest schedule.', type: 'TIMETABLE' });
  return created;
}

export async function listTimetable(user, filters) {
  const scope = await getReadScope(user);
  const expandedFilters = await expandSectionFilters(filters);
  const query = buildReadFilter(scope, expandedFilters);
  const data = await populateEntries(Timetable.find(query).sort({ day: 1, startTime: 1 })).lean();
  return { data, count: data.length };
}

export async function getTimetableEntry(id, user) {
  const scope = await getReadScope(user);
  const entry = await populateEntries(Timetable.findOne({ _id: id, ...scope })).lean();
  if (!entry) throw new AppError(404, 'Timetable entry not found');
  return entry;
}

export async function createTimetableEntry(entry, user) {
  return withTimetableWriteLock(() => createCheckedEntry(entry, user));
}

export async function updateTimetableEntry(id, changes) {
  return withTimetableWriteLock(async () => {
    const current = await Timetable.findById(id).lean();
    if (!current) throw new AppError(404, 'Timetable entry not found');
    const updated = { ...current, ...changes, _id: current._id };
    ensureValidRange(updated);
    const result = await detectConflicts(updated);
    if (result.hasConflict) throw new AppError(409, 'Timetable entry violates hard constraints', { hasConflict: true, conflicts: result.conflicts });
    const entry = await Timetable.findByIdAndUpdate(id, changes, { new: true, runValidators: true });
    await notifyStudentsInSections([current.section, entry.section], { title: 'Timetable updated', message: 'Your section timetable has changed. Review your latest schedule for updated class details.', type: 'TIMETABLE' });
    return entry;
  });
}

export async function deleteTimetableEntry(id) {
  return withTimetableWriteLock(async () => {
    const entry = await Timetable.findByIdAndDelete(id);
    if (!entry) throw new AppError(404, 'Timetable entry not found');
    await notifyStudentsInSections([entry.section], { title: 'Timetable updated', message: 'A class was removed from your section timetable. Review your latest schedule.', type: 'TIMETABLE' });
    return entry;
  });
}

export async function clearTimetable() {
  return withTimetableWriteLock(async () => {
    const sectionIds = await Timetable.distinct('section');
    const result = await Timetable.deleteMany({});
    if (sectionIds.length) {
      await notifyStudentsInSections(sectionIds, { title: 'Timetable cleared', message: 'The campus timetable was cleared by an administrator. Check back for the updated schedule.', type: 'TIMETABLE' });
    }
    return { deletedEntries: result.deletedCount || 0 };
  });
}

export async function checkTimetableConflicts(entry) {
  ensureValidRange(entry);
  return detectConflicts(entry);
}

export async function generateAndSaveTimetable(input, user) {
  return withTimetableWriteLock(async () => {
    const result = await generateTimetable(input, user._id);
    const sectionIds = [...new Set(result.data.map((entry) => String(entry.section)))];
    if (sectionIds.length) await notifyStudentsInSections(sectionIds, { title: 'Timetable updated', message: 'Your section timetable has been generated or updated. Review your latest schedule.', type: 'TIMETABLE' });
    return result;
  });
}
