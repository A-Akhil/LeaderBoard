import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Upload, Users, FileText, UserPlus, Calendar, MessageSquare, Settings, Layers, Info, Shield } from 'lucide-react';
import AdminUpcomingEventForm from '../../components/AdminUpcomingEventForm';
import UpcomingEventsList from '../../components/UpcomingEventsList';
import ReportsPage from '../ReportsPage';
import AdminFeedbackReview from './AdminFeedbackReview';
import EnumManagement from './EnumManagement';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const VITE_BASE_URL = import.meta.env.VITE_BASE_URL;

const DEGREE_TYPE_OPTIONS = [
  { value: 'BTECH', label: 'B.Tech (default 4 years)' },
  { value: 'MTECH', label: 'M.Tech (default 2 years)' },
  { value: 'MTECH_INTEGRATED', label: 'Integrated M.Tech (default 5 years)' }
];

const DEGREE_DURATION_DEFAULTS = {
  BTECH: 4,
  MTECH: 2,
  MTECH_INTEGRATED: 5
};

const COURSE_FIELD_TOOLTIPS = {
  code: 'Primary identifier shared across metadata, bulk CSV uploads, and student/teacher records. Generated as DEGREETYPE-DEPARTMENT-SPECIALISATION, e.g., BTECH-CINTEL-CSE-AIML.',
  name: 'Canonical course title that appears in reports and metadata listings. Should match institutional naming.',
  displayName: 'Optional friendly label for UI surfaces. If left blank, the system falls back to the course name.',
  degreeType: 'Degree track associated with the course. Drives default duration values and the derived degree summary.',
  durationYears: 'Number of academic years the course spans. Used to validate student registration years and cohort progress.',
  departmentCode: 'Owning department code that must already exist in metadata. Determines department validations for imports and assignments.'
};

const BUNDLE_STEP_KEYS = ['classes', 'teachers', 'students', 'studentAssignments', 'facultyAssignments', 'advisorAssignments'];

const BUNDLE_FIELD_MAP = {
  classes: 'classesCsv',
  teachers: 'teachersCsv',
  students: 'studentsCsv',
  studentAssignments: 'studentAssignmentsCsv',
  facultyAssignments: 'facultyAssignmentsCsv',
  advisorAssignments: 'advisorAssignmentsCsv'
};

const BUNDLE_SKIP_FIELD_MAP = {
  classes: 'skipExistingClasses',
  teachers: 'skipExistingTeachers',
  students: 'skipExistingStudents',
  studentAssignments: 'skipExistingStudentAssignments',
  facultyAssignments: 'skipExistingFacultyAssignments',
  advisorAssignments: 'skipExistingAdvisorAssignments'
};

const normaliseSegment = (value) => (value ? value.toString().trim().toUpperCase() : '');

const stripDegreePrefixes = (value = '') =>
  value
    .replace(/B\.?\s*Tech\.?/gi, '')
    .replace(/M\.?\s*Tech\.?/gi, '')
    .replace(/Integrated/gi, '')
    .replace(/Bachelor/gi, '')
    .replace(/Master/gi, '')
    .replace(/Programme/gi, '')
    .replace(/Program/gi, '')
    .replace(/Degree/gi, '')
    .replace(/Course/gi, '');

const SPECIALISATION_STOPWORDS = new Set([
  'AND',
  'WITH',
  'IN',
  'OF',
  'THE',
  'FOR',
  'ON',
  'SPECIALIZATION',
  'SPECIALISATION',
  'SPECIALIZED',
  'SPECIALISED'
]);

const SPECIALISATION_PATTERNS = [
  { sequence: ['COMPUTER', 'SCIENCE', 'ENGINEERING'], output: 'CSE' },
  { sequence: ['INFORMATION', 'TECHNOLOGY'], output: 'IT' },
  { sequence: ['ARTIFICIAL', 'INTELLIGENCE'], output: 'AI' },
  { sequence: ['DATA', 'SCIENCE'], output: 'DS' },
  { sequence: ['MACHINE', 'LEARNING'], output: 'ML' },
  { sequence: ['ELECTRONICS', 'COMMUNICATION'], output: 'ECE' },
  { sequence: ['ELECTRICAL', 'ELECTRONICS'], output: 'EEE' }
];

const combineSegments = (segments) => {
  const combined = [];
  for (let i = 0; i < segments.length; i += 1) {
    const current = segments[i];
    const next = segments[i + 1];
    if (current === 'AI' && next === 'ML') {
      combined.push('AIML');
      i += 1;
    } else {
      combined.push(current);
    }
  }
  return combined;
};

const deriveSpecialisationSegment = (name = '') => {
  const withoutPrefixes = stripDegreePrefixes(name);
  const sanitised = withoutPrefixes.replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
  if (!sanitised) {
    return '';
  }

  const rawTokens = sanitised
    .split(' ')
    .map((token) => token.trim().toUpperCase())
    .filter((token) => token && !SPECIALISATION_STOPWORDS.has(token));

  if (rawTokens.length === 0) {
    return '';
  }

  const segments = [];
  for (let i = 0; i < rawTokens.length;) {
    const token = rawTokens[i];
    const matchedPattern = SPECIALISATION_PATTERNS.find(({ sequence }) =>
      sequence.every((value, idx) => rawTokens[i + idx] === value)
    );

    if (matchedPattern) {
      segments.push(matchedPattern.output);
      i += matchedPattern.sequence.length;
      continue;
    }

    segments.push(token.slice(0, 4));
    i += 1;
  }

  const condensed = combineSegments(segments);
  const finalSegment = condensed.join('-');
  return finalSegment.length > 20 ? finalSegment.slice(0, 20) : finalSegment;
};

const deriveCourseCode = (degreeType, departmentCode, name) => {
  const degreeSegment = normaliseSegment(degreeType);
  const departmentSegment = normaliseSegment(departmentCode);
  const specialisationSegment = deriveSpecialisationSegment(name);

  if (!degreeSegment || !departmentSegment || !specialisationSegment) {
    return '';
  }

  return `${degreeSegment}-${departmentSegment}-${specialisationSegment}`;
};

const LabelWithInfo = ({ label, tooltip }) => (
  <div className="flex items-center gap-1">
    <span>{label}</span>
    <span
      className="inline-flex cursor-help text-gray-400 hover:text-gray-600 focus:text-gray-600 focus:outline-none"
      role="img"
      aria-label={`${label} information`}
      tabIndex={0}
      title={tooltip}
    >
      <Info size={14} aria-hidden="true" />
    </span>
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('create-class');
  const [classFile, setClassFile] = useState(null);
  const [studentsFile, setStudentsFile] = useState(null);
  const [teacherFile, setTeacherFile] = useState(null);
  const [registerStudentFile, setRegisterStudentFile] = useState(null);
  const [studentAssignmentFile, setStudentAssignmentFile] = useState(null);
  const [facultyAssignmentFile, setFacultyAssignmentFile] = useState(null);
  const [advisorAssignmentFile, setAdvisorAssignmentFile] = useState(null);

  const [bulkImportOptions, setBulkImportOptions] = useState({
    classes: { skipExisting: false },
    teachers: { skipExisting: false },
    students: { skipExisting: false },
    studentAssignments: { skipExisting: false },
    facultyAssignments: { skipExisting: false },
    advisorAssignments: { skipExisting: false }
  });

  const createStatus = (overrides = {}) => ({
    status: 'idle',
    message: '',
    details: [],
    hasFailures: false,
    ...overrides
  });

  const createInitialUploadStates = () => ({
    classes: createStatus(),
    students: createStatus(),
    teachers: createStatus(),
    registerStudent: createStatus(),
    studentAssignments: createStatus(),
    facultyAssignments: createStatus(),
    advisorAssignments: createStatus()
  });

  const [adminInfo, setAdminInfo] = useState(() => {
    const stored = localStorage.getItem('admin-data');
    if (!stored) {
      return null;
    }
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse admin-data from localStorage:', error);
      return null;
    }
  });

  const [metadataLists, setMetadataLists] = useState({
    departments: [],
    degreeSummaries: [],
    courses: []
  });

  const [degreeSummaryNote, setDegreeSummaryNote] = useState('');

  const metadataLoadedRef = useRef(false);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState('');

  const [departmentForm, setDepartmentForm] = useState({
    code: '',
    name: '',
    description: '',
    aliases: '',
    hodEmail: ''
  });
  const [editingDepartmentCode, setEditingDepartmentCode] = useState(null);

  const [courseForm, setCourseForm] = useState({
    code: '',
    name: '',
    displayName: '',
    degreeType: 'BTECH',
    departmentCode: '',
    durationYears: String(DEGREE_DURATION_DEFAULTS.BTECH)
  });
  const [editingCourseCode, setEditingCourseCode] = useState(null);

  const derivedCourseCode = useMemo(
    () => (editingCourseCode ? editingCourseCode : deriveCourseCode(courseForm.degreeType, courseForm.departmentCode, courseForm.name)),
    [editingCourseCode, courseForm.degreeType, courseForm.departmentCode, courseForm.name]
  );

  const [metadataStates, setMetadataStates] = useState(() => ({
    department: createStatus(),
    course: createStatus()
  }));

  const updateMetadataState = (key, nextState) => {
    setMetadataStates((prev) => ({
      ...prev,
      [key]: typeof nextState === 'function' ? nextState(prev[key]) : { ...prev[key], ...nextState }
    }));
  };

  const resetMetadataState = (key) => {
    setMetadataStates((prev) => ({
      ...prev,
      [key]: createStatus()
    }));
  };

  const isSuperAdmin = adminInfo?.role === 'Super Admin';

  const [uploadStates, setUploadStates] = useState(() => createInitialUploadStates());
  const [validationSession, setValidationSession] = useState(null);

  const updateUploadState = (key, nextState) => {
    setUploadStates((prev) => ({
      ...prev,
      [key]: typeof nextState === 'function' ? nextState(prev[key]) : { ...prev[key], ...nextState }
    }));
  };

  const resetUploadState = (key) => {
    setUploadStates((prev) => ({
      ...prev,
      [key]: createStatus()
    }));
  };

  const updateBulkImportOption = (key, option, value) => {
    if (BUNDLE_STEP_KEYS.includes(key)) {
      setValidationSession(null);
    }
    setBulkImportOptions((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [option]: value
      }
    }));
  };

  const parseResponsePayload = async (response) => {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (error) {
      return { raw: text };
    }
  };

  const buildQueryString = (query = {}) => {
    const searchParams = new URLSearchParams();

    Object.entries(query || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item !== undefined && item !== null) {
            searchParams.append(key, item);
          }
        });
        return;
      }

      searchParams.append(key, value);
    });

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  };

  const collectOutcomeDetails = (payload) => {
    const failureSources = [
      payload?.failedEntries,
      payload?.results?.failedEntries,
      payload?.results?.details?.failedEntries
    ];

    const skippedSources = [
      payload?.skippedEntries,
      payload?.results?.skippedEntries,
      payload?.results?.details?.skippedEntries
    ];

    const failureDetails = [];
    failureSources.forEach((source) => {
      if (Array.isArray(source)) {
        failureDetails.push(...source);
      }
    });

    const skippedDetails = [];
    skippedSources.forEach((source) => {
      if (Array.isArray(source)) {
        skippedDetails.push(...source);
      }
    });

    return { failureDetails, skippedDetails };
  };

  const summariseUpload = (payload, fallbackMessage) => {
    const counts = [];
    const appendCount = (label, value) => {
      if (typeof value === 'number') {
        counts.push(`${label}: ${value}`);
      }
      if (Array.isArray(value)) {
        counts.push(`${label}: ${value.length}`);
      }
    };

    const gatherCounts = (source) => {
      if (!source || typeof source !== 'object') return;
      ['successful', 'failed', 'failedEntries', 'skipped', 'skippedEntries'].forEach((key) => appendCount(key, source[key]));
    };

    gatherCounts(payload);
    gatherCounts(payload?.results);
    gatherCounts(payload?.results?.details);

    const { failureDetails, skippedDetails } = collectOutcomeDetails(payload);
    const details = [...failureDetails, ...skippedDetails];
    const messageParts = [];

    if (payload?.message) {
      messageParts.push(payload.message);
    } else if (fallbackMessage) {
      messageParts.push(fallbackMessage);
    }

    if (counts.length > 0) {
      messageParts.push(`(${counts.join(', ')})`);
    }

    return {
      summary: messageParts.join(' ').trim() || fallbackMessage || 'Completed',
      details,
      hasFailures:
        failureDetails.length > 0 ||
        Number(payload?.failed) > 0 ||
        Number(payload?.results?.failed) > 0 ||
        Number(payload?.results?.details?.failed) > 0
    };
  };

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem('admin-token');
    localStorage.removeItem('admin-data');
    navigate('/admin-login');
  }, [navigate]);

  const authorisedRequest = useCallback(async (endpoint, options = {}) => {
    const token = localStorage.getItem('admin-token');
    if (!token) {
      handleUnauthorized();
      throw new Error('Authentication required');
    }

    const response = await fetch(`${VITE_BASE_URL}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      },
      body: options.body
    });

    const payload = await parseResponsePayload(response);

    if (response.status === 401) {
      handleUnauthorized();
      throw new Error(payload?.message || 'Authentication failed');
    }

    if (response.status === 403) {
      throw new Error(payload?.message || 'Access denied');
    }

    if (!response.ok) {
      throw new Error(payload?.message || 'Request failed');
    }

    return payload;
  }, [VITE_BASE_URL, handleUnauthorized]);

  const submitCsv = async ({ key, file, endpoint, successMessage, onSuccess, query, loadingMessage }) => {
    if (!file) {
      updateUploadState(key, { status: 'error', message: 'Please select a CSV file', details: [], hasFailures: true });
      return;
    }

    const token = localStorage.getItem('admin-token');
    if (!token) {
      handleUnauthorized();
      return;
    }

    const pendingMessage = loadingMessage || 'Uploading file...';
    updateUploadState(key, { status: 'loading', message: pendingMessage, details: [], hasFailures: false });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const queryString = buildQueryString(query);
      const response = await fetch(`${VITE_BASE_URL}${endpoint}${queryString}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const payload = await parseResponsePayload(response);

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        const errorMessage = payload?.message || 'Upload failed';
        throw new Error(errorMessage);
      }

      const { summary, details, hasFailures } = summariseUpload(payload, successMessage);

      updateUploadState(key, {
        status: hasFailures ? 'warning' : 'success',
        message: summary,
        details,
        hasFailures
      });

      if (typeof onSuccess === 'function') {
        onSuccess();
      }
      return payload;
    } catch (error) {
      updateUploadState(key, {
        status: 'error',
        message: error.message || 'Upload failed',
        details: [],
        hasFailures: true
      });
      return null;
    }
  };

  const submitMetadata = async ({ key, endpoint, method = 'POST', body, successMessage }) => {
    updateMetadataState(key, { status: 'loading', message: 'Saving...', details: [] });

    try {
      const payload = await authorisedRequest(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const message = successMessage || payload?.message || 'Saved successfully';

      updateMetadataState(key, {
        status: 'success',
        message,
        details: []
      });

      return payload;
    } catch (error) {
      updateMetadataState(key, {
        status: 'error',
        message: error.message || 'Request failed',
        details: []
      });
      throw error;
    }
  };

  const fetchMetadataLists = useCallback(async () => {
    setMetadataLoading(true);
    setMetadataError('');
    try {
      const [departmentPayload, programPayload, coursePayload] = await Promise.all([
        authorisedRequest('/metadata/departments'),
        authorisedRequest('/metadata/programs'),
        authorisedRequest('/metadata/courses')
      ]);

      setMetadataLists({
        departments: departmentPayload?.data || [],
        degreeSummaries: programPayload?.data || [],
        courses: coursePayload?.data || []
      });
      setDegreeSummaryNote(programPayload?.message || '');

      metadataLoadedRef.current = true;
    } catch (error) {
      setMetadataError(error.message || 'Failed to load metadata');
      setDegreeSummaryNote('');
    } finally {
      setMetadataLoading(false);
    }
  }, [authorisedRequest]);

  // Check for authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem('admin-token');
    if (!token) {
      handleUnauthorized();
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await axios.get(`${VITE_BASE_URL}/admin/profile`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response?.data) {
          setAdminInfo(response.data);
          localStorage.setItem('admin-data', JSON.stringify(response.data));
        }
      } catch (error) {
        handleUnauthorized();
      }
    };

    verifyToken();
  }, [VITE_BASE_URL, handleUnauthorized]);

  useEffect(() => {
    if (!isSuperAdmin && (activeTab === 'metadata' || activeTab === 'leadership')) {
      setActiveTab('create-class');
    }
  }, [isSuperAdmin, activeTab]);

  useEffect(() => {
    if (activeTab === 'metadata' && isSuperAdmin && !metadataLoadedRef.current) {
      fetchMetadataLists();
    }
  }, [activeTab, isSuperAdmin, fetchMetadataLists]);

  const handleFileChange = (event, setFile, statusKey) => {
    const file = event.target.files[0];

    if (!file) {
      setFile(null);
      if (statusKey && BUNDLE_STEP_KEYS.includes(statusKey)) {
        setValidationSession(null);
      }
      return;
    }

    if (file.type === 'text/csv') {
      setFile(file);
      if (statusKey) {
        resetUploadState(statusKey);
        if (BUNDLE_STEP_KEYS.includes(statusKey)) {
          setValidationSession(null);
        }
      }
      return;
    }

    event.target.value = '';
    if (statusKey) {
      updateUploadState(statusKey, {
        status: 'error',
        message: 'Only CSV files are supported',
        details: [],
        hasFailures: true
      });
      if (BUNDLE_STEP_KEYS.includes(statusKey)) {
        setValidationSession(null);
      }
    }
  };

  const handleCreateClass = (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    submitCsv({
      key: 'classes',
      file: classFile,
      endpoint: '/class/bulk-create',
      successMessage: 'Bulk class creation completed',
      onSuccess: () => {
        setClassFile(null);
        formElement.reset();
      }
    });
  };

  const handleAddStudents = (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    submitCsv({
      key: 'students',
      file: studentsFile,
      endpoint: '/student/bulk-register',
      successMessage: 'Bulk student registration completed',
      onSuccess: () => {
        setStudentsFile(null);
        formElement.reset();
      }
    });
  };

  const handleRegisterTeacher = (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    submitCsv({
      key: 'teachers',
      file: teacherFile,
      endpoint: '/teacher/bulk-register',
      successMessage: 'Bulk teacher registration completed',
      onSuccess: () => {
        setTeacherFile(null);
        formElement.reset();
      }
    });
  };

  const handleRegisterStudent = (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    submitCsv({
      key: 'registerStudent',
      file: registerStudentFile,
      endpoint: '/student/bulk-register',
      successMessage: 'Bulk student registration completed',
      onSuccess: () => {
        setRegisterStudentFile(null);
        formElement.reset();
      }
    });
  };

  const handleStudentAssignmentsUpload = (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    submitCsv({
      key: 'studentAssignments',
      file: studentAssignmentFile,
      endpoint: '/assignment/students-to-classes',
      successMessage: 'Student-class assignments processed',
      onSuccess: () => {
        setStudentAssignmentFile(null);
        formElement.reset();
      }
    });
  };

  const handleFacultyAssignmentsUpload = (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    submitCsv({
      key: 'facultyAssignments',
      file: facultyAssignmentFile,
      endpoint: '/assignment/faculty-to-classes',
      successMessage: 'Faculty-class assignments processed',
      onSuccess: () => {
        setFacultyAssignmentFile(null);
        formElement.reset();
      }
    });
  };

  const handleAdvisorAssignmentsUpload = (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    submitCsv({
      key: 'advisorAssignments',
      file: advisorAssignmentFile,
      endpoint: '/assignment/advisors-to-classes',
      successMessage: 'Advisor-class assignments processed',
      onSuccess: () => {
        setAdvisorAssignmentFile(null);
        formElement.reset();
      }
    });
  };

  const newYearImportSteps = useMemo(
    () => [
      {
        key: 'classes',
        step: '1',
        title: 'Upload Classes',
        description: 'Creates the class roster for the new academic year.',
        file: classFile,
        setFile: setClassFile,
        endpoint: '/class/bulk-create',
        successMessage: 'Bulk class creation completed',
        templatePath: 'docs/generated_datasets/classes.csv',
        extraNote: undefined,
        supportsSkipExisting: true,
        skipExisting: bulkImportOptions.classes?.skipExisting ?? false
      },
      {
        key: 'teachers',
        step: '2',
        title: 'Upload Teachers',
        description: 'Registers faculty, advisors, and leadership roles.',
        file: teacherFile,
        setFile: setTeacherFile,
        endpoint: '/teacher/bulk-register',
        successMessage: 'Bulk teacher registration completed',
        templatePath: 'docs/generated_datasets/teachers.csv',
        extraNote: 'Ensure metadata for all departments and courses exists before this step.',
        supportsSkipExisting: true,
        skipExisting: bulkImportOptions.teachers?.skipExisting ?? false
      },
      {
        key: 'students',
        step: '3',
        title: 'Upload Students',
        description: 'Registers new student batches with course-aware validation.',
        file: studentsFile,
        setFile: setStudentsFile,
        endpoint: '/student/bulk-register',
        successMessage: 'Bulk student registration completed',
        templatePath: 'docs/generated_datasets/students.csv',
        extraNote: 'CSV must reference active course codes so degree and department mappings resolve.',
        supportsSkipExisting: true,
        skipExisting: bulkImportOptions.students?.skipExisting ?? false
      },
      {
        key: 'studentAssignments',
        step: '4',
        title: 'Assign Students to Classes',
        description: 'Links each student register number to their class.',
        file: studentAssignmentFile,
        setFile: setStudentAssignmentFile,
        endpoint: '/assignment/students-to-classes',
        successMessage: 'Student-class assignments processed',
        templatePath: 'docs/generated_datasets/student_class_assignments.csv',
        extraNote: undefined,
        supportsSkipExisting: true,
        skipExisting: bulkImportOptions.studentAssignments?.skipExisting ?? false
      },
      {
        key: 'facultyAssignments',
        step: '5',
        title: 'Assign Faculty to Classes',
        description: 'Populates faculty advisors for every class.',
        file: facultyAssignmentFile,
        setFile: setFacultyAssignmentFile,
        endpoint: '/assignment/faculty-to-classes',
        successMessage: 'Faculty-class assignments processed',
        templatePath: 'docs/generated_datasets/faculty_class_assignments.csv',
        extraNote: undefined,
        supportsSkipExisting: true,
        skipExisting: bulkImportOptions.facultyAssignments?.skipExisting ?? false
      },
      {
        key: 'advisorAssignments',
        step: '6',
        title: 'Assign Academic Advisors',
        description: 'Attaches academic advisors to each class.',
        file: advisorAssignmentFile,
        setFile: setAdvisorAssignmentFile,
        endpoint: '/assignment/advisors-to-classes',
        successMessage: 'Advisor-class assignments processed',
        templatePath: 'docs/generated_datasets/advisor_class_assignments.csv',
        extraNote: undefined,
        supportsSkipExisting: true,
        skipExisting: bulkImportOptions.advisorAssignments?.skipExisting ?? false
      }
    ],
    [
      classFile,
      teacherFile,
      studentsFile,
      studentAssignmentFile,
      facultyAssignmentFile,
      advisorAssignmentFile,
      bulkImportOptions
    ]
  );

  const normaliseBundleBucket = (bucket = {}) => {
    const successfulCount =
      typeof bucket.successful === 'number'
        ? bucket.successful
        : typeof bucket.created === 'number'
          ? bucket.created
          : 0;

    const failedEntries = Array.isArray(bucket.failedEntries) ? bucket.failedEntries : [];
    const skippedEntries = Array.isArray(bucket.skippedEntries) ? bucket.skippedEntries : [];

    const failedCount =
      typeof bucket.failed === 'number' ? bucket.failed : failedEntries.length;
    const skippedCount =
      typeof bucket.skipped === 'number' ? bucket.skipped : skippedEntries.length;

    return {
      successfulCount,
      failedCount,
      skippedCount,
      failedEntries,
      skippedEntries
    };
  };

  const resolveBundleBucket = (results, key, phase) => {
    if (!results) {
      return null;
    }

    if (phase === 'commit') {
      if (key === 'studentAssignments') {
        return results.assignments?.students || null;
      }
      if (key === 'facultyAssignments') {
        return results.assignments?.faculty || null;
      }
      if (key === 'advisorAssignments') {
        return results.assignments?.advisors || null;
      }
      return results[key] || null;
    }

    return results[key] || null;
  };

  const applyBundleBucketToState = (step, results, phase) => {
    const bucket = resolveBundleBucket(results, step.key, phase);

    if (!bucket) {
      const fallback =
        phase === 'verify'
          ? `No validation data returned for ${step.title}`
          : `No upload summary returned for ${step.title}`;
      updateUploadState(step.key, {
        status: 'error',
        message: fallback,
        details: [],
        hasFailures: true
      });
      return;
    }

    const { successfulCount, failedCount, skippedCount, failedEntries, skippedEntries } = normaliseBundleBucket(bucket);

    const counts = [];
    if (successfulCount > 0) counts.push(`Success: ${successfulCount}`);
    if (failedCount > 0) counts.push(`Failed: ${failedCount}`);
    if (skippedCount > 0) counts.push(`Skipped: ${skippedCount}`);

    let baseMessage;
    if (successfulCount === 0 && failedCount === 0 && skippedCount === 0) {
      baseMessage = phase === 'verify' ? `No rows detected for ${step.title}` : `No changes applied for ${step.title}`;
    } else if (phase === 'verify') {
      baseMessage = failedCount > 0 ? `${step.title} validation reported issues` : `${step.title} validation passed`;
    } else {
      const successCopy = step.successMessage || `${step.title} upload completed`;
      baseMessage = failedCount > 0 ? `${successCopy} with issues` : successCopy;
    }

    const message = counts.length > 0 ? `${baseMessage} (${counts.join(', ')})` : baseMessage;
    const hasFailures = failedCount > 0;
    const status = hasFailures ? 'warning' : 'success';
    const details = failedEntries.length || skippedEntries.length ? [...failedEntries, ...skippedEntries] : [];

    updateUploadState(step.key, {
      status,
      message,
      details,
      hasFailures
    });
  };

  const setBundleLoadingState = (phase) => {
    newYearImportSteps.forEach((step) => {
      updateUploadState(step.key, {
        status: 'loading',
        message: `${phase === 'verify' ? 'Validating' : 'Uploading'} ${step.title}...`,
        details: [],
        hasFailures: false
      });
    });
  };

  const propagateBundleError = (messageOrBuilder) => {
    newYearImportSteps.forEach((step) => {
      const message =
        typeof messageOrBuilder === 'function' ? messageOrBuilder(step) : messageOrBuilder;
      updateUploadState(step.key, {
        status: 'error',
        message,
        details: [],
        hasFailures: true
      });
    });
  };

  const submitBundleVerification = async () => {
    const token = localStorage.getItem('admin-token');
    if (!token) {
      handleUnauthorized();
      throw new Error('Authentication required');
    }

    const formData = new FormData();

    newYearImportSteps.forEach((step) => {
      const fieldName = BUNDLE_FIELD_MAP[step.key];
      if (!fieldName) {
        return;
      }
      formData.append(fieldName, step.file);

      const skipField = BUNDLE_SKIP_FIELD_MAP[step.key];
      if (skipField && bulkImportOptions?.[step.key]?.skipExisting) {
        formData.append(skipField, 'true');
      }
    });

    const response = await fetch(`${VITE_BASE_URL}/bulk-import/verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const payload = await parseResponsePayload(response);

    if (response.status === 401) {
      handleUnauthorized();
      throw new Error(payload?.message || 'Authentication failed');
    }

    if (!response.ok) {
      throw new Error(payload?.message || 'Validation failed');
    }

    return payload;
  };

  const submitBundleCommit = async (sessionId) =>
    authorisedRequest('/bulk-import/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });

  const ensureFilesSelected = (steps, actionLabel) => {
    let hasMissing = false;
    steps.forEach((step) => {
      if (!step.file) {
        hasMissing = true;
        updateUploadState(step.key, {
          status: 'error',
          message: `Select a CSV before running ${actionLabel}`,
          details: [],
          hasFailures: true
        });
      }
    });
    return !hasMissing;
  };

  const handleVerifyAll = async () => {
    if (!ensureFilesSelected(newYearImportSteps, 'Verify All')) {
      return;
    }

    setValidationSession(null);
    setBundleLoadingState('verify');

    try {
      const payload = await submitBundleVerification();
      const results = payload?.results || {};

      newYearImportSteps.forEach((step) => {
        applyBundleBucketToState(step, results, 'verify');
      });

      if (payload?.sessionId) {
        setValidationSession({ id: payload.sessionId, expiresAt: payload.expiresAt || null });
      } else {
        setValidationSession(null);
      }
    } catch (error) {
      propagateBundleError((step) => `${error.message || 'Validation failed'} (${step.title})`);
    }
  };

  const handleUploadAll = async () => {
    if (!canUploadAll) {
      return;
    }

    if (!validationSession?.id) {
      propagateBundleError((step) => `Run Verify All before uploading ${step.title.toLowerCase()}.`);
      return;
    }

    const expiresAtMs = validationSession.expiresAt ? Date.parse(validationSession.expiresAt) : null;
    if (expiresAtMs && Number.isFinite(expiresAtMs) && expiresAtMs < Date.now()) {
      setValidationSession(null);
      propagateBundleError((step) => `Validation session expired. Re-run Verify All for ${step.title.toLowerCase()}.`);
      return;
    }

    setBundleLoadingState('commit');

    try {
      const payload = await submitBundleCommit(validationSession.id);
      const results = payload?.results || {};

      newYearImportSteps.forEach((step) => {
        applyBundleBucketToState(step, results, 'commit');
      });

      setValidationSession(null);
    } catch (error) {
      setValidationSession(null);
      propagateBundleError((step) => `${error.message || 'Upload failed'} (${step.title})`);
    }
  };

  const isBulkProcessing = useMemo(
    () => newYearImportSteps.some((step) => uploadStates[step.key]?.status === 'loading'),
    [newYearImportSteps, uploadStates]
  );

  const blockingSteps = useMemo(() => {
    if (!validationSession?.id) {
      return [];
    }

    return newYearImportSteps
      .filter((step) => uploadStates?.[step.key]?.hasFailures)
      .map((step) => step.title);
  }, [validationSession, newYearImportSteps, uploadStates]);

  const allStepsValidated = useMemo(
    () =>
      newYearImportSteps.every((step) => {
        const state = uploadStates?.[step.key];
        return state?.status === 'success';
      }),
    [newYearImportSteps, uploadStates]
  );

  const canUploadAll = useMemo(
    () => Boolean(validationSession?.id) && blockingSteps.length === 0 && allStepsValidated,
    [validationSession, blockingSteps, allStepsValidated]
  );

  const summariseRecord = (record) => {
    if (!record || typeof record !== 'object') {
      return '';
    }

    const parts = Object.entries(record)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${key}: ${value}`);

    const summary = parts.join(', ');
    return summary.length > 180 ? `${summary.slice(0, 177)}...` : summary;
  };

  const formatFailureEntry = (entry) => {
    if (!entry) {
      return 'Unknown issue';
    }
    if (typeof entry === 'string') {
      return entry;
    }

    const context = summariseRecord(
      entry.data || entry.class || entry.student || entry.teacher || entry.assignment || entry.row
    );

    if (entry.error) {
      return context ? `${entry.error} (${context})` : entry.error;
    }

    if (entry.message) {
      return context ? `${entry.message} (${context})` : entry.message;
    }

    try {
      return JSON.stringify(entry);
    } catch (error) {
      return String(entry);
    }
  };

  const statusStyles = {
    loading: 'bg-blue-50 border-blue-200 text-blue-700',
    success: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    error: 'bg-red-50 border-red-200 text-red-700'
  };

  const parseCsvList = (value) =>
    (value || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => entry.toUpperCase());

  const handleDepartmentInputChange = (event) => {
    const { name, value } = event.target;
    setDepartmentForm((prev) => ({
      ...prev,
      [name]:
        name === 'code'
          ? value.toUpperCase()
          : name === 'hodEmail'
            ? value.toLowerCase()
            : value
    }));

    if (metadataStates.department.status !== 'idle') {
      resetMetadataState('department');
    }
  };

  const handleDepartmentReset = () => {
    setDepartmentForm({ code: '', name: '', description: '', aliases: '', hodEmail: '' });
    setEditingDepartmentCode(null);
    resetMetadataState('department');
  };

  const handleDepartmentSubmit = async (event) => {
    event.preventDefault();

    const code = departmentForm.code.trim().toUpperCase();
    const name = departmentForm.name.trim();
    const hodEmail = departmentForm.hodEmail.trim().toLowerCase();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!code || !name) {
      updateMetadataState('department', {
        status: 'error',
        message: 'Department code and name are required',
        details: []
      });
      return;
    }

    if (!hodEmail || !emailPattern.test(hodEmail)) {
      updateMetadataState('department', {
        status: 'error',
        message: 'A valid HOD email is required so the system can assign the department head automatically',
        details: []
      });
      return;
    }

    const payload = {
      code,
      name,
      description: departmentForm.description.trim() || undefined,
      aliases: parseCsvList(departmentForm.aliases),
      hodEmail
    };

    const targetCode = editingDepartmentCode || code;

    try {
      await submitMetadata({
        key: 'department',
        endpoint: editingDepartmentCode
          ? `/metadata/departments/${encodeURIComponent(editingDepartmentCode)}`
          : '/metadata/departments',
        method: editingDepartmentCode ? 'PUT' : 'POST',
        body: payload,
        successMessage: `Department ${targetCode} ${editingDepartmentCode ? 'updated' : 'saved'}`
      });

      setDepartmentForm({ code: '', name: '', description: '', aliases: '', hodEmail: '' });
      setEditingDepartmentCode(null);
      await fetchMetadataLists();
    } catch (error) {
      // Handled via submitMetadata state updates
    }
  };

  const beginDepartmentEdit = (department) => {
    if (!department) {
      return;
    }

    setDepartmentForm({
      code: department.code || '',
      name: department.name || '',
      description: department.description || '',
      aliases: Array.isArray(department.aliases) && department.aliases.length > 0 ? department.aliases.join(', ') : '',
      hodEmail: (department.hodTeacher?.email || department.hodEmail || '').toLowerCase()
    });
    setEditingDepartmentCode(department.code || null);
    resetMetadataState('department');
  };

  const handleCourseInputChange = (event) => {
    const { name, value } = event.target;
    setCourseForm((prev) => {
      if (name === 'degreeType') {
        const nextDegree = value.toUpperCase();
        const defaultDuration = DEGREE_DURATION_DEFAULTS[nextDegree];
        return {
          ...prev,
          degreeType: nextDegree,
          durationYears: defaultDuration ? String(defaultDuration) : prev.durationYears
        };
      }

      if (name === 'departmentCode') {
        return {
          ...prev,
          [name]: value.toUpperCase()
        };
      }

      return {
        ...prev,
        [name]: value
      };
    });

    if (metadataStates.course.status !== 'idle') {
      resetMetadataState('course');
    }
  };

  const handleCourseReset = () => {
    setCourseForm({
      code: '',
      name: '',
      displayName: '',
      degreeType: 'BTECH',
      departmentCode: '',
      durationYears: String(DEGREE_DURATION_DEFAULTS.BTECH)
    });
    setEditingCourseCode(null);
    resetMetadataState('course');
  };

  const handleCourseSubmit = async (event) => {
    event.preventDefault();

    const name = courseForm.name.trim();
    const degreeType = courseForm.degreeType.trim().toUpperCase();
    const departmentCode = courseForm.departmentCode.trim().toUpperCase();
    const durationYears = Number(courseForm.durationYears);
    const displayName = courseForm.displayName.trim();
    const code = editingCourseCode ? editingCourseCode : derivedCourseCode;

    if (!code || !name || !degreeType || !departmentCode || !Number.isFinite(durationYears) || durationYears <= 0) {
      updateMetadataState('course', {
        status: 'error',
        message: 'Degree type, department, course name, and a positive duration are required so the system can generate a course code',
        details: []
      });
      return;
    }

    const payload = {
      code,
      name,
      displayName: displayName || undefined,
      degreeType,
      departmentCode,
      durationYears
    };

    try {
      await submitMetadata({
        key: 'course',
        endpoint: editingCourseCode
          ? `/metadata/courses/${encodeURIComponent(editingCourseCode)}`
          : '/metadata/courses',
        method: editingCourseCode ? 'PUT' : 'POST',
        body: payload,
        successMessage: `Course ${code} ${editingCourseCode ? 'updated' : 'saved'}`
      });

      setCourseForm({
        code: '',
        name: '',
        displayName: '',
        degreeType: 'BTECH',
        departmentCode: '',
        durationYears: String(DEGREE_DURATION_DEFAULTS.BTECH)
      });
      setEditingCourseCode(null);
      await fetchMetadataLists();
    } catch (error) {
      // Error response handled via submitMetadata state updates
    }
  };

  const beginCourseEdit = (course) => {
    if (!course) {
      return;
    }

    setCourseForm({
      code: course.code || '',
      name: course.name || '',
      displayName: course.displayName || '',
      degreeType: course.degreeType || 'BTECH',
      departmentCode: course.departmentCode || '',
      durationYears: course.durationYears ? String(course.durationYears) : ''
    });
    setEditingCourseCode(course.code || null);
    resetMetadataState('course');
  };

  const renderStatus = (key, source = uploadStates) => {
    const state = source?.[key];
    if (!state || state.status === 'idle') {
      return null;
    }

    const style = statusStyles[state.status] || 'bg-gray-50 border-gray-200 text-gray-700';

    return (
      <div className={`mt-4 border rounded-lg px-4 py-3 text-sm ${style}`}>
        <p className="font-medium">
          {state.message || (state.status === 'loading' ? 'Processing...' : '')}
        </p>
        {state.details && state.details.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer">
              View details ({state.details.length})
            </summary>
            <ul className="mt-2 list-disc space-y-1 text-xs text-gray-700 ml-5">
              {state.details.slice(0, 5).map((detail, index) => (
                <li key={`${key}-detail-${index}`}>
                  {formatFailureEntry(detail)}
                </li>
              ))}
            </ul>
            {state.details.length > 5 && (
              <p className="mt-2 text-xs text-gray-500">
                Showing first 5 issues. Check API response for full details.
              </p>
            )}
          </details>
        )}
      </div>
    );
  };

  const ImportStep = ({
    step,
    title,
    description,
    file,
    setFile,
    statusKey,
    templatePath,
    extraNote,
    supportsSkipExisting = false,
    skipExisting = false,
    onSkipExistingChange
  }) => {
    const inputRef = useRef(null);

    return (
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Step {step}</p>
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
            {templatePath && (
              <p className="mt-1 text-xs text-gray-500">
                Template: <code className="bg-gray-100 px-2 py-1 rounded">{templatePath}</code>
              </p>
            )}
            {extraNote && (
              <p className="mt-1 text-xs text-gray-500">{extraNote}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <input
              type="file"
              accept=".csv"
              onChange={(event) => handleFileChange(event, setFile, statusKey)}
              ref={inputRef}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center justify-center rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              {file ? file.name : 'Choose CSV'}
            </button>
          </div>
        </div>
        {supportsSkipExisting && (
          <label className="mt-3 flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              checked={skipExisting}
              onChange={(event) => onSkipExistingChange?.(event.target.checked)}
            />
            <span>Skip existing records instead of failing duplicates</span>
          </label>
        )}
        {!file && (
          <p className="mt-2 text-xs text-gray-400" data-testid={`${statusKey}-file-empty`}>
            No file selected yet.
          </p>
        )}
        {renderStatus(statusKey)}
      </div>
    );
  };

  const handleDownloadReport = async (reportType) => {
    try {
      // Replace with your API endpoint
      // const response = await fetch(`/api/${reportType}`);
      // const blob = await response.blob();
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `${reportType}-report.csv`;
      // document.body.appendChild(a);
      // a.click();
      // window.URL.revokeObjectURL(url);
      console.log('Downloading report:', reportType);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Error downloading report');
    }
  };

  // Example of using admin token in API calls
  const fetchAdminData = async () => {
    const token = localStorage.getItem('admin-token');
    if (!token) {
      navigate('/admin-login');
      return;
    }

    try {
      const response = await axios.get(`${VITE_BASE_URL}/admin/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      // Process response data
    } catch (error) {
      // Handle error
      if (error.response?.status === 401) {
        localStorage.removeItem('admin-token');
        navigate('/admin-login');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Tab Navigation */}
        <div className="mb-8 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('new-year-import')}
              className={`w-full p-4 flex items-center gap-2 ${activeTab === 'new-year-import' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
                }`}
            >
              <Upload size={20} />
              New Year Import
            </button>
            {isSuperAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('metadata')}
                  className={`w-full p-4 flex items-center gap-2 ${activeTab === 'metadata' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
                    }`}
                >
                  <Layers size={20} />
                  Metadata Management
                </button>
                <button
                  onClick={() => setActiveTab('leadership')}
                  className={`w-full p-4 flex items-center gap-2 ${activeTab === 'leadership' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
                    }`}
                >
                  <Shield size={20} />
                  Leadership Roles
                </button>
              </>
            )}
            <button
              onClick={() => setActiveTab('create-class')}
              className={`w-full p-4 flex items-center gap-2 ${activeTab === 'create-class' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
                }`}
            >
              <Upload size={20} />
              Create Class
            </button>
            <button
              onClick={() => setActiveTab('add-student')}
              className={`w-full p-4 flex items-center gap-2 ${activeTab === 'add-student' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
                }`}
            >
              <Users size={20} />
              Add Students
            </button>
            <button
              onClick={() => setActiveTab('register-teacher')}
              className={`w-full p-4 flex items-center gap-2 ${activeTab === 'register-teacher' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
                }`}
            >
              <UserPlus size={20} />
              Register Teacher
            </button>
            <button
              onClick={() => setActiveTab('register-student')}
              className={`w-full p-4 flex items-center gap-2 ${activeTab === 'register-student' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
                }`}
            >
              <UserPlus size={20} />
              Register Student
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full p-4 flex items-center gap-2 ${activeTab === 'reports' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
                }`}
            >
              <FileText size={20} />
              Reports
            </button>
            <button
              onClick={() => setActiveTab('upcoming-events')}
              className={`w-full p-4 flex items-center gap-2 ${activeTab === 'upcoming-events' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
                }`}
            >
              <Calendar size={20} />
              Manage Upcoming Events
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`w-full p-4 flex items-center gap-2 ${activeTab === 'feedback' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
                }`}
            >
              <MessageSquare size={20} />
              Feedback Review
            </button>
            <button
              onClick={() => navigate('/admin/system-config')}
              className={`w-full p-4 flex items-center gap-2 ${activeTab === 'enum-management' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
                }`}
            >
              <Settings size={20} />
              System Configuration
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'new-year-import' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold text-gray-800">New Academic Year Bulk Import</h2>
            <p className="mt-2 text-sm text-gray-600">
              Upload the generated CSV bundles in the order below to initialise the upcoming academic year. Each step
              surfaces API feedback, including any failed rows, so you can correct issues quickly.
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleVerifyAll}
                  className="inline-flex items-center rounded border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 transition disabled:opacity-60"
                  disabled={isBulkProcessing}
                >
                  Verify All
                </button>
                <button
                  type="button"
                  onClick={handleUploadAll}
                  className="inline-flex items-center rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-60"
                  disabled={isBulkProcessing || !canUploadAll}
                >
                  Upload All
                </button>
              </div>
              {validationSession?.id ? (
                blockingSteps.length > 0 ? (
                  <p className="text-xs text-yellow-600">
                    Resolve validation issues for {blockingSteps.join(', ')} before uploading. All steps must be green to enable Upload All.
                  </p>
                ) : canUploadAll ? (
                  <p className="text-xs text-gray-500">
                    Validation session ready. Upload All before{' '}
                    {validationSession.expiresAt ? new Date(validationSession.expiresAt).toLocaleString() : 'it expires'}.
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Validation completed; waiting for the remaining steps to finish processing.
                  </p>
                )
              ) : (
                <p className="text-xs text-gray-500">Run Verify All to generate a validation session for Upload All.</p>
              )}
            </div>
            <div className="mt-6 space-y-6">
              {newYearImportSteps.map((step) => (
                <ImportStep
                  key={step.key}
                  step={step.step}
                  title={step.title}
                  description={step.description}
                  file={step.file}
                  setFile={step.setFile}
                  statusKey={step.key}
                  templatePath={step.templatePath}
                  extraNote={step.extraNote}
                  supportsSkipExisting={step.supportsSkipExisting}
                  skipExisting={step.skipExisting}
                  onSkipExistingChange={(value) => updateBulkImportOption(step.key, 'skipExisting', value)}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'metadata' && isSuperAdmin && (
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">Metadata Management</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Configure departments and courses before running bulk imports. Degree availability updates automatically from the course catalog, and only Super Admins can create or update metadata.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fetchMetadataLists()}
                  className="inline-flex items-center rounded border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 transition disabled:opacity-60"
                  disabled={metadataLoading}
                >
                  {metadataLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            {metadataError && (
              <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {metadataError}
              </div>
            )}

            {metadataLoading && !metadataError && (
              <div className="mt-4 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Loading metadata...
              </div>
            )}

            <div className="mt-6 space-y-10">
              <section>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">Departments</h3>
                  <p className="text-sm text-gray-600">
                    Define department codes and optional aliases recognised by CSV uploads and manual forms.
                  </p>
                </div>
                <form onSubmit={handleDepartmentSubmit} className="mt-4 space-y-4">
                  {editingDepartmentCode && (
                    <div className="rounded border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
                      Editing department {editingDepartmentCode}. Update the details below or cancel to exit edit mode.
                    </div>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Department Code</label>
                      <input
                        name="code"
                        value={departmentForm.code}
                        onChange={handleDepartmentInputChange}
                        className={`mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm ${editingDepartmentCode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        placeholder="e.g. CINTEL"
                        required
                        disabled={Boolean(editingDepartmentCode)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Department Name</label>
                      <input
                        name="name"
                        value={departmentForm.name}
                        onChange={handleDepartmentInputChange}
                        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        placeholder="e.g. Computing Intelligence"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Description (optional)</label>
                      <textarea
                        name="description"
                        value={departmentForm.description}
                        onChange={handleDepartmentInputChange}
                        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        rows={2}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Aliases (comma separated)</label>
                      <input
                        name="aliases"
                        value={departmentForm.aliases}
                        onChange={handleDepartmentInputChange}
                        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        placeholder="CINT, C-INTEL"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Head of Department Email</label>
                      <input
                        name="hodEmail"
                        type="email"
                        value={departmentForm.hodEmail}
                        onChange={handleDepartmentInputChange}
                        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        placeholder="hod@example.edu"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        The system auto-creates or updates the department HOD login using this email.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      className="inline-flex items-center rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
                    >
                      {editingDepartmentCode ? 'Update Department' : 'Save Department'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDepartmentReset}
                      className="inline-flex items-center rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                      {editingDepartmentCode ? 'Cancel' : 'Reset'}
                    </button>
                  </div>
                </form>
                {renderStatus('department', metadataStates)}
                <div className="mt-5">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Configured Departments</h4>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {metadataLists.departments.length === 0 ? (
                      <p className="text-sm text-gray-500">No departments configured yet.</p>
                    ) : (
                      metadataLists.departments.map((dept) => (
                        <div key={dept._id || dept.code} className="rounded border border-gray-200 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-gray-800">{dept.code}</p>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-semibold px-2 py-1 rounded border ${dept.isActive
                                    ? 'border-green-200 bg-green-50 text-green-700'
                                    : 'border-gray-200 bg-gray-100 text-gray-600'
                                  }`}
                              >
                                {dept.isActive ? 'Active' : 'Inactive'}
                              </span>
                              <button
                                type="button"
                                onClick={() => beginDepartmentEdit(dept)}
                                className="text-xs font-medium text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                          <p className="mt-1 text-sm text-gray-700">{dept.name}</p>
                          {dept.description && (
                            <p className="mt-1 text-xs text-gray-500">{dept.description}</p>
                          )}
                          {dept.hodTeacher ? (
                            <p className="mt-1 text-xs text-gray-500">
                              HOD: {dept.hodTeacher.name} ({dept.hodTeacher.email}) · {dept.hodTeacher.registerNo}
                            </p>
                          ) : dept.hodEmail ? (
                            <p className="mt-1 text-xs text-gray-500">HOD Email: {dept.hodEmail}</p>
                          ) : (
                            <p className="mt-1 text-xs text-gray-500">HOD not assigned yet.</p>
                          )}
                          {Array.isArray(dept.aliases) && dept.aliases.length > 0 && (
                            <p className="mt-1 text-xs text-gray-500">Aliases: {dept.aliases.join(', ')}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              <section>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">Degree Types</h3>
                  <p className="text-sm text-gray-600">
                    Degree information is derived from courses. Update or create courses to adjust degree availability and duration.
                  </p>
                  {degreeSummaryNote && (
                    <p className="mt-2 text-xs text-blue-600">{degreeSummaryNote}</p>
                  )}
                </div>
                <div className="mt-5">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Derived Overview</h4>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {metadataLists.degreeSummaries.length === 0 ? (
                      <p className="text-sm text-gray-500">No degree data available yet. Add a course to populate this summary.</p>
                    ) : (
                      metadataLists.degreeSummaries.map((summary) => (
                        <div key={summary.code} className="rounded border border-gray-200 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-gray-800">{summary.code}</p>
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded border ${summary.isActive
                                  ? 'border-green-200 bg-green-50 text-green-700'
                                  : 'border-gray-200 bg-gray-100 text-gray-600'
                                }`}
                            >
                              {summary.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Courses: {summary.courseCount} · Duration (max): {summary.durationYears || '—'} years
                          </p>
                          {summary.departmentCodes?.length > 0 && (
                            <p className="mt-1 text-xs text-gray-500">
                              Departments: {summary.departmentCodes.join(', ')}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              <section>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">Courses</h3>
                  <p className="text-sm text-gray-600">
                    Courses capture the degree type, duration, and department data used across validations and imports.
                  </p>
                </div>
                <form onSubmit={handleCourseSubmit} className="mt-4 space-y-4">
                  {editingCourseCode && (
                    <div className="rounded border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
                      Editing course {editingCourseCode}. The course code stays locked; adjust other fields as needed or cancel to exit edit mode.
                    </div>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        <LabelWithInfo label="Generated Course Code" tooltip={COURSE_FIELD_TOOLTIPS.code} />
                      </label>
                      <div className="mt-1 w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                        <span title={derivedCourseCode || undefined} className="block truncate">
                          {derivedCourseCode || 'Select degree type, department, and course name to generate the course code.'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        The system calculates this key automatically and uses it across metadata, bulk CSV uploads, and student or teacher records.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        <LabelWithInfo label="Course Name" tooltip={COURSE_FIELD_TOOLTIPS.name} />
                      </label>
                      <input
                        name="name"
                        value={courseForm.name}
                        onChange={handleCourseInputChange}
                        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        placeholder="e.g. B.Tech AI"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        <LabelWithInfo label="Display Name (optional)" tooltip={COURSE_FIELD_TOOLTIPS.displayName} />
                      </label>
                      <input
                        name="displayName"
                        value={courseForm.displayName}
                        onChange={handleCourseInputChange}
                        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Friendly label for UI"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        <LabelWithInfo label="Degree Type" tooltip={COURSE_FIELD_TOOLTIPS.degreeType} />
                      </label>
                      <select
                        name="degreeType"
                        value={courseForm.degreeType}
                        onChange={handleCourseInputChange}
                        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        required
                      >
                        {DEGREE_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        <LabelWithInfo label="Duration (years)" tooltip={COURSE_FIELD_TOOLTIPS.durationYears} />
                      </label>
                      <input
                        name="durationYears"
                        type="number"
                        min="1"
                        value={courseForm.durationYears}
                        onChange={handleCourseInputChange}
                        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        <LabelWithInfo label="Department" tooltip={COURSE_FIELD_TOOLTIPS.departmentCode} />
                      </label>
                      <select
                        name="departmentCode"
                        value={courseForm.departmentCode}
                        onChange={handleCourseInputChange}
                        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        disabled={metadataLists.departments.length === 0}
                        required
                      >
                        <option value="">Select department</option>
                        {metadataLists.departments.map((dept) => (
                          <option key={dept._id || dept.code} value={dept.code}>
                            {dept.code} — {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      className="inline-flex items-center rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
                    >
                      {editingCourseCode ? 'Update Course' : 'Save Course'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCourseReset}
                      className="inline-flex items-center rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                      {editingCourseCode ? 'Cancel' : 'Reset'}
                    </button>
                  </div>
                </form>
                {renderStatus('course', metadataStates)}
                <div className="mt-5">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Configured Courses</h4>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {metadataLists.courses.length === 0 ? (
                      <p className="text-sm text-gray-500">No courses configured yet.</p>
                    ) : (
                      metadataLists.courses.map((course) => (
                        <div key={course._id || course.code} className="rounded border border-gray-200 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-gray-800">{course.code}</p>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-semibold px-2 py-1 rounded border ${course.isActive
                                    ? 'border-green-200 bg-green-50 text-green-700'
                                    : 'border-gray-200 bg-gray-100 text-gray-600'
                                  }`}
                              >
                                {course.isActive ? 'Active' : 'Inactive'}
                              </span>
                              <button
                                type="button"
                                onClick={() => beginCourseEdit(course)}
                                className="text-xs font-medium text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                          <p className="mt-1 text-sm text-gray-700">{course.name}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            Degree: {course.degreeType} | Department: {course.departmentCode}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">Duration: {course.durationYears} years</p>
                          {course.displayName && (
                            <p className="mt-1 text-xs text-gray-500">Display name: {course.displayName}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'create-class' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Create Class</h2>
            <form onSubmit={handleCreateClass}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Upload Class CSV</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileChange(e, setClassFile, 'classes')}
                  className="w-full p-2 border rounded"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Please upload a CSV file with class details
                </p>
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Upload and Create Class
              </button>
            </form>
            {renderStatus('classes')}
          </div>
        )}

        {activeTab === 'add-student' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Add Students</h2>
            <form onSubmit={handleAddStudents}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Upload Students CSV</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileChange(e, setStudentsFile, 'students')}
                  className="w-full p-2 border rounded"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Please upload a CSV file with student details
                </p>
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Upload and Add Students
              </button>
            </form>
            {renderStatus('students')}
          </div>
        )}

        {activeTab === 'register-teacher' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Register Teacher</h2>
            <form onSubmit={handleRegisterTeacher}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Upload Teacher CSV</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileChange(e, setTeacherFile, 'teachers')}
                  className="w-full p-2 border rounded"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Please upload a CSV file with teacher details
                </p>
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Upload and Register Teacher
              </button>
            </form>
            {renderStatus('teachers')}
          </div>
        )}

        {activeTab === 'register-student' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Register Student</h2>
            <form onSubmit={handleRegisterStudent}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Upload Student CSV</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileChange(e, setRegisterStudentFile, 'registerStudent')}
                  className="w-full p-2 border rounded"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Please upload a CSV file with student details
                </p>
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Upload and Register Student
              </button>
            </form>
            {renderStatus('registerStudent')}
          </div>
        )}

        {activeTab === 'upcoming-events' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="lg:sticky lg:top-4 lg:h-fit">
              <AdminUpcomingEventForm />
            </div>
            <div>
              <UpcomingEventsList />
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="bg-white rounded-lg shadow">
            <ReportsPage />
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <AdminFeedbackReview />
          </div>
        )}

        {activeTab === 'enum-management' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <button
              onClick={() => navigate('/admin/system-config')}
              className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Open Advanced Configuration
            </button>
            <p className="text-gray-600">
              Manage categories, points rules, and form configurations in the advanced system configuration page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;