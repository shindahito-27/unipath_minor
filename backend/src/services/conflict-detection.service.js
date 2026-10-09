import Faculty from '../models/faculty.model.js';
import Room from '../models/room.model.js';
import Section from '../models/section.model.js';
import Subject from '../models/subject.model.js';
import Timetable from '../models/timetable.model.js';
import { AppError } from '../utils/app-error.js';

export function intervalsOverlap(firstStart, firstEnd, secondStart, secondEnd) {
  return firstStart < secondEnd && firstEnd > secondStart;
}

function refId(value) {
  return String(value?._id ?? value);
}

function conflict(type, message, entry) {
  return {
    type,
    message,
    ...(entry?._id ? { conflictingEntryId: String(entry._id), day: entry.day, startTime: entry.startTime, endTime: entry.endTime } : {}),
  };
}

export async function detectConflicts(timetableEntry) {
  const [section, subject, faculty, room] = await Promise.all([
    Section.findById(refId(timetableEntry.section)).lean(),
    Subject.findById(refId(timetableEntry.subject)).lean(),
    Faculty.findById(refId(timetableEntry.faculty)).lean(),
    Room.findById(refId(timetableEntry.room)).lean(),
  ]);
  if (!section || !subject || !faculty || !room) throw new AppError(404, 'One or more timetable resources were not found');

  const conflicts = [];
  if (room.capacity < section.studentCount) {
    conflicts.push(conflict('ROOM_CAPACITY_VIOLATION', `Room ${room.name} seats ${room.capacity}, but section ${section.name} has ${section.studentCount} students.`));
  }
  if (subject.type === 'LAB' && room.type !== 'LAB') {
    conflicts.push(conflict('LAB_ROOM_MISMATCH', `Lab subject ${subject.code} must be assigned to a LAB room.`));
  }

  const overlapping = await Timetable.find({
    day: timetableEntry.day,
    startTime: { $lt: timetableEntry.endTime },
    endTime: { $gt: timetableEntry.startTime },
    ...(timetableEntry._id ? { _id: { $ne: timetableEntry._id } } : {}),
  }).select('section faculty room day startTime endTime').lean();

  for (const other of overlapping) {
    if (refId(other.faculty) === refId(timetableEntry.faculty)) {
      conflicts.push(conflict('FACULTY_OVERLAP', `Faculty ${faculty.name} already has a class on ${other.day} from ${other.startTime} to ${other.endTime}.`, other));
    }
    if (refId(other.room) === refId(timetableEntry.room)) {
      conflicts.push(conflict('ROOM_OVERLAP', `Room ${room.name} is already booked on ${other.day} from ${other.startTime} to ${other.endTime}.`, other));
    }
    if (refId(other.section) === refId(timetableEntry.section)) {
      conflicts.push(conflict('SECTION_OVERLAP', `Section ${section.name} already has a class on ${other.day} from ${other.startTime} to ${other.endTime}.`, other));
    }
  }

  return { hasConflict: conflicts.length > 0, conflicts };
}
