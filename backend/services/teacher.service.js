const { model } = require('mongoose')
const teacherModel = require('../models/teacher.model')
const classModel = require('../models/class.model');
const bcrypt = require('bcrypt');
const metadataCache = require('../utils/metadataCache');

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