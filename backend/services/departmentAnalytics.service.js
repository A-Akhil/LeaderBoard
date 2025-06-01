const Student = require('../models/student.model');
const Teacher = require('../models/teacher.model');
const Event = require('../models/event.model');
const Class = require('../models/class.model');
const mongoose = require('mongoose');

class DepartmentAnalyticsService {
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
        
      case 'HOD':
        // HOD sees only their department
        departments = teacher.department ? [teacher.department] : [];
        break;
        
      default:
        // Other roles have limited access, return empty array for department-level view
        departments = [];
    }
    
    return departments;
  }

  /**
   * 1. Department Overview Dashboard
   */
  static async getDepartmentOverview(teacher, filters = {}) {
    try {
      console.log('Service: getDepartmentOverview started for teacher:', teacher.name);
      const allowedDepartments = await this.getRoleBasedDepartmentAccess(teacher);
      console.log('Service: getDepartmentOverview allowedDepartments:', allowedDepartments);
      
      if (allowedDepartments.length === 0) {
        return { 
          error: 'No department access available for this role',
          departments: []
        };
      }

      // Build date filters if provided
      const dateFilter = {};
      if (filters.startDate || filters.endDate) {
        if (filters.startDate) dateFilter.$gte = new Date(filters.startDate);
        if (filters.endDate) dateFilter.$lte = new Date(filters.endDate);
      }

      const departmentOverviews = await Promise.all(
        allowedDepartments.map(async (dept) => {
          // Get student count and total points for department
          const students = await Student.find({ department: dept })
            .select('totalPoints eventsParticipated')
            .lean();

          const studentCount = students.length;
          const totalPoints = students.reduce((sum, s) => sum + (s.totalPoints || 0), 0);
          const averagePoints = studentCount > 0 ? Math.round((totalPoints / studentCount) * 10) / 10 : 0;

          // Get participation metrics
          const studentsWithActivities = students.filter(s => 
            s.eventsParticipated && s.eventsParticipated.length > 0
          ).length;
          const participationRate = studentCount > 0 ? 
            Math.round((studentsWithActivities / studentCount) * 100) : 0;

          // Get event count for department
          const eventQuery = { 
            department: dept,
            status: 'Approved'
          };
          if (Object.keys(dateFilter).length > 0) {
            eventQuery.date = dateFilter;
          }

          const eventCount = await Event.countDocuments(eventQuery);

          // Get achievement rate (students with points > 0)
          const studentsWithPoints = students.filter(s => (s.totalPoints || 0) > 0).length;
          const achievementRate = studentCount > 0 ? 
            Math.round((studentsWithPoints / studentCount) * 100) : 0;

          return {
            department: dept,
            studentCount,
            totalPoints,
            averagePoints,
            eventCount,
            participationRate,
            achievementRate,
            studentsWithActivities,
            studentsWithPoints
          };
        })
      );

      // Sort by average points descending
      departmentOverviews.sort((a, b) => b.averagePoints - a.averagePoints);

      return {
        departments: departmentOverviews,
        totalDepartments: departmentOverviews.length,
        overallMetrics: {
          totalStudents: departmentOverviews.reduce((sum, d) => sum + d.studentCount, 0),
          totalPoints: departmentOverviews.reduce((sum, d) => sum + d.totalPoints, 0),
          totalEvents: departmentOverviews.reduce((sum, d) => sum + d.eventCount, 0),
          averageParticipationRate: departmentOverviews.length > 0 ? 
            Math.round(departmentOverviews.reduce((sum, d) => sum + d.participationRate, 0) / departmentOverviews.length) : 0
        }
      };

    } catch (error) {
      console.error('Error in getDepartmentOverview:', error);
      throw error;
    }
  }

  /**
   * Department Performance Comparison - Bar Chart Data
   */
  static async getDepartmentPerformanceComparison(teacher, filters = {}) {
    try {
      console.log('Service: getDepartmentPerformanceComparison started for teacher:', teacher.name);
      const allowedDepartments = await this.getRoleBasedDepartmentAccess(teacher);
      console.log('Service: getDepartmentPerformanceComparison allowedDepartments:', allowedDepartments);
      
      if (allowedDepartments.length === 0) {
        return [];
      }

      const departmentPerformance = await Promise.all(
        allowedDepartments.map(async (dept) => {
          const students = await Student.find({ department: dept })
            .select('totalPoints eventsParticipated')
            .lean();

          const studentCount = students.length;
          const totalPoints = students.reduce((sum, s) => sum + (s.totalPoints || 0), 0);
          const averagePoints = studentCount > 0 ? Math.round((totalPoints / studentCount) * 10) / 10 : 0;
          
          const studentsWithActivities = students.filter(s => 
            s.eventsParticipated && s.eventsParticipated.length > 0
          ).length;
          const participationRate = studentCount > 0 ? 
            Math.round((studentsWithActivities / studentCount) * 100) : 0;

          return {
            department: dept,
            averagePoints,
            participationRate,
            studentCount,
            totalPoints
          };
        })
      );

      return departmentPerformance.sort((a, b) => b.averagePoints - a.averagePoints);

    } catch (error) {
      console.error('Error in getDepartmentPerformanceComparison:', error);
      throw error;
    }
  }

  /**
   * Department Activity Heatmap - Monthly Activity Levels
   */
  static async getDepartmentActivityHeatmap(teacher, months = 12) {
    try {
      console.log('Service: getDepartmentActivityHeatmap started for teacher:', teacher.name);
      const allowedDepartments = await this.getRoleBasedDepartmentAccess(teacher);
      console.log('Service: getDepartmentActivityHeatmap allowedDepartments:', allowedDepartments);
      
      if (allowedDepartments.length === 0) {
        return { heatmapData: [], monthLabels: [] };
      }

      // Generate last N months
      const monthLabels = [];
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      for (let i = 0; i < months; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - (months - 1 - i));
        monthLabels.push(date.toLocaleString('default', { month: 'short', year: 'numeric' }));
      }

      const heatmapData = await Promise.all(
        allowedDepartments.map(async (dept) => {
          const monthlyData = await Event.aggregate([
            {
              $match: {
                department: dept,
                status: 'Approved',
                date: { $gte: startDate }
              }
            },
            {
              $group: {
                _id: {
                  month: { $month: "$date" },
                  year: { $year: "$date" }
                },
                count: { $sum: 1 },
                points: { $sum: "$pointsEarned" }
              }
            },
            {
              $sort: { "_id.year": 1, "_id.month": 1 }
            }
          ]);

          // Create array for all months, filling in gaps with 0
          const dataPoints = monthLabels.map((label, index) => {
            const targetDate = new Date();
            targetDate.setMonth(targetDate.getMonth() - (months - 1 - index));
            
            const found = monthlyData.find(item => 
              item._id.month === targetDate.getMonth() + 1 && 
              item._id.year === targetDate.getFullYear()
            );

            return found ? found.count : 0;
          });

          return {
            department: dept,
            data: dataPoints
          };
        })
      );

      return {
        heatmapData,
        monthLabels
      };

    } catch (error) {
      console.error('Error in getDepartmentActivityHeatmap:', error);
      throw error;
    }
  }

  /**
   * Department Rankings with Growth Metrics
   */
  static async getDepartmentRankings(teacher, filters = {}) {
    try {
      console.log('Service: getDepartmentRankings started for teacher:', teacher.name);
      const allowedDepartments = await this.getRoleBasedDepartmentAccess(teacher);
      console.log('Service: getDepartmentRankings allowedDepartments:', allowedDepartments);
      
      if (allowedDepartments.length === 0) {
        return [];
      }

      // Calculate current month and previous month
      const currentMonth = new Date();
      const previousMonth = new Date();
      previousMonth.setMonth(previousMonth.getMonth() - 1);

      const departmentRankings = await Promise.all(
        allowedDepartments.map(async (dept) => {
          // Current month metrics
          const currentMonthEvents = await Event.countDocuments({
            department: dept,
            status: 'Approved',
            date: {
              $gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
              $lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
            }
          });

          const currentMonthPoints = await Event.aggregate([
            {
              $match: {
                department: dept,
                status: 'Approved',
                date: {
                  $gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
                  $lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                }
              }
            },
            {
              $group: {
                _id: null,
                totalPoints: { $sum: "$pointsEarned" }
              }
            }
          ]);

          // Previous month metrics
          const previousMonthEvents = await Event.countDocuments({
            department: dept,
            status: 'Approved',
            date: {
              $gte: new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1),
              $lt: new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 1)
            }
          });

          const previousMonthPoints = await Event.aggregate([
            {
              $match: {
                department: dept,
                status: 'Approved',
                date: {
                  $gte: new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1),
                  $lt: new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 1)
                }
              }
            },
            {
              $group: {
                _id: null,
                totalPoints: { $sum: "$pointsEarned" }
              }
            }
          ]);

          const currentPoints = currentMonthPoints[0]?.totalPoints || 0;
          const previousPoints = previousMonthPoints[0]?.totalPoints || 0;

          // Calculate growth percentages
          const eventGrowth = previousMonthEvents > 0 ? 
            Math.round(((currentMonthEvents - previousMonthEvents) / previousMonthEvents) * 100) : 
            (currentMonthEvents > 0 ? 100 : 0);

          const pointsGrowth = previousPoints > 0 ? 
            Math.round(((currentPoints - previousPoints) / previousPoints) * 100) : 
            (currentPoints > 0 ? 100 : 0);

          // Get overall department totals
          const students = await Student.find({ department: dept }).select('totalPoints').lean();
          const totalStudents = students.length;
          const totalDepartmentPoints = students.reduce((sum, s) => sum + (s.totalPoints || 0), 0);
          const averagePoints = totalStudents > 0 ? Math.round((totalDepartmentPoints / totalStudents) * 10) / 10 : 0;

          // Get submission rate (events submitted this month / total students)
          const submissionRate = totalStudents > 0 ? 
            Math.round((currentMonthEvents / totalStudents) * 100) : 0;

          return {
            department: dept,
            averagePoints,
            totalPoints: totalDepartmentPoints,
            studentCount: totalStudents,
            currentMonthEvents,
            previousMonthEvents,
            eventGrowth,
            pointsGrowth,
            submissionRate
          };
        })
      );

      // Sort by average points for overall ranking
      const sortedRankings = departmentRankings.sort((a, b) => b.averagePoints - a.averagePoints);

      // Add rank information
      return sortedRankings.map((dept, index) => ({
        ...dept,
        rank: index + 1,
        outOf: sortedRankings.length
      }));

    } catch (error) {
      console.error('Error in getDepartmentRankings:', error);
      throw error;
    }
  }

  /**
   * 2. Department Analytics - Cross-Department Category Analysis
   */
  static async getCrossDepartmentCategoryAnalysis(teacher, filters = {}) {
    try {
      console.log('Service: getCrossDepartmentCategoryAnalysis started for teacher:', teacher.name);
      const allowedDepartments = await this.getRoleBasedDepartmentAccess(teacher);
      console.log('Service: getCrossDepartmentCategoryAnalysis allowedDepartments:', allowedDepartments);
      
      if (allowedDepartments.length === 0) {
        return { categoryAnalysis: [], popularCategories: [] };
      }

      // Build date filter
      const dateFilter = {};
      if (filters.startDate || filters.endDate) {
        if (filters.startDate) dateFilter.$gte = new Date(filters.startDate);
        if (filters.endDate) dateFilter.$lte = new Date(filters.endDate);
      }

      const categoryAnalysis = await Promise.all(
        allowedDepartments.map(async (dept) => {
          const matchCondition = {
            department: dept,
            status: 'Approved'
          };

          if (Object.keys(dateFilter).length > 0) {
            matchCondition.date = dateFilter;
          }

          const categoryBreakdown = await Event.aggregate([
            { $match: matchCondition },
            {
              $group: {
                _id: "$category",
                count: { $sum: 1 },
                points: { $sum: "$pointsEarned" },
                uniqueStudents: { $addToSet: "$submittedBy" }
              }
            },
            {
              $project: {
                category: "$_id",
                count: 1,
                points: 1,
                uniqueStudents: { $size: "$uniqueStudents" },
                _id: 0
              }
            },
            { $sort: { count: -1 } }
          ]);

          return {
            department: dept,
            categories: categoryBreakdown
          };
        })
      );

      // Find most popular categories across all departments
      const allCategories = {};
      categoryAnalysis.forEach(dept => {
        dept.categories.forEach(cat => {
          if (!allCategories[cat.category]) {
            allCategories[cat.category] = {
              category: cat.category,
              totalCount: 0,
              totalPoints: 0,
              totalUniqueStudents: 0,
              departments: []
            };
          }
          allCategories[cat.category].totalCount += cat.count;
          allCategories[cat.category].totalPoints += cat.points;
          allCategories[cat.category].totalUniqueStudents += cat.uniqueStudents;
          allCategories[cat.category].departments.push({
            department: dept.department,
            count: cat.count,
            points: cat.points
          });
        });
      });

      const popularCategories = Object.values(allCategories)
        .sort((a, b) => b.totalCount - a.totalCount)
        .slice(0, 10);

      return {
        categoryAnalysis,
        popularCategories
      };

    } catch (error) {
      console.error('Error in getCrossDepartmentCategoryAnalysis:', error);
      throw error;
    }
  }

  /**
   * Department Prize Money Metrics
   */
  static async getDepartmentPrizeMoneyMetrics(teacher, filters = {}) {
    try {
      const allowedDepartments = await this.getRoleBasedDepartmentAccess(teacher);
      
      if (allowedDepartments.length === 0) {
        return [];
      }

      // Build date filter
      const dateFilter = {};
      if (filters.startDate || filters.endDate) {
        if (filters.startDate) dateFilter.$gte = new Date(filters.startDate);
        if (filters.endDate) dateFilter.$lte = new Date(filters.endDate);
      }

      const prizeMoneyMetrics = await Promise.all(
        allowedDepartments.map(async (dept) => {
          const matchCondition = {
            department: dept,
            status: 'Approved',
            prizeMoney: { $gt: 0 } // Only events with prize money
          };

          if (Object.keys(dateFilter).length > 0) {
            matchCondition.date = dateFilter;
          }

          const prizeData = await Event.aggregate([
            { $match: matchCondition },
            {
              $group: {
                _id: null,
                totalPrizeMoney: { $sum: "$prizeMoney" },
                totalPoints: { $sum: "$pointsEarned" },
                prizeEventCount: { $sum: 1 },
                avgPrizeMoney: { $avg: "$prizeMoney" }
              }
            }
          ]);

          const data = prizeData[0] || {
            totalPrizeMoney: 0,
            totalPoints: 0,
            prizeEventCount: 0,
            avgPrizeMoney: 0
          };

          // Calculate ROI (points earned vs prize money won)
          const roi = data.totalPrizeMoney > 0 ? 
            Math.round((data.totalPoints / data.totalPrizeMoney) * 100) / 100 : 0;

          return {
            department: dept,
            totalPrizeMoney: data.totalPrizeMoney,
            totalPoints: data.totalPoints,
            prizeEventCount: data.prizeEventCount,
            avgPrizeMoney: Math.round(data.avgPrizeMoney * 100) / 100,
            roi
          };
        })
      );

      return prizeMoneyMetrics.sort((a, b) => b.totalPrizeMoney - a.totalPrizeMoney);

    } catch (error) {
      console.error('Error in getDepartmentPrizeMoneyMetrics:', error);
      throw error;
    }
  }

  /**
   * Faculty Performance by Department
   */
  static async getFacultyPerformanceByDepartment(teacher, filters = {}) {
    try {
      const allowedDepartments = await this.getRoleBasedDepartmentAccess(teacher);
      
      if (allowedDepartments.length === 0) {
        return [];
      }

      const facultyPerformance = await Promise.all(
        allowedDepartments.map(async (dept) => {
          // Get all faculty in this department
          const faculty = await Teacher.find({ 
            department: dept,
            role: { $in: ['Faculty', 'Academic Advisor'] }
          }).select('name email role classes').lean();

          if (faculty.length === 0) {
            return {
              department: dept,
              facultyCount: 0,
              topFaculty: [],
              avgClassPerformance: 0,
              classVariance: 0
            };
          }

          // Calculate performance for each faculty member
          const facultyWithPerformance = await Promise.all(
            faculty.map(async (f) => {
              // Get classes assigned to this faculty
              const classes = await Class.find({
                $or: [
                  { facultyAssigned: f._id },
                  { academicAdvisors: f._id }
                ],
                department: dept
              }).select('_id className').lean();

              if (classes.length === 0) {
                return {
                  ...f,
                  classCount: 0,
                  avgPoints: 0,
                  totalStudents: 0
                };
              }

              const classIds = classes.map(c => c._id);

              // Get students in these classes
              const students = await Student.find({
                $or: [
                  { 'currentClass.ref': { $in: classIds } },
                  { 'class': { $in: classIds } }
                ],
                department: dept
              }).select('totalPoints').lean();

              const totalStudents = students.length;
              const totalPoints = students.reduce((sum, s) => sum + (s.totalPoints || 0), 0);
              const avgPoints = totalStudents > 0 ? Math.round((totalPoints / totalStudents) * 10) / 10 : 0;

              return {
                ...f,
                classCount: classes.length,
                avgPoints,
                totalStudents,
                totalPoints
              };
            })
          );

          // Calculate department averages and variance
          const validFaculty = facultyWithPerformance.filter(f => f.totalStudents > 0);
          const avgClassPerformance = validFaculty.length > 0 ? 
            Math.round((validFaculty.reduce((sum, f) => sum + f.avgPoints, 0) / validFaculty.length) * 10) / 10 : 0;

          // Calculate variance (how spread out the class performances are)
          const variance = validFaculty.length > 1 ? 
            Math.round((validFaculty.reduce((sum, f) => sum + Math.pow(f.avgPoints - avgClassPerformance, 2), 0) / validFaculty.length) * 10) / 10 : 0;

          // Top 5 faculty by performance
          const topFaculty = facultyWithPerformance
            .filter(f => f.totalStudents > 0)
            .sort((a, b) => b.avgPoints - a.avgPoints)
            .slice(0, 5);

          return {
            department: dept,
            facultyCount: faculty.length,
            topFaculty,
            avgClassPerformance,
            classVariance: variance
          };
        })
      );

      return facultyPerformance;

    } catch (error) {
      console.error('Error in getFacultyPerformanceByDepartment:', error);
      throw error;
    }
  }

  /**
   * 3. Strategic Insights - Untapped Opportunities by Department
   */
  static async getUntappedOpportunitiesByDepartment(teacher, filters = {}) {
    try {
      console.log('Service: getUntappedOpportunitiesByDepartment started for teacher:', teacher.name);
      const allowedDepartments = await this.getRoleBasedDepartmentAccess(teacher);
      console.log('Service: getUntappedOpportunitiesByDepartment allowedDepartments:', allowedDepartments);
      
      if (allowedDepartments.length === 0) {
        return [];
      }

      // Get all available categories from recent events
      const allCategories = await Event.distinct('category');

      const departmentOpportunities = await Promise.all(
        allowedDepartments.map(async (dept) => {
          // Get students in this department
          const students = await Student.find({ department: dept }).select('_id').lean();
          const studentIds = students.map(s => s._id);
          const totalStudents = students.length;

          if (totalStudents === 0) {
            return {
              department: dept,
              totalStudents: 0,
              untappedCategories: [],
              lowParticipationCategories: []
            };
          }

          // Get participation by category for this department
          const categoryParticipation = await Event.aggregate([
            {
              $match: {
                submittedBy: { $in: studentIds },
                status: 'Approved'
              }
            },
            {
              $group: {
                _id: "$category",
                uniqueStudents: { $addToSet: "$submittedBy" },
                eventCount: { $sum: 1 }
              }
            },
            {
              $project: {
                category: "$_id",
                uniqueStudents: { $size: "$uniqueStudents" },
                eventCount: 1,
                _id: 0
              }
            }
          ]);

          // Identify untapped and low participation categories
          const untappedCategories = [];
          const lowParticipationCategories = [];

          allCategories.forEach(category => {
            const participation = categoryParticipation.find(cp => cp.category === category);
            const participantCount = participation ? participation.uniqueStudents : 0;
            const participationRate = Math.round((participantCount / totalStudents) * 100);

            if (participantCount === 0) {
              untappedCategories.push({
                category,
                participationRate: 0,
                recommendation: 'Introduce this category to department'
              });
            } else if (participationRate < 20) { // Less than 20% participation
              lowParticipationCategories.push({
                category,
                participationRate,
                participantCount,
                eventCount: participation.eventCount,
                recommendation: participationRate < 5 ? 
                  'High-priority improvement needed' : 
                  'Increase awareness and promotion'
              });
            }
          });

          return {
            department: dept,
            totalStudents,
            untappedCategories: untappedCategories.slice(0, 5), // Top 5 untapped
            lowParticipationCategories: lowParticipationCategories
              .sort((a, b) => a.participationRate - b.participationRate)
              .slice(0, 5) // Top 5 low participation
          };
        })
      );

      return departmentOpportunities;

    } catch (error) {
      console.error('Error in getUntappedOpportunitiesByDepartment:', error);
      throw error;
    }
  }

  /**
   * Department Engagement Patterns - Weekly/Monthly Trends
   */
  static async getDepartmentEngagementPatterns(teacher, timeframe = 'monthly', periods = 12) {
    try {
      const allowedDepartments = await this.getRoleBasedDepartmentAccess(teacher);
      
      if (allowedDepartments.length === 0) {
        return { patterns: [], timeLabels: [] };
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      if (timeframe === 'weekly') {
        startDate.setDate(startDate.getDate() - (periods * 7));
      } else {
        startDate.setMonth(startDate.getMonth() - periods);
      }

      const departmentPatterns = await Promise.all(
        allowedDepartments.map(async (dept) => {
          const groupStage = timeframe === 'weekly' 
            ? {
                $group: {
                  _id: {
                    week: { $week: "$date" },
                    year: { $year: "$date" }
                  },
                  count: { $sum: 1 },
                  points: { $sum: "$pointsEarned" },
                  uniqueStudents: { $addToSet: "$submittedBy" }
                }
              }
            : {
                $group: {
                  _id: {
                    month: { $month: "$date" },
                    year: { $year: "$date" }
                  },
                  count: { $sum: 1 },
                  points: { $sum: "$pointsEarned" },
                  uniqueStudents: { $addToSet: "$submittedBy" }
                }
              };

          const engagementData = await Event.aggregate([
            {
              $match: {
                department: dept,
                status: 'Approved',
                date: { $gte: startDate, $lte: endDate }
              }
            },
            groupStage,
            {
              $project: {
                period: timeframe === 'weekly' 
                  ? { $concat: [{ $toString: "$_id.week" }, "-", { $toString: "$_id.year" }] }
                  : { $concat: [{ $toString: "$_id.month" }, "-", { $toString: "$_id.year" }] },
                count: 1,
                points: 1,
                uniqueStudents: { $size: "$uniqueStudents" },
                _id: 0
              }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.week": 1 } }
          ]);

          return {
            department: dept,
            engagement: engagementData
          };
        })
      );

      // Generate time labels
      const timeLabels = [];
      for (let i = 0; i < periods; i++) {
        const date = new Date();
        if (timeframe === 'weekly') {
          date.setDate(date.getDate() - ((periods - 1 - i) * 7));
          timeLabels.push(`Week ${getWeekNumber(date)}, ${date.getFullYear()}`);
        } else {
          date.setMonth(date.getMonth() - (periods - 1 - i));
          timeLabels.push(date.toLocaleString('default', { month: 'short', year: 'numeric' }));
        }
      }

      return {
        patterns: departmentPatterns,
        timeLabels
      };

    } catch (error) {
      console.error('Error in getDepartmentEngagementPatterns:', error);
      throw error;
    }
  }

  /**
   * Inter-Department Collaboration Metrics
   */
  static async getInterDepartmentCollaboration(teacher, filters = {}) {
    try {
      const allowedDepartments = await this.getRoleBasedDepartmentAccess(teacher);
      
      if (allowedDepartments.length === 0) {
        return { collaborationMatrix: [], crossDepartmentEvents: [] };
      }

      // Look for cross-department collaboration indicators
      // This could be events with participants from multiple departments,
      // joint projects, etc. For now, we'll analyze department interaction patterns

      const collaborationMetrics = await Promise.all(
        allowedDepartments.map(async (dept) => {
          // Get events that might indicate collaboration (similar timing, categories)
          const deptEvents = await Event.find({
            department: dept,
            status: 'Approved'
          }).select('eventName category date submittedBy').lean();

          // Group by category and time to find potential collaboration
          const categoryTiming = {};
          
          deptEvents.forEach(event => {
            const monthKey = `${event.date.getFullYear()}-${event.date.getMonth()}`;
            if (!categoryTiming[event.category]) {
              categoryTiming[event.category] = {};
            }
            if (!categoryTiming[event.category][monthKey]) {
              categoryTiming[event.category][monthKey] = 0;
            }
            categoryTiming[event.category][monthKey]++;
          });

          return {
            department: dept,
            categoryTiming,
            eventCount: deptEvents.length
          };
        })
      );

      // Analyze cross-department patterns
      const collaborationMatrix = [];
      
      for (let i = 0; i < allowedDepartments.length; i++) {
        for (let j = i + 1; j < allowedDepartments.length; j++) {
          const dept1 = allowedDepartments[i];
          const dept2 = allowedDepartments[j];
          
          const dept1Data = collaborationMetrics.find(d => d.department === dept1);
          const dept2Data = collaborationMetrics.find(d => d.department === dept2);
          
          // Calculate similarity score based on category timing overlap
          let collaborationScore = 0;
          let sharedCategories = 0;
          
          Object.keys(dept1Data.categoryTiming).forEach(category => {
            if (dept2Data.categoryTiming[category]) {
              sharedCategories++;
              const dept1Months = Object.keys(dept1Data.categoryTiming[category]);
              const dept2Months = Object.keys(dept2Data.categoryTiming[category]);
              
              const sharedMonths = dept1Months.filter(month => 
                dept2Months.includes(month)
              ).length;
              
              collaborationScore += sharedMonths;
            }
          });

          collaborationMatrix.push({
            department1: dept1,
            department2: dept2,
            collaborationScore,
            sharedCategories,
            collaborationLevel: collaborationScore > 5 ? 'High' : 
                               collaborationScore > 2 ? 'Medium' : 'Low'
          });
        }
      }

      return {
        collaborationMatrix: collaborationMatrix.sort((a, b) => b.collaborationScore - a.collaborationScore),
        departmentMetrics: collaborationMetrics
      };

    } catch (error) {
      console.error('Error in getInterDepartmentCollaboration:', error);
      throw error;
    }
  }
}

// Helper function to get week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

module.exports = DepartmentAnalyticsService;
