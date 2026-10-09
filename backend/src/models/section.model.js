import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  department: { type: String, required: true, trim: true, maxlength: 100 },
  semester: { type: Number, required: true, min: 1, max: 16 },
  studentCount: { type: Number, required: true, min: 0, max: 10000 },
  sectionType: { type: String, enum: ['LECTURE', 'LAB'], default: 'LECTURE' },
  cohort: { type: String, trim: true, maxlength: 100, default: '' },
  parentSection: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', default: null },
  rollNumberStart: { type: Number, min: 1 },
  rollNumberEnd: { type: Number, min: 1 },
  isActive: { type: Boolean, default: true },
  curriculum: [{
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    lecturesPerWeek: { type: Number, min: 0, max: 20, default: 0 },
    labsPerWeek: { type: Number, min: 0, max: 20, default: 0 },
    lectureDurationHours: { type: Number, min: 1, max: 4, default: 1 },
    labDurationHours: { type: Number, min: 1, max: 4, default: 2 },
  }],
}, { timestamps: true, versionKey: false });

sectionSchema.index({ name: 1, department: 1, semester: 1 }, { unique: true });

export default mongoose.model('Section', sectionSchema);
