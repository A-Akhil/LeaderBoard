const csv = require('csv-parser');
const fs = require('fs');
const { generateRandomPassword } = require('../utils/passwordGenerator');
const EmailService = require('./mail.services'); 
const teacherService = require('./teacher.service');
const teacherModel = require('../models/teacher.model');

class TeacherBulkService {
    constructor() {
        this.emailService = new EmailService(); // Ensure this is correctly instantiated
    }

    async processCSV(filePath) {
        const results = [];
        const errors = [];

        return new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', async () => {
                    try {
                        const processedResults = await this.processTeachers(results);
                        resolve(processedResults);
                    } catch (error) {
                        reject(error);
                    }
                });
        });
    }

    async processTeachers(teachers) {
        const results = {
            successful: [],
            failed: []
        };

        for (const teacher of teachers) {
            try {
                console.log("Input Data from CSV:", results)
                const password = generateRandomPassword();
                const hashedPassword = await teacherModel.hashedPassword(password);

                const newTeacher = await teacherService.createTeacher({
                    name: teacher.name,
                    email: teacher.email,
                    registerNo: teacher.registerNo,
                    password: hashedPassword
                });

                await this.emailService.sendPasswordEmail(newTeacher.email, newTeacher.name, password);

                results.successful.push({
                    name: teacher.name,
                    email: teacher.email,
                    registerNo: teacher.registerNo,
                    generatedPassword: password // Include generated password for admin reference (consider removing for security)
                });
            } catch (error) {
                results.failed.push({
                    teacher,
                    error: error.message
                });
            }
        }

        return results;
    }
}

module.exports = TeacherBulkService;
