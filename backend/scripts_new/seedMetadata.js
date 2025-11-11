/* eslint-disable no-console */
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const DepartmentConfig = require('../models/departmentConfig.model');
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

const courseSeeds = [
  {
    code: 'BTech-CSE-AI',
    name: 'B.Tech CSE Artificial Intelligence',
    displayName: 'B.Tech CSE (AI)',
    degreeType: 'BTECH',
    departmentCode: 'CSE',
    durationYears: 4
  },
  {
    code: 'BTech-CSE-AIML',
    name: 'B.Tech CSE Artificial Intelligence & ML',
    displayName: 'B.Tech CSE (AI & ML)',
    degreeType: 'BTECH',
    departmentCode: 'CSE',
    durationYears: 4
  },
  {
    code: 'BTech-MECH',
    name: 'B.Tech Mechanical Engineering',
    displayName: 'B.Tech MECH',
    degreeType: 'BTECH',
    departmentCode: 'MECH',
    durationYears: 4
  },
  {
    code: 'BTech-CIVIL',
    name: 'B.Tech Civil Engineering',
    displayName: 'B.Tech CIVIL',
    degreeType: 'BTECH',
    departmentCode: 'CIVIL',
    durationYears: 4
  },
  {
    code: 'BTech-EEE',
    name: 'B.Tech Electrical and Electronics Engineering',
    displayName: 'B.Tech EEE',
    degreeType: 'BTECH',
    departmentCode: 'EEE',
    durationYears: 4
  },
  {
    code: 'BTech-IT',
    name: 'B.Tech Information Technology',
    displayName: 'B.Tech IT',
    degreeType: 'BTECH',
    departmentCode: 'IT',
    durationYears: 4
  },
  {
    code: 'MTech-CSE',
    name: 'M.Tech Computer Science and Engineering',
    displayName: 'M.Tech CSE',
    degreeType: 'MTECH',
    departmentCode: 'CSE',
    durationYears: 2
  },
  {
    code: 'MTech-ECE',
    name: 'M.Tech Electronics and Communication Engineering',
    displayName: 'M.Tech ECE',
    degreeType: 'MTECH',
    departmentCode: 'ECE',
    durationYears: 2
  },
  {
    code: 'MTech-MECH',
    name: 'M.Tech Mechanical Engineering',
    displayName: 'M.Tech MECH',
    degreeType: 'MTECH',
    departmentCode: 'MECH',
    durationYears: 2
  },
  {
    code: 'MTech-CIVIL',
    name: 'M.Tech Civil Engineering',
    displayName: 'M.Tech CIVIL',
    degreeType: 'MTECH',
    departmentCode: 'CIVIL',
    durationYears: 2
  },
  {
    code: 'MTech-EEE',
    name: 'M.Tech Electrical and Electronics Engineering',
    displayName: 'M.Tech EEE',
    degreeType: 'MTECH',
    departmentCode: 'EEE',
    durationYears: 2
  },
  {
    code: 'MTech-IT',
    name: 'M.Tech Information Technology',
    displayName: 'M.Tech IT',
    degreeType: 'MTECH',
    departmentCode: 'IT',
    durationYears: 2
  },
  {
    code: 'MTech-Integrated-CSE-ws-CC',
    name: 'Integrated M.Tech CSE with Cloud Computing',
    displayName: 'Integrated M.Tech CSE (CC)',
    degreeType: 'MTECH_INTEGRATED',
    departmentCode: 'CSE',
    durationYears: 5
  },
  {
    code: 'MTech-Integrated-CSE-ws-SWE',
    name: 'Integrated M.Tech CSE with Software Engineering',
    displayName: 'Integrated M.Tech CSE (SWE)',
    degreeType: 'MTECH_INTEGRATED',
    departmentCode: 'CSE',
    durationYears: 5
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
