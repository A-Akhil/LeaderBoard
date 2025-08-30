import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/homepage/LandingPage';  
import StudentLoginForm from './pages/Students/StudentLogin';
import StudentDashboard from './pages/Students/StudentDashboard';
import EventForm from './pages/Students/EventForm';
import StudentProfile from './pages/Students/StudentProfile';
import StudentProtectWrapper from './Wrappers/StudentWrapper';
import StudentLayout from './layouts/StudentLayout';
import TeacherLoginForm from './pages/Teachers/TeacherLogin';
import TeacherDashboard from './pages/Teachers/TeacherDashboard';
import TeacherProtectWrapper from './Wrappers/TeacherWrapper';
import AdvisorHodWrapper from './Wrappers/AdvisorHodWrapper';
import EventHistoryTable from './components/EventList';
import AdminDashboard from './pages/Admin/AdminDashBoard';
import AdminLoginForm from './pages/Admin/AdminLogin';
import ReportsPage from './pages/ReportsPage';
import EventTable from './pages/Teachers/TeacherEventVerify';
import EventsList from './components/EventsList';
import AdvisorHodDashboard from './pages/AdvisorHod/AdvisorHodDashboard';
import ClassDetailsView from './pages/AdvisorHod/ClassDetailsView';
import UpcomingEvents from './pages/UpcomingEvents';
import StudentEventHistory from './components/StudentEventHistory';
import AdminFeedbackReview from './pages/Admin/AdminFeedbackReview';
import ConfigManagement from './pages/Admin/ConfigManagement';
import ProtectedRoute from './components/ProtectedRoute';
import EditEventForm from './pages/Students/EditEventForm';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/student-login" element={<StudentLoginForm />} />
      <Route path="/teacher-login" element={<TeacherLoginForm />} />
      <Route path="/admin-login" element={<AdminLoginForm />} />
      <Route path="/" element={<LandingPage/>} />
      
      {/* Teacher routes - Moving these BEFORE student routes for proper matching */}
      <Route path="/teacher-events" element={<TeacherProtectWrapper><EventTable /></TeacherProtectWrapper>} />
      <Route path="/teacher-dashboard" element={<TeacherProtectWrapper><TeacherDashboard /></TeacherProtectWrapper>} />
      <Route path="/advisor-hod-dashboard" element={<AdvisorHodWrapper><AdvisorHodDashboard /></AdvisorHodWrapper>} />
      <Route path="/advisor-hod/class/:classId" element={<AdvisorHodWrapper><ClassDetailsView /></AdvisorHodWrapper>} />
      
      {/* Protected student routes with layout */}
      <Route path="/" element={<StudentProtectWrapper><StudentLayout /></StudentProtectWrapper>}>
        <Route path="student-dashboard" element={<StudentDashboard />} />
        <Route path="student-profile" element={<StudentProfile />} />
        <Route path="event-submit" element={<EventForm />} />
        <Route path="student-events" element={<StudentEventHistory />} />
        <Route path="upcoming-events" element={<UpcomingEvents />} />
        <Route path="edit-event" element={<EditEventForm />} /> {/* Add this line */}
      </Route>
      
      {/* Other routes */}
      <Route path='/reports' element={<TeacherProtectWrapper><ReportsPage /></TeacherProtectWrapper>} />
      <Route path='/events' element={<EventHistoryTable />} />
      <Route path='/admin-dashboard' element={<AdminDashboard />} />
      <Route path="/admin/feedback" element={<AdminFeedbackReview />} />
      <Route path="/admin/system-config" element={
        <ProtectedRoute allowedRoles={['admin', 'Super Admin']}>
          <ConfigManagement />
        </ProtectedRoute>
      } />
      </Routes>
  );
}

export default App;
