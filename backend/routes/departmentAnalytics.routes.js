const express = require('express');
const router = express.Router();
const DepartmentAnalyticsController = require('../controllers/departmentAnalytics.controller');
const authMiddleware = require('../middlewares/auth.middlewares');

// Apply authentication middleware to all routes
router.use(authMiddleware.authTeacher);

// Add role-based authorization middleware for department analytics
router.use((req, res, next) => {
  const adminRoles = ['HOD', 'Associate Chairperson', 'Chairperson'];
  if (adminRoles.includes(req.teacher.role)) {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Only HOD, Associate Chairperson, and Chairperson can access department analytics.' 
    });
  }
});

// Department Analytics Routes

/**
 * @route GET /api/department-analytics/overview
 * @desc Get department overview dashboard
 * @access HOD, Associate Chairperson, Chairperson
 */
router.get('/overview', DepartmentAnalyticsController.getDepartmentOverview);

/**
 * @route GET /api/department-analytics/performance-comparison
 * @desc Get department performance comparison (bar chart data)
 * @access HOD, Associate Chairperson, Chairperson
 */
router.get('/performance-comparison', DepartmentAnalyticsController.getDepartmentPerformanceComparison);

/**
 * @route GET /api/department-analytics/activity-heatmap
 * @desc Get department activity heatmap (monthly activity levels)
 * @access HOD, Associate Chairperson, Chairperson
 */
router.get('/activity-heatmap', DepartmentAnalyticsController.getDepartmentActivityHeatmap);

/**
 * @route GET /api/department-analytics/rankings
 * @desc Get department rankings with growth metrics
 * @access HOD, Associate Chairperson, Chairperson
 */
router.get('/rankings', DepartmentAnalyticsController.getDepartmentRankings);

/**
 * @route GET /api/department-analytics/category-analysis
 * @desc Get cross-department category analysis
 * @access HOD, Associate Chairperson, Chairperson
 */
router.get('/category-analysis', DepartmentAnalyticsController.getCrossDepartmentCategoryAnalysis);

/**
 * @route GET /api/department-analytics/prize-money-metrics
 * @desc Get department prize money metrics with ROI analysis
 * @access HOD, Associate Chairperson, Chairperson
 */
router.get('/prize-money-metrics', DepartmentAnalyticsController.getDepartmentPrizeMoneyMetrics);

/**
 * @route GET /api/department-analytics/faculty-performance
 * @desc Get faculty performance by department
 * @access HOD, Associate Chairperson, Chairperson
 */
router.get('/faculty-performance', DepartmentAnalyticsController.getFacultyPerformanceByDepartment);

/**
 * @route GET /api/department-analytics/untapped-opportunities
 * @desc Get untapped opportunities by department
 * @access HOD, Associate Chairperson, Chairperson
 */
router.get('/untapped-opportunities', DepartmentAnalyticsController.getUntappedOpportunitiesByDepartment);

/**
 * @route GET /api/department-analytics/engagement-patterns
 * @desc Get department engagement patterns (weekly/monthly trends)
 * @access HOD, Associate Chairperson, Chairperson
 */
router.get('/engagement-patterns', DepartmentAnalyticsController.getDepartmentEngagementPatterns);

/**
 * @route GET /api/department-analytics/collaboration-metrics
 * @desc Get inter-department collaboration metrics
 * @access HOD, Associate Chairperson, Chairperson
 */
router.get('/collaboration-metrics', DepartmentAnalyticsController.getInterDepartmentCollaboration);

/**
 * @route GET /api/department-analytics/dashboard
 * @desc Get comprehensive department dashboard (combines multiple analytics)
 * @access HOD, Associate Chairperson, Chairperson
 */
router.get('/dashboard', (req, res, next) => {
  console.log('Backend Route: /dashboard endpoint hit');
  console.log('Backend Route: Request method:', req.method);
  console.log('Backend Route: Request URL:', req.originalUrl);
  console.log('Backend Route: Request path:', req.path);
  console.log('Backend Route: User role:', req.teacher?.role || 'No teacher in request');
  DepartmentAnalyticsController.getComprehensiveDashboard(req, res, next);
});

/**
 * @route GET /api/department-analytics/summary
 * @desc Get department summary statistics (quick widgets)
 * @access HOD, Associate Chairperson, Chairperson
 */
router.get('/summary', DepartmentAnalyticsController.getDepartmentSummary);

module.exports = router;
