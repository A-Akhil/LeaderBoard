const dotenv = require('dotenv'); 
dotenv.config();

const express = require('express');
const app = express();
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectToDb = require('./db/db');
const mongoose = require('mongoose');
const path = require('path');

// CORS configuration
app.use(cors({
  origin: ["http://10.1.38.23:5173","http://localhost:5173","http://10.1.38.23","http://10.9.99.36:5173","http://localhost:4000"], // Or your actual frontend URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 
app.use(cookieParser()); 

// Routes
const studentRoutes = require('./routes/student.routes');
const teacherRoutes = require('./routes/teacher.routes');
const adminRoutes = require("./routes/admin.routes");
const classRoutes = require('./routes/class.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const eventRoutes = require('./routes/event.routes');
const upcomingEventRoutes = require('./routes/upcomingEvent.routes');
const assignmentRoutes = require('./routes/assignment.routes');
const roleBasedEventReportsRoutes = require('./routes/roleBasedEventReports.routes');
const feedbackRoutes = require('./routes/feedback.routes');
const facultyReportRoutes = require('./routes/facultyReport.routes');
const enumConfigRoutes = require('./routes/enumConfig.routes');
const templateRoutes = require('./routes/templates.routes');
const departmentAnalyticsRoutes = require('./routes/departmentAnalytics.routes');

// Create API router and mount all routes on it
const apiRouter = express.Router();

// Mount all existing routes on the API router
apiRouter.use('/student', studentRoutes);
apiRouter.use('/teacher', teacherRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/class', classRoutes);
apiRouter.use('/leaderboard', leaderboardRoutes);
apiRouter.use('/event', eventRoutes);
apiRouter.use('/upcoming-events', upcomingEventRoutes);
apiRouter.use('/assignment', assignmentRoutes);
apiRouter.use('/reports', roleBasedEventReportsRoutes);
apiRouter.use('/feedback', feedbackRoutes);
apiRouter.use('/faculty-reports', facultyReportRoutes);
apiRouter.use('/department-analytics', departmentAnalyticsRoutes);
apiRouter.use('/admin/config', enumConfigRoutes);
apiRouter.use('/admin/enums', enumConfigRoutes);
apiRouter.use('/admin/config', templateRoutes);

// Mount the API router with /api prefix
app.use('/api', apiRouter);

// Move uploads under the API prefix
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Modify your Express static file middleware to check if the environment is production
if (process.env.NODE_ENV === 'production') {
  // Only serve static files in production
  console.log('Serving static files from production build');
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  
  // // This will only be reached if no API routes matched
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
} else {
  // In development, only handle API routes
  // Don't try to serve frontend static files
  console.log('Running in development mode, serving API only');
  console.log('API is running on http://localhost:4000/api');
  app.get('/', (req, res) => {
    res.send('API is running in development mode');
  });
}

module.exports = app;
