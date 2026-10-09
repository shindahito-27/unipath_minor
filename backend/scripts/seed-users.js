import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User, { USER_ROLES } from '../src/models/user.model.js';

if (process.env.NODE_ENV === 'production') {
  throw new Error('The demo user seed script is disabled in production.');
}

const demoPassword = 'UniPath-Demo-Only-2026!';
const demoAccounts = [
  { name: 'UniPath Admin', email: 'admin@unipath.com', role: USER_ROLES.ADMIN },
  { name: 'UniPath Faculty', email: 'faculty@unipath.com', role: USER_ROLES.FACULTY },
  { name: 'UniPath Student', email: 'student@unipath.com', role: USER_ROLES.STUDENT, department: 'Computer Science', semester: 3 },
];

try {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGODB_URI must be configured before seeding demo users.');
  await mongoose.connect(mongoUri);
  for (const account of demoAccounts) {
    const passwordHash = await bcrypt.hash(demoPassword, 12);
    await User.updateOne(
      { email: account.email },
      { $setOnInsert: { ...account, passwordHash } },
      { upsert: true },
    );
    console.info(`Seeded or preserved ${account.role}: ${account.email}`);
  }
  console.info('Demo accounts use the documented development-only password. Existing accounts were not changed.');
} catch (error) {
  console.error(`Unable to seed demo users: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
