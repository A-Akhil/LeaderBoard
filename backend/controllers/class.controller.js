const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const classModel = require('../models/class.model'); // Add this import
const teacherModel = require('../models/teacher.model');
const studentModel = require('../models/student.model');
const metadataCache = require('../utils/metadataCache');
const classService = require('../services/class.service');

// Consolidated createClass function
exports.createClass = async (req, res) => {
    try {
        const { year, section, academicYear, department, facultyIds, academicAdvisorIds } = req.body;

        // Validate required fields
        if (!year || !section || !academicYear || !department) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Create new class using service
        const newClass = await classService.createClass({
            year,
            section,
            academicYear,
            department,
            facultyIds,
            academicAdvisorIds
        });

        return res.status(201).json({ 
            message: 'Class created successfully', 
            class: newClass 
        });
    } catch (error) {
        console.error('Error in createClass:', error);
        return res.status(500).json({ message: error.message || 'Internal server error' });
    }
};

exports.addStudentsToClass = async (req, res) => {
    const { classId, studentIds } = req.body;

    if (!classId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ error: "classId and an array of studentIds are required." });
    }

    try {
        // Update the class with the new students
        const updatedClass = await classService.addStudentsToClass(classId, studentIds);

        // Update the `class` field for all students in a single query
        const result = await studentModel.updateMany(
            { _id: { $in: studentIds } }, // Match students by IDs
            { $set: { class: classId } } // Set the `class` field
        );

        // Check if any student IDs were not updated (optional validation step)
        if (result.matchedCount !== studentIds.length) {
            console.warn(
                `${studentIds.length - result.matchedCount} students were not found during update.`
            );
        }

        res.status(200).json({
            message: 'Students added successfully and updated in student models',
            class: updatedClass,
            modifiedCount: result.modifiedCount, // Number of students updated
        });
    } catch (error) {
        console.error("Error adding students to class:", error.message);
        res.status(500).json({ error: "An error occurred while adding students to the class." });
    }
};


exports.changeClassTeacher = async (req, res) => {
    const { classId, teacherId } = req.body;

    try {
        const updatedClass = await classService.changeClassTeacher(classId, teacherId);
        res.status(200).json({ message: 'Class teacher updated successfully', class: updatedClass });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getClassDetails = async (req, res) => {

    console.log("Fetching class details for classId:", req.params.classId);
    const { classId } = req.params;
    
    try {
        const classDetails = await classModel.findById(classId)
            .populate('facultyAssigned', 'name email registerNo')
            .populate('academicAdvisors', 'name email registerNo')
            .populate('students', 'name email registerNo totalPoints');
            
        if (!classDetails) {
            return res.status(404).json({ message: 'Class not found' });
        }
        
        res.status(200).json(classDetails);
    } catch (error) {
        console.error('Error in getClassDetails:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

exports.createClassesInBulk = async (req, res) => {
    const csvFilePath = req.file.path;
  
    try {
      const result = await classService.createClassesInBulk(csvFilePath);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating classes in bulk:", error.message);
      res.status(500).json({ error: "An error occurred while creating classes in bulk." });
    } finally {
      fs.unlinkSync(csvFilePath); // Remove the uploaded file after processing
    }
  };

exports.addStudentsToClassInBulk = async (req, res) => {
  if (!req.file || !req.file.path) {
    return res.status(400).json({ error: "CSV file is required." });
  }

  const csvFilePath = req.file.path;

  try {
    const result = await classService.addStudentsToClassInBulk(csvFilePath);
    res.status(201).json(result);
  } catch (error) {
    console.error("Error adding students to class in bulk:", error);
    res.status(500).json({
      error: "An error occurred while adding students to the class in bulk.",
    });
  } finally {
    fs.unlink(csvFilePath, (err) => {
      if (err) {
        console.error("Error deleting the uploaded CSV file:", err.message);
      }
    });
  }
};

exports.assignAcademicAdvisor = async (req, res) => {
    try {
        const { classId, teacherId } = req.body;

        // Validate required fields
        if (!classId || !teacherId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check if class exists
        const classData = await classModel.findById(classId);
        if (!classData) {
            return res.status(404).json({ message: 'Class not found' });
        }

        // Check if teacher exists and is an Academic Advisor
        const teacher = await teacherModel.findById(teacherId);
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        if (teacher.role !== 'Academic Advisor' && teacher.role !== 'HOD') {
            return res.status(400).json({ 
                message: 'Only Academic Advisors or HODs can be assigned as advisors' 
            });
        }

        // Check if teacher is already assigned to this class
        if (classData.academicAdvisors.includes(teacherId)) {
            return res.status(400).json({ 
                message: 'Teacher is already assigned as an academic advisor to this class' 
            });
        }

        // Assign academic advisor to class
        classData.academicAdvisors.push(teacherId);
        await classData.save();

        // Add class to teacher's classes
        if (!teacher.classes.includes(classId)) {
            teacher.classes.push(classId);
            await teacher.save();
        }

        return res.status(200).json({ 
            message: 'Academic advisor assigned successfully', 
            class: classData 
        });
    } catch (error) {
        console.error('Error in assignAcademicAdvisor:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getClassesByDepartment = async (req, res) => {
    try {
        const { departmentId } = req.params;
        const classes = await classService.getClassesByDepartment(departmentId);
        return res.status(200).json(classes);
    } catch (error) {
        console.error('Error in getClassesByDepartment:', error);
        return res.status(500).json({ message: error.message || 'Internal server error' });
    }
};

exports.getStudentsByClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const students = await classService.getStudentsByClass(classId);
        return res.status(200).json(students);
    } catch (error) {
        console.error('Error in getStudentsByClass:', error);
        return res.status(500).json({ message: error.message || 'Internal server error' });
    }
};

exports.createClassesBulk = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const rows = [];
        await new Promise((resolve, reject) => {
            fs.createReadStream(req.file.path)
                .pipe(csv())
                .on('data', (data) => rows.push(data))
                .on('end', resolve)
                .on('error', reject);
        });
        const results = {
            successful: [],
            failed: [],
            failedEntries: []
        };

        for (const rawRow of rows) {
            const row = { ...rawRow };
            const issues = [];

            const year = rawRow.year ? Number.parseInt(rawRow.year, 10) : Number.NaN;
            if (!rawRow.year || Number.isNaN(year)) {
                issues.push('Year is required and must be a number');
            }

            const section = rawRow.section ? rawRow.section.toString().trim().toUpperCase() : '';
            if (!section) {
                issues.push('Section is required');
            }

            const academicYear = rawRow.academicYear ? rawRow.academicYear.toString().trim() : '';
            if (!academicYear) {
                issues.push('Academic year is required');
            }

            const department = rawRow.department ? rawRow.department.toString().trim().toUpperCase() : '';
            if (!department) {
                issues.push('Department is required');
            }

            if (issues.length > 0) {
                results.failedEntries.push({ class: row, error: issues.join('; ') });
                continue;
            }

            try {
                const departmentConfig = await metadataCache.getDepartmentByCode(department);
                if (!departmentConfig || departmentConfig.isActive === false) {
                    results.failedEntries.push({
                        class: row,
                        error: `Department ${department} is not configured`
                    });
                    continue;
                }

                const existingClass = await classModel.findOne({
                    year,
                    section,
                    academicYear,
                    department
                });

                if (existingClass) {
                    results.failedEntries.push({
                        class: row,
                        error: 'Class already exists'
                    });
                    continue;
                }

                const createdClass = new classModel({
                    year,
                    section,
                    academicYear,
                    department,
                    assignedFaculty: [],
                    students: [],
                    facultyAssigned: [],
                    academicAdvisors: []
                });

                await createdClass.save();

                results.successful.push({
                    id: createdClass._id,
                    year: createdClass.year,
                    section: createdClass.section,
                    academicYear: createdClass.academicYear,
                    department: createdClass.department
                });
            } catch (error) {
                console.error('Error processing class:', error);
                let message = error.message || 'Unknown error while creating class';

                if (error.name === 'ValidationError' && error.errors) {
                    message = Object.values(error.errors)
                        .map((validationError) => validationError.message)
                        .join('; ');
                }

                results.failedEntries.push({
                    class: row,
                    error: message
                });
            }
        }

        fs.unlinkSync(req.file.path);

        return res.status(200).json({
            message: 'Bulk class creation completed',
            successful: results.successful.length,
            failed: results.failedEntries.length,
            failedEntries: results.failedEntries,
            classes: results.successful
        });
    } catch (error) {
        console.error('Error in createClassesBulk:', error);
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
};
