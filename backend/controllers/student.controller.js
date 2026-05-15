const studentModel = require('../models/student.model');
const studentService = require('../services/student.service');
const blackListModel = require('../models/blacklistToken.model');
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const StudentBulkService = require('../services/studentsBulk.services');
const eventModel = require('../models/event.model');
const csv = require('csv-parser');
const bcrypt = require('bcrypt'); // Add this import

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

                // Validate course format
                const validPrograms = ['BTech', 'MTech', 'MTech-Integrated'];
                const validDepartments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];
                const courseParts = data.course.split('-');

                if (courseParts.length !== 2 || 
                    !validPrograms.includes(courseParts[0]) || 
                    !validDepartments.includes(courseParts[1])) {
                    results.failedEntries.push({
                        student: data,
                        error: 'Invalid course format. Should be Program-Department (e.g., BTech-CSE)'
                    });
                    continue;
                }

                const [program, department] = courseParts;

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
                    course: data.course,
                    program,
                    department,
                    registrationYear: parseInt(data.registrationYear),
                    year: 1 // Default to first year
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
            course, year, currentClassId 
        } = req.body;

        // Validate course format
        const validPrograms = ['BTech', 'MTech', 'MTech-Integrated'];
        const validDepartments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];
        
        const courseParts = course.split('-');
        if (courseParts.length !== 2 || !validPrograms.includes(courseParts[0]) || 
            !validDepartments.includes(courseParts[1])) {
            return res.status(400).json({ 
                message: 'Invalid course format. Should be Program-Department (e.g., BTech-CSE)' 
            });
        }

        // Extract program and department
        const program = courseParts[0];
        const department = courseParts[1];

        // Check if student already exists
        const existingStudent = await studentModel.findOne({ email });
        if (existingStudent) {
            return res.status(400).json({ message: 'Student with this email already exists' });
        }

        // Verify the class exists and get class details
        const classData = await classModel.findById(currentClassId);
        if (!classData) {
            return res.status(404).json({ message: 'Class not found' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new student
        const newStudent = new studentModel({
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
            .select('-password')
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
        
        // Safely get token from request
        let token;
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        
        if (token) {
            await blackListModel.create({ token });
        }
        
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
}


module.exports.getstudentEventDetails = async (req, res, next) => {
    try {
        const studentId = req.params.id;
        
        // Authorization check: students can only access their own data
        if (req.student._id.toString() !== studentId) {
            return res.status(403).json({ message: 'Forbidden: You can only access your own event details' });
        }
        
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


