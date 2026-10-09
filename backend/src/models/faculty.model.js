import mongoose from 'mongoose';

const facultySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  department: { type: String, required: true, trim: true, maxlength: 100 },
  availability: { type: [String], default: [] },
}, { timestamps: true, versionKey: false });

export default mongoose.model('Faculty', facultySchema);
