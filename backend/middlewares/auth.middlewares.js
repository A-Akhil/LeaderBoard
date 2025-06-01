const studentModel = require('../models/student.model');
const jwt = require('jsonwebtoken');
const blackListTokenModel = require('../models/blacklistToken.model');
const teacherModel = require('../models/teacher.model');
const adminModel = require('../models/admin.model')



module.exports.authStudent = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[ 1 ];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized Token missing' });
    }


    const isBlacklisted = await blackListTokenModel.findOne({ token: token });

    if (isBlacklisted) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const student = await studentModel.findById(decoded._id)

        req.student = student;

        return next();

    } catch (err) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
}

module.exports.authTeacher = async (req, res, next) => {
    try {
        // console.log("Auth headers:", req.headers.authorization); // Debug log
        
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }
        
        if (!token) {
            console.log("No token provided in request"); // Debug log
            return res.status(401).json({ message: 'Unauthorized: Token missing' });
        }
        
        const isBlacklisted = await blackListTokenModel.findOne({ token: token });

        if (isBlacklisted) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        try {

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
            const teacher = await teacherModel.findById(decoded._id)
            
            req.teacher = teacher;

            return next();

        } catch (err) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
    } catch (error) {
        console.error("Auth middleware error:", error); // Debug log
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
} 


exports.authAdmin = async (req, res, next) => {
    try {
      // Get token from header
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication failed. No token provided.' 
        });
      }
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find admin
      const admin = await adminModel.findById(decoded._id);
      
      if (!admin) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication failed. Admin not found.' 
        });
      }
      
      // Attach admin to request
      req.admin = admin;
      next();
    } catch (error) {
      console.error('Admin authentication error:', error);
      res.status(401).json({
        success: false,
        message: 'Authentication failed. Invalid token.'
      });
    }
  };
  
  exports.requireSuperAdmin = (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (req.admin.role !== 'Super Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super Admin privileges required.'
      });
    }
    
    next();
  };
  
  exports.restrictToDepartment = (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Super admin can access any department
    if (req.admin.role === 'Super Admin') {
      return next();
    }
    
    // Department admin can only access their department
    const requestedDept = req.params.department || req.query.department || req.body.department;
    
    if (requestedDept && requestedDept !== req.admin.department) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your department.'
      });
    }
    
    next();
  };

module.exports.authHOD = async (req, res, next) => {
    try {
        await module.exports.authTeacher(req, res, () => {
            if (req.teacher && req.teacher.role === 'HOD') {
                next();
            } else {
                return res.status(403).json({ message: 'Access denied. HOD role required.' });
            }
        });
    } catch (err) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

module.exports.authAcademicAdvisor = async (req, res, next) => {
    try {
        await module.exports.authTeacher(req, res, () => {
            if (req.teacher && (req.teacher.role === 'Academic Advisor' || req.teacher.role === 'HOD')) {
                next();
            } else {
                return res.status(403).json({ message: 'Access denied. Academic Advisor role required.' });
            }
        });
    } catch (err) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

// New middleware for Associate Chairperson access
module.exports.authAssociateChairperson = async (req, res, next) => {
    try {
        await module.exports.authTeacher(req, res, () => {
            if (req.teacher && (req.teacher.role === 'Associate Chairperson' || req.teacher.role === 'Chairperson')) {
                next();
            } else {
                return res.status(403).json({ message: 'Access denied. Associate Chairperson role or higher required.' });
            }
        });
    } catch (err) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

// New middleware for Chairperson access
module.exports.authChairperson = async (req, res, next) => {
    try {
        await module.exports.authTeacher(req, res, () => {
            if (req.teacher && req.teacher.role === 'Chairperson') {
                next();
            } else {
                return res.status(403).json({ message: 'Access denied. Chairperson role required.' });
            }
        });
    } catch (err) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

// Enhanced middleware for administrative access (HOD, Academic Advisor, Associate Chairperson, Chairperson)
module.exports.authAdministrative = async (req, res, next) => {
    try {
        await module.exports.authTeacher(req, res, () => {
            const adminRoles = ['HOD', 'Academic Advisor', 'Associate Chairperson', 'Chairperson'];
            if (req.teacher && adminRoles.includes(req.teacher.role)) {
                next();
            } else {
                return res.status(403).json({ message: 'Access denied. Administrative role required.' });
            }
        });
    } catch (err) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
};