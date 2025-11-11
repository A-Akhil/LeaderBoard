const DepartmentConfig = require('../models/departmentConfig.model');
const CourseConfig = require('../models/courseConfig.model');
const metadataCache = require('../utils/metadataCache');

const normaliseCode = (value) => (value ? value.toString().trim().toUpperCase() : '');

const listDepartments = async (req, res) => {
    try {
        const departments = await DepartmentConfig.find().sort({ code: 1 });
        res.status(200).json({ success: true, data: departments });
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch departments' });
    }
};

const upsertDepartment = async (req, res) => {
    try {
        const codeFromParams = req.params.code;
        const { code: codeFromBody, name, description, isActive = true, aliases, departmentCodes } = req.body;

        const code = normaliseCode(codeFromParams || codeFromBody);
        if (!code || !name) {
            return res.status(400).json({
                success: false,
                message: 'Department code and name are required'
            });
        }

        const aliasSource = Array.isArray(aliases) ? aliases : Array.isArray(departmentCodes) ? departmentCodes : [];
        const normalisedAliases = aliasSource
            .map((value) => normaliseCode(value))
            .filter(Boolean)
            .filter((value) => value !== code);

        const department = await DepartmentConfig.findOneAndUpdate(
            { code },
            {
                code,
                name: name.trim(),
                description: description ? description.trim() : null,
                aliases: normalisedAliases,
                isActive
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        metadataCache.invalidateMetadata('department');

        res.status(200).json({ success: true, data: department });
    } catch (error) {
        console.error('Error upserting department:', error);
        res.status(500).json({ success: false, message: 'Failed to upsert department' });
    }
};

const listPrograms = async (req, res) => {
    try {
        const courses = await CourseConfig.find()
            .select('degreeType durationYears isActive departmentCode')
            .lean();

        const aggregated = Array.from(
            courses.reduce((acc, course) => {
                const degreeType = normaliseCode(course.degreeType);
                if (!degreeType) {
                    return acc;
                }

                if (!acc.has(degreeType)) {
                    acc.set(degreeType, {
                        code: degreeType,
                        name: degreeType,
                        durationYears: course.durationYears,
                        courseCount: 0,
                        departmentCodes: new Set(),
                        isActive: false
                    });
                }

                const entry = acc.get(degreeType);
                entry.courseCount += 1;
                entry.durationYears = Math.max(entry.durationYears || 0, course.durationYears || 0);
                if (course.departmentCode) {
                    entry.departmentCodes.add(normaliseCode(course.departmentCode));
                }
                entry.isActive = entry.isActive || course.isActive;

                return acc;
            }, new Map()).values()
        ).map((entry) => ({
            code: entry.code,
            name: entry.name,
            durationYears: entry.durationYears,
            courseCount: entry.courseCount,
            departmentCodes: Array.from(entry.departmentCodes).sort(),
            isActive: entry.isActive
        }));

        res.status(200).json({
            success: true,
            data: aggregated,
            message: 'Programs are derived from course degree types; manage them via course metadata.'
        });
    } catch (error) {
        console.error('Error fetching program summary:', error);
        res.status(500).json({ success: false, message: 'Failed to derive program summary' });
    }
};

const upsertProgram = async (_req, res) => {
    res.status(410).json({
        success: false,
        message: 'Program management is deprecated. Please create or update courses with the desired degree type instead.'
    });
};

const listCourses = async (req, res) => {
    try {
        const filter = {};
        const degreeTypeQuery = normaliseCode(req.query.degreeType || req.query.programCode);
        if (degreeTypeQuery) {
            filter.degreeType = degreeTypeQuery;
        }
        if (req.query.departmentCode) {
            filter.departmentCode = normaliseCode(req.query.departmentCode);
        }
        if (typeof req.query.isActive !== 'undefined') {
            filter.isActive = req.query.isActive !== 'false';
        }
        const courses = await CourseConfig.find(filter).sort({ code: 1 });
        res.status(200).json({ success: true, data: courses });
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch courses' });
    }
};

const upsertCourse = async (req, res) => {
    try {
        const codeFromParams = req.params.code;
        const {
            code: codeFromBody,
            name,
            displayName,
            degreeType,
            departmentCode,
            durationYears,
            yearSpan, // legacy alias kept for backwards compatible payloads
            isActive = true
        } = req.body;

        const code = normaliseCode(codeFromParams || codeFromBody);
        const resolvedDegreeType = normaliseCode(degreeType || req.body.programCode);
        const parsedDuration = Number(typeof durationYears !== 'undefined' ? durationYears : yearSpan);
        if (!code || !name || !resolvedDegreeType || !departmentCode || Number.isNaN(parsedDuration) || parsedDuration <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Course code, name, degreeType, departmentCode, and positive durationYears are required'
            });
        }

        const normalisedDepartmentCode = normaliseCode(departmentCode);

        if (!CourseConfig.DEGREE_TYPES.includes(resolvedDegreeType)) {
            return res.status(400).json({
                success: false,
                message: `Degree type must be one of: ${CourseConfig.DEGREE_TYPES.join(', ')}`
            });
        }

        const department = await DepartmentConfig.findOne({ code: normalisedDepartmentCode });

        if (!department) {
            return res.status(400).json({ success: false, message: `Department ${normalisedDepartmentCode} is not configured` });
        }

        const course = await CourseConfig.findOneAndUpdate(
            { code },
            {
                code,
                name: name.trim(),
                displayName: displayName ? displayName.trim() : null,
                degreeType: resolvedDegreeType,
                departmentCode: normalisedDepartmentCode,
                durationYears: parsedDuration,
                isActive
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        metadataCache.invalidateMetadata('course');

        res.status(200).json({ success: true, data: course });
    } catch (error) {
        console.error('Error upserting course:', error);
        res.status(500).json({ success: false, message: 'Failed to upsert course' });
    }
};

module.exports = {
    listDepartments,
    upsertDepartment,
    listPrograms,
    upsertProgram,
    listCourses,
    upsertCourse
};
