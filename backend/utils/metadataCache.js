const CourseConfig = require('../models/courseConfig.model');
const ProgramConfig = require('../models/programConfig.model');
const DepartmentConfig = require('../models/departmentConfig.model');

const TTL_MS = 5 * 60 * 1000; // Cache metadata lookups for five minutes

const caches = {
    course: new Map(),
    program: new Map(),
    department: new Map()
};

const normaliseKey = (value) => (value ? value.toString().trim().toUpperCase() : '');

const getCacheEntry = (type, key) => {
    const entry = caches[type].get(key);
    if (!entry) {
        return undefined;
    }

    if (entry.expiresAt < Date.now()) {
        caches[type].delete(key);
        return undefined;
    }

    return entry.value;
};

const setCacheEntry = (type, key, value) => {
    caches[type].set(key, {
        value,
        expiresAt: Date.now() + TTL_MS
    });
};

const loadAndCache = async (type, key, loader) => {
    if (!key) {
        return null;
    }

    const cached = getCacheEntry(type, key);
    if (cached !== undefined) {
        return cached;
    }

    const value = await loader(key);
    setCacheEntry(type, key, value);
    return value;
};

const getCourseByCode = async (code) => {
    const normalisedCode = normaliseKey(code);
    return loadAndCache('course', normalisedCode, async (lookupKey) => {
        return CourseConfig.findOne({ code: lookupKey });
    });
};

const getProgramByCode = async (code) => {
    const normalisedCode = normaliseKey(code);
    return loadAndCache('program', normalisedCode, async (lookupKey) => {
        return ProgramConfig.findOne({ code: lookupKey });
    });
};

const getDepartmentByCode = async (code) => {
    const normalisedCode = normaliseKey(code);
    return loadAndCache('department', normalisedCode, async (lookupKey) => {
        return DepartmentConfig.findOne({
            $or: [
                { code: lookupKey },
                { aliases: lookupKey }
            ]
        });
    });
};

const isValidCourseCode = async (code) => {
    const course = await getCourseByCode(code);
    return !!course;
};

const isValidProgramCode = async (code) => {
    const program = await getProgramByCode(code);
    return !!program;
};

const isValidDepartmentCode = async (code) => {
    const department = await getDepartmentByCode(code);
    return !!department;
};

const invalidateMetadata = (type, code) => {
    if (code) {
        caches[type]?.delete(normaliseKey(code));
        return;
    }
    caches[type]?.clear();
};

const invalidateAllMetadata = () => {
    Object.keys(caches).forEach((key) => caches[key].clear());
};

module.exports = {
    getCourseByCode,
    getProgramByCode,
    getDepartmentByCode,
    isValidCourseCode,
    isValidProgramCode,
    isValidDepartmentCode,
    invalidateMetadata,
    invalidateAllMetadata
};
