const csv = require('csv-parser');
const fs = require('fs');
const { generateRandomPassword } = require('../utils/passwordGenerator');
const EmailService = require('./mail.services'); 
const studentService = require('./student.service');

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
                const password = student.password || generateRandomPassword();
                if (!student.course) {
                    throw new Error('Course is required for each student record');
                }

                const newStudent = await studentService.createStudent({
                    name: student.name,
                    email: student.email,
                    registerNo: student.registerNo,
                    password,
                    rawPassword: password,
                    course: student.course,
                    year: student.year ? parseInt(student.year, 10) : undefined,
                    registrationYear: student.registrationYear ? parseInt(student.registrationYear, 10) : undefined,
                    currentClassId: student.currentClassId
                });

                // Email Service (Optional)
                // await this.emailService.sendStudentEmail(newStudent.email, newStudent.name, password);

                results.successful.push({
                    name: student.name,
                    email: student.email,
                    registerNo: student.registerNo,
                    rawPassword: password // Include raw password in the results
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
    