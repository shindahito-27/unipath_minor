import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import { createAccessToken } from '../utils/jwt.js';

const SALT_ROUNDS = 12;

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    semester: user.semester,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function registerUser({ name, email, password, department, semester }) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set to a random value of at least 32 characters.');
  }
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, passwordHash, department, semester });
  return { user: publicUser(user), token: createAccessToken(user) };
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
  return { user: publicUser(user), token: createAccessToken(user) };
}

export { publicUser };
