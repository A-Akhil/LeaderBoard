/* eslint-disable no-console */
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const DepartmentConfig = require('../models/departmentConfig.model');
const ProgramConfig = require('../models/programConfig.model');
const CourseConfig = require('../models/courseConfig.model');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const departmentSeeds = [
  { code: 'CSE', name: 'Computer Science and Engineering', aliases: ['CSD'] },
  { code: 'ECE', name: 'Electronics and Communication Engineering', aliases: [] },
  { code: 'EEE', name: 'Electrical and Electronics Engineering', aliases: [] },
  { code: 'MECH', name: 'Mechanical Engineering', aliases: [] },
  { code: 'CIVIL', name: 'Civil Engineering', aliases: [] },
  { code: 'IT', name: 'Information Technology', aliases: ['ITE'] },
  { code: 'CINTEL', name: 'Computational Intelligence', aliases: ['CIA'] }
];

const programSeeds = [
  {
    code: 'BTech',
    name: 'Bachelor of Technology',
    durationYears: 4,
    leaderboardGroup: 'Undergraduate',
    registerPattern: '^[A-Z]{2}\\d{2}[A-Z]{3}\\d{3}$',
    departmentCodes: departmentSeeds.map((dept) => dept.code)
  },
  {
    code: 'MTech',
    name: 'Master of Technology',
    durationYears: 2,
    leaderboardGroup: 'Postgraduate',
    registerPattern: '^[A-Z]{2}\\d{2}[A-Z]{3}\\d{3}$',
    departmentCodes: departmentSeeds.map((dept) => dept.code)
  },
  {
    code: 'MTech-Integrated',
    name: 'Integrated M.Tech.',
    durationYears: 5,
    leaderboardGroup: 'Integrated',
    registerPattern: '^[A-Z]{2}\\d{2}[A-Z]{3}\\d{4}$',
    departmentCodes: ['CSE', 'CINTEL']
  }
];

const courseSeeds = [
  {
    code: 'BTech-CSE-AI',
    name: 'B.Tech CSE Artificial Intelligence',
    displayName: 'B.Tech CSE (AI)',
    programCode: 'BTech',
    departmentCode: 'CSE',
    yearSpan: 4
  },
  {
    code: 'BTech-CSE-AIML',
    name: 'B.Tech CSE Artificial Intelligence & ML',
    displayName: 'B.Tech CSE (AI & ML)',
    programCode: 'BTech',
    departmentCode: 'CSE',
    yearSpan: 4
  },
  {
    code: 'BTech-MECH',
    name: 'B.Tech Mechanical Engineering',
    displayName: 'B.Tech MECH',
    programCode: 'BTech',
    departmentCode: 'MECH',
    yearSpan: 4
  },
  {
    code: 'BTech-CIVIL',
    name: 'B.Tech Civil Engineering',
    displayName: 'B.Tech CIVIL',
    programCode: 'BTech',
    departmentCode: 'CIVIL',
    yearSpan: 4
  },
  {
    code: 'BTech-EEE',
    name: 'B.Tech Electrical and Electronics Engineering',
    displayName: 'B.Tech EEE',
    programCode: 'BTech',
    departmentCode: 'EEE',
    yearSpan: 4
  },
  {
    code: 'BTech-IT',
    name: 'B.Tech Information Technology',
    displayName: 'B.Tech IT',
    programCode: 'BTech',
    departmentCode: 'IT',
    yearSpan: 4
  },
  {
    code: 'MTech-CSE',
    name: 'M.Tech Computer Science and Engineering',
    displayName: 'M.Tech CSE',
    programCode: 'MTech',
    departmentCode: 'CSE',
    yearSpan: 2
  },
  {
    code: 'MTech-ECE',
    name: 'M.Tech Electronics and Communication Engineering',
    displayName: 'M.Tech ECE',
    programCode: 'MTech',
    departmentCode: 'ECE',
    yearSpan: 2
  },
  {
    code: 'MTech-MECH',
    name: 'M.Tech Mechanical Engineering',
    displayName: 'M.Tech MECH',
    programCode: 'MTech',
    departmentCode: 'MECH',
    yearSpan: 2
  },
  {
    code: 'MTech-CIVIL',
    name: 'M.Tech Civil Engineering',
    displayName: 'M.Tech CIVIL',
    programCode: 'MTech',
    departmentCode: 'CIVIL',
    yearSpan: 2
  },
  {
    code: 'MTech-EEE',
    name: 'M.Tech Electrical and Electronics Engineering',
    displayName: 'M.Tech EEE',
    programCode: 'MTech',
    departmentCode: 'EEE',
    yearSpan: 2
  },
  {
    code: 'MTech-IT',
    name: 'M.Tech Information Technology',
    displayName: 'M.Tech IT',
    programCode: 'MTech',
    departmentCode: 'IT',
    yearSpan: 2
  },
  {
    code: 'MTech-Integrated-CSE-ws-CC',
    name: 'Integrated M.Tech CSE with Cloud Computing',
    displayName: 'Integrated M.Tech CSE (CC)',
    programCode: 'MTech-Integrated',
    departmentCode: 'CSE',
    yearSpan: 5
  },
  {
    code: 'MTech-Integrated-CSE-ws-SWE',
    name: 'Integrated M.Tech CSE with Software Engineering',
    displayName: 'Integrated M.Tech CSE (SWE)',
    programCode: 'MTech-Integrated',
    departmentCode: 'CSE',
    yearSpan: 5
  }
];

const upsertDocument = async (Model, filter, payload) => {
  await Model.updateOne(filter, { $set: payload }, { upsert: true });
};

const seed = async () => {
  if (!process.env.DB_CONNECT) {
    throw new Error('DB_CONNECT is not defined in environment');
  }

  await mongoose.connect(process.env.DB_CONNECT, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  console.log('Connected to MongoDB');

  for (const department of departmentSeeds) {
    await upsertDocument(DepartmentConfig, { code: department.code }, department);
  }
  console.log(`Seeded ${departmentSeeds.length} departments`);

  for (const program of programSeeds) {
    await upsertDocument(ProgramConfig, { code: program.code.toUpperCase() }, program);
  }
  console.log(`Seeded ${programSeeds.length} programs`);

  for (const course of courseSeeds) {
    await upsertDocument(CourseConfig, { code: course.code }, course);
  }
  console.log(`Seeded ${courseSeeds.length} courses`);

  await mongoose.disconnect();
  console.log('Metadata seeding completed');
};

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Metadata seeding failed', error);
    process.exit(1);
  });
