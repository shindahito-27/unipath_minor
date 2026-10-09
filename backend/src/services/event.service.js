import Event from '../models/event.model.js';
import { AppError } from '../utils/app-error.js';
import { notifyAllStudents } from './notification.service.js';

function validateRange(startTime, endTime) {
  if (startTime >= endTime) throw new AppError(400, 'endTime must be later than startTime');
}

function eventNotification(event, verb) {
  return {
    title: verb === 'published' ? 'New campus event' : 'Campus event updated',
    message: `${event.title} · ${event.date.toISOString().slice(0, 10)}, ${event.startTime}–${event.endTime} at ${event.venue}.`,
    type: 'EVENT',
  };
}

export async function listEvents(user) {
  const filter = user.role === 'ADMIN' ? {} : { status: 'PUBLISHED' };
  return Event.find(filter).populate('createdBy', 'name').sort({ date: 1, startTime: 1 }).lean();
}

export async function createEvent(input, user) {
  validateRange(input.startTime, input.endTime);
  const event = await Event.create({ ...input, createdBy: user._id });
  if (event.status === 'PUBLISHED') await notifyAllStudents(eventNotification(event, 'published'));
  return event;
}

export async function updateEvent(id, changes) {
  if (changes.startTime && changes.endTime) validateRange(changes.startTime, changes.endTime);
  const event = await Event.findById(id);
  if (!event) throw new AppError(404, 'Event not found');
  const previousStatus = event.status;
  Object.assign(event, changes);
  validateRange(event.startTime, event.endTime);
  await event.save();
  if (event.status === 'PUBLISHED' && (previousStatus !== 'PUBLISHED' || Object.keys(changes).some((key) => key !== 'status'))) {
    await notifyAllStudents(eventNotification(event, previousStatus === 'PUBLISHED' ? 'updated' : 'published'));
  }
  return event;
}

export async function setEventStatus(id, status) {
  return updateEvent(id, { status });
}

export async function deleteEvent(id) {
  const event = await Event.findByIdAndDelete(id);
  if (!event) throw new AppError(404, 'Event not found');
  return event;
}
