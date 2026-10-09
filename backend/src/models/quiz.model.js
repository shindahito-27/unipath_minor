import mongoose from 'mongoose';

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const quizSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  sections: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Section' }], default: [] },
  date: { type: Date, required: true },
  startTime: { type: String, required: true, match: timePattern },
  endTime: { type: String, required: true, match: timePattern },
  studentCount: { type: Number, required: true, min: 1, max: 10000 },
  status: { type: String, enum: ['SCHEDULED', 'ALLOCATED', 'PARTIALLY_ALLOCATED', 'CANCELLED'], default: 'SCHEDULED' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, versionKey: false });

quizSchema.index({ date: 1, startTime: 1, endTime: 1 });
export default mongoose.model('Quiz', quizSchema);
