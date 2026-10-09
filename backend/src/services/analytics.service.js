import Event from '../models/event.model.js';
import Faculty from '../models/faculty.model.js';
import Notification from '../models/notification.model.js';
import Quiz from '../models/quiz.model.js';
import Room from '../models/room.model.js';
import Timetable from '../models/timetable.model.js';
import User from '../models/user.model.js';
import VenueAllocation from '../models/venue-allocation.model.js';

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function timeMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function bookingHours(startTime, endTime) {
  return Math.max(0, (timeMinutes(endTime) - timeMinutes(startTime)) / 60);
}

function calculateTimetableConflicts(entries) {
  const conflictKeys = new Set();
  const add = (type, key) => conflictKeys.add(`${type}:${key}`);
  const byDay = new Map();

  for (const entry of entries) {
    const section = entry.section;
    const subject = entry.subject;
    const room = entry.room;
    if (section && room && section.studentCount > room.capacity) add('ROOM_CAPACITY_VIOLATION', entry._id);
    if (subject?.type === 'LAB' && room && room.type !== 'LAB') add('LAB_ROOM_MISMATCH', entry._id);
    byDay.set(entry.day, [...(byDay.get(entry.day) || []), entry]);
  }

  for (const dayEntries of byDay.values()) {
    dayEntries.sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 0; i < dayEntries.length; i += 1) {
      const current = dayEntries[i];
      for (let j = i + 1; j < dayEntries.length; j += 1) {
        const other = dayEntries[j];
        if (other.startTime >= current.endTime) break;
        if (current.startTime >= other.endTime) continue;
        const pair = [String(current._id), String(other._id)].sort().join(':');
        if (current.faculty && other.faculty && String(current.faculty?._id ?? current.faculty) === String(other.faculty?._id ?? other.faculty)) add('FACULTY_OVERLAP', pair);
        if (current.room && other.room && String(current.room?._id ?? current.room) === String(other.room?._id ?? other.room)) add('ROOM_OVERLAP', pair);
        if (current.section && other.section && String(current.section?._id ?? current.section) === String(other.section?._id ?? other.section)) add('SECTION_OVERLAP', pair);
      }
    }
  }

  const breakdown = {};
  for (const key of conflictKeys) {
    const type = key.slice(0, key.indexOf(':'));
    breakdown[type] = (breakdown[type] || 0) + 1;
  }
  return { count: conflictKeys.size, breakdown };
}

function buildRoomUtilization(rooms, timetableEntries, allocations) {
  const stats = new Map(rooms.map((room) => [String(room._id), {
    room,
    studentHours: 0,
    capacityHours: 0,
    timetableSessions: 0,
    quizSessions: 0,
  }]));

  for (const entry of timetableEntries) {
    const roomId = String(entry.room?._id ?? entry.room);
    const stat = stats.get(roomId);
    const room = entry.room;
    if (!stat || !room?.capacity || entry.section?.studentCount == null) continue;
    const hours = bookingHours(entry.startTime, entry.endTime);
    stat.capacityHours += room.capacity * hours;
    stat.studentHours += Math.min(entry.section.studentCount, room.capacity) * hours;
    stat.timetableSessions += 1;
  }

  for (const allocation of allocations) {
    const roomId = String(allocation.room?._id ?? allocation.room);
    const stat = stats.get(roomId);
    const room = allocation.room;
    const quiz = allocation.quiz;
    if (!stat || !room?.capacity || !quiz || quiz.status === 'CANCELLED') continue;
    const hours = bookingHours(quiz.startTime, quiz.endTime);
    stat.capacityHours += room.capacity * hours;
    stat.studentHours += Math.min(allocation.allocatedStudents, room.capacity) * hours;
    stat.quizSessions += 1;
  }

  return [...stats.values()].map(({ room, studentHours, capacityHours, timetableSessions, quizSessions }) => ({
    roomId: String(room._id),
    name: room.name,
    building: room.building,
    capacity: room.capacity,
    isActive: room.isActive,
    utilizationPercent: capacityHours ? Math.round((studentHours / capacityHours) * 100) : 0,
    studentHours: Number(studentHours.toFixed(1)),
    capacityHours: Number(capacityHours.toFixed(1)),
    timetableSessions,
    quizSessions,
    totalSessions: timetableSessions + quizSessions,
  })).sort((a, b) => b.utilizationPercent - a.utilizationPercent || b.totalSessions - a.totalSessions || a.name.localeCompare(b.name));
}

async function getActivityTrend(today) {
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 6);
  const [timetableActivity, quizActivity] = await Promise.all([
    Timetable.aggregate([
      { $match: { updatedAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } }, count: { $sum: 1 } } },
    ]),
    Quiz.aggregate([
      { $match: { updatedAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } }, count: { $sum: 1 } } },
    ]),
  ]);
  const timetableByDate = new Map(timetableActivity.map((item) => [item._id, item.count]));
  const quizzesByDate = new Map(quizActivity.map((item) => [item._id, item.count]));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const key = dateKey(date);
    return { date: key, timetable: timetableByDate.get(key) || 0, quizzes: quizzesByDate.get(key) || 0 };
  });
}

async function getRecentNotifications() {
  return Notification.aggregate([
    { $sort: { createdAt: -1 } },
    { $addFields: { deliveryMinute: { $dateToString: { format: '%Y-%m-%dT%H:%M', date: '$createdAt' } } } },
    { $group: {
      _id: { title: '$title', message: '$message', type: '$type', deliveryMinute: '$deliveryMinute' },
      createdAt: { $max: '$createdAt' },
      recipients: { $sum: 1 },
    } },
    { $sort: { createdAt: -1 } },
    { $limit: 6 },
    { $project: { _id: 0, title: '$_id.title', message: '$_id.message', type: '$_id.type', createdAt: 1, recipients: 1 } },
  ]);
}

export async function getAdminAnalytics(now = new Date()) {
  const today = startOfUtcDay(now);
  const time = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
  const nextActivityFilter = { $or: [{ date: { $gt: today } }, { date: today, endTime: { $gte: time } }] };
  const upcomingEventFilter = { status: 'PUBLISHED', ...nextActivityFilter };
  const upcomingQuizFilter = { status: { $ne: 'CANCELLED' }, ...nextActivityFilter };

  const [
    totalStudents,
    totalFaculty,
    totalRooms,
    activeRooms,
    activeEvents,
    upcomingQuizCount,
    timetableEntries,
    roomRecords,
    venueAllocations,
    upcomingEvents,
    upcomingQuizzes,
    activity,
    recentNotifications,
    recentTimetableChanges,
  ] = await Promise.all([
    User.countDocuments({ role: 'STUDENT' }),
    Faculty.countDocuments({}),
    Room.countDocuments({}),
    Room.countDocuments({ isActive: true }),
    Event.countDocuments(upcomingEventFilter),
    Quiz.countDocuments(upcomingQuizFilter),
    Timetable.find().select('_id day startTime endTime section subject faculty room updatedAt')
      .populate('section', 'name department studentCount')
      .populate('subject', 'code name type')
      .populate('faculty', 'name')
      .populate('room', 'name building capacity type isActive').lean(),
    Room.find().select('_id name building capacity isActive').lean(),
    VenueAllocation.find().select('room allocatedStudents quiz')
      .populate('room', 'name building capacity')
      .populate('quiz', 'title date startTime endTime status').lean(),
    Event.find(upcomingEventFilter).sort({ date: 1, startTime: 1 }).limit(6).select('title date startTime endTime venue organizer').lean(),
    Quiz.find(upcomingQuizFilter).sort({ date: 1, startTime: 1 }).limit(6)
      .populate('subject', 'code name').populate('section', 'name')
      .select('title date startTime endTime studentCount status subject section').lean(),
    getActivityTrend(today),
    getRecentNotifications(),
    Timetable.find().sort({ updatedAt: -1 }).limit(6)
      .populate('section', 'name').populate('subject', 'code name').populate('room', 'name')
      .populate('createdBy', 'name').select('day startTime endTime section subject room createdBy createdAt updatedAt').lean(),
  ]);

  const conflictSummary = calculateTimetableConflicts(timetableEntries);
  const roomUtilization = buildRoomUtilization(roomRecords, timetableEntries, venueAllocations);

  return {
    current: {
      totalStudents,
      totalFaculty,
      totalRooms,
      activeRooms,
      activeEvents,
      timetableConflictCount: conflictSummary.count,
      conflictBreakdown: conflictSummary.breakdown,
    },
    utilization: {
      metric: 'SEAT_HOURS',
      description: 'Seats used divided by seat capacity across saved timetable and non-cancelled quiz bookings.',
      rooms: roomUtilization,
    },
    activity,
    upcoming: { quizCount: upcomingQuizCount, quizzes: upcomingQuizzes, events: upcomingEvents },
    recent: { notifications: recentNotifications, timetableChanges: recentTimetableChanges },
  };
}
