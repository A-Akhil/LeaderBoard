const ChairpersonReportsService = require('../services/chairpersonReports.service');

class ChairpersonReportsController {
  /**
   * ========================================
   * ASSOCIATE CHAIRPERSON REPORTS
   * ========================================
   */

  /**
   * Get Department Performance Dashboard for Associate Chairperson
   */
  static async getDepartmentPerformanceDashboard(req, res, next) {
    try {
      console.log('Getting department performance dashboard for:', req.teacher.role, req.teacher.name);
      
      const dashboard = await ChairpersonReportsService.getDepartmentPerformanceDashboard(req.teacher);
      
      res.status(200).json({ 
        success: true, 
        data: dashboard 
      });
    } catch (error) {
      console.error('Error in getDepartmentPerformanceDashboard controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get department performance dashboard'
      });
    }
  }

  /**
   * Get Event Analysis for Associate Chairperson
   */
  static async getEventAnalysis(req, res, next) {
    try {
      console.log('Getting event analysis for:', req.teacher.role, req.teacher.name);
      
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const analysis = await ChairpersonReportsService.getEventAnalysis(req.teacher, filters);
      
      res.status(200).json({ 
        success: true, 
        data: analysis 
      });
    } catch (error) {
      console.error('Error in getEventAnalysis controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get event analysis'
      });
    }
  }

  /**
   * Get Faculty Overview for Associate Chairperson
   */
  static async getFacultyOverview(req, res, next) {
    try {
      console.log('Getting faculty overview for:', req.teacher.role, req.teacher.name);
      
      const overview = await ChairpersonReportsService.getFacultyOverview(req.teacher);
      
      res.status(200).json({ 
        success: true, 
        data: overview 
      });
    } catch (error) {
      console.error('Error in getFacultyOverview controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get faculty overview'
      });
    }
  }

  /**
   * ========================================
   * CHAIRPERSON REPORTS
   * ========================================
   */

  /**
   * Get Institution Overview for Chairperson
   */
  static async getInstitutionOverview(req, res, next) {
    try {
      console.log('Getting institution overview for:', req.teacher.role, req.teacher.name);
      
      const overview = await ChairpersonReportsService.getInstitutionOverview(req.teacher);
      
      res.status(200).json({ 
        success: true, 
        data: overview 
      });
    } catch (error) {
      console.error('Error in getInstitutionOverview controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get institution overview'
      });
    }
  }

  /**
   * Get Comparative Analysis for Chairperson
   */
  static async getComparativeAnalysis(req, res, next) {
    try {
      console.log('Getting comparative analysis for:', req.teacher.role, req.teacher.name);
      
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const analysis = await ChairpersonReportsService.getComparativeAnalysis(req.teacher, filters);
      
      res.status(200).json({ 
        success: true, 
        data: analysis 
      });
    } catch (error) {
      console.error('Error in getComparativeAnalysis controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get comparative analysis'
      });
    }
  }

  /**
   * Get Administrative Insights for Chairperson
   */
  static async getAdministrativeInsights(req, res, next) {
    try {
      console.log('Getting administrative insights for:', req.teacher.role, req.teacher.name);
      
      const insights = await ChairpersonReportsService.getAdministrativeInsights(req.teacher);
      
      res.status(200).json({ 
        success: true, 
        data: insights 
      });
    } catch (error) {
      console.error('Error in getAdministrativeInsights controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get administrative insights'
      });
    }
  }

  /**
   * ========================================
   * COMBINED DASHBOARD ENDPOINTS
   * ========================================
   */

  /**
   * Get complete Associate Chairperson dashboard
   */
  static async getAssociateChairpersonDashboard(req, res, next) {
    try {
      console.log('Getting complete Associate Chairperson dashboard for:', req.teacher.name);
      
      if (req.teacher.role !== 'Associate Chairperson') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Associate Chairperson role required.'
        });
      }

      const [performance, events, faculty] = await Promise.all([
        ChairpersonReportsService.getDepartmentPerformanceDashboard(req.teacher),
        ChairpersonReportsService.getEventAnalysis(req.teacher),
        ChairpersonReportsService.getFacultyOverview(req.teacher)
      ]);
      
      res.status(200).json({ 
        success: true, 
        data: {
          departmentPerformance: performance,
          eventAnalysis: events,
          facultyOverview: faculty
        }
      });
    } catch (error) {
      console.error('Error in getAssociateChairpersonDashboard controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get Associate Chairperson dashboard'
      });
    }
  }

  /**
   * Get complete Chairperson dashboard
   */
  static async getChairpersonDashboard(req, res, next) {
    try {
      console.log('Getting complete Chairperson dashboard for:', req.teacher.name);
      
      if (req.teacher.role !== 'Chairperson') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Chairperson role required.'
        });
      }

      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const [institution, comparative, administrative] = await Promise.all([
        ChairpersonReportsService.getInstitutionOverview(req.teacher),
        ChairpersonReportsService.getComparativeAnalysis(req.teacher, filters),
        ChairpersonReportsService.getAdministrativeInsights(req.teacher)
      ]);
      
      res.status(200).json({ 
        success: true, 
        data: {
          institutionOverview: institution,
          comparativeAnalysis: comparative,
          administrativeInsights: administrative
        }
      });
    } catch (error) {
      console.error('Error in getChairpersonDashboard controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get Chairperson dashboard'
      });
    }
  }
}

module.exports = ChairpersonReportsController;