const DepartmentAnalyticsService = require('../services/departmentAnalytics.service');

class DepartmentAnalyticsController {
  /**
   * Get department overview dashboard
   */
  static async getDepartmentOverview(req, res, next) {
    try {
      console.log('Getting department overview for:', req.teacher.role, req.teacher.name);
      
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const overview = await DepartmentAnalyticsService.getDepartmentOverview(
        req.teacher,
        filters
      );

      res.status(200).json({ 
        success: true, 
        data: overview 
      });
    } catch (error) {
      console.error('Error in getDepartmentOverview controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get department overview'
      });
    }
  }

  /**
   * Get department performance comparison
   */
  static async getDepartmentPerformanceComparison(req, res, next) {
    try {
      console.log('Getting department performance comparison for:', req.teacher.role);
      
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const comparison = await DepartmentAnalyticsService.getDepartmentPerformanceComparison(
        req.teacher,
        filters
      );

      res.status(200).json({ 
        success: true, 
        data: comparison 
      });
    } catch (error) {
      console.error('Error in getDepartmentPerformanceComparison controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get department performance comparison'
      });
    }
  }

  /**
   * Get department activity heatmap
   */
  static async getDepartmentActivityHeatmap(req, res, next) {
    try {
      console.log('Getting department activity heatmap for:', req.teacher.role);
      
      const months = parseInt(req.query.months) || 12;

      const heatmap = await DepartmentAnalyticsService.getDepartmentActivityHeatmap(
        req.teacher,
        months
      );

      res.status(200).json({ 
        success: true, 
        data: heatmap 
      });
    } catch (error) {
      console.error('Error in getDepartmentActivityHeatmap controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get department activity heatmap'
      });
    }
  }

  /**
   * Get department rankings
   */
  static async getDepartmentRankings(req, res, next) {
    try {
      console.log('Getting department rankings for:', req.teacher.role);
      
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const rankings = await DepartmentAnalyticsService.getDepartmentRankings(
        req.teacher,
        filters
      );

      res.status(200).json({ 
        success: true, 
        data: rankings 
      });
    } catch (error) {
      console.error('Error in getDepartmentRankings controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get department rankings'
      });
    }
  }

  /**
   * Get cross-department category analysis
   */
  static async getCrossDepartmentCategoryAnalysis(req, res, next) {
    try {
      console.log('Getting cross-department category analysis for:', req.teacher.role);
      
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const analysis = await DepartmentAnalyticsService.getCrossDepartmentCategoryAnalysis(
        req.teacher,
        filters
      );

      res.status(200).json({ 
        success: true, 
        data: analysis 
      });
    } catch (error) {
      console.error('Error in getCrossDepartmentCategoryAnalysis controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get cross-department category analysis'
      });
    }
  }

  /**
   * Get department prize money metrics
   */
  static async getDepartmentPrizeMoneyMetrics(req, res, next) {
    try {
      console.log('Getting department prize money metrics for:', req.teacher.role);
      
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const metrics = await DepartmentAnalyticsService.getDepartmentPrizeMoneyMetrics(
        req.teacher,
        filters
      );

      res.status(200).json({ 
        success: true, 
        data: metrics 
      });
    } catch (error) {
      console.error('Error in getDepartmentPrizeMoneyMetrics controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get department prize money metrics'
      });
    }
  }

  /**
   * Get faculty performance by department
   */
  static async getFacultyPerformanceByDepartment(req, res, next) {
    try {
      console.log('Getting faculty performance by department for:', req.teacher.role);
      
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const performance = await DepartmentAnalyticsService.getFacultyPerformanceByDepartment(
        req.teacher,
        filters
      );

      res.status(200).json({ 
        success: true, 
        data: performance 
      });
    } catch (error) {
      console.error('Error in getFacultyPerformanceByDepartment controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get faculty performance by department'
      });
    }
  }

  /**
   * Get untapped opportunities by department
   */
  static async getUntappedOpportunitiesByDepartment(req, res, next) {
    try {
      console.log('Getting untapped opportunities by department for:', req.teacher.role);
      
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const opportunities = await DepartmentAnalyticsService.getUntappedOpportunitiesByDepartment(
        req.teacher,
        filters
      );

      res.status(200).json({ 
        success: true, 
        data: opportunities 
      });
    } catch (error) {
      console.error('Error in getUntappedOpportunitiesByDepartment controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get untapped opportunities by department'
      });
    }
  }

  /**
   * Get department engagement patterns
   */
  static async getDepartmentEngagementPatterns(req, res, next) {
    try {
      console.log('Getting department engagement patterns for:', req.teacher.role);
      
      const timeframe = req.query.timeframe || 'monthly'; // weekly or monthly
      const periods = parseInt(req.query.periods) || 12;

      const patterns = await DepartmentAnalyticsService.getDepartmentEngagementPatterns(
        req.teacher,
        timeframe,
        periods
      );

      res.status(200).json({ 
        success: true, 
        data: patterns 
      });
    } catch (error) {
      console.error('Error in getDepartmentEngagementPatterns controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get department engagement patterns'
      });
    }
  }

  /**
   * Get inter-department collaboration metrics
   */
  static async getInterDepartmentCollaboration(req, res, next) {
    try {
      console.log('Getting inter-department collaboration for:', req.teacher.role);
      
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const collaboration = await DepartmentAnalyticsService.getInterDepartmentCollaboration(
        req.teacher,
        filters
      );

      res.status(200).json({ 
        success: true, 
        data: collaboration 
      });
    } catch (error) {
      console.error('Error in getInterDepartmentCollaboration controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get inter-department collaboration'
      });
    }
  }

  /**
   * Get comprehensive department dashboard data
   * This endpoint combines multiple analytics for a single dashboard view
   */
  static async getComprehensiveDashboard(req, res, next) {
    try {
      console.log('Backend: getComprehensiveDashboard called');
      console.log('Backend: Teacher role:', req.teacher.role);
      console.log('Backend: Teacher name:', req.teacher.name);
      console.log('Backend: Query params:', req.query);
      console.log('Backend: Request URL:', req.originalUrl);
      console.log('Backend: Request path:', req.path);
      
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      console.log('Backend: Filters applied:', filters);

      // Execute analytics one by one to identify which one is hanging
      console.log('Backend: Starting sequential execution to debug hanging...');
      
      let overview, performanceComparison, rankings, categoryAnalysis, opportunities;

      try {
        console.log('Backend: Starting getDepartmentOverview...');
        overview = await DepartmentAnalyticsService.getDepartmentOverview(req.teacher, filters);
        console.log('Backend: getDepartmentOverview completed successfully');
      } catch (err) {
        console.error('Backend: getDepartmentOverview error:', err);
        overview = { error: 'Failed to get overview', departments: [] };
      }

      try {
        console.log('Backend: Starting getDepartmentPerformanceComparison...');
        performanceComparison = await DepartmentAnalyticsService.getDepartmentPerformanceComparison(req.teacher, filters);
        console.log('Backend: getDepartmentPerformanceComparison completed successfully');
      } catch (err) {
        console.error('Backend: getDepartmentPerformanceComparison error:', err);
        performanceComparison = [];
      }

      try {
        console.log('Backend: Starting getDepartmentRankings...');
        rankings = await DepartmentAnalyticsService.getDepartmentRankings(req.teacher, filters);
        console.log('Backend: getDepartmentRankings completed successfully');
      } catch (err) {
        console.error('Backend: getDepartmentRankings error:', err);
        rankings = [];
      }

      try {
        console.log('Backend: Starting getCrossDepartmentCategoryAnalysis...');
        categoryAnalysis = await DepartmentAnalyticsService.getCrossDepartmentCategoryAnalysis(req.teacher, filters);
        console.log('Backend: getCrossDepartmentCategoryAnalysis completed successfully');
      } catch (err) {
        console.error('Backend: getCrossDepartmentCategoryAnalysis error:', err);
        categoryAnalysis = [];
      }

      try {
        console.log('Backend: Starting getUntappedOpportunitiesByDepartment...');
        opportunities = await DepartmentAnalyticsService.getUntappedOpportunitiesByDepartment(req.teacher, filters);
        console.log('Backend: getUntappedOpportunitiesByDepartment completed successfully');
      } catch (err) {
        console.error('Backend: getUntappedOpportunitiesByDepartment error:', err);
        opportunities = [];
      }
      
      console.log('Backend: All operations completed successfully');

      const dashboardData = {
        overview,
        performanceComparison,
        rankings,
        categoryAnalysis,
        opportunities,
        lastUpdated: new Date()
      };

      res.status(200).json({ 
        success: true, 
        data: dashboardData 
      });
    } catch (error) {
      console.error('Error in getComprehensiveDashboard controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get comprehensive dashboard'
      });
    }
  }

  /**
   * Get department summary statistics
   * Quick overview for cards/widgets
   */
  static async getDepartmentSummary(req, res, next) {
    try {
      console.log('Getting department summary for:', req.teacher.role);
      
      const allowedDepartments = await DepartmentAnalyticsService.getRoleBasedDepartmentAccess(req.teacher);
      
      if (allowedDepartments.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            totalDepartments: 0,
            totalStudents: 0,
            totalEvents: 0,
            avgPerformance: 0
          }
        });
      }

      // Quick aggregation for summary
      const summary = await Promise.all([
        // Total students across allowed departments
        require('../models/student.model').countDocuments({ 
          department: { $in: allowedDepartments } 
        }),
        // Total approved events
        require('../models/event.model').countDocuments({ 
          department: { $in: allowedDepartments },
          status: 'Approved'
        }),
        // Average points calculation
        require('../models/student.model').aggregate([
          { $match: { department: { $in: allowedDepartments } } },
          { $group: { _id: null, avgPoints: { $avg: "$totalPoints" } } }
        ])
      ]);

      const summaryData = {
        totalDepartments: allowedDepartments.length,
        totalStudents: summary[0],
        totalEvents: summary[1],
        avgPerformance: summary[2][0] ? Math.round(summary[2][0].avgPoints * 10) / 10 : 0,
        departments: allowedDepartments
      };

      res.status(200).json({ 
        success: true, 
        data: summaryData 
      });
    } catch (error) {
      console.error('Error in getDepartmentSummary controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get department summary'
      });
    }
  }
}

module.exports = DepartmentAnalyticsController;
