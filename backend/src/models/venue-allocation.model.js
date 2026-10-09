import mongoose from 'mongoose';

const venueAllocationSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  faculty: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' }], default: [] },
  allocatedStudents: { type: Number, required: true, min: 1 },
  rollNumberStart: { type: Number, required: true, min: 1 },
  rollNumberEnd: { type: Number, required: true, min: 1 },
}, { timestamps: true, versionKey: false });

venueAllocationSchema.index({ quiz: 1, room: 1 }, { unique: true });
venueAllocationSchema.index({ room: 1, quiz: 1 });
export default mongoose.model('VenueAllocation', venueAllocationSchema);
