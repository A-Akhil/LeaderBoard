const studentModel = require('../models/student.model');
const teacherModel = require('../models/teacher.model');
const classModel = require('../models/class.model');
const bcrypt = require('bcrypt');

class AssignmentService {
    async assignStudentsToClasses(assignments, options = {}) {
        const { dryRun = false, skipExisting = false } = options;
        const results = {
            successful: [],
            failedEntries: [],
            skippedEntries: []
        };

        for (const assign of assignments) {
            try {
                const student = await studentModel.findOne({ registerNo: assign.studentRegNo });
                const classData = await classModel.findOne({ className: assign.className });

                if (!student || !classData) {
                    results.failedEntries.push({
                        assignment: assign,
                        error: !student ? 'Student not found' : 'Class not found'
                    });
                    continue;
                }

                const alreadyAssigned =
                    student.currentClass &&
                    student.currentClass.ref &&
                    student.currentClass.ref.toString() === classData._id.toString();

                if (alreadyAssigned) {
                    const duplicateMessage = 'Student already assigned to this class';
                    if (skipExisting) {
                        results.skippedEntries.push({
                            assignment: assign,
                            message: duplicateMessage
                        });
                        continue;
                    }

                    results.failedEntries.push({
                        assignment: assign,
                        error: duplicateMessage
                    });
                    continue;
                }

                if (dryRun) {
                    results.successful.push({
                        student: student.registerNo,
                        class: classData.className
                    });
                    continue;
                }

                student.currentClass = {
                    year: classData.year,
                    section: classData.section,
                    ref: classData._id
                };
                await student.save();

                classData.students.addToSet(student._id);
                await classData.save();

                results.successful.push({
                    student: student.registerNo,
                    class: classData.className
                });
            } catch (error) {
                results.failedEntries.push({
                    assignment: assign,
                    error: error.message
                });
            }
        }

        results.failed = results.failedEntries;
        return results;
    }

    async assignFacultyToClasses(assignments, options = {}) {
        const { dryRun = false, skipExisting = false } = options;
        const results = {
            successful: [],
            failedEntries: [],
            skippedEntries: []
        };

        for (const assign of assignments) {
            try {
                const faculty = await teacherModel.findOne({
                    registerNo: assign.facultyRegNo,
                    role: 'Faculty'
                });
                const classData = await classModel.findOne({ className: assign.className });

                if (!faculty || !classData) {
                    results.failedEntries.push({
                        assignment: assign,
                        error: !faculty ? 'Faculty not found' : 'Class not found'
                    });
                    continue;
                }

                const facultyAlreadyAssigned = classData.facultyAssigned.some((id) => id.toString() === faculty._id.toString());

                if (facultyAlreadyAssigned) {
                    const duplicateMessage = 'Faculty already assigned to this class';
                    if (skipExisting) {
                        results.skippedEntries.push({
                            assignment: assign,
                            message: duplicateMessage
                        });
                        continue;
                    }

                    results.failedEntries.push({
                        assignment: assign,
                        error: duplicateMessage
                    });
                    continue;
                }

                if (dryRun) {
                    results.successful.push({
                        faculty: faculty.registerNo,
                        class: classData.className
                    });
                    continue;
                }

                classData.facultyAssigned.addToSet(faculty._id);
                await classData.save();

                faculty.classes.addToSet(classData._id);
                await faculty.save();

                results.successful.push({
                    faculty: faculty.registerNo,
                    class: classData.className
                });
            } catch (error) {
                console.error('Error assigning faculty:', error);
                results.failedEntries.push({
                    assignment: assign,
                    error: error.message
                });
            }
        }

        results.failed = results.failedEntries;
        return results;
    }

    async assignAdvisorsToClasses(assignments, options = {}) {
        const { dryRun = false, skipExisting = false } = options;
        const results = {
            successful: [],
            failedEntries: [],
            skippedEntries: []
        };

        for (const assign of assignments) {
            try {
                const advisor = await teacherModel.findOne({
                    registerNo: assign.advisorRegNo,
                    role: 'Academic Advisor'
                });
                const classData = await classModel.findOne({ className: assign.className });

                if (!advisor || !classData) {
                    results.failedEntries.push({
                        assignment: assign,
                        error: !advisor ? 'Academic Advisor not found' : 'Class not found'
                    });
                    continue;
                }

                const advisorAlreadyAssigned = classData.academicAdvisors.some((id) => id.toString() === advisor._id.toString());

                if (advisorAlreadyAssigned) {
                    const duplicateMessage = 'Advisor already assigned to this class';
                    if (skipExisting) {
                        results.skippedEntries.push({
                            assignment: assign,
                            message: duplicateMessage
                        });
                        continue;
                    }

                    results.failedEntries.push({
                        assignment: assign,
                        error: duplicateMessage
                    });
                    continue;
                }

                if (dryRun) {
                    results.successful.push({
                        advisor: advisor.registerNo,
                        class: classData.className
                    });
                    continue;
                }

                classData.academicAdvisors.addToSet(advisor._id);
                await classData.save();

                advisor.classes.addToSet(classData._id);
                await advisor.save();

                results.successful.push({
                    advisor: advisor.registerNo,
                    class: classData.className
                });
            } catch (error) {
                console.error('Error assigning advisor:', error);
                results.failedEntries.push({
                    assignment: assign,
                    error: error.message
                });
            }
        }

        results.failed = results.failedEntries;
        return results;
    }
}

module.exports = new AssignmentService();