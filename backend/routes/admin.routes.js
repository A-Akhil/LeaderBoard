const express = require('express');
const router = express.Router();
const { body } = require("express-validator");
const adminController = require('../controllers/admin.controller');
const { authAdmin, requireSuperAdmin } = require('../middlewares/auth.middlewares');
const adminModel = require('../models/admin.model');
const classController = require('../controllers/class.controller');
const eventController = require('../controllers/event.controller');
const Feedback = require('../models/feedback.model');
const impactAnalysisController = require('../controllers/impactAnalysis.controller');
const FormFieldConfig = require('../models/formFieldConfig.model'); // Assuming this model exists

// Password validation regex pattern
const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Registration route with validation
router.post('/register', [
    body('email')
        .isEmail()
        .withMessage('Invalid Email')
        .normalizeEmail(),
    body('name')
        .trim()
        .isLength({ min: 3 })
        .withMessage('Name must be at least 3 characters long'),
    body('password')
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters long")
        .matches(passwordRegex)
        .withMessage('Password must contain at least one uppercase letter, one number, and one special character (@$!%*?&)')
],
adminController.registeradmin);

// Login route with validation
router.post('/login', [
    body('email')
        .isEmail()
        .withMessage('Invalid Email')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters long")
],
adminController.loginadmin);

// Profile route with authentication middleware
router.get('/profile', authAdmin, adminController.getAdminProfile);

// Update dashboard routes - make sure there are no references to missing controller functions
router.get('/dashboard', authAdmin, (req, res) => {
    res.json({ message: 'Dashboard data endpoint - implementation pending' });
});

// Logout route (commented out but available if needed)
// router.get('/logout', authMiddleware.authAdmin, adminController.logoutadmin);

// Debug routes removed for security

router.get('/feedback', authAdmin, async (req, res) => {
    try {
        const feedbacks = await Feedback.find().sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching feedbacks' });
    }
});

router.post('/points/impact-analysis', requireSuperAdmin, impactAnalysisController.analyzePointsChange);

router.put('/form-config/:category', authAdmin, async (req, res) => {
    try {
        const { category } = req.params;
        const updatedConfig = await FormFieldConfig.findOneAndUpdate(
            { category },
            req.body,
            { new: true, upsert: true }
        );

        res.status(200).json({
            success: true,
            message: 'Form configuration updated successfully',
            config: updatedConfig
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update form configuration',
            error: error.message
        });
    }
});

module.exports = router;