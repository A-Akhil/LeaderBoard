const archiver = require('archiver');
const DepartmentConfig = require('../models/departmentConfig.model');
const CourseConfig = require('../models/courseConfig.model');
const classModel = require('../models/class.model');

const TEMPLATE_KEYS = new Set([
  'classes',
  'teachers',
  'students',
  'student-assignments',
  'faculty-assignments',
  'advisor-assignments'
]);

const TEMPLATE_HEADERS = {
  classes: ['year', 'section', 'academicYear', 'department'],
  teachers: ['name', 'email', 'password', 'registerNo', 'role', 'department', 'managedDepartments'],
  students: ['name', 'email', 'password', 'registerNo', 'course', 'registrationYear', 'year'],
  'student-assignments': ['className', 'studentRegNo'],
  'faculty-assignments': ['className', 'facultyRegNo'],
  'advisor-assignments': ['className', 'advisorRegNo']
};

const requiresClassList = new Set(['student-assignments', 'faculty-assignments', 'advisor-assignments']);
const VALID_TEACHER_ROLES = ['Faculty', 'Academic Advisor', 'HOD', 'Associate Chairperson', 'Chairperson'];

const toLine = (values) => values.map((value) => (value === undefined || value === null ? '' : String(value))).join(',');

const currentAcademicYear = () => {
  const today = new Date();
  const startYear = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
};

const pickSampleDepartment = (departments = []) => departments[0]?.code || 'DEPARTMENT';
const pickSampleCourse = (courses = []) => courses[0]?.code || 'COURSE-CODE';

const buildCsvTemplate = (type, { departments, courses }) => {
  const headers = TEMPLATE_HEADERS[type];
  if (!headers) {
    return '';
  }

  const sampleRow = (() => {
    switch (type) {
      case 'classes': {
        const department = pickSampleDepartment(departments);
        return {
          year: 4,
          section: 'A1',
          academicYear: currentAcademicYear(),
          department
        };
      }
      case 'teachers': {
        const department = pickSampleDepartment(departments);
        return {
          name: 'Sample Faculty',
          email: 'faculty@example.edu',
          password: 'Faculty@123',
          registerNo: 'EMP0001',
          role: 'Faculty',
          department,
          managedDepartments: ''
        };
      }
      case 'students': {
        const course = pickSampleCourse(courses);
        return {
          name: 'Sample Student',
          email: 'student@example.edu',
          password: 'Student@123',
          registerNo: 'RA2111000000000',
          course,
          registrationYear: new Date().getFullYear(),
          year: 1
        };
      }
      case 'student-assignments':
      case 'faculty-assignments':
      case 'advisor-assignments': {
        const department = pickSampleDepartment(departments);
        const className = `4-A1-${department}`;
        const idKey = type === 'student-assignments' ? 'studentRegNo' : type === 'faculty-assignments' ? 'facultyRegNo' : 'advisorRegNo';
        return {
          className,
          [idKey]: idKey === 'studentRegNo' ? 'RA2111000000000' : 'EMP0001'
        };
      }
      default:
        return null;
    }
  })();

  const lines = [toLine(headers)];
  if (sampleRow) {
    lines.push(toLine(headers.map((key) => sampleRow[key])));
  }
  return `${lines.join('\n')}\n`;
};

const formatDepartmentSummary = (departments = []) => {
  if (!departments.length) {
    return 'None configured';
  }
  return departments
    .map((dept) => {
      const aliases = Array.isArray(dept.aliases) && dept.aliases.length > 0 ? ` | Aliases: ${dept.aliases.join(', ')}` : '';
      const hodInfo = dept.hodTeacher
        ? ` | HOD: ${dept.hodTeacher.name} <${dept.hodTeacher.email}> (${dept.hodTeacher.registerNo})`
        : dept.hodEmail
        ? ` | HOD Email: ${dept.hodEmail}`
        : '';
      return `- ${dept.code}: ${dept.name}${aliases}${hodInfo}`;
    })
    .join('\n');
};

const formatCourseSummary = (courses = []) => {
  if (!courses.length) {
    return 'None configured';
  }
  return courses
    .map((course) => {
      const display = course.displayName ? ` | Display: ${course.displayName}` : '';
      return `- ${course.code}: ${course.name} | Degree: ${course.degreeType} | Duration: ${course.durationYears} years | Department: ${course.departmentCode}${display}`;
    })
    .join('\n');
};

const formatClassSummary = (classes = []) => {
  if (!classes.length) {
    return 'No classes currently registered.';
  }
  return classes
    .slice(0, 200)
    .map((cls) => `- ${cls.className} (Year ${cls.year}, Section ${cls.section}, Department ${cls.department})`)
    .join('\n');
};

const buildReferenceText = (type, metadata, classes) => {
  const lines = [];
  lines.push('Bulk Import Template Reference');
  lines.push(`Template Type: ${type}`);
  lines.push(`Generated At: ${new Date().toISOString()}`);
  lines.push('');

  switch (type) {
    case 'classes':
      lines.push('Columns: year, section, academicYear, department');
      lines.push('Year: numeric between 1 and 5. Section: format like A1, B2. Academic year must match YYYY-YYYY pattern. Department must be an active code.');
      break;
    case 'teachers':
      lines.push('Columns: name, email, password, registerNo, role, department, managedDepartments');
      lines.push('Provide managedDepartments (comma separated) for Associate Chairperson roles. Chairperson rows should leave department blank.');
      lines.push(`Allowed roles: ${VALID_TEACHER_ROLES.join(', ')}`);
      break;
    case 'students':
      lines.push('Columns: name, email, password, registerNo, course, registrationYear, year');
      lines.push('Course must be an active course code. Registration year is the cohort start year (numeric). Year defaults to 1 if omitted.');
      break;
    case 'student-assignments':
      lines.push('Columns: className, studentRegNo');
      lines.push('Use the generated class name format YEAR-SECTION-DEPARTMENT. studentRegNo must exist in the student upload.');
      break;
    case 'faculty-assignments':
      lines.push('Columns: className, facultyRegNo');
      lines.push('Assign faculty register numbers to class names. Faculty must exist from the teacher upload.');
      break;
    case 'advisor-assignments':
      lines.push('Columns: className, advisorRegNo');
      lines.push('Advisor register numbers must reference Academic Advisor or HOD profiles.');
      break;
    default:
      break;
  }

  lines.push('');
  lines.push('Active Departments:');
  lines.push(formatDepartmentSummary(metadata.departments));
  lines.push('');
  lines.push('Active Courses:');
  lines.push(formatCourseSummary(metadata.courses));

  if (classes) {
    lines.push('');
    lines.push('Existing Classes:');
    lines.push(formatClassSummary(classes));
  }

  return `${lines.join('\n')}\n`;
};

exports.downloadTemplate = async (req, res) => {
  try {
    const rawType = req.params.type;
    const normalisedType = typeof rawType === 'string' ? rawType.toLowerCase() : '';

    if (!TEMPLATE_KEYS.has(normalisedType)) {
      return res.status(400).json({ success: false, message: 'Unknown template type requested' });
    }

    const [departments, courses] = await Promise.all([
      DepartmentConfig.find({}).sort({ code: 1 }).populate('hodTeacher', 'name email registerNo'),
      CourseConfig.find({}).sort({ code: 1 })
    ]);

    let classSummaries = null;
    if (requiresClassList.has(normalisedType)) {
      classSummaries = await classModel.find({}, 'className department year section').sort({ department: 1, year: 1, section: 1 });
    }

    const csvContent = buildCsvTemplate(normalisedType, { departments, courses });
    const referenceContent = buildReferenceText(normalisedType, { departments, courses }, classSummaries);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${normalisedType}-template-${Date.now()}.zip`
    );

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(res);
    archive.append(csvContent, { name: `${normalisedType}_template.csv` });
    archive.append(referenceContent, { name: 'reference.txt' });

    await archive.finalize();
  } catch (error) {
    console.error('Error generating template download:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate template download' });
    }
  }
};
