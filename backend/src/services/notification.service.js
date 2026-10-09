import Notification from '../models/notification.model.js';
import Section from '../models/section.model.js';
import User from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';
import { emitNotificationToUser } from './socket.service.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function notifyRecipients(recipientIds, { title, message, type = 'GENERAL' }) {
  const recipients = [...new Set(recipientIds.map(String))];
  if (!recipients.length) return { created: 0 };
  const records = recipients.map((recipient) => ({ recipient, title, message, type }));
  const created = await Notification.insertMany(records, { ordered: false });
  for (const notification of created) {
    emitNotificationToUser(notification.recipient, notification.toObject());
  }
  return { created: created.length };
}

export async function notifyAllStudents(notification) {
  const students = await User.find({ role: 'STUDENT' }).select('_id').lean();
  return notifyRecipients(students.map(({ _id }) => _id), notification);
}

export async function notifyRole(role, notification) {
  const users = await User.find({ role }).select('_id').lean();
  return notifyRecipients(users.map(({ _id }) => _id), notification);
}

export async function notifyStudentsInSections(sectionIds, notification) {
  const ids = [...new Set(sectionIds.map(String))];
  if (!ids.length) return { created: 0 };
  const sections = await Section.find({ _id: { $in: ids } }).select('name department semester').lean();
  const clauses = sections.map((section) => ({
    department: new RegExp(`^${escapeRegex(section.department.trim())}$`, 'i'),
    semester: section.semester,
  }));
  if (!clauses.length) return { created: 0 };
  const students = await User.find({ role: 'STUDENT', $or: clauses }).select('_id').lean();
  return notifyRecipients(students.map(({ _id }) => _id), notification);
}

export async function listNotifications(user) {
  return Notification.find({ recipient: user._id }).sort({ createdAt: -1 }).limit(50).lean();
}

export async function markNotificationRead(id, user) {
  const notification = await Notification.findOneAndUpdate({ _id: id, recipient: user._id }, { read: true }, { new: true });
  if (!notification) throw new AppError(404, 'Notification not found');
  return notification;
}

export async function markAllNotificationsRead(user) {
  const result = await Notification.updateMany({ recipient: user._id, read: false }, { read: true });
  return { updated: result.modifiedCount };
}
