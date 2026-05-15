const studentModel = require('../models/student.model');
const classModel = require('../models/class.model');
const bcrypt = require('bcrypt');

/**
 * Create a new student with course and department
 */
exports.createStudent = async (studentData) => {
    const { 
        name, email, password, registerNo, 
        course, year, currentClassId 
    } = studentData;
    
    // Extract program and department from course
    const courseParts = course.split('-');
    if (courseParts.length !== 2) {
        throw new Error('Invalid course format. Should be Program-Department (e.g., BTech-CSE)');
    }
    
    const program = courseParts[0];
    const department = courseParts[1];
    
    // Verify class exists
    const classData = await classModel.findById(currentClassId);
    if (!classData) {
        throw new Error('Class not found');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create student
    const student = new studentModel({
        name,
        email,
        password: hashedPassword,
        registerNo,
        course,
        program,
        department,
        currentClass: {
            year: classData.year,
            section: classData.section,
            ref: currentClassId
        }
    });
    
    await student.save();
    return student;
};

/**
 * Get students by department, course, year, or section
 */
exports.getStudentsByFilter = async (filter = {}) => {
    return await studentModel.find(filter)
        .select('-password')
        .populate({
            path: 'currentClass.ref',
            select: 'year section academicYear'
        });
};

/**
 * Update student's class (for year advancement)
 */
exports.updateStudentClass = async (studentId, classId) => {
    const student = await studentModel.findById(studentId);
    if (!student) throw new Error('Student not found');
    
    const classData = await classModel.findById(classId);
    if (!classData) throw new Error('Class not found');
    
    // Add current class to history
    if (!student.classHistory) student.classHistory = [];
    student.classHistory.push({
        year: student.currentClass.year,
        section: student.currentClass.section,
        ref: student.currentClass.ref
    });
    
    // Update current class
    student.currentClass = {
        year: classData.year,
        section: classData.section,
        ref: classId
    };
    
    await student.save();
    return student;
};

/**
 * Perform year advancement for all students
 */
exports.advanceAcademicYear = async (academicYear) => {
    const students = await studentModel.find({
        'currentClass.year': { $lt: 5 }, // Don't advance students in 5th year
        isGraduated: false
    });
    
    const results = {
        advanced: 0,
        graduated: 0,
        errors: []
    };
    
    for (const student of students) {
        try {
            await student.advanceToNextYear(academicYear);
            
            if (student.isGraduated) {
                results.graduated++;
            } else {
                results.advanced++;
            }
        } catch (error) {
            results.errors.push({
                studentId: student._id,
                error: error.message
            });
        }
    }
    
    return results;
};



module.exports.changePassword = async (studentId, oldPassword, newPassword) => {
    try {
        const student = await studentModel.findById(studentId).select('+password');
        if (!student) {
            throw new Error("Student not found");
        }

        if (!await student.comparePassword(oldPassword)) {
            throw new Error("Invalid password");
        }

        const hashedPassword = await studentModel.hashedPassword(newPassword);
        student.password = hashedPassword;
        await student.save();

        return student;
    } catch (error) {
        console.error("Error changing password:", error);
        throw error;
    }
};