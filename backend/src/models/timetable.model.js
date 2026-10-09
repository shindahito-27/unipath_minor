import mongoose from 'mongoose';

export const WEEK_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const timetableSchema = new mongoose.Schema({
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  day: { type: String, enum: WEEK_DAYS, required: true },
  startTime: { type: String, required: true, match: timePattern },
  endTime: { type: String, required: true, match: timePattern },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, versionKey: false });

timetableSchema.index({ day: 1, startTime: 1, endTime: 1 });
timetableSchema.index({ section: 1, day: 1 });

export default mongoose.model('Timetable', timetableSchema);
