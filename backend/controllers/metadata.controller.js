const DepartmentConfig = require('../models/departmentConfig.model');
const ProgramConfig = require('../models/programConfig.model');
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
        const programs = await ProgramConfig.find().sort({ code: 1 });
        res.status(200).json({ success: true, data: programs });
    } catch (error) {
        console.error('Error fetching programs:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch programs' });
    }
};

const upsertProgram = async (req, res) => {
    try {
        const codeFromParams = req.params.code;
        const {
            code: codeFromBody,
            name,
            durationYears,
            leaderboardGroup,
            registerPattern,
            departmentCodes = [],
            isActive = true
        } = req.body;

        const code = normaliseCode(codeFromParams || codeFromBody);
        const parsedDurationYears = Number(durationYears);
        if (!code || !name || !leaderboardGroup || Number.isNaN(parsedDurationYears) || parsedDurationYears <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Program code, name, positive durationYears, and leaderboardGroup are required'
            });
        }

        const parsedDepartmentCodes = Array.isArray(departmentCodes)
            ? departmentCodes.map(normaliseCode).filter(Boolean)
            : [];

        const validationResults = await Promise.all(parsedDepartmentCodes.map(async (deptCode) => {
            const department = await DepartmentConfig.findOne({ code: deptCode });
            return { code: deptCode, exists: !!department };
        }));

        const missing = validationResults.find((result) => !result.exists);
        if (missing) {
            return res.status(400).json({
                success: false,
                message: `Department ${missing.code} is not configured`
            });
        }

        const program = await ProgramConfig.findOneAndUpdate(
            { code },
            {
                code,
                name: name.trim(),
                durationYears: parsedDurationYears,
                leaderboardGroup: leaderboardGroup.trim(),
                registerPattern: registerPattern ? registerPattern.trim() : null,
                departmentCodes: parsedDepartmentCodes,
                isActive
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

    metadataCache.invalidateMetadata('program');

        res.status(200).json({ success: true, data: program });
    } catch (error) {
        console.error('Error upserting program:', error);
        res.status(500).json({ success: false, message: 'Failed to upsert program' });
    }
};

const listCourses = async (req, res) => {
    try {
        const filter = {};
        if (req.query.programCode) {
            filter.programCode = normaliseCode(req.query.programCode);
        }
        if (req.query.departmentCode) {
            filter.departmentCode = normaliseCode(req.query.departmentCode);
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
            programCode,
            departmentCode,
            yearSpan,
            isActive = true
        } = req.body;

        const code = normaliseCode(codeFromParams || codeFromBody);
        const parsedYearSpan = Number(yearSpan);
        if (!code || !name || !programCode || !departmentCode || Number.isNaN(parsedYearSpan) || parsedYearSpan <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Course code, name, programCode, departmentCode, and positive yearSpan are required'
            });
        }

        const normalisedProgramCode = normaliseCode(programCode);
        const normalisedDepartmentCode = normaliseCode(departmentCode);

        const [program, department] = await Promise.all([
            ProgramConfig.findOne({ code: normalisedProgramCode }),
            DepartmentConfig.findOne({ code: normalisedDepartmentCode })
        ]);

        if (!program) {
            return res.status(400).json({ success: false, message: `Program ${normalisedProgramCode} is not configured` });
        }

        if (!department) {
            return res.status(400).json({ success: false, message: `Department ${normalisedDepartmentCode} is not configured` });
        }

        const course = await CourseConfig.findOneAndUpdate(
            { code },
            {
                code,
                name: name.trim(),
                displayName: displayName ? displayName.trim() : null,
                programCode: normalisedProgramCode,
                departmentCode: normalisedDepartmentCode,
                yearSpan: parsedYearSpan,
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
