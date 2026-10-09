import Faculty from '../models/faculty.model.js';
import Quiz from '../models/quiz.model.js';
import Room from '../models/room.model.js';
import Section from '../models/section.model.js';
import Subject from '../models/subject.model.js';
import Timetable, { WEEK_DAYS } from '../models/timetable.model.js';
import VenueAllocation from '../models/venue-allocation.model.js';
import { AppError } from '../utils/app-error.js';
import { intervalsOverlap } from './conflict-detection.service.js';
import { withTimetableWriteLock } from './timetable-write-lock.service.js';
import { notifyStudentsInSections } from './notification.service.js';

const dayName = ['SUNDAY', ...WEEK_DAYS, 'SATURDAY'];
const sameDate = (left, right) => new Date(left).toISOString().slice(0, 10) === new Date(right).toISOString().slice(0, 10);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function validateRange(startTime, endTime) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) || startTime >= endTime) {
    throw new AppError(400, 'Quiz end time must be later than its start time');
  }
}

export async function createQuiz(input, user) {
  validateRange(input.startTime, input.endTime);
  const sectionIds = [...new Set((input.sections || [input.section]).filter(Boolean).map(String))];
  const [subject, sections] = await Promise.all([Subject.exists({ _id: input.subject }), Section.find({ _id: { $in: sectionIds } }).lean()]);
  if (!subject) throw new AppError(404, 'Subject not found');
  if (sections.length !== sectionIds.length) throw new AppError(404, 'One or more sections were not found');
  const studentCount = sections.reduce((total, section) => total + section.studentCount, 0);
  return Quiz.create({ ...input, section: sections[0]._id, sections: sections.map(({ _id }) => _id), studentCount, createdBy: user._id });
}

export async function listQuizzes(user) {
  const filter = {};
  if (user.role === 'STUDENT') {
    if (!user.department || user.semester == null) filter.$or = [{ section: { $in: [] } }, { sections: { $in: [] } }];
    const sections = user.department && user.semester != null
      ? await Section.find({ department: new RegExp(`^${escapeRegex(user.department.trim())}$`, 'i'), semester: user.semester }).select('_id').lean()
      : [];
    if (user.department && user.semester != null) filter.$or = [{ section: { $in: sections.map(({ _id }) => _id) } }, { sections: { $in: sections.map(({ _id }) => _id) } }];
  } else if (user.role === 'FACULTY') {
    const faculty = await Faculty.findOne({ email: user.email }).select('_id').lean();
    const scheduled = faculty ? await Timetable.find({ faculty: faculty._id }).select('section subject').lean() : [];
    const sectionIds = [...new Set(scheduled.map((item) => String(item.section)))];
    const bookings = faculty ? await VenueAllocation.find({ faculty: faculty._id }).select('quiz').lean() : [];
    const quizIds = bookings.map(({ quiz }) => quiz);
    filter.$or = [{ section: { $in: sectionIds } }, { sections: { $in: sectionIds } }, { _id: { $in: quizIds } }];
  }
  const quizzes = await Quiz.find(filter).populate('subject', 'code name type').populate('section', 'name department semester studentCount').populate('sections', 'name department semester studentCount').populate('createdBy', 'name').sort({ date: 1, startTime: 1 }).lean();
  const allocations = await VenueAllocation.find({ quiz: { $in: quizzes.map((quiz) => quiz._id) } }).populate('room', 'name building floor capacity type isActive').populate('faculty', 'name email department').lean();
  const byQuiz = new Map();
  for (const item of allocations) byQuiz.set(String(item.quiz), [...(byQuiz.get(String(item.quiz)) || []), item]);
  return quizzes.map((quiz) => ({ ...quiz, allocations: byQuiz.get(String(quiz._id)) || [] }));
}

/** Greedy best-fit allocation: fill the tightest room that fits the remainder, otherwise the largest remaining room. */
export async function venueAllocator({ studentCount, date, startTime, endTime, availableRooms, quizId }) {
  validateRange(startTime, endTime);
  if (!Number.isInteger(studentCount) || studentCount < 1) throw new AppError(400, 'studentCount must be a positive integer');
  const ids = [...new Set((availableRooms || []).map(String))];
  const roomFilter = Array.isArray(availableRooms) ? { _id: { $in: ids } } : {};
  const allRooms = await Room.find(roomFilter).lean();
  const activeRooms = allRooms.filter((room) => room.isActive);
  const quizFilter = { date: { $gte: new Date(`${new Date(date).toISOString().slice(0, 10)}T00:00:00.000Z`), $lt: new Date(`${new Date(date).toISOString().slice(0, 10)}T23:59:59.999Z`) }, status: { $ne: 'CANCELLED' } };
  if (quizId) quizFilter._id = { $ne: quizId };
  const otherQuizzes = await Quiz.find(quizFilter).select('_id date startTime endTime').lean();
  const otherIds = otherQuizzes.map((quiz) => quiz._id);
  const allocations = otherIds.length ? await VenueAllocation.find({ quiz: { $in: otherIds } }).select('quiz room').lean() : [];
  const roomQuizIds = new Map();
  for (const allocation of allocations) roomQuizIds.set(String(allocation.room), [...(roomQuizIds.get(String(allocation.room)) || []), String(allocation.quiz)]);
  const quizzesById = new Map(otherQuizzes.map((quiz) => [String(quiz._id), quiz]));
  const weekday = dayName[new Date(`${new Date(date).toISOString().slice(0, 10)}T00:00:00.000Z`).getUTCDay()];
  const timetableMatches = WEEK_DAYS.includes(weekday)
    ? await Timetable.find({ day: weekday, room: { $in: activeRooms.map(({ _id }) => _id) }, startTime: { $lt: endTime }, endTime: { $gt: startTime } }).select('room startTime endTime').lean()
    : [];
  const reservedRoomIds = new Set();
  for (const room of activeRooms) {
    for (const id of roomQuizIds.get(String(room._id)) || []) {
      const other = quizzesById.get(id);
      if (other && sameDate(other.date, date) && intervalsOverlap(startTime, endTime, other.startTime, other.endTime)) reservedRoomIds.add(String(room._id));
    }
  }
  for (const entry of timetableMatches) if (intervalsOverlap(startTime, endTime, entry.startTime, entry.endTime)) reservedRoomIds.add(String(entry.room));

  const roomAvailability = allRooms.map((room) => ({ room, available: room.isActive && !reservedRoomIds.has(String(room._id)), reason: !room.isActive ? 'Venue is inactive' : reservedRoomIds.has(String(room._id)) ? 'Overlaps a class or another quiz' : undefined }));
  const suitable = activeRooms.filter((room) => room.capacity > 0 && !reservedRoomIds.has(String(room._id))).sort((a, b) => a.capacity - b.capacity || a.name.localeCompare(b.name));
  let remaining = studentCount;
  const chosen = [];
  while (remaining > 0 && suitable.length) {
    let index = suitable.findIndex((room) => room.capacity >= remaining);
    if (index < 0) index = suitable.length - 1;
    const [room] = suitable.splice(index, 1);
    const count = Math.min(room.capacity, remaining);
    chosen.push({ room, allocatedStudents: count });
    remaining -= count;
  }
  let nextRoll = 1;
  const resultAllocations = chosen.map(({ room, allocatedStudents }) => {
    const allocation = { room, allocatedStudents, rollNumberStart: nextRoll, rollNumberEnd: nextRoll + allocatedStudents - 1 };
    nextRoll += allocatedStudents;
    return allocation;
  });
  return {
    success: remaining === 0,
    totalStudents: studentCount,
    allocatedStudents: studentCount - remaining,
    studentsRemaining: remaining,
    roomsUsed: resultAllocations.length,
    allocations: resultAllocations,
    roomAvailability,
    reason: remaining ? (Array.isArray(availableRooms) && availableRooms.length === 0 ? 'No rooms were selected for allocation.' : activeRooms.length === 0 ? 'No active rooms are available in the selected room list.' : `Available rooms could not accommodate ${remaining} student${remaining === 1 ? '' : 's'} after checking capacity and schedule conflicts.`) : undefined,
  };
}

export async function allocateQuizVenues(quizId, input = {}) {
  return withTimetableWriteLock(async () => {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new AppError(404, 'Quiz not found');
    const previous = await VenueAllocation.find({ quiz: quiz._id }).populate('room', 'name').populate('faculty', 'name').lean();
    const result = await venueAllocator({ studentCount: quiz.studentCount, date: quiz.date, startTime: quiz.startTime, endTime: quiz.endTime, availableRooms: input.availableRooms, quizId: quiz._id });
    let facultyAssignments = [];
    let facultyById = new Map();
    if (input.facultyIds?.length) {
      const facultyIds = [...new Set(input.facultyIds.map(String))];
      const candidates = await Faculty.find({ _id: { $in: facultyIds } }).lean();
      facultyById = new Map(candidates.map((person) => [String(person._id), person]));
      if (candidates.length !== facultyIds.length) throw new AppError(400, 'One or more selected faculty members were not found');
      const required = result.roomsUsed * 2;
      if (candidates.length < required) throw new AppError(400, `Select at least ${required} faculty members to book two per venue`);
      const quizDate = new Date(`${quiz.date.toISOString().slice(0, 10)}T00:00:00.000Z`);
      const weekday = dayName[quizDate.getUTCDay()];
      const [classes, bookings] = await Promise.all([
        Timetable.find({ faculty: { $in: facultyIds }, day: weekday, startTime: { $lt: quiz.endTime }, endTime: { $gt: quiz.startTime } }).select('faculty').lean(),
        VenueAllocation.find({ faculty: { $in: facultyIds }, quiz: { $ne: quiz._id } }).populate({ path: 'quiz', match: { date: { $gte: quizDate, $lt: new Date(quizDate.getTime() + 86400000) }, status: { $ne: 'CANCELLED' } }, select: 'startTime endTime' }).select('faculty quiz').lean(),
      ]);
      const busy = new Set(classes.map((entry) => String(entry.faculty)));
      for (const booking of bookings) if (booking.quiz && intervalsOverlap(quiz.startTime, quiz.endTime, booking.quiz.startTime, booking.quiz.endTime)) for (const id of booking.faculty || []) busy.add(String(id));
      const free = candidates.filter((person) => !busy.has(String(person._id)));
      if (free.length < required) throw new AppError(409, `Only ${free.length} selected faculty are available; ${required} are required (2 per venue)`);
      facultyAssignments = Array.from({ length: result.roomsUsed }, (_, index) => free.slice(index * 2, index * 2 + 2).map(({ _id }) => _id));
    }
    await VenueAllocation.deleteMany({ quiz: quiz._id });
    if (result.allocations.length) await VenueAllocation.insertMany(result.allocations.map(({ room, ...item }, index) => ({ ...item, room: room._id, faculty: facultyAssignments[index] || [], quiz: quiz._id })));
    quiz.status = result.success ? 'ALLOCATED' : 'PARTIALLY_ALLOCATED';
    await quiz.save();
    const allocationKey = (items) => items.map((item) => `${String(item.room?._id ?? item.room)}:${item.allocatedStudents}:${item.rollNumberStart}-${item.rollNumberEnd}:${(item.faculty || []).map((person) => String(person?._id ?? person)).sort().join(',')}`).sort().join('|');
    if (allocationKey(previous) !== allocationKey(result.allocations)) {
      const venueSummary = result.allocations.map((item) => `${item.room.name} (rolls ${item.rollNumberStart}–${item.rollNumberEnd})`).join(', ');
      const message = result.success
        ? `${quiz.title} on ${quiz.date.toISOString().slice(0, 10)} is allocated to ${venueSummary}.`
        : venueSummary ? `${quiz.title} has a partial venue allocation: ${venueSummary}. ${result.studentsRemaining} students remain unassigned.` : `${quiz.title} venue allocation changed, but no rooms are currently assigned. Contact your department for details.`;
      await notifyStudentsInSections(quiz.sections?.length ? quiz.sections : [quiz.section], { title: 'Quiz venue updated', message, type: 'QUIZ' });
    }
    return { ...result, allocations: result.allocations.map(({ room, ...allocation }, index) => ({ ...allocation, faculty: (facultyAssignments[index] || []).map((id) => facultyById.get(String(id)) || id), room: { _id: room._id, name: room.name, building: room.building, floor: room.floor, capacity: room.capacity, type: room.type } })) };
  });
}

export async function checkQuizAvailability({ date, startTime, endTime }) {
  if (!date || !startTime || !endTime) throw new AppError(400, 'date, startTime and endTime are required');
  validateRange(startTime, endTime);
  const result = await venueAllocator({ studentCount: 1, date, startTime, endTime });
  return { rooms: result.roomAvailability.map(({ room, available, reason }) => ({ _id: room._id, name: room.name, building: room.building, floor: room.floor, capacity: room.capacity, type: room.type, available, reason })) };
}

export async function deleteQuiz(quizId) {
  return withTimetableWriteLock(async () => {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new AppError(404, 'Quiz not found');
    await VenueAllocation.deleteMany({ quiz: quiz._id });
    await Quiz.deleteOne({ _id: quiz._id });
    return { deleted: true, releasedAllocations: true };
  });
}
