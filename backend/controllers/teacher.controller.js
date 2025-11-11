const fs = require('fs');
const path = require('path');
const multer = require('multer');
const csv = require('csv-parser');
const bcrypt = require('bcrypt');
const teacherModel = require('../models/teacher.model');
const teacherService = require('../services/teacher.service');
const TeacherBulkService = require('../services/teacherBulk.services');
const BlacklistToken = require('../models/blacklistToken.model');
const studentModel = require('../models/student.model'); // Add this import
const classModel = require('../models/class.model'); // Make sure class model is imported
const metadataCache = require('../utils/metadataCache');
const { validationResult } = require('express-validator');
const { parseBooleanFlag } = require('../utils/requestFlags');

// Ensure uploads directory exists
const uploadPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath);
}

exports.registerTeacher = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password, registerNo, department, role, managedDepartments } = req.body;

        // Check if role is valid
        const validRoles = ['Faculty', 'Academic Advisor', 'HOD', 'Associate Chairperson', 'Chairperson'];
        if (role && !validRoles.includes(role)) {
            return res.status(400).json({ message: 'Invalid role specified' });
        }

        const departmentCode = department ? department.toString().trim().toUpperCase() : '';
        if (role !== 'Chairperson') {
            if (!departmentCode) {
                return res.status(400).json({ message: 'Department is required for the selected role' });
            }

            const departmentConfig = await metadataCache.getDepartmentByCode(departmentCode);
            if (!departmentConfig || departmentConfig.isActive === false) {
                return res.status(400).json({ message: `Department ${departmentCode} is not available` });
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
                return res.status(400).json({ message: `Managed department ${invalid.code} is not available` });
            }

            managedDepartmentCodes = [...new Set(validationResults.map((result) => result.code))];
        }

        // Role-specific validations
        if (role === 'HOD') {
            const existingHOD = await teacherModel.findOne({ department: departmentCode, role: 'HOD' });
            if (existingHOD) {
                return res.status(400).json({ 
                    message: `HOD already exists for ${departmentCode} department` 
                });
            }
        }

        if (role === 'Chairperson') {
            const existingChairperson = await teacherModel.findOne({ role: 'Chairperson' });
            if (existingChairperson) {
                return res.status(400).json({ 
                    message: `Chairperson already exists` 
                });
            }
        }

        if (role === 'Associate Chairperson') {
            if (!managedDepartments || !managedDepartments.length) {
                return res.status(400).json({ 
                    message: 'Associate Chairperson must have managed departments specified' 
                });
            }
        }

        // Check if teacher already exists
        const existingTeacher = await teacherModel.findOne({ email });
        if (existingTeacher) {
            return res.status(400).json({ message: 'Teacher with this email already exists' });
        }

        // Hash the password
        const hashedPassword = await teacherModel.hashedPassword(password);

        const teacherPayload = {
            name,
            email,
            password: hashedPassword,
            rawPassword: password,
            registerNo,
            role: role || 'Faculty'
        };

        if (role !== 'Chairperson' && departmentCode) {
            teacherPayload.department = departmentCode;
        }

        if (managedDepartmentCodes.length > 0) {
            teacherPayload.managedDepartments = managedDepartmentCodes;
        }

        const newTeacher = new teacherModel(teacherPayload);

        await newTeacher.save();

        return res.status(201).json({ 
            message: 'Teacher registered successfully',
            role: newTeacher.role,
            department: newTeacher.department
        });
    } catch (error) {
        console.error('Error in registerTeacher:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getTeachersByRole = async (req, res) => {
    try {
        const { role, department } = req.query;
        
        const filter = {};
        if (role) filter.role = role;
        if (department) filter.department = department;
        
        const teachers = await teacherModel.find(filter)
            .select('-password -rawPassword')
            .populate('classes');
            
        return res.status(200).json(teachers);
    } catch (error) {
        console.error('Error in getTeachersByRole:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getDepartmentClasses = async (req, res) => {
    try {
        // This route should only be accessible by HOD or Academic Advisors
        const department = req.teacher.department;
        
        const classModel = require('../models/class.model');
        const classes = await classModel.find({ department })
            .populate('facultyAssigned', 'name email registerNo')
            .populate('academicAdvisors', 'name email registerNo');
            
        return res.status(200).json(classes);
    } catch (error) {
        console.error('Error in getDepartmentClasses:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

exports.registerTeachersBulk = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const isDryRun = parseBooleanFlag(req.query.dryRun || req.query.preview || req.query.mode);
        const shouldSkipExisting = parseBooleanFlag(req.query.skipExisting);

        const results = {
            successful: [],
            failedEntries: [],
            skippedEntries: []
        };

        const teachers = [];
        const validRoles = ['Faculty', 'Academic Advisor', 'HOD', 'Associate Chairperson', 'Chairperson'];

        await new Promise((resolve, reject) => {
            fs.createReadStream(req.file.path)
                .pipe(csv())
                .on('data', (data) => {
                    const name = data.name ? data.name.trim() : '';
                    const email = data.email ? data.email.trim() : '';
                    const password = data.password ? data.password : '';
                    const registerNo = data.registerNo ? data.registerNo.trim() : '';
                    const role = data.role ? data.role.trim() : '';
                    const departmentCode = data.department ? data.department.trim().toUpperCase() : '';

                    if (!name || !email || !password || !registerNo || !role) {
                        results.failedEntries.push({
                            teacher: data,
                            error: 'Missing required fields'
                        });
                        return;
                    }

                    if (!validRoles.includes(role)) {
                        results.failedEntries.push({
                            teacher: data,
                            error: 'Invalid role'
                        });
                        return;
                    }

                    if (role !== 'Chairperson' && !departmentCode) {
                        results.failedEntries.push({
                            teacher: data,
                            error: 'Department is required for the selected role'
                        });
                        return;
                    }

                    const managedList = data.managedDepartments
                        ? data.managedDepartments.split(',').map((value) => value.trim()).filter(Boolean)
                        : [];

                    teachers.push({
                        name,
                        email,
                        password,
                        registerNo,
                        department: departmentCode,
                        role,
                        managedDepartments: managedList.map((value) => value.toUpperCase())
                    });
                })
                .on('end', resolve)
                .on('error', reject);
        });

        for (const teacherData of teachers) {
            try {
                const role = teacherData.role;
                const departmentCode = teacherData.department;

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
                if (Array.isArray(teacherData.managedDepartments) && teacherData.managedDepartments.length > 0) {
                    const validationResults = await Promise.all(teacherData.managedDepartments.map(async (code) => {
                        const departmentConfig = await metadataCache.getDepartmentByCode(code);
                        return { code, isValid: !!departmentConfig && departmentConfig.isActive !== false };
                    }));

                    const invalid = validationResults.find((result) => !result.isValid);
                    if (invalid) {
                        throw new Error(`Managed department ${invalid.code} is not available`);
                    }

                    managedDepartmentCodes = [...new Set(validationResults.map((result) => result.code))];
                }

                const existingTeacher = await teacherModel.findOne({
                    $or: [{ email: teacherData.email }, { registerNo: teacherData.registerNo }]
                });

                if (existingTeacher) {
                    const duplicateMessage = 'Teacher with this email or register number already exists';
                    if (shouldSkipExisting) {
                        results.skippedEntries.push({
                            teacher: teacherData,
                            message: duplicateMessage
                        });
                        continue;
                    }
                    throw new Error(duplicateMessage);
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

                if (isDryRun) {
                    results.successful.push({
                        name: teacherData.name,
                        email: teacherData.email,
                        registerNo: teacherData.registerNo,
                        role,
                        department: role !== 'Chairperson' ? departmentCode : undefined
                    });
                    continue;
                }

                const hashedPassword = await teacherModel.hashedPassword(teacherData.password);

                const teacher = new teacherModel({
                    name: teacherData.name,
                    email: teacherData.email,
                    password: hashedPassword,
                    rawPassword: teacherData.password,
                    registerNo: teacherData.registerNo,
                    department: role !== 'Chairperson' ? departmentCode : undefined,
                    role: role || 'Faculty',
                    managedDepartments: managedDepartmentCodes
                });

                await teacher.save();
                results.successful.push({
                    name: teacher.name,
                    email: teacher.email,
                    registerNo: teacher.registerNo,
                    role: teacher.role,
                    department: teacher.department
                });
            } catch (error) {
                results.failedEntries.push({
                    teacher: teacherData,
                    error: error.message || 'Unknown error'
                });
            }
        }

        fs.unlinkSync(req.file.path);

        return res.status(200).json({
            message: isDryRun ? 'Bulk teacher validation completed' : 'Bulk registration completed',
            mode: isDryRun ? 'dry-run' : 'commit',
            successful: results.successful.length,
            failed: results.failedEntries.length,
            skipped: results.skippedEntries.length,
            failedEntries: results.failedEntries,
            skippedEntries: results.skippedEntries,
            teachers: results.successful,
            results: {
                successful: results.successful.length,
                failed: results.failedEntries.length,
                skipped: results.skippedEntries.length,
                details: {
                    successful: results.successful,
                    failedEntries: results.failedEntries,
                    skippedEntries: results.skippedEntries
                }
            }
        });
    } catch (error) {
        console.error('Error in registerTeachersBulk:', error);
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports.loginTeacher = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        const teacher = await teacherModel.findOne({ email }).select('+password');

        if (!teacher) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await teacher.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        const token = teacher.generateAuthToken();
        res.cookie('token', token);

        res.status(200).json({ token, teacher });
    } catch (error) {
        next(error);
    }
};

module.exports.getProfile = async (req, res, next) => {
    try {
        if (!req.teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        const populatedTeacher = await teacherModel.findById(req.teacher._id)
            .populate({
                path: 'classes',
                select: '_id className students',
                populate: {
                    path: 'students',
                    select: 'name email _id'
                }
            });

        if (!populatedTeacher) {
            return res.status(404).json({ message: 'Teacher data not found' });
        }

        res.status(200).json(populatedTeacher);
    } catch (error) {
        next(error);
    }
};


module.exports.addProfileImg = async (req, res, next) => { 
    try {
        const { registerNo, profileImg } = req.body;
        console.log(registerNo,profileImg)
        const teacher = await teacherService.addProfileImg(registerNo, profileImg);

        res.status(200).json(teacher);
    } catch (error) {
        next(error);
    }
}


module.exports.changePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const teacher = await teacherService.changePassword(req.teacher._id, oldPassword, newPassword);

        res.status(200).json(teacher);
    } catch (error) {
        next(error);
    }
}

module.exports.logoutTeacher = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization.split(' ')[1];

        await BlacklistToken.create({ token });

        res.clearCookie('token');

        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
};

/**
 * Get classes for academic advisor
 * Access: Academic Advisors and HODs
 */
exports.getAdvisedClasses = async (req, res) => {
    try {
        const teacher = req.teacher;
        console.log("Teacher ID:", teacher._id);
        console.log("Teacher role:", teacher.role);
        
        let classes = [];
        
        // HODs can see all classes in their department
        if (teacher.role === 'HOD') {
            classes = await classModel.find({ department: teacher.department })
                .populate('facultyAssigned', 'name email registerNo')
                .populate('academicAdvisors', 'name email registerNo');
            
            console.log(`Found ${classes.length} classes for HOD in department ${teacher.department}`);
        } 
        // Chairperson can see all classes in the institution
        else if (teacher.role === 'Chairperson') {
            classes = await classModel.find({})
                .populate('facultyAssigned', 'name email registerNo')
                .populate('academicAdvisors', 'name email registerNo');
            
            console.log(`Found ${classes.length} classes for Chairperson (all classes)`);
        }
        // Associate Chairperson can see classes from their managed departments
        else if (teacher.role === 'Associate Chairperson') {
            const managedDepartments = teacher.managedDepartments || [];
            if (managedDepartments.length > 0) {
                classes = await classModel.find({ department: { $in: managedDepartments } })
                    .populate('facultyAssigned', 'name email registerNo')
                    .populate('academicAdvisors', 'name email registerNo');
                
                console.log(`Found ${classes.length} classes for Associate Chairperson in departments: ${managedDepartments.join(', ')}`);
            } else {
                console.log('Associate Chairperson has no managed departments assigned');
            }
        }
        // For Academic Advisors and Faculty, find classes where they're listed
        else {
            classes = await classModel.find({ 
                $or: [
                    { academicAdvisors: teacher._id },
                    { facultyAssigned: teacher._id }
                ]
            })
            .populate('facultyAssigned', 'name email registerNo')
            .populate('academicAdvisors', 'name email registerNo');
            
            console.log(`Found ${classes.length} classes for teacher (${teacher.role})`);
        }
        
        return res.status(200).json(classes);
    } catch (error) {
        console.error('Error in getAdvisedClasses:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

module.exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided',
      });
    }

    // Send the filename and path back to the client
    res.status(200).json({
      message: 'Profile image uploaded successfully',
      fileName: req.file.filename,
      filePath: `/uploads/profile/teacher/${req.file.filename}`
    });
  } catch (error) {
    res.status(500).json({
      error: 'Profile image upload failed',
      details: error.message,
    });
  }
};

module.exports.updateProfileImage = async (req, res) => {
  try {
    const { profileImg } = req.body;
    
    // Make sure to import your Teacher model at the top of the file
    const updatedTeacher = await teacherModel.findByIdAndUpdate(
      req.teacher._id, 
      { profileImg }, 
      { new: true }
    );

    if (!updatedTeacher) {
      return res.status(404).json({ 
        success: false,
        message: 'Teacher not found' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile image updated successfully',
      teacher: updatedTeacher
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update profile image',
      details: error.message
    });
  }
};
