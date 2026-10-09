import mongoose from 'mongoose';

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 3000, default: '' },
  date: { type: Date, required: true },
  startTime: { type: String, required: true, match: timePattern },
  endTime: { type: String, required: true, match: timePattern },
  venue: { type: String, required: true, trim: true, maxlength: 160 },
  organizer: { type: String, required: true, trim: true, maxlength: 160 },
  status: { type: String, enum: ['DRAFT', 'PUBLISHED'], default: 'DRAFT' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, versionKey: false });

eventSchema.index({ status: 1, date: 1 });
export default mongoose.model('Event', eventSchema);
