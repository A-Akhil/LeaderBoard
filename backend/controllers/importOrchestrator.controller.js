const multer = require('multer');
const importOrchestratorService = require('../services/importOrchestrator.service');
const { parseBooleanFlag } = require('../utils/requestFlags');

const upload = multer({ storage: multer.memoryStorage() });

const FILE_FIELDS = [
  { name: 'classesCsv', maxCount: 1 },
  { name: 'teachersCsv', maxCount: 1 },
  { name: 'studentsCsv', maxCount: 1 },
  { name: 'studentAssignmentsCsv', maxCount: 1 },
  { name: 'facultyAssignmentsCsv', maxCount: 1 },
  { name: 'advisorAssignmentsCsv', maxCount: 1 }
];

const DEFAULT_SKIP_FLAGS = {
  classes: false,
  teachers: false,
  students: false,
  studentAssignments: false,
  facultyAssignments: false,
  advisorAssignments: false
};

function extractSkipFlags(req) {
  const sources = [req.body || {}, req.query || {}];
  const flags = { ...DEFAULT_SKIP_FLAGS };

  const fieldMap = {
    classes: ['skipExistingClasses', 'skipExisting[classes]', 'classesSkipExisting'],
    teachers: ['skipExistingTeachers', 'skipExisting[teachers]', 'teachersSkipExisting'],
    students: ['skipExistingStudents', 'skipExisting[students]', 'studentsSkipExisting'],
    studentAssignments: ['skipExistingStudentAssignments', 'skipExisting[studentAssignments]', 'studentAssignmentsSkipExisting'],
    facultyAssignments: ['skipExistingFacultyAssignments', 'skipExisting[facultyAssignments]', 'facultyAssignmentsSkipExisting'],
    advisorAssignments: ['skipExistingAdvisorAssignments', 'skipExisting[advisorAssignments]', 'advisorAssignmentsSkipExisting']
  };

  for (const [key, aliases] of Object.entries(fieldMap)) {
    for (const source of sources) {
      for (const alias of aliases) {
        if (alias in source) {
          flags[key] = parseBooleanFlag(source[alias]);
          break;
        }
      }
      if (flags[key]) {
        break;
      }
    }
  }

  return flags;
}

async function verifyBundle(req, res) {
  try {
    const skipExisting = extractSkipFlags(req);
    const adminId = req.admin?._id;

    if (!adminId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const result = await importOrchestratorService.verifyBundle({
      files: req.files || {},
      adminId,
      skipExisting
    });

    return res.status(200).json({
      message: result.sessionId ? 'Bulk import validation completed' : 'Bulk import validation reported issues',
      sessionId: result.sessionId,
      expiresAt: result.expiresAt,
      results: result.results
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || 'Failed to validate bulk import bundle'
    });
  }
}

async function commitBundle(req, res) {
  try {
    const adminId = req.admin?._id;
    if (!adminId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { sessionId } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ message: 'sessionId is required' });
    }

    const summary = await importOrchestratorService.commitSession(sessionId, adminId);

    return res.status(200).json({
      message: 'Bulk import commit completed',
      sessionId,
      results: summary
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || 'Failed to commit bulk import bundle'
    });
  }
}

module.exports = {
  upload,
  FILE_FIELDS,
  verifyBundle,
  commitBundle
};
