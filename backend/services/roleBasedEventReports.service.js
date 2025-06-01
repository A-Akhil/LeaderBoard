const Student = require('../models/student.model');
const Event = require('../models/event.model');
const Class = require('../models/class.model');
const Teacher = require('../models/teacher.model');
const mongoose = require('mongoose');

class RoleBasedEventReportsService {
  /**
   * Get role-based filters based on teacher's role and department
   */
  static async getRoleBasedFilters(teacher) {
    console.log("Teacher role:", teacher.role);
    console.log("Teacher department:", teacher.department);
    
    // Base filters - only include approved events
    let filters = { status: 'Approved' };
    
    // Different filtering logic based on role
    switch(teacher.role) {
      case 'Chairperson':
        // Chairperson can see all events across the institution
        console.log("Using Chairperson filters - all events");
        // No additional filters needed - sees everything
        break;
        
      case 'Associate Chairperson':
        // Associate Chairperson sees events from their managed departments
        console.log("Using Associate Chairperson filters");
        const managedDepartments = teacher.managedDepartments || [];
        if (managedDepartments.length > 0) {
          filters.department = { $in: managedDepartments };
          console.log(`Applying managed departments filter: ${managedDepartments.join(', ')}`);
        } else {
          console.log("Warning: Associate Chairperson has no managed departments");
          // Return dummy filter if no departments managed
          return { _id: mongoose.Types.ObjectId("000000000000000000000000") };
        }
        break;
        
      case 'HOD':
        // HOD can see all classes in their department
        console.log("Using HOD filters for", teacher.department);
        if (teacher.department) {
          filters.department = teacher.department;
        }
        break;
        
      case 'Academic Advisor':
        // Academic advisor sees classes they advise, within their department
        console.log("Using Academic Advisor filters");
        
        // Get classes where teacher is academic advisor
        const advisorClasses = await Class.find({ 
          academicAdvisors: teacher._id,
          ...(teacher.department ? { department: teacher.department } : {})
        }).select('_id');
        
        if (advisorClasses.length === 0) {
          console.log("Warning: No classes found for Academic Advisor");
        } else {
          console.log(`Found ${advisorClasses.length} classes for advisor`);
          filters.classIds = advisorClasses.map(c => c._id);
        }
        // Also apply department filter for Academic Advisor
        if (teacher.department) {
          filters.department = teacher.department;
        }
        break;
        
      case 'Faculty':
      default:
        // Faculty sees only their assigned classes, within their department
        console.log("Using Faculty filters");
        
        // Apply department filter for faculty
        if (teacher.department) {
          filters.department = teacher.department;
        }
        
        // Get classes where teacher is assigned
        const facultyClasses = await Class.find({ 
          facultyAssigned: teacher._id,
          ...(teacher.department ? { department: teacher.department } : {})
        }).select('_id');
        
        // If teacher has no classes, they see nothing
        if (facultyClasses.length === 0) {
          console.log("Warning: No classes found for Faculty member");
          
          // Fallback: check if teacher has classes in the teacher.classes array
          if (teacher.classes && teacher.classes.length > 0) {
            console.log(`Using ${teacher.classes.length} classes from teacher's classes array`);
            
            // Need to further filter these classes by department
            if (teacher.department) {
              const deptClasses = await Class.find({
                _id: { $in: teacher.classes },
                department: teacher.department
              }).select('_id');
              
              filters.classIds = deptClasses.map(c => c._id);
            } else {
              filters.classIds = teacher.classes;
            }
          } else {
            // Return dummy filter that won't match anything if no classes found
            console.log("No classes found, using dummy filter");
            return { _id: mongoose.Types.ObjectId("000000000000000000000000") };
          }
        } else {
          console.log(`Found ${facultyClasses.length} classes for faculty`);
          filters.classIds = facultyClasses.map(c => c._id);
        }
    }
    
    return filters;
  }

  /**
   * Apply user filters to base filters
   */
  static applyUserFilters(baseFilters, userFilters = {}) {
    const filters = { ...baseFilters };
    
    // Add year filter
    if (userFilters.year && !isNaN(parseInt(userFilters.year))) {
      filters.studentYear = parseInt(userFilters.year);
      console.log(`Applied year filter: ${filters.studentYear}`);
    }
    
    // Add specific class filter if provided
    if (userFilters.classId) {
      filters.specificClassId = userFilters.classId;
    }
    
    // Add date range filter if provided
    if (userFilters.startDate && userFilters.endDate) {
      filters.dateRange = {
        $gte: new Date(userFilters.startDate),
        $lte: new Date(userFilters.endDate)
      };
    }
    
    // Add category filter
    if (userFilters.category) {
      filters.category = userFilters.category;
    }
    
    // Add department filter
    if (userFilters.department) {
      filters.department = userFilters.department;
    }
    
    return filters;
  }

  /**
   * Get student-class mapping based on filters
   */
  static async getStudentClassMap(filters) {
    try {
      // Get accessible classes based on role
      let classQuery = {};
      
      if (filters.specificClassId) {
        // Looking for a specific class
        classQuery._id = filters.specificClassId;
      } else if (filters.classIds && filters.classIds.length > 0) {
        // Filter to role-accessible classes
        classQuery._id = { $in: filters.classIds };
      }
      
      // Apply year filter if provided
      if (filters.studentYear) {
        classQuery.year = filters.studentYear;
        console.log(`Filtering classes by year: ${filters.studentYear}`);
      }
      
      // Apply department filter if provided
      if (filters.department) {
        classQuery.department = filters.department;
        console.log(`Filtering classes by department: ${filters.department}`);
      }
      
      console.log('Class query:', JSON.stringify(classQuery));
      
      // Get filtered classes
      const classes = await Class.find(classQuery).lean();
      console.log(`Found ${classes.length} classes matching criteria`);
      
      // If no classes found, return empty map
      if (classes.length === 0) {
        return new Map();
      }
      
      // Get class IDs
      const classIds = classes.map(c => c._id);
      
      // Create a map of classId -> className for reference
      const classNameMap = classes.reduce((map, cls) => {
        map[cls._id.toString()] = cls.className;
        return map;
      }, {});
      
      // Find students in those classes
      const studentQuery = {
        $or: [
          { 'currentClass.ref': { $in: classIds } },
          { 'class': { $in: classIds } }
        ]
      };
      
      // Apply department filter if provided
      if (filters.department) {
        studentQuery.department = filters.department;
        console.log(`Filtering students by department: ${filters.department}`);
      }
      
      const students = await Student.find(studentQuery)
        .select('_id currentClass class')
        .lean();
      
      console.log(`Found ${students.length} students in these classes`);
      
      // Create map of student ID to class name
      const studentClassMap = new Map();
      
      students.forEach(student => {
        const classId = student.currentClass?.ref || student.class;
        if (classId) {
          const className = classNameMap[classId.toString()] || "Unknown";
          studentClassMap.set(student._id.toString(), className);
        }
      });
      
      return studentClassMap;
    } catch (error) {
      console.error('Error getting student-class map:', error);
      return new Map();
    }
  }

  /**
   * Get available classes for the given teacher's role/department
   */
  static async getAvailableClasses(teacher, yearFilter = null) {
    try {
      // Get role-based access filters
      const baseFilters = await this.getRoleBasedFilters(teacher);
      
      // Build query based on teacher's role
      let query = {};
      
      if (teacher.role === 'Chairperson') {
        // Chairperson sees all classes in the institution
        // No department filter needed
        
        // Apply year filter if provided for Chairperson
        if (yearFilter && !isNaN(parseInt(yearFilter))) {
          query.year = parseInt(yearFilter);
        }
      }
      else if (teacher.role === 'Associate Chairperson') {
        // Associate Chairperson sees classes from managed departments
        const managedDepartments = teacher.managedDepartments || [];
        if (managedDepartments.length > 0) {
          query.department = { $in: managedDepartments };
          
          // Apply year filter if provided for Associate Chairperson
          if (yearFilter && !isNaN(parseInt(yearFilter))) {
            query.year = parseInt(yearFilter);
          }
        } else {
          console.log("Warning: Associate Chairperson has no managed departments");
          // Return empty array if no departments managed
          return [];
        }
      }
      else if (teacher.role === 'HOD' && teacher.department) {
        // HOD sees all classes in their department
        query.department = teacher.department;
        
        // Apply year filter if provided for HOD
        if (yearFilter && !isNaN(parseInt(yearFilter))) {
          query.year = parseInt(yearFilter);
        }
      } 
      else if (teacher.role === 'Academic Advisor') {
        // Academic Advisor sees only classes they advise
        query.academicAdvisors = teacher._id;
        
        // Academic Advisors are restricted to their department
        if (teacher.department) {
          query.department = teacher.department;
        }
        
        // For Academic Advisor, first determine their assigned year
        const advisorClasses = await Class.find({
          academicAdvisors: teacher._id,
          ...(teacher.department ? { department: teacher.department } : {})
        }).distinct('year');
        
        if (advisorClasses.length > 0) {
          console.log(`Academic Advisor is assigned to year(s): ${advisorClasses}`);
          
          // If year filter is provided, check if it matches the advisor's assigned years
          if (yearFilter && !isNaN(parseInt(yearFilter))) {
            if (!advisorClasses.includes(parseInt(yearFilter))) {
              console.log(`Academic Advisor attempted to access unauthorized year: ${yearFilter}`);
              // Return empty array if trying to access unauthorized year
              return [];
            }
            query.year = parseInt(yearFilter);
          } else {
            // If no year filter specified, use the advisor's assigned year
            // Typically advisors handle only one year, so use the first one
            query.year = advisorClasses[0];
          }
        }
      }
      else if ((teacher.role === 'Faculty' || teacher.role === 'faculty') && 
               teacher.classes && teacher.classes.length > 0) {
        // Faculty sees only their assigned classes
        query._id = { $in: teacher.classes };
        
        // Apply year filter if provided for Faculty
        if (yearFilter && !isNaN(parseInt(yearFilter))) {
          query.year = parseInt(yearFilter);
        }
      }
      
      // console.log(`Class query for ${teacher.role}:`, query);
      
      // Get classes
      const classes = await Class.find(query)
        .sort({ year: 1, section: 1, department: 1 })
        .lean();
      
      console.log(`Found ${classes.length} classes for ${teacher.role}`);
      return classes;
    } catch (error) {
      console.error('Error getting available classes:', error);
      return [];
    }
  }

  /**
   * Get top students based on teacher's role/department
   */
  static async getTopStudents(teacher, limit = 10, userFilters = {}) {
    try {
      // Get role-based access filters with user filters applied
      const baseFilters = await this.getRoleBasedFilters(teacher);
      const filters = this.applyUserFilters(baseFilters, userFilters);
      
      // Get student-class map based on filters (now includes year filter)
      const studentClassMap = await this.getStudentClassMap(filters);
      
      // Convert student IDs to ObjectIds
      const accessibleStudentIds = Array.from(studentClassMap.keys()).map(id => 
        new mongoose.Types.ObjectId(id)  // Fixed with 'new' keyword
      );
      
      // If no students found, return empty array
      if (accessibleStudentIds.length === 0) {
        console.log("No accessible students found");
        return [];
      }
      
      // Get events submitted by these students
      const pipeline = [
        {
          $match: {
            submittedBy: { $in: accessibleStudentIds },
            status: 'Approved'
          }
        },
        {
          $group: {
            _id: '$submittedBy',
            totalPoints: { $sum: '$points' },
            eventCount: { $sum: 1 }
          }
        },
        {
          $sort: { totalPoints: -1 }
        },
        {
          $limit: limit
        }
      ];
      
      const studentStats = await Event.aggregate(pipeline);
      
      // Get student details
      const topStudents = await Promise.all(
        studentStats.map(async (stat) => {
          const student = await Student.findById(stat._id)
            .select('name registerNo totalPoints department currentClass')
            .lean();
            
          if (!student) return null;
          
          return {
            _id: student._id,
            name: student.name,
            registerNo: student.registerNo,
            totalPoints: stat.totalPoints,
            activityCount: stat.eventCount,
            department: student.department,
            className: studentClassMap.get(student._id.toString()) || 'Unknown'
          };
        })
      );
      
      // Filter out nulls and return results
      return topStudents.filter(Boolean);
    } catch (error) {
      console.error('Error getting top students:', error);
      return [];
    }
  }

  /**
   * Get popular categories based on event submissions
   */
  static async getPopularCategories(teacher, limit = 5, userFilters = {}) {
    try {
      // Pass the year filter to getAvailableClasses
      const yearFilter = userFilters.year ? parseInt(userFilters.year) : null;
      const classes = await this.getAvailableClasses(teacher, yearFilter);
      
      if (classes.length === 0) {
        console.log("No classes found, returning empty result");
        return [];
      }
      
      // Get class IDs
      const classIds = classes.map(c => c._id);
      
      // Find students in those classes with department filter if provided
      const studentQuery = {
        $or: [
          { 'currentClass.ref': { $in: classIds } },
          { 'class': { $in: classIds } }
        ]
      };
      
      // Apply department filter if provided
      if (userFilters.department) {
        studentQuery.department = userFilters.department;
        console.log(`Filtering students by department: ${userFilters.department}`);
      }
      
      const students = await Student.find(studentQuery).select('_id').lean();
      
      const studentIds = students.map(s => s._id);
      
      if (studentIds.length === 0) {
        console.log("No students found, returning empty result");
        return [];
      }
      
      // Build match condition for events
      const matchCondition = {
        submittedBy: { $in: studentIds },
        status: 'Approved'
      };
      
      // Apply department filter to events if provided
      if (userFilters.department) {
        matchCondition.department = userFilters.department;
        console.log(`Filtering events by department: ${userFilters.department}`);
      }
      
      // Apply date range filter if provided
      if (userFilters.startDate && userFilters.endDate) {
        matchCondition.createdAt = {
          $gte: new Date(userFilters.startDate),
          $lte: new Date(userFilters.endDate)
        };
        console.log(`Filtering events by date range: ${userFilters.startDate} to ${userFilters.endDate}`);
      }
      
      // Find approved events submitted by these students
      const categoryAggregation = await Event.aggregate([
        {
          $match: matchCondition
        },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            totalPoints: { $sum: "$pointsEarned" }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: limit
        },
        {
          $project: {
            category: "$_id",
            count: 1,
            totalPoints: 1,
            _id: 0
          }
        }
      ]);
      
      console.log(`Found ${categoryAggregation.length} popular categories`);
      
      // If no categories found, create a placeholder
      if (categoryAggregation.length === 0) {
        return [
          { 
            category: "No Data", 
            count: 0, 
            totalPoints: 0 
          }
        ];
      }
      
      return categoryAggregation;
    } catch (error) {
      console.error('Error getting popular categories:', error);
      // Return placeholder data
      return [
        { 
          category: "Error occurred", 
          count: 0, 
          totalPoints: 0 
        }
      ];
    }
  }

  /**
   * Get class performance metrics
   */
  static async getClassPerformance(teacher, userFilters = {}) {
    try {
      // Pass the year filter to getAvailableClasses
      const yearFilter = userFilters.year ? parseInt(userFilters.year) : null;
      const classes = await this.getAvailableClasses(teacher, yearFilter);
      
      if (classes.length === 0) {
        console.log("No classes found, returning empty result");
        return [];
      }
      
      // Apply department filter to classes if provided
      let filteredClasses = classes;
      if (userFilters.department) {
        filteredClasses = classes.filter(c => c.department === userFilters.department);
        console.log(`Filtered classes by department: ${userFilters.department}, found ${filteredClasses.length} classes`);
        
        if (filteredClasses.length === 0) {
          return [];
        }
      }
      
      // Get class IDs
      const classIds = filteredClasses.map(c => c._id);
      
      // Find students in those classes
      const studentQuery = {
        $or: [
          { 'currentClass.ref': { $in: classIds } },
          { 'class': { $in: classIds } }
        ]
      };
      
      // Apply department filter to students if provided
      if (userFilters.department) {
        studentQuery.department = userFilters.department;
        console.log(`Filtering students by department: ${userFilters.department}`);
      }
      
      const students = await Student.find(studentQuery).select('_id currentClass class').lean();
      
      if (students.length === 0) {
        console.log("No students found, returning empty result");
        return [];
      }
      
      // Group students by class
      const studentsByClass = {};
      students.forEach(student => {
        const classId = (student.currentClass?.ref || student.class).toString();
        if (!studentsByClass[classId]) {
          studentsByClass[classId] = [];
        }
        studentsByClass[classId].push(student._id);
      });
      
      // Create match condition for events
      const matchCondition = {
        status: 'Approved'
      };
      
      // Apply date range filter if provided
      if (userFilters.startDate && userFilters.endDate) {
        matchCondition.createdAt = {
          $gte: new Date(userFilters.startDate),
          $lte: new Date(userFilters.endDate)
        };
      }
      
      // Apply department filter to events if provided
      if (userFilters.department) {
        matchCondition.department = userFilters.department;
        console.log(`Filtering events by department: ${userFilters.department}`);
      }
      
      // Prepare result array
      const result = [];
      
      // Process each class
      for (const classId of Object.keys(studentsByClass)) {
        const classStudents = studentsByClass[classId];
        const classObj = filteredClasses.find(c => c._id.toString() === classId);
        
        if (!classObj) continue;
        
        // Clone match condition and add student filter
        const classMatchCondition = { 
          ...matchCondition,
          submittedBy: { $in: classStudents }
        };
        
        // Get event data for this class
        const classStats = await Event.aggregate([
          { $match: classMatchCondition },
          { $group: {
              _id: null,
              totalEvents: { $sum: 1 },
              totalPoints: { $sum: "$pointsEarned" },
              avgPoints: { $avg: "$pointsEarned" },
              categoryCount: { $addToSet: "$category" }
            }
          }
        ]);
        
        // Calculate the metrics
        const totalStudents = classStudents.length;
        const totalEvents = classStats.length > 0 ? classStats[0].totalEvents : 0;
        const totalPoints = classStats.length > 0 ? classStats[0].totalPoints : 0;
        
        // Format class performance data
        const classData = {
          classId: classId,
          className: classObj.className || 'Unknown',
          department: classObj.department || 'Unknown',
          year: classObj.year || 'Unknown',
          section: classObj.section || 'Unknown',
          totalStudents: totalStudents,
          studentCount: totalStudents, // Alias for frontend
          totalEvents: totalEvents,
          activityCount: totalEvents, // Alias for frontend
          totalActivities: totalEvents, // Add missing alias that matches frontend component
          totalPoints: totalPoints,
          avgPointsPerStudent: totalStudents > 0 && classStats.length > 0 ? 
            Math.round((totalPoints / totalStudents) * 10) / 10 : 0,
          avgPointsPerEvent: totalEvents > 0 ? 
            Math.round((totalPoints / totalEvents) * 10) / 10 : 0,
          averagePoints: totalStudents > 0 ? 
            Math.round((totalPoints / totalStudents) * 10) / 10 : 0, // Add alias for frontend table
          uniqueCategories: classStats.length > 0 ? classStats[0].categoryCount.length : 0
        };
        
        result.push(classData);
      }
      
      // Sort by total points (descending)
      return result.sort((a, b) => b.totalPoints - a.totalPoints);
      
    } catch (error) {
      console.error('Error getting class performance:', error);
      return [];
    }
  }

  /**
   * Get approval rates statistics
   */
  static async getApprovalRates(teacher, userFilters = {}) {
    try {
      // Pass the year filter to getAvailableClasses
      const yearFilter = userFilters.year ? parseInt(userFilters.year) : null;
      const classes = await this.getAvailableClasses(teacher, yearFilter);
      
      if (classes.length === 0) {
        console.log("No classes found, returning empty result");
        return [
          { status: 'Approved', count: 0, percentage: 0 },
          { status: 'Pending', count: 0, percentage: 0 },
          { status: 'Rejected', count: 0, percentage: 0 }
        ];
      }
      
      // Apply department filter to classes if provided
      let filteredClasses = classes;
      if (userFilters.department) {
        filteredClasses = classes.filter(c => c.department === userFilters.department);
        console.log(`Filtered classes by department: ${userFilters.department}, found ${filteredClasses.length} classes`);
        
        if (filteredClasses.length === 0) {
          return [
            { status: 'Approved', count: 0, percentage: 0 },
            { status: 'Pending', count: 0, percentage: 0 },
            { status: 'Rejected', count: 0, percentage: 0 }
          ];
        }
      }
      
      // Get class IDs
      const classIds = filteredClasses.map(c => c._id);
      
      // Find students in those classes
      const studentQuery = {
        $or: [
          { 'currentClass.ref': { $in: classIds } },
          { 'class': { $in: classIds } }
        ]
      };
      
      // Apply department filter to students if provided
      if (userFilters.department) {
        studentQuery.department = userFilters.department;
        console.log(`Filtering students by department: ${userFilters.department}`);
      }
      
      const students = await Student.find(studentQuery).select('_id').lean();
      
      const studentIds = students.map(s => s._id);
      
      if (studentIds.length === 0) {
        console.log("No students found, returning empty result");
        return [
          { status: 'Approved', count: 0, percentage: 0 },
          { status: 'Pending', count: 0, percentage: 0 },
          { status: 'Rejected', count: 0, percentage: 0 }
        ];
      }
      
      // Build match condition for events
      const matchCondition = {
        submittedBy: { $in: studentIds }
      };
      
      // Apply department filter to events if provided
      if (userFilters.department) {
        matchCondition.department = userFilters.department;
        console.log(`Filtering events by department: ${userFilters.department}`);
      }
      
      // Apply date range filter if provided
      if (userFilters.startDate && userFilters.endDate) {
        matchCondition.createdAt = {
          $gte: new Date(userFilters.startDate),
          $lte: new Date(userFilters.endDate)
        };
        console.log(`Filtering events by date range: ${userFilters.startDate} to ${userFilters.endDate}`);
      }
      
      // Get status counts for events
      const statusCounts = await Event.aggregate([
        {
          $match: matchCondition
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]);
      
      // Transform to expected format
      const result = statusCounts.map(item => ({
        status: item._id,
        count: item.count
      }));
      
      // Calculate totals for percentages
      const total = result.reduce((sum, item) => sum + item.count, 0);
      
      // Add percentage to each status
      result.forEach(item => {
        item.percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
      });
      
      // Ensure all statuses are present
      const statuses = ['Approved', 'Pending', 'Rejected'];
      statuses.forEach(status => {
        if (!result.some(item => item.status === status)) {
          result.push({ status, count: 0, percentage: 0 });
        }
      });
      
      return result;
    } catch (error) {
      console.error('Error getting approval rates:', error);
      return [
        { status: 'Approved', count: 0, percentage: 0 },
        { status: 'Pending', count: 0, percentage: 0 },
        { status: 'Rejected', count: 0, percentage: 0 }
      ];
    }
  }

  /**
   * Get inactive students (students with no recent activity)
   */
  static async getInactiveStudents(teacher, inactiveDays = 30, userFilters = {}) {
    try {
      // Log input parameters
      console.log(`Finding inactive students (${inactiveDays}+ days) with filters:`, userFilters);
      console.log(`Teacher:`, teacher.name, teacher.department, teacher.role);
      
      // Pass the year filter to getAvailableClasses
      const yearFilter = userFilters.year ? parseInt(userFilters.year) : null;
      const classes = await this.getAvailableClasses(teacher, yearFilter);
      
      if (classes.length === 0) {
        console.log("No classes found, returning empty result");
        return [];
      }
      
      console.log(`Found ${classes.length} classes for reports`);
      
      // Get class IDs
      const classIds = classes.map(c => c._id);
      
      // Create a map of classId -> className for reference
      const classMap = classes.reduce((map, cls) => {
        map[cls._id.toString()] = cls.className;
        return map;
      }, {});
      
      // Build student query with department filter
      const studentQuery = {
        $or: [
          { 'currentClass.ref': { $in: classIds } },
          { 'class': { $in: classIds } }
        ]
      };
      
      // Apply department filter if teacher has department assigned
      if (teacher.department && teacher.role !== 'Admin' && teacher.role !== 'Chairperson') {
        studentQuery.department = teacher.department;
        console.log(`Filtering students by department: ${teacher.department}`);
      }
      
      // Find students in those classes
      const students = await Student.find(studentQuery)
        .select('_id name registerNo department currentClass class updatedAt')
        .lean();
      
      console.log(`Found ${students.length} students to check for inactivity`);
      
      if (students.length === 0) {
        return [];
      }
      
      const studentIds = students.map(s => s._id);
      
      // Get latest event date for each student
      const now = new Date();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);
      
      console.log(`Checking events since ${cutoffDate.toISOString()}`);
      
      const latestEvents = await Event.aggregate([
        {
          $match: {
            submittedBy: { $in: studentIds }
          }
        },
        {
          $sort: { createdAt: -1 }
        },
        {
          $group: {
            _id: "$submittedBy",
            lastActivity: { $first: "$createdAt" }
          }
        }
      ]);
      
      console.log(`Found activity data for ${latestEvents.length} students`);
      
      // Create map of student ID to last activity date
      const lastActivityMap = latestEvents.reduce((map, item) => {
        map[item._id.toString()] = item.lastActivity;
        return map;
      }, {});
      
      // Calculate inactive days for each student
      const inactiveStudents = students.map(student => {
        // Get the class name
        let className = "Unknown";
        const classId = student.currentClass?.ref || student.class;
        
        if (classId) {
          className = classMap[classId.toString()] || "Unknown";
        }
        
        // Get the last activity date (from events or account updates)
        const lastEventDate = lastActivityMap[student._id.toString()];
        
        // CRITICAL FIX: Don't use updatedAt as fallback for activity calculation
        // If there's no event activity, the student is definitely inactive
        let lastActivity;
        let isNoActivity = false;
        
        if (lastEventDate) {
          // Student has event activity, use the event date
          lastActivity = lastEventDate;
          // console.log(`Student ${student.name} has event activity: ${new Date(lastActivity).toISOString()}`);
        } else {
          // No event activity found
          lastActivity = null;
          isNoActivity = true;
          // console.log(`Student ${student.name} has no event activity at all`);
        }
        
        // Calculate days since last activity (or use max days if no activity)
        let diffDays;
        if (lastActivity) {
          const diffTime = Math.abs(now - new Date(lastActivity));
          diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } else {
          // If no activity at all, set to a large number to ensure they show up
          diffDays = 9999;
        }
        
        return {
          _id: student._id,
          name: student.name,
          registerNo: student.registerNo,
          className,
          department: student.department,
          lastActivity: lastActivity || null,
          inactiveDays: diffDays,
          hasNoActivity: isNoActivity
        };
      });
      
      // Filter to students inactive for more than the specified days
      const filteredInactive = inactiveStudents
        .filter(student => student.inactiveDays >= inactiveDays)
        .sort((a, b) => b.inactiveDays - a.inactiveDays);
      
      console.log(`Found ${filteredInactive.length} inactive students out of ${students.length} total`);
      
      // After calculating filteredInactive
      // console.log(`Final inactive students count: ${filteredInactive.length}`);
      // console.log(`First few inactive students:`, filteredInactive.slice(0, 3));
      
      // Return the inactive students directly - don't wrap in an object
      return filteredInactive;
    } catch (error) {
      console.error('Error getting inactive students:', error);
      return [];
    }
  }

  /**
   * Get detailed student performance data
   */
  static async getDetailedStudentPerformance(teacher, userFilters = {}) {
    try {
      // Pass the year filter to getAvailableClasses
      const yearFilter = userFilters.year ? parseInt(userFilters.year) : null;
      const classes = await this.getAvailableClasses(teacher, yearFilter);
      
      if (classes.length === 0) {
        console.log("No classes found, returning empty result");
        return [];
      }
      
      // Get class IDs
      const classIds = classes.map(c => c._id);
      
      // Create a map of classId -> className for reference
      const classMap = classes.reduce((map, cls) => {
        map[cls._id.toString()] = cls.className;
        return map;
      }, {});
      
      // Build student query with department filter
      const studentQuery = {
        $or: [
          { 'currentClass.ref': { $in: classIds } },
          { 'class': { $in: classIds } }
        ]
      };
      
      // Apply department filter if teacher has department assigned
      if (teacher.department && teacher.role !== 'Admin' && teacher.role !== 'Chairperson') {
        studentQuery.department = teacher.department;
        console.log(`Filtering students by department: ${teacher.department}`);
      }
      
      // Find students in those classes
      const students = await Student.find(studentQuery)
        .select('name registerNo totalPoints currentClass class department')
        .lean();
      
      // Enhanced student data with activity counts and class names
      const enhancedStudents = await Promise.all(students.map(async student => {
        // Get the class name
        let className = "Unknown";
        const classId = student.currentClass?.ref || student.class;
        
        if (classId) {
          className = classMap[classId.toString()] || "Unknown";
        }
        
        // Get activity count
        const activityCount = await Event.countDocuments({
          submittedBy: student._id,
          status: 'Approved'
        });
        
        // Get category breakdown
        const categoryBreakdown = await Event.aggregate([
          {
            $match: {
              submittedBy: student._id,
              status: 'Approved'
            }
          },
          {
            $group: {
              _id: "$category",
              count: { $sum: 1 },
              points: { $sum: "$pointsEarned" }
            }
          },
          {
            $project: {
              category: "$_id",
              count: 1,
              points: 1,
              _id: 0
            }
          }
        ]);
        
        return {
          _id: student._id,
          name: student.name,
          registerNo: student.registerNo,
          className,
          department: student.department,
          totalPoints: student.totalPoints || 0,
          activityCount,
          categoryBreakdown
        };
      }));
      
      // Sort by total points descending
      return enhancedStudents.sort((a, b) => b.totalPoints - a.totalPoints);
    } catch (error) {
      console.error('Error getting detailed student performance:', error);
      return [];
    }
  }

  /**
   * Get category performance by class
   */
  static async getCategoryPerformanceByClass(teacher, userFilters = {}) {
    try {
      // Pass the year filter to getAvailableClasses
      const yearFilter = userFilters.year ? parseInt(userFilters.year) : null;
      const classes = await this.getAvailableClasses(teacher, yearFilter);
      
      if (classes.length === 0) {
        console.log("No classes found, returning empty result");
        return [];
      }
      
      // Apply department filter to classes if provided
      let filteredClasses = classes;
      if (userFilters.department) {
        filteredClasses = classes.filter(c => c.department === userFilters.department);
        console.log(`Filtered classes by department: ${userFilters.department}, found ${filteredClasses.length} classes`);
        
        if (filteredClasses.length === 0) {
          return [];
        }
      }
      
      // Create result structure
      const result = [];
      
      // Process each class
      for (const cls of filteredClasses) {
        // Find students in this class
        const studentQuery = {
          $or: [
            { 'currentClass.ref': cls._id },
            { 'class': cls._id }
          ]
        };
        
        // Apply department filter to students if provided
        if (userFilters.department) {
          studentQuery.department = userFilters.department;
          console.log(`Filtering students by department: ${userFilters.department}`);
        }
        
        const students = await Student.find(studentQuery).select('_id').lean();
        
        const studentIds = students.map(s => s._id);
        
        if (studentIds.length === 0) continue;
        
        // Create match condition for events
        const matchCondition = {
          submittedBy: { $in: studentIds },
          status: 'Approved'
        };
        
        // Apply department filter to events if provided
        if (userFilters.department) {
          matchCondition.department = userFilters.department;
          console.log(`Filtering events by department: ${userFilters.department}`);
        }
        
        // Apply category filter if provided
        if (userFilters.category) {
          matchCondition.category = userFilters.category;
          console.log(`Filtering events by category: ${userFilters.category}`);
        }
        
        // Apply date range filter if provided
        if (userFilters.startDate && userFilters.endDate) {
          matchCondition.createdAt = {
            $gte: new Date(userFilters.startDate),
            $lte: new Date(userFilters.endDate)
          };
          console.log(`Filtering events by date range: ${userFilters.startDate} to ${userFilters.endDate}`);
        }
        
        // Get category breakdown for this class
        const categoryBreakdown = await Event.aggregate([
          {
            $match: matchCondition
          },
          {
            $group: {
              _id: "$category",
              count: { $sum: 1 },
              points: { $sum: "$pointsEarned" }
            }
          },
          {
            $project: {
              category: "$_id",
              count: 1,
              points: 1,
              _id: 0
            }
          }
        ]);
        
        // Skip classes with no activities
        if (categoryBreakdown.length === 0) continue;
        
        // Add to result
        result.push({
          className: cls.className,
          department: cls.department,
          year: cls.year,
          categories: categoryBreakdown
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error getting category performance by class:', error);
      return [];
    }
  }

  /**
   * Get participation trends over time
   */
  static async getTrends(teacher, userFilters = {}) {
    try {
      // Pass the year filter to getAvailableClasses
      const yearFilter = userFilters.year ? parseInt(userFilters.year) : null;
      const classes = await this.getAvailableClasses(teacher, yearFilter);
      if (classes.length === 0) {
        console.log("No classes found, returning empty result");
        return [];
      }
      
      // Apply department filter to classes if provided
      let filteredClasses = classes;
      if (userFilters.department) {
        filteredClasses = classes.filter(c => c.department === userFilters.department);
        console.log(`Filtered classes by department: ${userFilters.department}, found ${filteredClasses.length} classes`);
        
        if (filteredClasses.length === 0) {
          return [];
        }
      }
      
      // Get class IDs
      const classIds = filteredClasses.map(c => c._id);
      
      // Find students in those classes
      const studentQuery = {
        $or: [
          { 'currentClass.ref': { $in: classIds } },
          { 'class': { $in: classIds } }
        ]
      };
      
      // Apply department filter to students if provided
      if (userFilters.department) {
        studentQuery.department = userFilters.department;
        console.log(`Filtering students by department: ${userFilters.department}`);
      }
      
      const students = await Student.find(studentQuery).select('_id').lean();
      
      const studentIds = students.map(s => s._id);
      
      if (studentIds.length === 0) {
        console.log("No students found, returning empty result");
        return [];
      }
      
      // Get trends for the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      // Create match condition for events
      const matchCondition = {
        submittedBy: { $in: studentIds },
        status: 'Approved',
        date: { $gte: sixMonthsAgo }
      };
      
      // Apply department filter to events if provided
      if (userFilters.department) {
        matchCondition.department = userFilters.department;
        console.log(`Filtering events by department: ${userFilters.department}`);
      }
      
      // Apply date range filter if provided (overrides the 6-month default)
      if (userFilters.startDate && userFilters.endDate) {
        matchCondition.date = {
          $gte: new Date(userFilters.startDate),
          $lte: new Date(userFilters.endDate)
        };
        console.log(`Filtering trends by date range: ${userFilters.startDate} to ${userFilters.endDate}`);
      }
      
      const trends = await Event.aggregate([
        {
          $match: matchCondition
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
          $sort: {
            "_id.year": 1,
            "_id.month": 1
          }
        },
        {
          $project: {
            month: "$_id.month",
            year: "$_id.year",
            date: {
              $dateToString: {
                format: "%Y-%m",
                date: {
                  $dateFromParts: {
                    year: "$_id.year",
                    month: "$_id.month",
                    day: 1
                  }
                }
              }
            },
            count: 1,
            points: 1,
            _id: 0
          }
        }
      ]);
      
      // If no trends found, create placeholder data for the last 6 months
      if (trends.length === 0) {
        const placeholderTrends = [];
        const currentDate = new Date();
        
        for (let i = 0; i < 6; i++) {
          const date = new Date();
          date.setMonth(currentDate.getMonth() - i);
          
          placeholderTrends.push({
            month: date.getMonth() + 1,
            year: date.getFullYear(),
            date: date.toISOString().slice(0, 7),
            count: 0,
            points: 0
          });
        }
        
        return placeholderTrends.reverse();
      }
      
      return trends;
    } catch (error) {
      console.error('Error getting trends:', error);
      return [];
    }
  }

  /**
   * Get class participation data
   */
  static async getClassParticipation(teacher, userFilters = {}) {
    try {
      // Pass the year filter to getAvailableClasses
      const yearFilter = userFilters.year ? parseInt(userFilters.year) : null;
      const classes = await this.getAvailableClasses(teacher, yearFilter);
      
      if (classes.length === 0) {
        console.log("No classes found, returning empty result");
        return [];
      }
      
      // Get participation data for each month in the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      // Create a result structure with one entry per month
      const monthlyData = [];
      const currentDate = new Date();
      
      for (let i = 0; i < 6; i++) {
        const date = new Date();
        date.setMonth(currentDate.getMonth() - i);
        
        monthlyData.push({
          month: date.getMonth() + 1,
          year: date.getFullYear(),
          date: date.toISOString().slice(0, 7),
          classes: {}
        });
      }
      
      // Process each class
      for (const cls of classes) {
        // Find students in this class
        const students = await Student.find({
          $or: [
            { 'currentClass.ref': cls._id },
            { 'class': cls._id }
          ]
        }).select('_id').lean();
        
        const studentIds = students.map(s => s._id);
        
        if (studentIds.length === 0) continue;
        
        // Get monthly activity counts for this class
        const monthlyActivities = await Event.aggregate([
          {
            $match: {
              submittedBy: { $in: studentIds },
              status: 'Approved',
              date: { $gte: sixMonthsAgo }
            }
          },
          {
            $group: {
              _id: {
                month: { $month: "$date" },
                year: { $year: "$date" }
              },
              count: { $sum: 1 }
            }
          },
          {
            $sort: {
              "_id.year": 1,
              "_id.month": 1
            }
          }
        ]);
        
        // Add this class's data to the monthly structure
        monthlyActivities.forEach(item => {
          const monthData = monthlyData.find(
            md => md.month === item._id.month && md.year === item._id.year
          );
          
          if (monthData) {
            monthData.classes[cls.className] = item.count;
          }
        });
      }
      
      // Ensure all classes are represented in all months (with 0 if no activity)
      const classNames = classes.map(c => c.className);
      
      monthlyData.forEach(monthData => {
        classNames.forEach(className => {
          if (!monthData.classes[className]) {
            monthData.classes[className] = 0;
          }
        });
      });
      
      // Convert to format expected by frontend
      const result = monthlyData.map(monthData => ({
        date: monthData.date,
        ...monthData.classes
      }));
      
      return result.reverse(); // Most recent first
    } catch (error) {
      console.error('Error getting class participation:', error);
      return [];
    }
  }

  /**
   * Get available classes for reports
   */
  static async getAvailableClassesForReports(teacher, filters = {}) {
    try {
      // Get classes based on teacher role and department
      const query = {};
      
      // Apply department filter from controller
      if (filters.department) {
        query.department = filters.department;
      }
      
      // Apply any year filters if present
      if (filters.year) {
        query.year = parseInt(filters.year);
      }
      
      // Get all applicable classes
      const classes = await Class.find(query)
        .sort({ year: -1, className: 1 })
        .lean();
      
      // Create a Map to deduplicate classes by className
      const uniqueClasses = new Map();
      
      // Add classes to map, ensuring only one entry per className
      classes.forEach(cls => {
        if (!uniqueClasses.has(cls.className)) {
          uniqueClasses.set(cls.className, cls);
        }
      });
      
      // Convert map values back to array
      return Array.from(uniqueClasses.values());
    } catch (error) {
      console.error('Error getting available classes:', error);
      return [];
    }
  }
}

module.exports = RoleBasedEventReportsService;