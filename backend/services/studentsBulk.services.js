const csv = require('csv-parser');
const fs = require('fs');
const { generateRandomPassword } = require('../utils/passwordGenerator');
const EmailService = require('./mail.services'); 
const studentService = require('./student.service');
const studentModel = require('../models/student.model');
const teacherModel = require('../models/teacher.model');

class StudentBulkService {
    // constructor() {
    //     this.emailService = new EmailService();  // Ensure this is correctly instantiated
    // }

    async processCSV(filePath) {
        const results = [];
        const errors = [];

        return new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', async () => {
                    try {
                        const processedResults = await this.processStudents(results);
                        resolve(processedResults);
                    } catch (error) {
                        reject(error);
                    }
                });
        });
    }

    async processStudents(students) {
        const results = {
            successful: [],
            failed: []
        };

        for (const student of students) {
            try {
                const password = generateRandomPassword(); // Generate raw password
                const hashedPassword = await teacherModel.hashedPassword(password);

                const newStudent = await studentService.createStudent({
                    name: student.name,
                    email: student.email,
                    registerNo: student.registerNo,
                    password: hashedPassword
                });

                // Email Service (Optional)
                // await this.emailService.sendStudentEmail(newStudent.email, newStudent.name, password);

                results.successful.push({
                    name: student.name,
                    email: student.email,
                    registerNo: student.registerNo,
                    generatedPassword: password // Include generated password for admin reference (consider removing for security)
                });

            } catch (error) {
                results.failed.push({
                    student,
                    error: error.message
                });
            }
        }

        return results;
    }
}

module.exports = StudentBulkService;
    