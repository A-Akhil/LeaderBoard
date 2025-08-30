const express = require('express');
const router = express.Router();
const ChairpersonReportsController = require('../controllers/chairpersonReports.controller');
const authMiddleware = require('../middlewares/auth.middlewares');

// Apply authentication middleware to all routes
router.use(authMiddleware.authTeacher);

// Role-based authorization middleware
router.use((req, res, next) => {
  const adminRoles = ['Associate Chairperson', 'Chairperson'];
  if (adminRoles.includes(req.teacher.role)) {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Associate Chairperson or Chairperson role required.' 
    });
  }
});

/**
 * ========================================
 * ASSOCIATE CHAIRPERSON ROUTES
 * ========================================
 */

/**
 * @route GET /api/chairperson-reports/associate/department-performance
 * @desc Get Department Performance Dashboard for Associate Chairperson
 * @access Associate Chairperson, Chairperson
 */
router.get('/associate/department-performance', ChairpersonReportsController.getDepartmentPerformanceDashboard);

/**
 * @route GET /api/chairperson-reports/associate/event-analysis
 * @desc Get Event Analysis for Associate Chairperson
 * @access Associate Chairperson, Chairperson
 */
router.get('/associate/event-analysis', ChairpersonReportsController.getEventAnalysis);

/**
 * @route GET /api/chairperson-reports/associate/faculty-overview
 * @desc Get Faculty Overview for Associate Chairperson
 * @access Associate Chairperson, Chairperson
 */
router.get('/associate/faculty-overview', ChairpersonReportsController.getFacultyOverview);

/**
 * @route GET /api/chairperson-reports/associate/dashboard
 * @desc Get complete Associate Chairperson dashboard (combines all Associate reports)
 * @access Associate Chairperson, Chairperson
 */
router.get('/associate/dashboard', ChairpersonReportsController.getAssociateChairpersonDashboard);

/**
 * ========================================
 * CHAIRPERSON ROUTES
 * ========================================
 */

/**
 * @route GET /api/chairperson-reports/chairperson/institution-overview
 * @desc Get Institution Overview for Chairperson
 * @access Chairperson
 */
router.get('/chairperson/institution-overview', authMiddleware.authChairperson, ChairpersonReportsController.getInstitutionOverview);

/**
 * @route GET /api/chairperson-reports/chairperson/comparative-analysis
 * @desc Get Comparative Analysis for Chairperson
 * @access Chairperson
 */
router.get('/chairperson/comparative-analysis', authMiddleware.authChairperson, ChairpersonReportsController.getComparativeAnalysis);

/**
 * @route GET /api/chairperson-reports/chairperson/administrative-insights
 * @desc Get Administrative Insights for Chairperson
 * @access Chairperson
 */
router.get('/chairperson/administrative-insights', authMiddleware.authChairperson, ChairpersonReportsController.getAdministrativeInsights);

/**
 * @route GET /api/chairperson-reports/chairperson/dashboard
 * @desc Get complete Chairperson dashboard (combines all Chairperson reports)
 * @access Chairperson
 */
router.get('/chairperson/dashboard', authMiddleware.authChairperson, ChairpersonReportsController.getChairpersonDashboard);

module.exports = router;