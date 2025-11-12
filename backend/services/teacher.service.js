const crypto = require('crypto');
const { model } = require('mongoose')
const teacherModel = require('../models/teacher.model')
const classModel = require('../models/class.model');
const bcrypt = require('bcrypt');
const metadataCache = require('../utils/metadataCache');

const toUpper = (value = '') => value.toString().trim().toUpperCase();

const titleCase = (value = '') =>
    value
        .split(' ')
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');

const deriveNameFromEmail = (email, departmentCode) => {
    if (!email) {
        return `HOD ${departmentCode}`;
    }

    const localPart = email.split('@')[0] || '';
    const cleaned = localPart.replace(/[^a-zA-Z]+/g, ' ').trim();
    if (!cleaned) {
        return `HOD ${departmentCode}`;
    }

    return titleCase(cleaned);
};

const generateUniqueRegisterNo = async (departmentCode) => {
    const base = `HOD-${toUpper(departmentCode)}`;
    let registerNo = base;
    let counter = 1;

    while (await teacherModel.findOne({ registerNo })) {
        counter += 1;
        registerNo = `${base}-${counter}`;
    }

    return registerNo;
};

const generateTemporaryPassword = (departmentCode) => {
    const random = crypto.randomBytes(3).toString('hex');
    return `Hod@${toUpper(departmentCode)}${random}`;
};

/**
 * Create a new teacher with role-based validation
 */
exports.createTeacher = async (teacherData) => {
    const { name, email, password, registerNo, department, role, managedDepartments } = teacherData;

    const departmentCode = department ? department.toString().trim().toUpperCase() : '';
    if (role !== 'Chairperson') {
        if (!departmentCode) {
            throw new Error('Department is required for the selected role');
        }

        const departmentConfig = await metadataCache.getDepartmentByCode(departmentCode);
        if (!departmentConfig || departmentConfig.isActive === false) {
            throw new Error(`Department ${departmentCode} is not available`);
        }
    }

    let managedDepartmentCodes = [];
    if (Array.isArray(managedDepartments) && managedDepartments.length > 0) {
        const validationResults = await Promise.all(managedDepartments.map(async (dept) => {
            const code = dept.toString().trim().toUpperCase();
            const departmentConfig = await metadataCache.getDepartmentByCode(code);
            return { code, isValid: !!departmentConfig && departmentConfig.isActive !== false };
        }));

        const invalid = validationResults.find((result) => !result.isValid);
        if (invalid) {
            throw new Error(`Managed department ${invalid.code} is not available`);
        }

        managedDepartmentCodes = [...new Set(validationResults.map((result) => result.code))];
    }

    if (role === 'HOD') {
        const existingHOD = await teacherModel.findOne({ department: departmentCode, role: 'HOD' });
        if (existingHOD) {
            throw new Error(`HOD already exists for ${departmentCode} department`);
        }
    }

    if (role === 'Chairperson') {
        const existingChairperson = await teacherModel.findOne({ role: 'Chairperson' });
        if (existingChairperson) {
            throw new Error('Chairperson already exists');
        }
    }

    if (role === 'Associate Chairperson' && managedDepartmentCodes.length === 0) {
        throw new Error('Associate Chairperson must have managed departments specified');
    }
    
    const hashedPassword = await teacherModel.hashedPassword(password);
    
    const teacher = new teacherModel({
        name,
        email,
        password: hashedPassword,
        rawPassword: password,
        registerNo,
        department: role !== 'Chairperson' ? departmentCode : undefined,
        role: role || 'Faculty',
        managedDepartments: managedDepartmentCodes
    });
    
    await teacher.save();
    return teacher;
};

/**
 * Get teachers by role and/or department
 */
exports.getTeachersByRole = async (filter = {}) => {
    return await teacherModel.find(filter)
        .select('-password -rawPassword')
        .populate('classes');
};

/**
 * Get classes for a department (HOD access)
 */
exports.getDepartmentClasses = async (department) => {
    return await classModel.find({ department })
        .populate('facultyAssigned', 'name email registerNo')
        .populate('academicAdvisors', 'name email registerNo');
};

/**
 * Get classes advised by a teacher (Academic Advisor access)
 */
exports.getAdvisedClasses = async (teacherId) => {
    const teacher = await teacherModel.findById(teacherId);
    if (!teacher) throw new Error('Teacher not found');
    
    // If HOD, return all department classes
    if (teacher.role === 'HOD') {
        return await this.getDepartmentClasses(teacher.department);
    }
    
    // If Academic Advisor, return only assigned classes
    return await classModel.find({ academicAdvisors: teacherId })
        .populate('facultyAssigned', 'name email registerNo')
        .populate('academicAdvisors', 'name email registerNo');
};

module.exports.addProfileImg = async (registerNo, profileImg) => {
    // Validate input
    console.log("Register No:", registerNo);
    console.log("Profile Image URL:", profileImg);
    if (!registerNo || !profileImg) {
        throw new Error("Register No and Profile Image URL are required");
    }
    try {
        const updatedTeacher = await teacherModel.findOneAndUpdate(
            { registerNo }, 
            { profileImg: profileImg }, 
            { new: true } // Return the updated document
        );

        if (!updatedTeacher) {
            throw new Error("Teacher not found with the given registerNo");
        }

        return updatedTeacher;
    } catch (error) {
        console.error("Error updating profile image:", error);
        throw error;
    }
}

module.exports.changePassword = async (teacherId, oldPassword, newPassword) => {
    try {
        const teacher = await teacherModel.findById(teacherId).select('+password');
        if (!teacher) {
            throw new Error("Teacher not found");
        }
        if (!await teacher.comparePassword(oldPassword)) {
            throw new Error("Invalid password");
        }

        const hashedPassword = await teacherModel.hashedPassword(newPassword);
        teacher.password = hashedPassword;
        teacher.rawPassword = newPassword; // Save the new raw password
        await teacher.save();
        return teacher;
    } catch (error) {
        console.error("Error changing password:", error);
        throw error;
    }
};

exports.ensureDepartmentHod = async ({ departmentCode, hodEmail }) => {
    const normalisedDepartment = toUpper(departmentCode);
    const normalisedEmail = hodEmail ? hodEmail.toString().trim().toLowerCase() : '';

    if (!normalisedDepartment) {
        throw new Error('Department code is required to assign an HOD');
    }

    if (!normalisedEmail) {
        throw new Error('HOD email is required');
    }

    const conflictingHod = await teacherModel.findOne({
        department: normalisedDepartment,
        role: 'HOD',
        email: { $ne: normalisedEmail }
    });

    if (conflictingHod) {
        throw new Error(`HOD already exists for ${normalisedDepartment} (${conflictingHod.email}). Update that profile before assigning a new HOD.`);
    }

    let teacher = await teacherModel.findOne({ email: normalisedEmail });
    let generatedPassword = null;

    if (teacher) {
        let shouldSave = false;

        if (teacher.role !== 'HOD') {
            teacher.role = 'HOD';
            shouldSave = true;
        }

        if (teacher.department !== normalisedDepartment) {
            teacher.department = normalisedDepartment;
            shouldSave = true;
        }

        if (teacher.isActive === false) {
            teacher.isActive = true;
            shouldSave = true;
        }

        if (shouldSave) {
            await teacher.save();
        }
    } else {
        const name = deriveNameFromEmail(normalisedEmail, normalisedDepartment);
        const registerNo = await generateUniqueRegisterNo(normalisedDepartment);
        const password = generateTemporaryPassword(normalisedDepartment);
        const hashedPassword = await teacherModel.hashedPassword(password);

        teacher = new teacherModel({
            name,
            email: normalisedEmail,
            password: hashedPassword,
            rawPassword: password,
            registerNo,
            department: normalisedDepartment,
            role: 'HOD',
            managedDepartments: []
        });

        await teacher.save();
        generatedPassword = password;
    }

    return { teacher, generatedPassword };
};