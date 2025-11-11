const crypto = require('crypto');
const metadataCache = require('../utils/metadataCache');
const classModel = require('../models/class.model');
const teacherModel = require('../models/teacher.model');
const studentModel = require('../models/student.model');
const assignmentService = require('./assignment.service');
const { loadCsv } = require('../utils/csvLoader');

const VALID_TEACHER_ROLES = ['Faculty', 'Academic Advisor', 'HOD', 'Associate Chairperson', 'Chairperson'];
const FILE_FIELDS = {
  classes: 'classesCsv',
  teachers: 'teachersCsv',
  students: 'studentsCsv',
  studentAssignments: 'studentAssignmentsCsv',
  facultyAssignments: 'facultyAssignmentsCsv',
  advisorAssignments: 'advisorAssignmentsCsv'
};

class ImportOrchestratorService {
  constructor() {
    this.sessions = new Map();
    this.SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
  }

  async verifyBundle({ files, adminId, skipExisting }) {
    this._cleanupExpiredSessions();

    const parsedFiles = this._extractFiles(files);
    const stage = createStage(adminId, skipExisting, this.SESSION_TTL_MS);
    const results = createResultAggregate();

    await processClasses(parsedFiles.classes, stage, results.classes, skipExisting.classes);
    await processTeachers(parsedFiles.teachers, stage, results.teachers, skipExisting.teachers);
    await processStudents(parsedFiles.students, stage, results.students, skipExisting.students);
    await processStudentAssignments(parsedFiles.studentAssignments, stage, results.studentAssignments, skipExisting.studentAssignments);
    await processFacultyAssignments(parsedFiles.facultyAssignments, stage, results.facultyAssignments, skipExisting.facultyAssignments);
    await processAdvisorAssignments(parsedFiles.advisorAssignments, stage, results.advisorAssignments, skipExisting.advisorAssignments);

    const hasFailures = Object.values(results).some((bucket) => bucket.failedEntries.length > 0);

    if (hasFailures) {
      return {
        sessionId: null,
        expiresAt: null,
        results: formatResultsForResponse(results)
      };
    }

    const sessionId = this._storeSession(stage);
    return {
      sessionId,
      expiresAt: new Date(stage.expiresAt).toISOString(),
      results: formatResultsForResponse(results)
    };
  }

  async commitSession(sessionId, adminId) {
    this._cleanupExpiredSessions();
    const session = this.sessions.get(sessionId);

    if (!session) {
      const error = new Error('Validation session not found or expired.');
      error.statusCode = 404;
      throw error;
    }

    if (session.adminId.toString() !== adminId.toString()) {
      const error = new Error('Session does not belong to the requesting admin.');
      error.statusCode = 403;
      throw error;
    }

    if (session.expiresAt < Date.now()) {
      this.sessions.delete(sessionId);
      const error = new Error('Validation session has expired. Please verify again.');
      error.statusCode = 410;
      throw error;
    }

    const summary = await commitStagedData(session);
    this.sessions.delete(sessionId);
    return summary;
  }

  _extractFiles(files) {
    const resolved = {};

    Object.entries(FILE_FIELDS).forEach(([key, fieldName]) => {
      const field = files[fieldName];
      if (!Array.isArray(field) || field.length === 0) {
        const error = new Error(`CSV field "${fieldName}" is required`);
        error.statusCode = 400;
        throw error;
      }
      resolved[key] = field[0];
    });

    return resolved;
  }

  _storeSession(stage) {
    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, stage);
    return sessionId;
  }

  _cleanupExpiredSessions() {
    const now = Date.now();
    for (const [key, stage] of this.sessions.entries()) {
      if (stage.expiresAt < now) {
        this.sessions.delete(key);
      }
    }
  }
}

async function processClasses(file, stage, bucket, skipExisting) {
  const rows = await loadCsv(file);

  for (const rawRow of rows) {
    const context = normaliseClassRow(rawRow);
    if (context.error) {
      bucket.failedEntries.push({ class: context.payload, error: context.error });
      continue;
    }

    const { payload } = context;
    const classKey = `${payload.year}|${payload.section}|${payload.academicYear}|${payload.department}`;

    if (stage.classKeyMap.has(classKey)) {
      bucket.failedEntries.push({ class: payload, error: 'Duplicate class in uploaded CSV' });
      continue;
    }

    try {
      const departmentConfig = await metadataCache.getDepartmentByCode(payload.department);
      if (!departmentConfig || departmentConfig.isActive === false) {
        bucket.failedEntries.push({ class: payload, error: `Department ${payload.department} is not configured` });
        continue;
      }

      const existingClass = await classModel.findOne({
        year: payload.year,
        section: payload.section,
        academicYear: payload.academicYear,
        department: payload.department
      });

      if (existingClass) {
        if (skipExisting) {
          bucket.skippedEntries.push({ class: payload, message: 'Class already exists' });
          stage.classStates.set(existingClass.className, createExistingClassState(existingClass));
          continue;
        }

        bucket.failedEntries.push({ class: payload, error: 'Class already exists' });
        continue;
      }

      const stagedClassState = createStagedClassState(payload);
      stage.classesToCreate.push(stagedClassState.snapshot);
      stage.classKeyMap.set(classKey, stagedClassState);
      stage.classStates.set(stagedClassState.snapshot.className, stagedClassState);

      bucket.successful.push({ ...payload, className: stagedClassState.snapshot.className });
    } catch (error) {
      bucket.failedEntries.push({ class: payload, error: error.message || 'Failed to validate class row' });
    }
  }
}

async function processTeachers(file, stage, bucket, skipExisting) {
  const rows = await loadCsv(file);

  for (const rawRow of rows) {
    const context = normaliseTeacherRow(rawRow);
    if (context.error) {
      bucket.failedEntries.push({ teacher: context.payload, error: context.error });
      continue;
    }

    const { payload } = context;

    if (stage.teacherByRegister.has(payload.registerNo)) {
      bucket.failedEntries.push({ teacher: payload, error: 'Duplicate register number in CSV' });
      continue;
    }

    if (stage.teacherEmailSet.has(payload.email)) {
      bucket.failedEntries.push({ teacher: payload, error: 'Duplicate email in CSV' });
      continue;
    }

    try {
      if (payload.role !== 'Chairperson') {
        const departmentConfig = await metadataCache.getDepartmentByCode(payload.department);
        if (!departmentConfig || departmentConfig.isActive === false) {
          bucket.failedEntries.push({ teacher: payload, error: `Department ${payload.department} is not configured` });
          continue;
        }
      }

      const managedValidation = await validateManagedDepartments(payload.managedDepartments || []);
      if (!managedValidation.isValid) {
        bucket.failedEntries.push({ teacher: payload, error: managedValidation.error });
        continue;
      }
      payload.managedDepartments = managedValidation.cleaned;

      const duplicate = await teacherModel.findOne({
        $or: [{ email: payload.email }, { registerNo: payload.registerNo }]
      });

      if (duplicate) {
        if (skipExisting) {
          bucket.skippedEntries.push({ teacher: payload, message: 'Teacher already exists' });
          stage.teacherLookup.set(duplicate.registerNo, createExistingTeacherState(duplicate));
          stage.teacherEmailSet.add(payload.email);
          stage.teacherByRegister.set(payload.registerNo, { existing: true });
          continue;
        }

        bucket.failedEntries.push({ teacher: payload, error: 'Teacher with this email or register number already exists' });
        continue;
      }

      if (payload.role === 'HOD') {
        const existingHod = await teacherModel.findOne({ department: payload.department, role: 'HOD' });
        if (existingHod || stage.hodByDepartment.has(payload.department)) {
          bucket.failedEntries.push({ teacher: payload, error: `HOD already exists for ${payload.department}` });
          continue;
        }
        stage.hodByDepartment.add(payload.department);
      }

      if (payload.role === 'Chairperson') {
        const existingChair = await teacherModel.findOne({ role: 'Chairperson' });
        if (existingChair || stage.chairpersonStaged) {
          bucket.failedEntries.push({ teacher: payload, error: 'Chairperson already exists' });
          continue;
        }
        stage.chairpersonStaged = true;
      }

      if (payload.role === 'Associate Chairperson' && payload.managedDepartments.length === 0) {
        bucket.failedEntries.push({ teacher: payload, error: 'Associate Chairperson must have managed departments specified' });
        continue;
      }

      stage.teacherByRegister.set(payload.registerNo, { source: 'staged', payload });
      stage.teacherEmailSet.add(payload.email);
      stage.teacherLookup.set(payload.registerNo, {
        registerNo: payload.registerNo,
        role: payload.role,
        department: payload.department || null,
        managedDepartments: payload.managedDepartments,
        source: 'staged'
      });
      stage.teachersToCreate.push(payload);

      bucket.successful.push({
        name: payload.name,
        email: payload.email,
        registerNo: payload.registerNo,
        role: payload.role,
        department: payload.department || undefined
      });
    } catch (error) {
      bucket.failedEntries.push({ teacher: payload, error: error.message || 'Failed to validate teacher row' });
    }
  }
}

async function processStudents(file, stage, bucket, skipExisting) {
  const rows = await loadCsv(file);

  for (const rawRow of rows) {
    const context = normaliseStudentRow(rawRow);
    if (context.error) {
      bucket.failedEntries.push({ student: context.payload, error: context.error });
      continue;
    }

    const { payload } = context;

    if (stage.studentByRegister.has(payload.registerNo)) {
      bucket.failedEntries.push({ student: payload, error: 'Duplicate register number in CSV' });
      continue;
    }

    if (stage.studentEmailSet.has(payload.email)) {
      bucket.failedEntries.push({ student: payload, error: 'Duplicate email in CSV' });
      continue;
    }

    try {
      const courseConfig = await metadataCache.getCourseByCode(payload.course);
      if (!courseConfig || courseConfig.isActive === false) {
        bucket.failedEntries.push({ student: payload, error: `Invalid or inactive course: ${payload.course}` });
        continue;
      }

      if (!courseConfig.degreeType || !courseConfig.durationYears) {
        bucket.failedEntries.push({ student: payload, error: `Course ${payload.course} is missing degree metadata` });
        continue;
      }

      const departmentConfig = await metadataCache.getDepartmentByCode(courseConfig.departmentCode);
      if (!departmentConfig || departmentConfig.isActive === false) {
        bucket.failedEntries.push({ student: payload, error: `Department ${courseConfig.departmentCode} is not available` });
        continue;
      }

      payload.department = departmentConfig.code;
      payload.program = courseConfig.degreeType;
      payload.programDurationYears = courseConfig.durationYears;

      const duplicate = await studentModel.findOne({
        $or: [{ email: payload.email }, { registerNo: payload.registerNo }]
      }).populate({ path: 'currentClass.ref', select: 'className' });

      if (duplicate) {
        if (skipExisting) {
          bucket.skippedEntries.push({ student: payload, message: 'Student already exists' });
          stage.studentLookup.set(duplicate.registerNo, createExistingStudentState(duplicate));
          stage.studentEmailSet.add(payload.email);
          stage.studentByRegister.set(payload.registerNo, { existing: true });
          continue;
        }

        bucket.failedEntries.push({ student: payload, error: 'Student with this email or register number already exists' });
        continue;
      }

      stage.studentByRegister.set(payload.registerNo, { source: 'staged', payload });
      stage.studentEmailSet.add(payload.email);
      stage.studentLookup.set(payload.registerNo, {
        registerNo: payload.registerNo,
        department: payload.department,
        program: payload.program,
        currentClassName: null,
        currentClassId: null,
        source: 'staged'
      });
      stage.studentsToCreate.push(payload);

      bucket.successful.push({
        name: payload.name,
        email: payload.email,
        registerNo: payload.registerNo,
        course: payload.course,
        department: payload.department,
        year: payload.year,
        registrationYear: payload.registrationYear
      });
    } catch (error) {
      bucket.failedEntries.push({ student: payload, error: error.message || 'Failed to validate student row' });
    }
  }
}

async function processStudentAssignments(file, stage, bucket, skipExisting) {
  const rows = await loadCsv(file);

  for (const rawRow of rows) {
    const payload = normaliseAssignmentRow(rawRow, 'studentRegNo');
    if (payload.error) {
      bucket.failedEntries.push({ assignment: payload.row, error: payload.error });
      continue;
    }

    try {
      const classState = await resolveClassState(stage, payload.row.className);
      if (!classState) {
        bucket.failedEntries.push({ assignment: payload.row, error: `Class ${payload.row.className} not found` });
        continue;
      }

      const studentState = await resolveStudentState(stage, payload.row.studentRegNo);
      if (!studentState) {
        bucket.failedEntries.push({ assignment: payload.row, error: `Student ${payload.row.studentRegNo} not found` });
        continue;
      }

      const existingClassName = studentState.currentClassName;
      if (existingClassName && existingClassName === payload.row.className) {
        if (skipExisting) {
          bucket.skippedEntries.push({ assignment: payload.row, message: 'Student already assigned to this class' });
          continue;
        }

        bucket.failedEntries.push({ assignment: payload.row, error: 'Student already assigned to this class' });
        continue;
      }

      if (stage.assignmentState.studentToClass.has(payload.row.studentRegNo)) {
        const assignedClass = stage.assignmentState.studentToClass.get(payload.row.studentRegNo);
        if (assignedClass === payload.row.className) {
          if (skipExisting) {
            bucket.skippedEntries.push({ assignment: payload.row, message: 'Duplicate assignment in CSV' });
            continue;
          }

          bucket.failedEntries.push({ assignment: payload.row, error: 'Duplicate assignment in CSV' });
          continue;
        }

        bucket.failedEntries.push({ assignment: payload.row, error: `Student already assigned to ${assignedClass} in this upload` });
        continue;
      }

      stage.assignmentState.studentToClass.set(payload.row.studentRegNo, payload.row.className);
      stage.assignments.studentAssignments.push({
        studentRegNo: payload.row.studentRegNo,
        className: payload.row.className
      });

      bucket.successful.push({ student: payload.row.studentRegNo, class: payload.row.className });
    } catch (error) {
      bucket.failedEntries.push({ assignment: payload.row, error: error.message || 'Failed to validate student assignment' });
    }
  }
}

async function processFacultyAssignments(file, stage, bucket, skipExisting) {
  const rows = await loadCsv(file);

  for (const rawRow of rows) {
    const payload = normaliseAssignmentRow(rawRow, 'facultyRegNo');
    if (payload.error) {
      bucket.failedEntries.push({ assignment: payload.row, error: payload.error });
      continue;
    }

    try {
      const classState = await resolveClassState(stage, payload.row.className);
      if (!classState) {
        bucket.failedEntries.push({ assignment: payload.row, error: `Class ${payload.row.className} not found` });
        continue;
      }

      const teacherState = await resolveTeacherState(stage, payload.row.facultyRegNo);
      if (!teacherState) {
        bucket.failedEntries.push({ assignment: payload.row, error: `Faculty ${payload.row.facultyRegNo} not found` });
        continue;
      }

      if (teacherState.role !== 'Faculty') {
        bucket.failedEntries.push({ assignment: payload.row, error: 'Only Faculty can be assigned as class faculty' });
        continue;
      }

      const assignedSet = getOrCreateSet(stage.assignmentState.classFaculty, payload.row.className);

      if (assignedSet.has(payload.row.facultyRegNo)) {
        if (skipExisting) {
          bucket.skippedEntries.push({ assignment: payload.row, message: 'Faculty already assigned to this class' });
          continue;
        }

        bucket.failedEntries.push({ assignment: payload.row, error: 'Faculty already assigned to this class' });
        continue;
      }

      if (classState.existingFacultyIds.has(teacherState._id)) {
        if (skipExisting) {
          bucket.skippedEntries.push({ assignment: payload.row, message: 'Faculty already assigned in database' });
          continue;
        }

        bucket.failedEntries.push({ assignment: payload.row, error: 'Faculty already assigned in database' });
        continue;
      }

      assignedSet.add(payload.row.facultyRegNo);
      stage.assignments.facultyAssignments.push({
        facultyRegNo: payload.row.facultyRegNo,
        className: payload.row.className
      });

      bucket.successful.push({ faculty: payload.row.facultyRegNo, class: payload.row.className });
    } catch (error) {
      bucket.failedEntries.push({ assignment: payload.row, error: error.message || 'Failed to validate faculty assignment' });
    }
  }
}

async function processAdvisorAssignments(file, stage, bucket, skipExisting) {
  const rows = await loadCsv(file);

  for (const rawRow of rows) {
    const payload = normaliseAssignmentRow(rawRow, 'advisorRegNo');
    if (payload.error) {
      bucket.failedEntries.push({ assignment: payload.row, error: payload.error });
      continue;
    }

    try {
      const classState = await resolveClassState(stage, payload.row.className);
      if (!classState) {
        bucket.failedEntries.push({ assignment: payload.row, error: `Class ${payload.row.className} not found` });
        continue;
      }

      const teacherState = await resolveTeacherState(stage, payload.row.advisorRegNo);
      if (!teacherState) {
        bucket.failedEntries.push({ assignment: payload.row, error: `Academic Advisor ${payload.row.advisorRegNo} not found` });
        continue;
      }

      if (teacherState.role !== 'Academic Advisor' && teacherState.role !== 'HOD') {
        bucket.failedEntries.push({ assignment: payload.row, error: 'Only Academic Advisors or HODs can be assigned as advisors' });
        continue;
      }

      const assignedSet = getOrCreateSet(stage.assignmentState.classAdvisors, payload.row.className);

      if (assignedSet.has(payload.row.advisorRegNo)) {
        if (skipExisting) {
          bucket.skippedEntries.push({ assignment: payload.row, message: 'Advisor already assigned to this class' });
          continue;
        }

        bucket.failedEntries.push({ assignment: payload.row, error: 'Advisor already assigned to this class' });
        continue;
      }

      if (classState.existingAdvisorIds.has(teacherState._id)) {
        if (skipExisting) {
          bucket.skippedEntries.push({ assignment: payload.row, message: 'Advisor already assigned in database' });
          continue;
        }

        bucket.failedEntries.push({ assignment: payload.row, error: 'Advisor already assigned in database' });
        continue;
      }

      assignedSet.add(payload.row.advisorRegNo);
      stage.assignments.advisorAssignments.push({
        advisorRegNo: payload.row.advisorRegNo,
        className: payload.row.className
      });

      bucket.successful.push({ advisor: payload.row.advisorRegNo, class: payload.row.className });
    } catch (error) {
      bucket.failedEntries.push({ assignment: payload.row, error: error.message || 'Failed to validate advisor assignment' });
    }
  }
}

async function commitStagedData(stage) {
  const summary = {
    classes: { created: 0 },
    teachers: { created: 0 },
    students: { created: 0 },
    assignments: {
      students: { successful: 0, failed: 0, skipped: 0, failedEntries: [], skippedEntries: [] },
      faculty: { successful: 0, failed: 0, skipped: 0, failedEntries: [], skippedEntries: [] },
      advisors: { successful: 0, failed: 0, skipped: 0, failedEntries: [], skippedEntries: [] }
    }
  };

  if (stage.classesToCreate.length > 0) {
    await ensureClassesAreStillUnique(stage.classesToCreate);
    await classModel.insertMany(stage.classesToCreate.map((record) => ({
      year: record.year,
      section: record.section,
      academicYear: record.academicYear,
      department: record.department,
      assignedFaculty: [],
      students: [],
      facultyAssigned: [],
      academicAdvisors: []
    })), { ordered: true });
    summary.classes.created = stage.classesToCreate.length;
  }

  if (stage.teachersToCreate.length > 0) {
    await ensureTeachersAreStillUnique(stage.teachersToCreate);
    const teacherDocs = await Promise.all(stage.teachersToCreate.map(async (record) => ({
      name: record.name,
      email: record.email,
      password: await teacherModel.hashedPassword(record.password),
      rawPassword: record.password,
      registerNo: record.registerNo,
      department: record.role !== 'Chairperson' ? record.department : undefined,
      role: record.role,
      managedDepartments: record.managedDepartments
    })));
    await teacherModel.insertMany(teacherDocs, { ordered: true });
    summary.teachers.created = teacherDocs.length;
  }

  if (stage.studentsToCreate.length > 0) {
    await ensureStudentsAreStillUnique(stage.studentsToCreate);
    const studentDocs = await Promise.all(stage.studentsToCreate.map(async (record) => ({
      name: record.name,
      email: record.email,
      password: await studentModel.hashedPassword(record.password),
      rawPassword: record.password,
      registerNo: record.registerNo,
      year: record.year,
      course: record.course,
      program: record.program,
      department: record.department,
      programDurationYears: record.programDurationYears,
      registrationYear: record.registrationYear
    })));
    await studentModel.insertMany(studentDocs, { ordered: true });
    summary.students.created = studentDocs.length;
  }

  if (stage.assignments.studentAssignments.length > 0) {
    const result = await assignmentService.assignStudentsToClasses(stage.assignments.studentAssignments, {
      dryRun: false,
      skipExisting: stage.skipExisting.studentAssignments
    });
    summary.assignments.students = summariseAssignmentResult(result);
  }

  if (stage.assignments.facultyAssignments.length > 0) {
    const result = await assignmentService.assignFacultyToClasses(stage.assignments.facultyAssignments, {
      dryRun: false,
      skipExisting: stage.skipExisting.facultyAssignments
    });
    summary.assignments.faculty = summariseAssignmentResult(result);
  }

  if (stage.assignments.advisorAssignments.length > 0) {
    const result = await assignmentService.assignAdvisorsToClasses(stage.assignments.advisorAssignments, {
      dryRun: false,
      skipExisting: stage.skipExisting.advisorAssignments
    });
    summary.assignments.advisors = summariseAssignmentResult(result);
  }

  return summary;
}

function summariseAssignmentResult(result) {
  return {
    successful: result.successful.length,
    failed: result.failedEntries.length,
    skipped: result.skippedEntries.length,
    failedEntries: result.failedEntries,
    skippedEntries: result.skippedEntries
  };
}

async function ensureClassesAreStillUnique(records) {
  for (const record of records) {
    const existing = await classModel.findOne({
      year: record.year,
      section: record.section,
      academicYear: record.academicYear,
      department: record.department
    });

    if (existing) {
      const error = new Error(`Class ${record.year}-${record.section}-${record.department} already exists. Please re-run verification.`);
      error.statusCode = 409;
      throw error;
    }
  }
}

async function ensureTeachersAreStillUnique(records) {
  for (const record of records) {
    const existing = await teacherModel.findOne({
      $or: [{ email: record.email }, { registerNo: record.registerNo }]
    });

    if (existing) {
      const error = new Error(`Teacher ${record.registerNo} already exists. Please re-run verification.`);
      error.statusCode = 409;
      throw error;
    }

    if (record.role === 'HOD') {
      const conflict = await teacherModel.findOne({ department: record.department, role: 'HOD' });
      if (conflict) {
        const error = new Error(`HOD already exists for ${record.department}. Please re-run verification.`);
        error.statusCode = 409;
        throw error;
      }
    }

    if (record.role === 'Chairperson') {
      const conflict = await teacherModel.findOne({ role: 'Chairperson' });
      if (conflict) {
        const error = new Error('Chairperson already exists. Please re-run verification.');
        error.statusCode = 409;
        throw error;
      }
    }
  }
}

async function ensureStudentsAreStillUnique(records) {
  for (const record of records) {
    const existing = await studentModel.findOne({
      $or: [{ email: record.email }, { registerNo: record.registerNo }]
    });

    if (existing) {
      const error = new Error(`Student ${record.registerNo} already exists. Please re-run verification.`);
      error.statusCode = 409;
      throw error;
    }
  }
}

function formatResultsForResponse(results) {
  const formatted = {};
  for (const [key, bucket] of Object.entries(results)) {
    formatted[key] = {
      successful: bucket.successful.length,
      failed: bucket.failedEntries.length,
      skipped: bucket.skippedEntries.length,
      successfulEntries: bucket.successful,
      failedEntries: bucket.failedEntries,
      skippedEntries: bucket.skippedEntries
    };
  }
  return formatted;
}

function createResultAggregate() {
  return {
    classes: createResultBucket(),
    teachers: createResultBucket(),
    students: createResultBucket(),
    studentAssignments: createResultBucket(),
    facultyAssignments: createResultBucket(),
    advisorAssignments: createResultBucket()
  };
}

function createResultBucket() {
  return {
    successful: [],
    failedEntries: [],
    skippedEntries: []
  };
}

function createStage(adminId, skipExisting, ttlMs) {
  return {
    adminId,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
    skipExisting,
    classesToCreate: [],
    classKeyMap: new Map(),
    classStates: new Map(),
    teachersToCreate: [],
    teacherByRegister: new Map(),
    teacherEmailSet: new Set(),
    teacherLookup: new Map(),
    hodByDepartment: new Set(),
    chairpersonStaged: false,
    studentsToCreate: [],
    studentByRegister: new Map(),
    studentEmailSet: new Set(),
    studentLookup: new Map(),
    assignments: {
      studentAssignments: [],
      facultyAssignments: [],
      advisorAssignments: []
    },
    assignmentState: {
      studentToClass: new Map(),
      classFaculty: new Map(),
      classAdvisors: new Map()
    }
  };
}

function normaliseClassRow(row) {
  const payload = {
    year: parseIntSafe(row.year),
    section: toTrimUpper(row.section),
    academicYear: toTrim(row.academicYear),
    department: toTrimUpper(row.department)
  };

  if (!payload.year) {
    return { payload, error: 'Year is required and must be a number' };
  }

  if (!payload.section) {
    return { payload, error: 'Section is required' };
  }

  if (!payload.academicYear) {
    return { payload, error: 'Academic year is required' };
  }

  if (!payload.department) {
    return { payload, error: 'Department is required' };
  }

  return { payload };
}

function createStagedClassState(payload) {
  const className = `${payload.year}-${payload.section}-${payload.department}`;
  return {
    snapshot: {
      year: payload.year,
      section: payload.section,
      academicYear: payload.academicYear,
      department: payload.department,
      className
    },
    existingFacultyIds: new Set(),
    existingAdvisorIds: new Set()
  };
}

function createExistingClassState(doc) {
  return {
    snapshot: {
      year: doc.year,
      section: doc.section,
      academicYear: doc.academicYear,
      department: doc.department,
      className: doc.className,
      _id: doc._id
    },
    existingFacultyIds: new Set(doc.facultyAssigned.map((id) => id.toString())),
    existingAdvisorIds: new Set(doc.academicAdvisors.map((id) => id.toString()))
  };
}

function normaliseTeacherRow(row) {
  const payload = {
    name: toTrim(row.name),
    email: toTrim(row.email),
    password: row.password ? String(row.password) : '',
    registerNo: toTrim(row.registerNo),
    role: toTrim(row.role),
    department: row.role && row.role.trim() === 'Chairperson' ? null : toTrimUpper(row.department),
    managedDepartments: parseCsvList(row.managedDepartments)
  };

  if (!payload.name || !payload.email || !payload.password || !payload.registerNo || !payload.role) {
    return { payload, error: 'Missing required fields' };
  }

  if (!VALID_TEACHER_ROLES.includes(payload.role)) {
    return { payload, error: 'Invalid role' };
  }

  if (payload.role !== 'Chairperson' && !payload.department) {
    return { payload, error: 'Department is required for the selected role' };
  }

  return { payload };
}

async function validateManagedDepartments(entries) {
  if (!entries || entries.length === 0) {
    return { isValid: true, cleaned: [] };
  }

  const cleaned = [];
  for (const entry of entries) {
    const code = entry.toUpperCase();
    const departmentConfig = await metadataCache.getDepartmentByCode(code);
    if (!departmentConfig || departmentConfig.isActive === false) {
      return { isValid: false, error: `Managed department ${code} is not available` };
    }
    if (!cleaned.includes(code)) {
      cleaned.push(code);
    }
  }

  return { isValid: true, cleaned };
}

function normaliseStudentRow(row) {
  const payload = {
    name: toTrim(row.name),
    email: toTrim(row.email),
    password: row.password ? String(row.password) : '',
    registerNo: toTrim(row.registerNo),
    course: toTrimUpper(row.course),
    registrationYear: parseIntSafe(row.registrationYear),
    year: parseIntSafe(row.year) || 1
  };

  if (!payload.name || !payload.email || !payload.password || !payload.registerNo || !payload.course || !payload.registrationYear) {
    return { payload, error: 'Missing required fields' };
  }

  if (payload.year < 1) {
    return { payload, error: 'Year must be a positive number when provided' };
  }

  return { payload };
}

function normaliseAssignmentRow(row, idKey) {
  const assignment = {
    className: toTrim(row.className),
    [idKey]: toTrim(row[idKey])
  };

  if (!assignment.className || !assignment[idKey]) {
    return { row: assignment, error: 'Missing required fields' };
  }

  return { row: assignment };
}

async function resolveClassState(stage, className) {
  if (!className) {
    return null;
  }

  if (stage.classStates.has(className)) {
    return stage.classStates.get(className);
  }

  const existing = await classModel.findOne({ className }).populate([
    { path: 'facultyAssigned', select: '_id registerNo' },
    { path: 'academicAdvisors', select: '_id registerNo' }
  ]);

  if (!existing) {
    return null;
  }

  const state = createExistingClassState(existing);
  state.snapshot.className = className;
  state.snapshot._id = existing._id.toString();
  stage.classStates.set(className, state);
  return state;
}

async function resolveTeacherState(stage, registerNo) {
  if (!registerNo) {
    return null;
  }

  if (stage.teacherLookup.has(registerNo)) {
    return stage.teacherLookup.get(registerNo);
  }

  const existing = await teacherModel.findOne({ registerNo });
  if (!existing) {
    return null;
  }

  const state = {
    registerNo: existing.registerNo,
    role: existing.role,
    department: existing.department || null,
    managedDepartments: existing.managedDepartments || [],
    _id: existing._id.toString(),
    source: 'existing'
  };

  stage.teacherLookup.set(registerNo, state);
  return state;
}

async function resolveStudentState(stage, registerNo) {
  if (!registerNo) {
    return null;
  }

  if (stage.studentLookup.has(registerNo)) {
    return stage.studentLookup.get(registerNo);
  }

  const existing = await studentModel.findOne({ registerNo }).populate({ path: 'currentClass.ref', select: 'className' });
  if (!existing) {
    return null;
  }

  const state = createExistingStudentState(existing);
  stage.studentLookup.set(registerNo, state);
  return state;
}

function createExistingTeacherState(doc) {
  return {
    registerNo: doc.registerNo,
    role: doc.role,
    department: doc.department || null,
    managedDepartments: doc.managedDepartments || [],
    _id: doc._id.toString(),
    source: 'existing'
  };
}

function createExistingStudentState(doc) {
  const currentClassName = doc.currentClass?.year && doc.currentClass?.section ? `${doc.currentClass.year}-${doc.currentClass.section}-${doc.department}` : doc.currentClass?.ref?.className || null;
  const currentClassId = doc.currentClass?.ref ? doc.currentClass.ref.toString() : null;

  return {
    registerNo: doc.registerNo,
    department: doc.department,
    program: doc.program,
    currentClassName,
    currentClassId,
    _id: doc._id.toString(),
    source: 'existing'
  };
}

function parseCsvList(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.toUpperCase());
}

function toTrim(value) {
  return value ? String(value).trim() : '';
}

function toTrimUpper(value) {
  return value ? String(value).trim().toUpperCase() : '';
}

function parseIntSafe(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function getOrCreateSet(map, key) {
  if (!map.has(key)) {
    map.set(key, new Set());
  }
  return map.get(key);
}

module.exports = new ImportOrchestratorService();
