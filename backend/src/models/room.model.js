import mongoose from 'mongoose';

export const ROOM_TYPES = ['CLASSROOM', 'LAB', 'SEMINAR_HALL'];

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  building: { type: String, required: true, trim: true, maxlength: 100 },
  floor: { type: Number, required: true, min: -5, max: 200 },
  capacity: { type: Number, required: true, min: 1, max: 10000 },
  type: { type: String, enum: ROOM_TYPES, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true, versionKey: false });

roomSchema.index({ building: 1, name: 1 }, { unique: true });

export default mongoose.model('Room', roomSchema);
