const assignmentService = require('../services/assignment.service');
const csv = require('csv-parser');
const fs = require('fs');
const { parseBooleanFlag } = require('../utils/requestFlags');

class AssignmentController {
    async assignStudentsToClasses(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            const isDryRun = parseBooleanFlag(req.query.dryRun || req.query.preview || req.query.mode);
            const shouldSkipExisting = parseBooleanFlag(req.query.skipExisting);

            const assignments = [];
            await new Promise((resolve, reject) => {
                fs.createReadStream(req.file.path)
                    .pipe(csv())
                    .on('data', (data) => assignments.push(data))
                    .on('end', resolve)
                    .on('error', reject);
            });

            const results = await assignmentService.assignStudentsToClasses(assignments, {
                dryRun: isDryRun,
                skipExisting: shouldSkipExisting
            });

            // Clean up uploaded file
            fs.unlinkSync(req.file.path);

            return res.status(200).json({
                message: isDryRun ? 'Student assignment validation completed' : 'Student assignments completed',
                mode: isDryRun ? 'dry-run' : 'commit',
                successful: results.successful.length,
                failed: results.failedEntries.length,
                skipped: results.skippedEntries.length,
                failedEntries: results.failedEntries,
                skippedEntries: results.skippedEntries,
                assignments: results.successful,
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
            console.error('Error in assignStudentsToClasses:', error);
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    async assignFacultyToClasses(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            const isDryRun = parseBooleanFlag(req.query.dryRun || req.query.preview || req.query.mode);
            const shouldSkipExisting = parseBooleanFlag(req.query.skipExisting);

            const assignments = [];
            await new Promise((resolve, reject) => {
                fs.createReadStream(req.file.path)
                    .pipe(csv())
                    .on('data', (data) => assignments.push(data))
                    .on('end', resolve)
                    .on('error', reject);
            });

            const results = await assignmentService.assignFacultyToClasses(assignments, {
                dryRun: isDryRun,
                skipExisting: shouldSkipExisting
            });

            // Clean up uploaded file
            fs.unlinkSync(req.file.path);

            return res.status(200).json({
                message: isDryRun ? 'Faculty assignment validation completed' : 'Faculty assignments completed',
                mode: isDryRun ? 'dry-run' : 'commit',
                successful: results.successful.length,
                failed: results.failedEntries.length,
                skipped: results.skippedEntries.length,
                failedEntries: results.failedEntries,
                skippedEntries: results.skippedEntries,
                assignments: results.successful,
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
            console.error('Error in assignFacultyToClasses:', error);
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    async assignAdvisorsToClasses(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            const isDryRun = parseBooleanFlag(req.query.dryRun || req.query.preview || req.query.mode);
            const shouldSkipExisting = parseBooleanFlag(req.query.skipExisting);

            const assignments = [];
            await new Promise((resolve, reject) => {
                fs.createReadStream(req.file.path)
                    .pipe(csv())
                    .on('data', (data) => assignments.push(data))
                    .on('end', resolve)
                    .on('error', reject);
            });

            const results = await assignmentService.assignAdvisorsToClasses(assignments, {
                dryRun: isDryRun,
                skipExisting: shouldSkipExisting
            });

            // Clean up uploaded file
            fs.unlinkSync(req.file.path);

            return res.status(200).json({
                message: isDryRun ? 'Advisor assignment validation completed' : 'Advisor assignments completed',
                mode: isDryRun ? 'dry-run' : 'commit',
                successful: results.successful.length,
                failed: results.failedEntries.length,
                skipped: results.skippedEntries.length,
                failedEntries: results.failedEntries,
                skippedEntries: results.skippedEntries,
                assignments: results.successful,
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
            console.error('Error in assignAdvisorsToClasses:', error);
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}

module.exports = new AssignmentController();