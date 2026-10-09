import Faculty from '../models/faculty.model.js';
import Room from '../models/room.model.js';
import Section from '../models/section.model.js';
import Subject from '../models/subject.model.js';
import Timetable from '../models/timetable.model.js';
import { intervalsOverlap } from './conflict-detection.service.js';
import { AppError } from '../utils/app-error.js';

const SEARCH_NODE_LIMIT = 100000;
const CANDIDATE_OPTION_LIMIT = 250000;
const ASSIGNMENT_LIMIT = 300;

function idOf(value) { return String(value?._id ?? value); }
function toMinutes(time) { const [hours, minutes] = time.split(':').map(Number); return hours * 60 + minutes; }
function sameDepartment(first, second) { return first?.trim().toLowerCase() === second?.trim().toLowerCase(); }

function overlapsResource(candidate, other, field) {
  return idOf(candidate[field]) === idOf(other[field])
    && candidate.day === other.day
    && intervalsOverlap(candidate.startTime, candidate.endTime, other.startTime, other.endTime);
}

function violatesHardConstraints(candidate, occupied) {
  return occupied.some((entry) => overlapsResource(candidate, entry, 'section')
    || overlapsResource(candidate, entry, 'faculty')
    || overlapsResource(candidate, entry, 'room'));
}

function roomWaste(candidate, section, roomsById) {
  const room = roomsById.get(idOf(candidate.room));
  return (room.capacity - section.studentCount) / Math.max(1, room.capacity);
}

function scoreCandidate(candidate, section, selected, roomsById) {
  const sameDay = selected.filter((entry) => entry.section === idOf(section) && entry.day === candidate.day);
  const adjacent = sameDay.filter((entry) => entry.startTime === candidate.endTime || entry.endTime === candidate.startTime).length;
  const dayLoad = sameDay.length;
  const totalDayLoad = selected.filter((entry) => entry.day === candidate.day).length;
  const start = toMinutes(candidate.startTime);
  const earlyPenalty = Math.max(0, 10 * 60 - start) * 0.16;
  const latePenalty = Math.max(0, start - 15 * 60) * 0.1;
  const courseDayLoad = sameDay.filter((entry) => entry.subject === idOf(candidate.subject)).length;
  const end = toMinutes(candidate.endTime);
  const nearestGap = sameDay.reduce((nearest, entry) => {
    const gap = toMinutes(entry.endTime) <= start ? start - toMinutes(entry.endTime)
      : end <= toMinutes(entry.startTime) ? toMinutes(entry.startTime) - end : 0;
    return Math.min(nearest, gap);
  }, Infinity);
  const spacingPenalty = nearestGap === Infinity || (nearestGap >= 60 && nearestGap <= 180)
    ? 0 : nearestGap === 0 ? 8 : nearestGap < 60 ? 4 : Math.min(16, (nearestGap - 180) / 30);
  return dayLoad * 6 + adjacent * 10 + totalDayLoad * 1.5 + courseDayLoad * 17 + spacingPenalty
    + earlyPenalty + latePenalty + roomWaste(candidate, section, roomsById) * 5 + (candidate._tieBreak || 0);
}

function unsatisfied(section, subject, reason) {
  return {
    section: section?._id ? { id: idOf(section), name: section.name } : undefined,
    subject: subject?._id ? { id: idOf(subject), code: subject.code, name: subject.name } : undefined,
    reason,
  };
}

function buildTasks(sections, subjects, faculty, rooms, days, slots, existing) {
  const tasks = [];
  const unassigned = [];
  let optionCount = 0;
  const scheduledCounts = new Map();
  for (const entry of existing) {
    const key = `${idOf(entry.section)}:${idOf(entry.subject)}`;
    scheduledCounts.set(key, (scheduledCounts.get(key) || 0) + 1);
  }

  for (const section of sections) {
    const configured = new Map((section.curriculum || []).map((item) => [idOf(item.subject), item]));
    const relevantSubjects = subjects.filter((subject) => sameDepartment(section.department, subject.department)
      && (!section.curriculum?.length || configured.has(idOf(subject))));
    if (relevantSubjects.length === 0) {
      unassigned.push(unsatisfied(section, undefined, 'NO_MATCHING_SUBJECTS'));
      continue;
    }

    for (const subject of relevantSubjects) {
      const pairKey = `${idOf(section)}:${idOf(subject)}`;
      const curriculum = configured.get(idOf(subject));
      const isLabSession = curriculum ? section.sectionType === 'LAB' : subject.type === 'LAB';
      const weeklyTarget = curriculum
        ? (section.sectionType === 'LAB' ? curriculum.labsPerWeek : curriculum.lecturesPerWeek)
        : 1;
      const outstanding = Math.max(0, weeklyTarget - (scheduledCounts.get(pairKey) || 0));
      if (!outstanding) continue;
      const eligibleFaculty = faculty.filter((person) => sameDepartment(person.department, section.department));
      if (!eligibleFaculty.length) {
        unassigned.push(unsatisfied(section, subject, 'NO_ELIGIBLE_FACULTY'));
        continue;
      }
      const requiredDuration = isLabSession && curriculum ? curriculum.labDurationHours
        : curriculum ? (curriculum.lectureDurationHours || 1) : (subject.type === 'LAB' ? 2 : 1);
      const sessionSlots = slots.filter((slot) => (toMinutes(slot.endTime) - toMinutes(slot.startTime)) === requiredDuration * 60);
      if (!sessionSlots.length) {
        unassigned.push(unsatisfied(section, subject, `NO_${requiredDuration}_HOUR_SLOT`));
        continue;
      }
      const eligibleRooms = rooms.filter((room) => room.isActive
        && room.capacity >= section.studentCount
        && (!isLabSession || room.type === 'LAB'));
      if (!eligibleRooms.length) {
        const reason = isLabSession && rooms.some((room) => room.isActive && room.capacity >= section.studentCount)
          ? 'NO_LAB_ROOM_WITH_CAPACITY'
          : 'NO_ROOM_WITH_CAPACITY';
        unassigned.push(unsatisfied(section, subject, reason));
        continue;
      }
      if (!days.length || !slots.length) {
        unassigned.push(unsatisfied(section, subject, 'NO_AVAILABLE_TIME_SLOTS'));
        continue;
      }

      const options = [];
      optionCount += days.length * sessionSlots.length * eligibleFaculty.length * eligibleRooms.length;
      if (optionCount > CANDIDATE_OPTION_LIMIT) {
        throw new AppError(413, 'Scheduling input is too large; reduce the selected resources or time slots');
      }
      for (const day of days) for (const slot of sessionSlots) for (const person of eligibleFaculty) for (const room of eligibleRooms) {
        options.push({
          section: idOf(section), subject: idOf(subject), faculty: idOf(person), room: idOf(room),
          day, startTime: slot.startTime, endTime: slot.endTime,
        });
      }
      for (let meeting = 0; meeting < outstanding; meeting += 1) {
        const variedOptions = options.map((option) => ({ ...option, _tieBreak: Math.random() * 16 }));
        tasks.push({ section, subject, options: variedOptions });
      }
      if (tasks.length > ASSIGNMENT_LIMIT) {
        throw new AppError(413, `A single generation request is limited to ${ASSIGNMENT_LIMIT} section/subject assignments`);
      }
    }
  }

  tasks.sort((a, b) => a.options.length - b.options.length || b.section.studentCount - a.section.studentCount);
  return { tasks, unassigned };
}

/** Schedules each configured weekly meeting for every selected section/course pair. */
export async function generateTimetable(input, createdBy) {
  const [sections, subjects, faculty, rooms] = await Promise.all([
    Section.find({ _id: { $in: input.sections }, isActive: { $ne: false } }).lean(),
    Subject.find({ _id: { $in: input.subjects } }).lean(),
    Faculty.find({ _id: { $in: input.faculty } }).lean(),
    Room.find({ _id: { $in: input.rooms }, isActive: true }).lean(),
  ]);
  const requestedCounts = [input.sections.length, input.subjects.length, input.faculty.length, input.rooms.length];
  const foundCounts = [sections.length, subjects.length, faculty.length, rooms.length];
  if (requestedCounts.some((count, index) => count !== foundCounts[index])) {
    throw new AppError(404, 'One or more selected scheduling resources were not found or are inactive');
  }
  if (input.weeklyLoads?.length) {
    for (const section of sections) {
    section.curriculum = input.weeklyLoads.filter((load) => subjects.some((subject) => idOf(subject) === String(load.subject)));
    }
  }

  const existing = await Timetable.find({
    $or: [
      { section: { $nin: input.sections }, day: { $in: input.availableDays }, faculty: { $in: input.faculty } },
      { section: { $nin: input.sections }, day: { $in: input.availableDays }, room: { $in: input.rooms } },
    ],
  }).select('section subject faculty room day startTime endTime').lean();

  const { tasks, unassigned } = buildTasks(sections, subjects, faculty, rooms, input.availableDays, input.timeSlots, existing);
  const selected = [];
  let bestSelected = [];
  const roomsById = new Map(rooms.map((room) => [idOf(room), room]));

  // Establish a complete greedy baseline before bounded backtracking. If the
  // search limit is reached, this keeps later task groups (especially lectures)
  // from disappearing simply because smaller lab groups had fewer options.
  for (const task of tasks) {
    const occupied = [...existing, ...bestSelected];
    const candidate = task.options
      .filter((option) => !violatesHardConstraints(option, occupied))
      .sort((a, b) => scoreCandidate(a, task.section, bestSelected, roomsById)
        - scoreCandidate(b, task.section, bestSelected, roomsById))[0];
    if (candidate) bestSelected.push(candidate);
  }

  let visited = 0;

  function search(index) {
    if (index >= tasks.length) return true;
    if (++visited > SEARCH_NODE_LIMIT) return false;
    const task = tasks[index];
    const options = task.options
      .filter((candidate) => !violatesHardConstraints(candidate, [...existing, ...selected]))
      .sort((a, b) => scoreCandidate(a, task.section, selected, roomsById) - scoreCandidate(b, task.section, selected, roomsById));

    for (const candidate of options) {
      selected.push(candidate);
      if (selected.length > bestSelected.length) bestSelected = [...selected];
      if (search(index + 1)) return true;
      selected.pop();
      if (visited > SEARCH_NODE_LIMIT) break;
    }
    return false;
  }

  const complete = search(0);
  const scheduled = complete ? selected : bestSelected;
  const scheduledCounts = new Map();
  for (const entry of scheduled) {
    const key = `${entry.section}:${entry.subject}`;
    scheduledCounts.set(key, (scheduledCounts.get(key) || 0) + 1);
  }
  const taskCounts = new Map();
  for (const task of tasks) {
    const key = `${idOf(task.section)}:${idOf(task.subject)}`;
    const taskIndex = taskCounts.get(key) || 0;
    taskCounts.set(key, taskIndex + 1);
    if (taskIndex >= (scheduledCounts.get(key) || 0)) {
      unassigned.push(unsatisfied(task.section, task.subject, visited > SEARCH_NODE_LIMIT ? 'SEARCH_LIMIT_REACHED' : 'NO_NON_CONFLICTING_SLOT'));
    }
  }

  if (input.weeklyLoads?.length) {
    for (const sectionId of input.sections) {
      const section = sections.find((item) => idOf(item) === String(sectionId));
    const loads = input.weeklyLoads.filter((load) => subjects.some((subject) => idOf(subject) === String(load.subject)));
      if (section) await Section.updateOne({ _id: sectionId }, { $set: { curriculum: loads } });
    }
  }
  if (input.replaceExisting !== false) {
    await Timetable.deleteMany({ section: { $in: input.sections } });
  }
  const documents = scheduled.map(({ _tieBreak, ...entry }) => ({ ...entry, createdBy }));
  const created = documents.length ? await Timetable.insertMany(documents, { ordered: true }) : [];
  return {
    assignments: created.length,
    conflicts: 0,
    unassigned: unassigned.length,
    unassignedAssignments: unassigned,
    data: created,
    searchNodes: visited,
  };
}
