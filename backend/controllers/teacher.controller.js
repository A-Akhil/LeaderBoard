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
const { validationResult } = require('express-validator');

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

        // Role-specific validations
        if (role === 'HOD') {
            const existingHOD = await teacherModel.findOne({ department, role: 'HOD' });
            if (existingHOD) {
                return res.status(400).json({ 
                    message: `HOD already exists for ${department} department` 
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

        // Create new teacher
        const teacherData = {
            name,
            email,
            password: hashedPassword,
            rawPassword: password, // For demo purposes only, remove in production
            registerNo,
            role: role || 'Faculty'
        };

        // Add department for roles that need it
        if (role !== 'Chairperson') {
            teacherData.department = department;
        }

        // Add managed departments for Associate Chairperson
        if (role === 'Associate Chairperson') {
            teacherData.managedDepartments = managedDepartments;
        }

        const newTeacher = new teacherModel(teacherData);

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

        const results = {
            successful: [],
            failed: []
        };

        const teachers = [];
        
        // Read CSV file
        await new Promise((resolve, reject) => {
            fs.createReadStream(req.file.path)
                .pipe(csv())
                .on('data', (data) => {
                    console.log('Processing row:', data); // Add debugging
                    // Validate required fields
                    if (!data.name || !data.email || !data.password || 
                        !data.registerNo || !data.department || !data.role) {
                        results.failed.push({
                            teacher: data,
                            error: 'Missing required fields'
                        });
                        return;
                    }

                    // Validate department
                    const validDepartments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];
                    if (!validDepartments.includes(data.department)) {
                        results.failed.push({
                            teacher: data,
                            error: 'Invalid department'
                        });
                        return;
                    }

                    // Validate role
                    const validRoles = ['Faculty', 'Academic Advisor', 'HOD', 'Associate Chairperson', 'Chairperson'];
                    if (!validRoles.includes(data.role)) {
                        results.failed.push({
                            teacher: data,
                            error: 'Invalid role'
                        });
                        return;
                    }

                    teachers.push({
                        name: data.name,
                        email: data.email,
                        password: data.password,
                        registerNo: data.registerNo,
                        department: data.department,
                        role: data.role
                    });
                })
                .on('end', () => {
                    console.log('Finished reading CSV'); // Add debugging
                    resolve();
                })
                .on('error', (error) => {
                    console.error('CSV parsing error:', error); // Add debugging
                    reject(error);
                });
        });

        // Process valid teachers
        for (const teacherData of teachers) {
            try {
                const hashedPassword = await bcrypt.hash(teacherData.password, 10);
                const teacher = new teacherModel({
                    ...teacherData,
                    password: hashedPassword
                });
                await teacher.save();
                results.successful.push({
                    name: teacher.name,
                    email: teacher.email,
                    registerNo: teacher.registerNo
                });
            } catch (error) {
                results.failed.push({
                    teacher: teacherData,
                    error: error.message
                });
            }
        }

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        return res.status(200).json({
            message: 'Bulk registration completed',
            results: {
                successful: results.successful.length,
                failed: results.failed.length,
                details: results
            }
        });
    } catch (error) {
        console.error('Error in registerTeachersBulk:', error);
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
