const mongoose = require('mongoose');
const classModel = require('../models/class.model');
const teacherModel = require('../models/teacher.model');
const studentModel = require('../models/student.model');
const fs = require('fs');
const csv = require('csv-parser');

// Utility function to validate ObjectIDs
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Utility function to find a teacher by ID
const findTeacherById = async (teacherId) => {
    if (!isValidObjectId(teacherId)) {
        throw new Error('Invalid Teacher ID');
    }
    const teacher = await teacherModel.findById(teacherId);
    if (!teacher) {
        throw new Error(`Teacher with ID ${teacherId} not found`);
    }
    return teacher;
};

// Utility function to find a class by ID
const findClassById = async (classId) => {
    if (!isValidObjectId(classId)) {
        throw new Error('Invalid Class ID');
    }
    const classDetails = await classModel.findById(classId);
    if (!classDetails) {
        throw new Error(`Class with ID ${classId} not found`);
    }
    return classDetails;
};

// Create a new class
const createClass = async (className, teacherId) => {
    await findTeacherById(teacherId);

    const newClass = new classModel({
        className,
        teacher: teacherId,
    });

    return await newClass.save();
};

// Add students to a class
const addStudentsToClass = async (classId, studentIds) => {
    const classDetails = await findClassById(classId);

    // Validate that all student IDs are valid and exist
    const validStudents = await studentModel.find({ _id: { $in: studentIds } });
    if (validStudents.length !== studentIds.length) {
        throw new Error('One or more students not found');
    }

    // Use $addToSet to avoid duplicates
    const updatedClass = await classModel.findByIdAndUpdate(
        classId,
        { $addToSet: { students: { $each: studentIds } } },
        { new: true } // Return the updated document
    );

    return updatedClass;
};

// Change the teacher of a class
const changeClassTeacher = async (classId, teacherId) => {
    const classDetails = await findClassById(classId);
    await findTeacherById(teacherId);

    classDetails.teacher = teacherId;
    return await classDetails.save();
};

// Get class details with populated teacher and student information
const getClassDetails = async (classId) => {
    const classDetails = await classModel.findById(classId)
    .populate('teacher', 'name email')
    .populate('students', 'name email registerNo');
          
    
    if (!classDetails) {
        throw new Error(`Class with ID ${classId} not found`);
    }

    return classDetails;
};

const createClassesInBulk = async (csvFilePath) => {
    const classes = [];
    const teachers = {};

    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
          const { className, teacherRegisterNo } = row;
          console.log(className, teacherRegisterNo); 
          if (!classes.some(cls => cls.className === className)) {
            classes.push({ className, teacherRegisterNo});
          }
          console.log(classes);
        })
        .on('end', async () => {
          try {
            for (const cls of classes) {
              let teacher = await teacherModel.findOne({ registerNo: cls.teacherRegisterNo });
              if (!teacher) {
                return reject(new Error(`Teacher with register number ${cls.teacherRegisterNo} not found`))
              }

              const newClass = new classModel({ className: cls.className, teacher: teacher._id });
              await newClass.save();

              teacher.classes.push(newClass._id);
              await teacher.save();
            }
            resolve({ message: 'Classes created successfully' });
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          reject(error);
        });
    });
};

const addStudentsToClassInBulk = async (csvFilePath) => {
  const students = [];
  const errors = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        const { className, studentRegisterNo, studentName } = row;
        students.push({ className, studentRegisterNo, studentName });
      })
      .on('end', async () => {
        try {
          for (const student of students) {
            const classDetails = await classModel.findOne({ className: student.className });
            if (!classDetails) {
              errors.push(`Class with name ${student.className} not found`);
              continue;
            }

            let studentRecord = await studentModel.findOne({ registerNo: student.studentRegisterNo });
            if (!studentRecord) {
              errors.push(`Student with register number ${student.studentRegisterNo} not found`);
              continue;
            } else {
              studentRecord.class = classDetails._id;
              await studentRecord.save();
            }

            await classModel.findByIdAndUpdate(
              classDetails._id,
              { $addToSet: { students: studentRecord._id } },
              { new: true }
            );
          }
          if (errors.length > 0) {
            console.error('Errors:', errors);
          }
          resolve({ message: 'Students added to class successfully', errors });
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

exports.createClass = async (classData) => {
    const { year, section, academicYear, department, facultyIds, academicAdvisorIds } = classData;
    
    // Check if class already exists
    const existingClass = await classModel.findOne({
        year,
        section,
        academicYear,
        department
    });
    
    if (existingClass) {
        throw new Error('Class already exists');
    }
    
    // Create class
    const newClass = new classModel({
        year,
        section,
        academicYear,
        department,
        facultyAssigned: facultyIds || [],
        academicAdvisors: academicAdvisorIds || []
    });
    
    await newClass.save();
    
    // Update teacher references
    if (facultyIds && facultyIds.length > 0) {
        await teacherModel.updateMany(
            { _id: { $in: facultyIds } },
            { $push: { classes: newClass._id } }
        );
    }
    
    if (academicAdvisorIds && academicAdvisorIds.length > 0) {
        await teacherModel.updateMany(
            { _id: { $in: academicAdvisorIds } },
            { $push: { classes: newClass._id } }
        );
    }
    
    return newClass;
};

/**
 * Assign academic advisor to class
 */
exports.assignAcademicAdvisor = async (classId, teacherId) => {
    // Verify class exists
    const classData = await classModel.findById(classId);
    if (!classData) {
        throw new Error('Class not found');
    }
    
    // Verify teacher exists and has proper role
    const teacher = await teacherModel.findById(teacherId);
    if (!teacher) {
        throw new Error('Teacher not found');
    }
    
    if (teacher.role !== 'Academic Advisor' && teacher.role !== 'HOD') {
        throw new Error('Only Academic Advisors or HODs can be assigned as advisors');
    }
    
    // Check for duplicate assignment
    if (classData.academicAdvisors.includes(teacherId)) {
        throw new Error('Teacher is already assigned as an academic advisor to this class');
    }
    
    // Update class and teacher
    classData.academicAdvisors.push(teacherId);
    await classData.save();
    
    if (!teacher.classes.includes(classId)) {
        teacher.classes.push(classId);
        await teacher.save();
    }
    
    return classData;
};

/**
 * Get classes by department
 */
exports.getClassesByDepartment = async (department) => {
    return await classModel.find({ department })
        .populate('facultyAssigned', 'name email registerNo')
        .populate('academicAdvisors', 'name email registerNo');
};

/**
 * Get students by class ID
 */
exports.getStudentsByClass = async (classId) => {
    return await studentModel.find({ 'currentClass.ref': classId })
        .select('-password');
};

exports.addStudentsToClass = async (classId, studentIds) => {
    // First, update the class to include these students
    await classModel.findByIdAndUpdate(
        classId,
        { $addToSet: { students: { $each: studentIds } } }
    );
    
    // Then update each student to reference this class
    // Try both ways depending on your schema usage
    await studentModel.updateMany(
        { _id: { $in: studentIds } },
        { 
            $set: { 
                class: classId,
                'currentClass.ref': classId 
            } 
        }
    );
    
    return await classModel.findById(classId).populate('students');
};

module.exports = {
    createClass,
    addStudentsToClass,
    changeClassTeacher,
    getClassDetails,
    createClassesInBulk,
    addStudentsToClassInBulk,
    assignAcademicAdvisor: exports.assignAcademicAdvisor,
    getClassesByDepartment: exports.getClassesByDepartment,
    getStudentsByClass: exports.getStudentsByClass
};
