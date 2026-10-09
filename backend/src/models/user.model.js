import mongoose from 'mongoose';

export const USER_ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  FACULTY: 'FACULTY',
  STUDENT: 'STUDENT',
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(USER_ROLES), default: USER_ROLES.STUDENT, required: true },
    department: { type: String, trim: true, maxlength: 100 },
    semester: { type: Number, min: 1, max: 16 },
  },
  { timestamps: true, versionKey: false },
);

const User = mongoose.model('User', userSchema);
export default User;
