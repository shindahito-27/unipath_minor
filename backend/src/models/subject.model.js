import mongoose from 'mongoose';

export const SUBJECT_TYPES = ['THEORY', 'LAB'];

const subjectSchema = new mongoose.Schema({
  code: { type: String, required: true, uppercase: true, trim: true, maxlength: 20, unique: true },
  name: { type: String, required: true, trim: true, maxlength: 150 },
  department: { type: String, required: true, trim: true, maxlength: 100 },
  credits: { type: Number, required: true, min: 1, max: 12 },
  type: { type: String, enum: SUBJECT_TYPES, required: true },
}, { timestamps: true, versionKey: false });

export default mongoose.model('Subject', subjectSchema);
