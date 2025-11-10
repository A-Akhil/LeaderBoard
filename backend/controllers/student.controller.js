const studentModel = require('../models/student.model');
const studentService = require('../services/student.service');
const blackListModel = require('../models/blacklistToken.model');
const classModel = require('../models/class.model');
const metadataCache = require('../utils/metadataCache');
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const StudentBulkService = require('../services/studentsBulk.services');
const eventModel = require('../models/event.model');
const csv = require('csv-parser');
const bcrypt = require('bcrypt');

const uploadPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath);
}

exports.registerStudentsBulk = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const results = {
            successful: [],
            failed: [],
            failedEntries: []
        };

        const rows = [];
        await new Promise((resolve, reject) => {
            fs.createReadStream(req.file.path)
                .pipe(csv())
                .on('data', (data) => rows.push(data))
                .on('end', resolve)
                .on('error', reject);
        });

        for (const data of rows) {
            try {
                // Validate required fields
                if (!data.name || !data.email || !data.password || 
                    !data.registerNo || !data.course || !data.registrationYear) {
                    results.failedEntries.push({
                        student: data,
                        error: 'Missing required fields'
                    });
                    continue;
                }

                const courseCode = data.course ? data.course.toString().trim().toUpperCase() : '';
                if (!courseCode) {
                    results.failedEntries.push({
                        student: data,
                        error: 'Course code is required'
                    });
                    continue;
                }

                const courseConfig = await metadataCache.getCourseByCode(courseCode);
                if (!courseConfig || courseConfig.isActive === false) {
                    results.failedEntries.push({
                        student: data,
                        error: `Invalid or inactive course: ${courseCode}`
                    });
                    continue;
                }

                const programConfig = await metadataCache.getProgramByCode(courseConfig.programCode);
                if (!programConfig || programConfig.isActive === false) {
                    results.failedEntries.push({
                        student: data,
                        error: `Program ${courseConfig.programCode} is not available`
                    });
                    continue;
                }

                const departmentConfig = await metadataCache.getDepartmentByCode(courseConfig.departmentCode);
                if (!departmentConfig || departmentConfig.isActive === false) {
                    results.failedEntries.push({
                        student: data,
                        error: `Department ${courseConfig.departmentCode} is not available`
                    });
                    continue;
                }

                const registrationYear = parseInt(data.registrationYear, 10);
                if (Number.isNaN(registrationYear)) {
                    results.failedEntries.push({
                        student: data,
                        error: 'Registration year must be a valid number'
                    });
                    continue;
                }

                const intakeYear = data.year ? parseInt(data.year, 10) : 1;
                if (Number.isNaN(intakeYear) || intakeYear < 1) {
                    results.failedEntries.push({
                        student: data,
                        error: 'Year must be a positive number when provided'
                    });
                    continue;
                }

                // Check if student already exists
                const existingStudent = await studentModel.findOne({ 
                    $or: [{ email: data.email }, { registerNo: data.registerNo }]
                });

                if (existingStudent) {
                    results.failedEntries.push({
                        student: data,
                        error: 'Student with this email or register number already exists'
                    });
                    continue;
                }

                // Create student without class assignment
                const hashedPassword = await bcrypt.hash(data.password, 10);
                const student = new studentModel({
                    name: data.name,
                    email: data.email,
                    password: hashedPassword,
                    registerNo: data.registerNo,
                    course: courseConfig.code,
                    program: programConfig.code,
                    department: departmentConfig.code,
                    programDurationYears: programConfig.durationYears,
                    registrationYear,
                    year: intakeYear
                });

                await student.save();
                results.successful.push({
                    name: student.name,
                    email: student.email,
                    registerNo: student.registerNo
                });
            } catch (error) {
                console.error('Error processing student:', error);
                results.failedEntries.push({
                    student: data,
                    error: error.message
                });
            }
        }

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        return res.status(200).json({
            message: 'Bulk registration completed',
            successful: results.successful.length,
            failed: results.failedEntries.length,
            failedEntries: results.failedEntries,
            students: results.successful
        });
    } catch (error) {
        console.error('Error in registerStudentsBulk:', error);
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
};

exports.registerStudent = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { 
            name, email, password, registerNo, 
            course, year, currentClassId, registrationYear
        } = req.body;

        const courseCode = course ? course.toString().trim().toUpperCase() : '';
        if (!courseCode) {
            return res.status(400).json({ message: 'Course code is required' });
        }

        const courseConfig = await metadataCache.getCourseByCode(courseCode);
        if (!courseConfig || courseConfig.isActive === false) {
            return res.status(400).json({ message: `Invalid or inactive course: ${courseCode}` });
        }

        const programConfig = await metadataCache.getProgramByCode(courseConfig.programCode);
        if (!programConfig || programConfig.isActive === false) {
            return res.status(400).json({ message: `Program ${courseConfig.programCode} is not available` });
        }

        const departmentConfig = await metadataCache.getDepartmentByCode(courseConfig.departmentCode);
        if (!departmentConfig || departmentConfig.isActive === false) {
            return res.status(400).json({ message: `Department ${courseConfig.departmentCode} is not available` });
        }

        const registrationYearValue = registrationYear ? parseInt(registrationYear, 10) : new Date().getFullYear();
        if (Number.isNaN(registrationYearValue)) {
            return res.status(400).json({ message: 'Registration year must be a valid number' });
        }

        const intakeYear = year ? parseInt(year, 10) : 1;
        if (Number.isNaN(intakeYear) || intakeYear < 1) {
            return res.status(400).json({ message: 'Year must be a positive number when provided' });
        }

        // Check if student already exists
        const existingStudent = await studentModel.findOne({ email });
        if (existingStudent) {
            return res.status(400).json({ message: 'Student with this email already exists' });
        }

        let classData = null;
        if (currentClassId) {
            classData = await classModel.findById(currentClassId);
            if (!classData) {
                return res.status(404).json({ message: 'Class not found' });
            }

            if (classData.department !== departmentConfig.code) {
                return res.status(400).json({ message: 'Class department does not match student department' });
            }
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new student
        const newStudent = new studentModel({
            name,
            email,
            password: hashedPassword,
            rawPassword: password,
            registerNo,
            course: courseConfig.code,
            program: programConfig.code,
            department: departmentConfig.code,
            programDurationYears: programConfig.durationYears,
            registrationYear: registrationYearValue,
            year: intakeYear,
            currentClass: classData ? {
                year: classData.year,
                section: classData.section,
                ref: currentClassId
            } : undefined
        });

        await newStudent.save();

        return res.status(201).json({ 
            message: 'Student registered successfully',
            course: newStudent.course,
            department: newStudent.department
        });
    } catch (error) {
        console.error('Error in registerStudent:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getStudentsByDepartment = async (req, res) => {
    try {
        const { department, course, year, section } = req.query;
        
        const filter = {};
        if (department) filter.department = department;
        if (course) filter.course = course;
        if (year) filter['currentClass.year'] = parseInt(year);
        if (section) filter['currentClass.section'] = section;
        
        const students = await studentModel.find(filter)
            .select('-password -rawPassword')
            .populate({
                path: 'currentClass.ref',
                select: 'year section academicYear'
            });
            
        return res.status(200).json(students);
    } catch (error) {
        console.error('Error in getStudentsByDepartment:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports.loginStudent = async (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    

    const student = await studentModel.findOne({ email }).select('+password');


    if (!student) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await student.comparePassword(password);


    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid password' });
    }

    const token = student.generateAuthToken();

    res.cookie('token', token);

    res.status(200).json({ token, student });
}

module.exports.getStudentProfile = async (req, res, next) => {
    try {
        if (!req.student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Get student with populated events and class
        const populatedStudent = await studentModel.findById(req.student._id)
            .populate({
                path: 'eventsParticipated',
                match: { status: 'Approved' },
                options: { sort: { date: -1 } }
            })
            .populate('class', 'className');

        if (!populatedStudent) {
            return res.status(404).json({ message: 'Student data not found' });
        }

        // Fetch all events (including pending) for this student
        const allEvents = await eventModel.find({
            submittedBy: req.student._id,
            status: 'Approved'
        }).sort({ date: -1 });

        // Create response object with approved events
        const responseData = {
            ...populatedStudent.toObject(),
            eventsParticipated: allEvents
        };

        res.status(200).json(responseData);
    } catch (error) {
        next(error);
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
        filePath: `/uploads/profile/student/${req.file.filename}`
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
      
      // Update student profile with the new image path
      const updatedStudent = await studentModel.findByIdAndUpdate(
        req.student._id, 
        { profileImg }, 
        { new: true }
      );
  
      if (!updatedStudent) {
        return res.status(404).json({ 
          success: false,
          message: 'Student not found' 
        });
      }
  
      res.status(200).json({
        success: true,
        message: 'Profile image updated successfully',
        student: updatedStudent
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update profile image',
        details: error.message
      });
    }
  };


module.exports.changePassword = async (req, res, next) => {
    try {
        if (!req.student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        const { oldPassword, newPassword } = req.body;

        const student = await studentService.changePassword(
            req.student._id,
            oldPassword,
            newPassword
        );

        res.status(200).json(student);
    } catch (error) {
        next(error);
    }
};

module.exports.logoutStudent = async (req, res, next) => {
    try {
        res.clearCookie('token');
        const token = req.cookies.token || req.headers.authorization.split(' ')[1];
        await blackListModel.create({ token });
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
}


module.exports.getstudentEventDetails = async (req, res, next) => {
    try {
        const studentId = req.params.id;
        console.log(studentId);
        
        const student = await studentModel.findById(studentId)
            .populate({
                path: 'eventsParticipated',
                match: { status: { $ne: 'Pending' } },
                options: { sort: { date: -1 } }
            });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.status(200).json(student.eventsParticipated);
    } catch (error) {
        next(error);
    }
};

module.exports.getAllStudentEvents = async (req, res, next) => {
    try {
        if (!req.student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Fetch all events for this student (including all statuses)
        const allEvents = await eventModel.find({
            submittedBy: req.student._id
        }).sort({ date: -1 }); // Sort by date, newest first

        if (!allEvents) {
            return res.status(404).json({ message: 'No events found' });
        }

        res.status(200).json(allEvents);
    } catch (error) {
        next(error);
    }
};

module.exports.getCurrentRank = async (req, res, next) => {
    try {
        if (!req.student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Get ALL students sorted by total points
        const allStudents = await studentModel
            .find({})
            .sort({ totalPoints: -1 })
            .select('_id totalPoints')
            .lean();

        // Calculate dense ranking
        let currentRank = 1;
        let currentPoints = null;
        let studentRank = null;
        let totalStudents = allStudents.length;

        for (const student of allStudents) {
            if (student.totalPoints !== currentPoints) {
                currentPoints = student.totalPoints;
                studentRank = currentRank++;
            }
            
            if (student._id.toString() === req.student._id.toString()) {
                break;
            }
        }

        res.status(200).json({
            rank: studentRank,
            totalStudents: totalStudents
        });
    } catch (error) {
        next(error);
    }
};


