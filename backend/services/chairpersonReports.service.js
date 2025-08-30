const Student = require('../models/student.model');
const Teacher = require('../models/teacher.model');
const Event = require('../models/event.model');
const Class = require('../models/class.model');
const mongoose = require('mongoose');

class ChairpersonReportsService {
  /**
   * Get role-based department access for the teacher
   */
  static async getRoleBasedDepartmentAccess(teacher) {
    let departments = [];
    
    switch(teacher.role) {
      case 'Chairperson':
        // Chairperson can see all departments
        departments = await Student.distinct('department');
        break;
        
      case 'Associate Chairperson':
        // Associate Chairperson sees only their managed departments
        departments = teacher.managedDepartments || [];
        break;
        
      default:
        // Other roles don't have access to these reports
        departments = [];
    }
    
    return departments;
  }

  /**
   * ========================================
   * ASSOCIATE CHAIRPERSON REPORTS
   * ========================================
   */

  /**
   * 1. Department Performance Dashboard for Associate Chairperson
   */
  static async getDepartmentPerformanceDashboard(teacher) {
    try {
      if (teacher.role !== 'Associate Chairperson') {
        throw new Error('Access denied. Associate Chairperson role required.');
      }

      const managedDepartments = teacher.managedDepartments || [];
      if (managedDepartments.length === 0) {
        return { error: 'No managed departments found', departments: [] };
      }

      const performanceData = await Promise.all(
        managedDepartments.map(async (dept) => {
          // Get department statistics
          const students = await Student.find({ department: dept });
          const totalStudents = students.length;
          const totalDepartmentPoints = students.reduce((sum, s) => sum + (s.totalPoints || 0), 0);
          
          // Get recent events (last 30 days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const recentEvents = await Event.countDocuments({
            department: dept,
            status: 'Approved',
            date: { $gte: thirtyDaysAgo }
          });

          const recentPoints = await Event.aggregate([
            {
              $match: {
                department: dept,
                status: 'Approved',
                date: { $gte: thirtyDaysAgo }
              }
            },
            {
              $group: {
                _id: null,
                totalPoints: { $sum: '$pointsEarned' }
              }
            }
          ]);

          // Calculate participation rate
          const activeStudents = await Event.distinct('submittedBy', {
            department: dept,
            status: 'Approved',
            date: { $gte: thirtyDaysAgo }
          });

          const participationRate = totalStudents > 0 ? 
            Math.round((activeStudents.length / totalStudents) * 100) : 0;

          return {
            department: dept,
            totalStudents,
            totalPoints: totalDepartmentPoints,
            averagePoints: totalStudents > 0 ? Math.round(totalDepartmentPoints / totalStudents) : 0,
            recentEvents,
            recentPoints: recentPoints[0]?.totalPoints || 0,
            participationRate,
            activeStudents: activeStudents.length
          };
        })
      );

      return {
        managedDepartments,
        performanceData,
        summary: {
          totalDepartments: managedDepartments.length,
          totalStudents: performanceData.reduce((sum, d) => sum + d.totalStudents, 0),
          totalEvents: performanceData.reduce((sum, d) => sum + d.recentEvents, 0),
          averageParticipation: Math.round(
            performanceData.reduce((sum, d) => sum + d.participationRate, 0) / managedDepartments.length
          )
        }
      };
    } catch (error) {
      console.error('Error in getDepartmentPerformanceDashboard:', error);
      throw error;
    }
  }

  /**
   * 2. Event Analysis for Associate Chairperson
   */
  static async getEventAnalysis(teacher, filters = {}) {
    try {
      if (teacher.role !== 'Associate Chairperson') {
        throw new Error('Access denied. Associate Chairperson role required.');
      }

      const managedDepartments = teacher.managedDepartments || [];
      if (managedDepartments.length === 0) {
        return { error: 'No managed departments found', analysis: {} };
      }

      // Date range (default to last 6 months)
      const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
      const startDate = filters.startDate ? new Date(filters.startDate) : (() => {
        const date = new Date();
        date.setMonth(date.getMonth() - 6);
        return date;
      })();

      // Event trends by category across managed departments
      const categoryAnalysis = await Event.aggregate([
        {
          $match: {
            department: { $in: managedDepartments },
            status: 'Approved',
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              category: '$category',
              department: '$department'
            },
            eventCount: { $sum: 1 },
            totalPoints: { $sum: '$pointsEarned' },
            uniqueParticipants: { $addToSet: '$submittedBy' }
          }
        },
        {
          $project: {
            category: '$_id.category',
            department: '$_id.department',
            eventCount: 1,
            totalPoints: 1,
            participantCount: { $size: '$uniqueParticipants' },
            _id: 0
          }
        }
      ]);

      // Monthly trends
      const monthlyTrends = await Event.aggregate([
        {
          $match: {
            department: { $in: managedDepartments },
            status: 'Approved',
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              month: { $month: '$date' },
              year: { $year: '$date' },
              department: '$department'
            },
            eventCount: { $sum: 1 },
            totalPoints: { $sum: '$pointsEarned' }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]);

      return {
        dateRange: { startDate, endDate },
        managedDepartments,
        categoryAnalysis,
        monthlyTrends,
        summary: {
          totalEvents: categoryAnalysis.reduce((sum, c) => sum + c.eventCount, 0),
          totalPoints: categoryAnalysis.reduce((sum, c) => sum + c.totalPoints, 0),
          totalCategories: [...new Set(categoryAnalysis.map(c => c.category))].length
        }
      };
    } catch (error) {
      console.error('Error in getEventAnalysis:', error);
      throw error;
    }
  }

  /**
   * 3. Faculty Overview for Associate Chairperson
   */
  static async getFacultyOverview(teacher) {
    try {
      if (teacher.role !== 'Associate Chairperson') {
        throw new Error('Access denied. Associate Chairperson role required.');
      }

      const managedDepartments = teacher.managedDepartments || [];
      if (managedDepartments.length === 0) {
        return { error: 'No managed departments found', faculty: [] };
      }

      // Get faculty in managed departments
      const facultyMembers = await Teacher.find({
        department: { $in: managedDepartments },
        role: { $in: ['Faculty', 'Academic Advisor', 'HOD'] }
      }).select('name email role department classes');

      // Get faculty performance data
      const facultyData = await Promise.all(
        facultyMembers.map(async (faculty) => {
          // Get classes taught by this faculty
          const classes = await Class.find({
            $or: [
              { academicAdvisor: faculty._id },
              { _id: { $in: faculty.classes || [] } }
            ]
          });

          // Get students in these classes
          const classIds = classes.map(c => c._id);
          const students = await Student.find({
            $or: [
              { 'currentClass.ref': { $in: classIds } },
              { 'class': { $in: classIds } }
            ]
          });

          const studentIds = students.map(s => s._id);

          // Get recent events from these students (last 3 months)
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

          const recentEvents = await Event.countDocuments({
            submittedBy: { $in: studentIds },
            status: 'Approved',
            date: { $gte: threeMonthsAgo }
          });

          const recentPoints = await Event.aggregate([
            {
              $match: {
                submittedBy: { $in: studentIds },
                status: 'Approved',
                date: { $gte: threeMonthsAgo }
              }
            },
            {
              $group: {
                _id: null,
                totalPoints: { $sum: '$pointsEarned' }
              }
            }
          ]);

          return {
            facultyId: faculty._id,
            name: faculty.name,
            email: faculty.email,
            role: faculty.role,
            department: faculty.department,
            classCount: classes.length,
            studentCount: students.length,
            recentEvents,
            recentPoints: recentPoints[0]?.totalPoints || 0,
            averagePointsPerStudent: students.length > 0 ? 
              Math.round((recentPoints[0]?.totalPoints || 0) / students.length) : 0
          };
        })
      );

      return {
        managedDepartments,
        facultyData,
        summary: {
          totalFaculty: facultyData.length,
          totalClasses: facultyData.reduce((sum, f) => sum + f.classCount, 0),
          totalStudents: facultyData.reduce((sum, f) => sum + f.studentCount, 0),
          totalRecentEvents: facultyData.reduce((sum, f) => sum + f.recentEvents, 0)
        }
      };
    } catch (error) {
      console.error('Error in getFacultyOverview:', error);
      throw error;
    }
  }

  /**
   * ========================================
   * CHAIRPERSON REPORTS
   * ========================================
   */

  /**
   * 1. Institution Overview for Chairperson
   */
  static async getInstitutionOverview(teacher) {
    try {
      if (teacher.role !== 'Chairperson') {
        throw new Error('Access denied. Chairperson role required.');
      }

      // Get all departments
      const allDepartments = await Student.distinct('department');
      
      // Institution-wide statistics
      const totalStudents = await Student.countDocuments();
      const totalFaculty = await Teacher.countDocuments({
        role: { $in: ['Faculty', 'Academic Advisor', 'HOD', 'Associate Chairperson'] }
      });
      const totalClasses = await Class.countDocuments();

      // Recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentEvents = await Event.countDocuments({
        status: 'Approved',
        date: { $gte: thirtyDaysAgo }
      });

      const recentPoints = await Event.aggregate([
        {
          $match: {
            status: 'Approved',
            date: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: null,
            totalPoints: { $sum: '$pointsEarned' }
          }
        }
      ]);

      // Department-wise breakdown
      const departmentBreakdown = await Promise.all(
        allDepartments.map(async (dept) => {
          const deptStudents = await Student.countDocuments({ department: dept });
          const deptFaculty = await Teacher.countDocuments({ department: dept });
          const deptEvents = await Event.countDocuments({
            department: dept,
            status: 'Approved',
            date: { $gte: thirtyDaysAgo }
          });

          const deptPoints = await Event.aggregate([
            {
              $match: {
                department: dept,
                status: 'Approved',
                date: { $gte: thirtyDaysAgo }
              }
            },
            {
              $group: {
                _id: null,
                totalPoints: { $sum: '$pointsEarned' }
              }
            }
          ]);

          return {
            department: dept,
            students: deptStudents,
            faculty: deptFaculty,
            recentEvents: deptEvents,
            recentPoints: deptPoints[0]?.totalPoints || 0
          };
        })
      );

      return {
        institutionSummary: {
          totalDepartments: allDepartments.length,
          totalStudents,
          totalFaculty,
          totalClasses,
          recentEvents,
          recentPoints: recentPoints[0]?.totalPoints || 0
        },
        departmentBreakdown,
        topPerformingDepartments: departmentBreakdown
          .sort((a, b) => b.recentPoints - a.recentPoints)
          .slice(0, 3)
      };
    } catch (error) {
      console.error('Error in getInstitutionOverview:', error);
      throw error;
    }
  }

  /**
   * 2. Comparative Analysis for Chairperson
   */
  static async getComparativeAnalysis(teacher, filters = {}) {
    try {
      if (teacher.role !== 'Chairperson') {
        throw new Error('Access denied. Chairperson role required.');
      }

      const allDepartments = await Student.distinct('department');
      
      // Date range (default to last 6 months)
      const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
      const startDate = filters.startDate ? new Date(filters.startDate) : (() => {
        const date = new Date();
        date.setMonth(date.getMonth() - 6);
        return date;
      })();

      // Inter-department comparison
      const departmentComparison = await Promise.all(
        allDepartments.map(async (dept) => {
          const students = await Student.find({ department: dept });
          const totalStudents = students.length;
          const totalDepartmentPoints = students.reduce((sum, s) => sum + (s.totalPoints || 0), 0);

          const events = await Event.countDocuments({
            department: dept,
            status: 'Approved',
            date: { $gte: startDate, $lte: endDate }
          });

          const points = await Event.aggregate([
            {
              $match: {
                department: dept,
                status: 'Approved',
                date: { $gte: startDate, $lte: endDate }
              }
            },
            {
              $group: {
                _id: null,
                totalPoints: { $sum: '$pointsEarned' }
              }
            }
          ]);

          const activeStudents = await Event.distinct('submittedBy', {
            department: dept,
            status: 'Approved',
            date: { $gte: startDate, $lte: endDate }
          });

          return {
            department: dept,
            totalStudents,
            totalPoints: totalDepartmentPoints,
            periodEvents: events,
            periodPoints: points[0]?.totalPoints || 0,
            activeStudents: activeStudents.length,
            participationRate: totalStudents > 0 ? 
              Math.round((activeStudents.length / totalStudents) * 100) : 0,
            averagePointsPerStudent: totalStudents > 0 ? 
              Math.round(totalDepartmentPoints / totalStudents) : 0
          };
        })
      );

      // Category-wise performance across departments
      const categoryComparison = await Event.aggregate([
        {
          $match: {
            status: 'Approved',
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              category: '$category',
              department: '$department'
            },
            eventCount: { $sum: 1 },
            totalPoints: { $sum: '$pointsEarned' }
          }
        },
        {
          $group: {
            _id: '$_id.category',
            departments: {
              $push: {
                department: '$_id.department',
                eventCount: '$eventCount',
                totalPoints: '$totalPoints'
              }
            },
            totalEvents: { $sum: '$eventCount' },
            totalPoints: { $sum: '$totalPoints' }
          }
        }
      ]);

      return {
        dateRange: { startDate, endDate },
        departmentComparison: departmentComparison.sort((a, b) => b.averagePointsPerStudent - a.averagePointsPerStudent),
        categoryComparison,
        insights: {
          topDepartment: departmentComparison.reduce((prev, current) => 
            (prev.averagePointsPerStudent > current.averagePointsPerStudent) ? prev : current
          ),
          mostActiveDepartment: departmentComparison.reduce((prev, current) => 
            (prev.periodEvents > current.periodEvents) ? prev : current
          ),
          highestParticipation: departmentComparison.reduce((prev, current) => 
            (prev.participationRate > current.participationRate) ? prev : current
          )
        }
      };
    } catch (error) {
      console.error('Error in getComparativeAnalysis:', error);
      throw error;
    }
  }

  /**
   * 3. Administrative Insights for Chairperson
   */
  static async getAdministrativeInsights(teacher) {
    try {
      if (teacher.role !== 'Chairperson') {
        throw new Error('Access denied. Chairperson role required.');
      }

      // Faculty distribution and performance
      const facultyAnalysis = await Teacher.aggregate([
        {
          $match: {
            role: { $in: ['Faculty', 'Academic Advisor', 'HOD', 'Associate Chairperson'] }
          }
        },
        {
          $group: {
            _id: {
              department: '$department',
              role: '$role'
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.department',
            roles: {
              $push: {
                role: '$_id.role',
                count: '$count'
              }
            },
            totalFaculty: { $sum: '$count' }
          }
        }
      ]);

      // Student-to-faculty ratio by department
      const allDepartments = await Student.distinct('department');
      const ratioAnalysis = await Promise.all(
        allDepartments.map(async (dept) => {
          const studentCount = await Student.countDocuments({ department: dept });
          const facultyCount = await Teacher.countDocuments({ department: dept });
          
          return {
            department: dept,
            students: studentCount,
            faculty: facultyCount,
            ratio: facultyCount > 0 ? Math.round(studentCount / facultyCount) : 0
          };
        })
      );

      // Event approval trends
      const last90Days = new Date();
      last90Days.setDate(last90Days.getDate() - 90);

      const approvalTrends = await Event.aggregate([
        {
          $match: {
            date: { $gte: last90Days }
          }
        },
        {
          $group: {
            _id: {
              status: '$status',
              department: '$department'
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.department',
            statusBreakdown: {
              $push: {
                status: '$_id.status',
                count: '$count'
              }
            },
            totalSubmissions: { $sum: '$count' }
          }
        }
      ]);

      // Resource allocation insights
      const resourceMetrics = await Event.aggregate([
        {
          $match: {
            status: 'Approved',
            date: { $gte: last90Days }
          }
        },
        {
          $group: {
            _id: '$department',
            totalEvents: { $sum: 1 },
            totalPoints: { $sum: '$pointsEarned' },
            avgPointsPerEvent: { $avg: '$pointsEarned' }
          }
        },
        {
          $sort: { totalPoints: -1 }
        }
      ]);

      return {
        facultyDistribution: facultyAnalysis,
        studentFacultyRatios: ratioAnalysis,
        approvalTrends,
        resourceAllocation: resourceMetrics,
        recommendations: this.generateRecommendations(ratioAnalysis, approvalTrends, resourceMetrics)
      };
    } catch (error) {
      console.error('Error in getAdministrativeInsights:', error);
      throw error;
    }
  }

  /**
   * Helper method to generate administrative recommendations
   */
  static generateRecommendations(ratioAnalysis, approvalTrends, resourceMetrics) {
    const recommendations = [];

    // Check student-faculty ratios
    const highRatioDepts = ratioAnalysis.filter(dept => dept.ratio > 50);
    if (highRatioDepts.length > 0) {
      recommendations.push({
        type: 'staffing',
        priority: 'high',
        message: `Consider increasing faculty in: ${highRatioDepts.map(d => d.department).join(', ')} (high student-faculty ratios)`
      });
    }

    // Check approval rates
    approvalTrends.forEach(dept => {
      const approved = dept.statusBreakdown.find(s => s.status === 'Approved')?.count || 0;
      const rejected = dept.statusBreakdown.find(s => s.status === 'Rejected')?.count || 0;
      const total = approved + rejected;
      
      if (total > 10 && (rejected / total) > 0.3) {
        recommendations.push({
          type: 'quality',
          priority: 'medium',
          message: `${dept._id} has high rejection rate (${Math.round(rejected/total*100)}%) - consider additional training`
        });
      }
    });

    // Check resource utilization
    const lowPerformingDepts = resourceMetrics.filter(dept => dept.avgPointsPerEvent < 10);
    if (lowPerformingDepts.length > 0) {
      recommendations.push({
        type: 'engagement',
        priority: 'medium',
        message: `Low point average in: ${lowPerformingDepts.map(d => d._id).join(', ')} - review event quality`
      });
    }

    return recommendations;
  }
}

module.exports = ChairpersonReportsService;