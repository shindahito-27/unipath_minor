import 'dotenv/config';
import mongoose from 'mongoose';
import Faculty from '../src/models/faculty.model.js';
import Room from '../src/models/room.model.js';
import Section from '../src/models/section.model.js';
import Subject from '../src/models/subject.model.js';
import User, { USER_ROLES } from '../src/models/user.model.js';

if (process.env.NODE_ENV === 'production') {
  throw new Error('The demo resource seed script is disabled in production.');
}

const rooms = [
  { name: 'N-101', building: 'North Hall', floor: 1, capacity: 42, type: 'CLASSROOM', isActive: true },
  { name: 'N-204', building: 'North Hall', floor: 2, capacity: 36, type: 'CLASSROOM', isActive: true },
  { name: 'N-305', building: 'North Hall', floor: 3, capacity: 48, type: 'SEMINAR_HALL', isActive: true },
  { name: 'N-401', building: 'North Hall', floor: 4, capacity: 80, type: 'CLASSROOM', isActive: true },
  { name: 'E-401', building: 'Engineering Block', floor: 4, capacity: 90, type: 'SEMINAR_HALL', isActive: true },
  { name: 'I-110', building: 'Innovation Center', floor: 1, capacity: 28, type: 'LAB', isActive: true },
  { name: 'I-214', building: 'Innovation Center', floor: 2, capacity: 38, type: 'LAB', isActive: true },
  { name: 'I-302', building: 'Innovation Center', floor: 3, capacity: 40, type: 'CLASSROOM', isActive: true },
  { name: 'E-105', building: 'Engineering Block', floor: 1, capacity: 36, type: 'CLASSROOM', isActive: true },
  { name: 'E-208', building: 'Engineering Block', floor: 2, capacity: 36, type: 'LAB', isActive: true },
  { name: 'S-120', building: 'Science Center', floor: 1, capacity: 24, type: 'LAB', isActive: true },
  { name: 'S-220', building: 'Science Center', floor: 2, capacity: 54, type: 'SEMINAR_HALL', isActive: false },
];

const faculty = [
  { name: 'Dr. Maya Chen', email: 'maya.chen@unipath.edu', department: 'Computer Science', availability: ['MONDAY 09:00-12:00', 'WEDNESDAY 13:00-16:00'] },
  { name: 'Prof. Elias Morgan', email: 'faculty@unipath.com', department: 'Computer Science', availability: ['TUESDAY 10:00-13:00', 'THURSDAY 09:00-12:00'] },
  { name: 'Dr. Asha Raman', email: 'asha.raman@unipath.edu', department: 'Computer Science', availability: ['MONDAY 13:00-16:00', 'FRIDAY 09:00-12:00'] },
  { name: 'Prof. Priya Nair', email: 'priya.nair@unipath.edu', department: 'Computer Science', availability: ['TUESDAY 09:00-12:00', 'THURSDAY 13:00-16:00'] },
  { name: 'Dr. Ethan Shah', email: 'ethan.shah@unipath.edu', department: 'Computer Science', availability: ['MONDAY 10:00-13:00', 'WEDNESDAY 14:00-17:00'] },
  { name: 'Prof. Hana Kim', email: 'hana.kim@unipath.edu', department: 'Computer Science', availability: ['TUESDAY 13:00-16:00', 'FRIDAY 09:00-12:00'] },
  { name: 'Dr. Omar Hassan', email: 'omar.hassan@unipath.edu', department: 'Computer Science', availability: ['MONDAY 09:00-12:00', 'THURSDAY 10:00-13:00'] },
  { name: 'Prof. Neha Kulkarni', email: 'neha.kulkarni@unipath.edu', department: 'Computer Science', availability: ['WEDNESDAY 09:00-12:00', 'FRIDAY 13:00-16:00'] },
  { name: 'Dr. Carlos Romero', email: 'carlos.romero@unipath.edu', department: 'Computer Science', availability: ['TUESDAY 10:00-13:00', 'THURSDAY 09:00-12:00'] },
  { name: 'Prof. Ananya Rao', email: 'ananya.rao@unipath.edu', department: 'Computer Science', availability: ['MONDAY 13:00-16:00', 'FRIDAY 10:00-13:00'] },
  { name: 'Dr. Victor Chen', email: 'victor.chen@unipath.edu', department: 'Computer Science', availability: ['WEDNESDAY 13:00-16:00', 'THURSDAY 13:00-16:00'] },
  { name: 'Dr. Riya Kapoor', email: 'riya.kapoor@unipath.edu', department: 'Electronics and Communication Engineering', availability: ['MONDAY 09:00-12:00', 'THURSDAY 13:00-16:00'] },
  { name: 'Prof. Sameer Iyer', email: 'sameer.iyer@unipath.edu', department: 'Electronics and Communication Engineering', availability: ['TUESDAY 10:00-13:00', 'FRIDAY 09:00-12:00'] },
  { name: 'Dr. Kavita Menon', email: 'kavita.menon@unipath.edu', department: 'Electronics and Communication Engineering', availability: ['WEDNESDAY 09:00-12:00', 'FRIDAY 13:00-16:00'] },
  { name: 'Prof. Meera Joshi', email: 'meera.joshi@unipath.edu', department: 'Electrical Engineering', availability: ['MONDAY 09:00-12:00', 'THURSDAY 13:00-16:00'] },
  { name: 'Dr. Rahul Desai', email: 'rahul.desai@unipath.edu', department: 'Electrical Engineering', availability: ['TUESDAY 10:00-13:00', 'FRIDAY 09:00-12:00'] },
  { name: 'Prof. Noah Bennett', email: 'noah.bennett@unipath.edu', department: 'Electrical Engineering', availability: ['TUESDAY 09:00-12:00', 'THURSDAY 13:00-16:00'] },
  { name: 'Dr. Sofia Alvarez', email: 'sofia.alvarez@unipath.edu', department: 'Electrical Engineering', availability: ['MONDAY 10:00-13:00', 'WEDNESDAY 09:00-12:00'] },
  { name: 'Prof. Arjun Mehta', email: 'arjun.mehta@unipath.edu', department: 'Electrical Engineering', availability: ['WEDNESDAY 13:00-16:00', 'FRIDAY 10:00-13:00'] },
  { name: 'Dr. Lena Fischer', email: 'lena.fischer@unipath.edu', department: 'Physics', availability: ['TUESDAY 13:00-16:00', 'THURSDAY 10:00-13:00'] },
  { name: 'Prof. Daniel Okafor', email: 'daniel.okafor@unipath.edu', department: 'Physics', availability: ['MONDAY 09:00-12:00', 'FRIDAY 13:00-16:00'] },
];

const subjects = [
  { code: 'CS101', name: 'Programming Fundamentals', department: 'Computer Science', credits: 4, type: 'THEORY' },
  { code: 'CS102L', name: 'Programming Lab', department: 'Computer Science', credits: 2, type: 'LAB' },
  { code: 'CS203', name: 'Data Structures', department: 'Computer Science', credits: 4, type: 'THEORY' },
  { code: 'CS305', name: 'Database Systems', department: 'Computer Science', credits: 3, type: 'THEORY' },
  { code: 'ECE101', name: 'Digital Logic Systems', department: 'Electronics and Communication Engineering', credits: 4, type: 'THEORY' },
  { code: 'ECE102L', name: 'Digital Circuits Laboratory', department: 'Electronics and Communication Engineering', credits: 2, type: 'LAB' },
  { code: 'ECE203', name: 'Communication Systems', department: 'Electronics and Communication Engineering', credits: 4, type: 'THEORY' },
  { code: 'ECE205L', name: 'Communication Systems Lab', department: 'Electronics and Communication Engineering', credits: 2, type: 'LAB' },
  { code: 'EE201', name: 'Circuit Analysis', department: 'Electrical Engineering', credits: 4, type: 'THEORY' },
  { code: 'EE202L', name: 'Electronics Laboratory', department: 'Electrical Engineering', credits: 2, type: 'LAB' },
  { code: 'EE301', name: 'Power Systems', department: 'Electrical Engineering', credits: 4, type: 'THEORY' },
  { code: 'EE302L', name: 'Electrical Machines Laboratory', department: 'Electrical Engineering', credits: 2, type: 'LAB' },
  { code: 'PHY101', name: 'Classical Mechanics', department: 'Physics', credits: 4, type: 'THEORY' },
  { code: 'PHY205L', name: 'Modern Physics Lab', department: 'Physics', credits: 2, type: 'LAB' },
];

const sections = [
  { name: 'CSE-G1', department: 'Computer Science', semester: 3, studentCount: 60, sectionType: 'LECTURE', cohort: 'CSE-2026', rollNumberStart: 1, rollNumberEnd: 60, isActive: true },
  { name: 'CSE-G2', department: 'Computer Science', semester: 3, studentCount: 74, sectionType: 'LECTURE', cohort: 'CSE-2026', rollNumberStart: 61, rollNumberEnd: 134, isActive: true },
  ...Array.from({ length: 7 }, (_, index) => ({ name: `CSE${index + 1}`, department: 'Computer Science', semester: 3, studentCount: index === 6 ? 14 : 20, sectionType: 'LAB', cohort: 'CSE-2026', parentSectionName: index < 3 ? 'CSE-G1' : 'CSE-G2', rollNumberStart: index * 20 + 1, rollNumberEnd: Math.min((index + 1) * 20, 134), isActive: true })),
  { name: 'ECE-G1', department: 'Electronics and Communication Engineering', semester: 3, studentCount: 60, sectionType: 'LECTURE', cohort: 'ECE-2026', rollNumberStart: 1, rollNumberEnd: 60, isActive: true },
  { name: 'ECE-G2', department: 'Electronics and Communication Engineering', semester: 3, studentCount: 60, sectionType: 'LECTURE', cohort: 'ECE-2026', rollNumberStart: 61, rollNumberEnd: 120, isActive: true },
  ...Array.from({ length: 6 }, (_, index) => ({ name: `ECE${index + 1}`, department: 'Electronics and Communication Engineering', semester: 3, studentCount: 20, sectionType: 'LAB', cohort: 'ECE-2026', parentSectionName: index < 3 ? 'ECE-G1' : 'ECE-G2', rollNumberStart: index * 20 + 1, rollNumberEnd: (index + 1) * 20, isActive: true })),
  { name: 'EE-G1', department: 'Electrical Engineering', semester: 3, studentCount: 48, sectionType: 'LECTURE', cohort: 'EE-2026', rollNumberStart: 1, rollNumberEnd: 48, isActive: true },
  { name: 'EE-G2', department: 'Electrical Engineering', semester: 3, studentCount: 48, sectionType: 'LECTURE', cohort: 'EE-2026', rollNumberStart: 49, rollNumberEnd: 96, isActive: true },
  ...Array.from({ length: 5 }, (_, index) => ({ name: `EE${index + 1}`, department: 'Electrical Engineering', semester: 3, studentCount: index === 4 ? 16 : 20, sectionType: 'LAB', cohort: 'EE-2026', parentSectionName: index < 2 ? 'EE-G1' : 'EE-G2', rollNumberStart: index * 20 + 1, rollNumberEnd: Math.min((index + 1) * 20, 96), isActive: true })),
];

const legacySectionNames = ['CS-A', 'CS-B', 'CS-C', 'CS-D', 'CS-E', 'CS-F', 'CS-G', 'CS-H', 'CS-I', 'CS-J', 'EE-A'];

async function upsertMany(Model, items, identity) {
  for (const item of items) {
    const filter = identity(item);
    await Model.updateOne(filter, { $setOnInsert: item }, { upsert: true, runValidators: true });
  }
}

try {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGODB_URI must be configured before seeding demo resources.');
  await mongoose.connect(mongoUri);

  await upsertMany(Room, rooms, ({ name, building }) => ({ name, building }));
  await upsertMany(Faculty, faculty, ({ email }) => ({ email }));
  await upsertMany(Subject, subjects, ({ code }) => ({ code }));
  const sectionIds = new Map();
  for (const item of sections) {
    const section = await Section.findOneAndUpdate(
      { name: item.name, department: item.department, semester: item.semester },
      { $set: { ...item, parentSection: null } }, { upsert: true, new: true, runValidators: true },
    );
    sectionIds.set(item.name, section._id);
  }
  for (const item of sections.filter((section) => section.parentSectionName)) {
    await Section.updateOne({ _id: sectionIds.get(item.name) }, { $set: { parentSection: sectionIds.get(item.parentSectionName) } });
  }
  await Section.updateMany({ name: { $in: legacySectionNames } }, { $set: { isActive: false } });

  const demoStudent = await User.findOne({ email: 'student@unipath.com', role: USER_ROLES.STUDENT });
  if (demoStudent) {
    let changed = false;
    if (!demoStudent.department) { demoStudent.department = 'Computer Science'; changed = true; }
    if (demoStudent.semester == null) { demoStudent.semester = 3; changed = true; }
    if (changed) await demoStudent.save();
  }

  console.info(`Seeded or preserved ${rooms.length} rooms, ${faculty.length} faculty, ${subjects.length} subjects, and ${sections.length} active CSE/ECE/EE groups (CSE 134, ECE 120, EE 96 students). Legacy CS-A/EE-A demo sections were archived; linked records remain intact.`);
} catch (error) {
  console.error(`Unable to seed demo resources: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
