const express = require('express');
const RoleBasedEventReportsController = require('../controllers/roleBasedEventReports.controller');
const authMiddleware = require('../middlewares/auth.middlewares');

const router = express.Router();

// Basic teacher authentication for all routes
router.use(authMiddleware.authTeacher);

// Routes for everyone (faculty, advisor, HOD)
router.get('/available-classes', RoleBasedEventReportsController.getAvailableClasses);
router.get('/top-students', RoleBasedEventReportsController.getTopStudents);
router.get('/top-performers/:category', RoleBasedEventReportsController.getTopPerformersByCategory);
router.get('/class-performance', RoleBasedEventReportsController.getClassPerformance);
router.get('/popular-categories', RoleBasedEventReportsController.getPopularCategories);
router.get('/approval-rates', RoleBasedEventReportsController.getApprovalRates);
router.get('/trends', RoleBasedEventReportsController.getTrends);
router.get('/advisor-year', authMiddleware.authTeacher, RoleBasedEventReportsController.getAdvisorYear);
// Administrative roles (HOD, Associate Chairperson, Chairperson) routes
router.get('/prize-money-by-class', 
  (req, res, next) => {
    const adminRoles = ['HOD', 'Associate Chairperson', 'Chairperson', 'admin'];
    if (adminRoles.includes(req.teacher.role)) {
      next();
    } else {
      return res.status(403).json({ 
        success: false, 
        message: 'Only HOD, Associate Chairperson, Chairperson or admin can access this report' 
      });
    }
  }, 
  RoleBasedEventReportsController.getTotalPrizeMoneyByClass
);

// Faculty + HOD routes
router.get('/detailed-student-performance', RoleBasedEventReportsController.getDetailedStudentPerformance);
router.get('/inactive-students', RoleBasedEventReportsController.getInactiveStudents);
router.get('/class-participation', RoleBasedEventReportsController.getClassParticipation);
router.get('/category-performance-by-class', RoleBasedEventReportsController.getCategoryPerformanceByClass);

// Download reports - available to all authenticated teachers
router.get('/download/:reportType', RoleBasedEventReportsController.downloadReport);

module.exports = router;