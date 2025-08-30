import React, { useState, useEffect } from 'react';
import { Upload, Users, FileText, Download, UserPlus, Calendar, MessageSquare, Settings, Shield } from 'lucide-react';
import AdminUpcomingEventForm from '../../components/AdminUpcomingEventForm';
import UpcomingEventsList from '../../components/UpcomingEventsList';
import ReportsPage from '../ReportsPage';
import AdminFeedbackReview from './AdminFeedbackReview';
import EnumManagement from './EnumManagement';
import UserManagement from '../../components/admin/UserManagement';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const VITE_BASE_URL = import.meta.env.VITE_BASE_URL;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('create-class');
  const [classFile, setClassFile] = useState(null);
  const [studentsFile, setStudentsFile] = useState(null);
  const [teacherFile, setTeacherFile] = useState(null);
  const [registerStudentFile, setRegisterStudentFile] = useState(null);

  // Check for authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem('admin-token');
    if (!token) {
      navigate('/admin-login');
      return;
    }
    
    // Verify token validity with backend
    const verifyToken = async () => {
      try {
        await axios.get(`${VITE_BASE_URL}/admin/profile`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      } catch (error) {
        localStorage.removeItem('admin-token');
        navigate('/admin-login');
      }
    };
    
    verifyToken();
  }, [navigate, VITE_BASE_URL]);

  const handleFileChange = (event, setFile) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      setFile(file);
    } else {
      alert('Please upload a CSV file');
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!classFile) {
      alert('Please select a CSV file');
      return;
    }
    const formData = new FormData();
    formData.append('file', classFile);

    try {
      // Replace with your API endpoint
      const response = await fetch(`${VITE_BASE_URL}/class/create-in-bulk`, {
        method: 'POST',
         body: formData
       });
      console.log('Uploading class file:', classFile);
      alert('Class created successfully!');
      setClassFile(null);
      e.target.reset();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error creating class');
    }
  };

  const handleAddStudents = async (e) => {
    e.preventDefault();
    if (!studentsFile) {
      alert('Please select a CSV file');
      return;
    }

    const formData = new FormData();
    formData.append('file', studentsFile);

    try {
      // Updated API endpoint to match expected functionality
      const response = await fetch(`${VITE_BASE_URL}/student/register-bulk`, {
        method: 'POST',  // Changed to POST since we're creating new records
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        console.error("API Error:", data.message || response.statusText);
        alert(`Error adding students: ${data.message || response.statusText}`);
        return;
      }
      if (data.errors && data.errors.length > 0) {
        console.error("Errors:", data.errors);
        alert(`Errors occurred:\n${data.errors.join('\n')}`);
      } else {
        alert('Students added successfully!');
      }
      setStudentsFile(null);
      e.target.reset();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error adding students');
    }
  };

  const handleRegisterTeacher = async (e) => {
    e.preventDefault();
    if (!teacherFile) {
      alert('Please select a CSV file');
      return;
    }

    const formData = new FormData();
    formData.append('file', teacherFile);

    try {
      // Replace with your API endpoint
      const response = await fetch(`${VITE_BASE_URL}/teacher/bulk-register`, {
         method: 'POST',
         body: formData
       });
      console.log('Uploading teacher file:', teacherFile);
      alert('Teacher registered successfully!');
      setTeacherFile(null);
      e.target.reset();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error registering teacher');
    }
  };

  const handleRegisterStudent = async (e) => {
    e.preventDefault();
    if (!registerStudentFile) {
      alert('Please select a CSV file');
      return;
    }

    const formData = new FormData();
    formData.append('file', registerStudentFile);

    try {
      // Replace with your API endpoint
       const response = await fetch(`${VITE_BASE_URL}/student/bulk-register`, {
         method: 'POST',
         body: formData
       });
       const data = await response.json();
       if (!response.ok) {
        console.error("API Error:", data.message || response.statusText);
        alert(`Error registering student: ${data.message || response.statusText}`);
        return;
      }alert("Student registered successfully!");
      setRegisterStudentFile(null);
      e.target.reset(); }
      catch (error) {
      console.error('Error uploading file:', error);
      alert('Error registering student');
    }
  };

  const handleDownloadReport = async (reportType) => {
    try {
      // Replace with your API endpoint
      // const response = await fetch(`/api/${reportType}`);
      // const blob = await response.blob();
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `${reportType}-report.csv`;
      // document.body.appendChild(a);
      // a.click();
      // window.URL.revokeObjectURL(url);
      console.log('Downloading report:', reportType);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Error downloading report');
    }
  };

  // Example of using admin token in API calls
  const fetchAdminData = async () => {
    const token = localStorage.getItem('admin-token');
    if (!token) {
        navigate('/admin-login');
        return;
    }
    
    try {
        const response = await axios.get(`${VITE_BASE_URL}/admin/dashboard`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        // Process response data
    } catch (error) {
        // Handle error
        if (error.response?.status === 401) {
            localStorage.removeItem('admin-token');
            navigate('/admin-login');
        }
    }
};

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Tab Navigation */}
        <div className="mb-8 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('create-class')}
              className={`w-full p-4 flex items-center gap-2 ${
                activeTab === 'create-class' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
              }`}
            >
              <Upload size={20} />
              Create Class
            </button>
            <button
              onClick={() => setActiveTab('add-student')}
              className={`w-full p-4 flex items-center gap-2 ${
                activeTab === 'add-student' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
              }`}
            >
              <Users size={20} />
              Add Students
            </button>
            <button
              onClick={() => setActiveTab('register-teacher')}
              className={`w-full p-4 flex items-center gap-2 ${
                activeTab === 'register-teacher' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
              }`}
            >
              <UserPlus size={20} />
              Register Teacher
            </button>
            <button
              onClick={() => setActiveTab('register-student')}
              className={`w-full p-4 flex items-center gap-2 ${
                activeTab === 'register-student' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
              }`}
            >
              <UserPlus size={20} />
              Register Student
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full p-4 flex items-center gap-2 ${
                activeTab === 'reports' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
              }`}
            >
              <FileText size={20} />
              Reports
            </button>
            <button
              onClick={() => setActiveTab('upcoming-events')}
              className={`w-full p-4 flex items-center gap-2 ${
                activeTab === 'upcoming-events' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
              }`}
            >
              <Calendar size={20} />
              Manage Upcoming Events
            </button>
            <button
              onClick={() => setActiveTab('user-management')}
              className={`w-full p-4 flex items-center gap-2 ${
                activeTab === 'user-management' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
              }`}
            >
              <Shield size={20} />
              User Management
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`w-full p-4 flex items-center gap-2 ${
                activeTab === 'feedback' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
              }`}
            >
              <MessageSquare size={20} />
              Feedback Review
            </button>
            <button
              onClick={() => navigate('/admin/system-config')}
              className={`w-full p-4 flex items-center gap-2 ${
                activeTab === 'enum-management' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
              }`}
            >
              <Settings size={20} />
              System Configuration
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'create-class' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Create Class</h2>
            <form onSubmit={handleCreateClass}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Upload Class CSV</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileChange(e, setClassFile)}
                  className="w-full p-2 border rounded"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Please upload a CSV file with class details
                </p>
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Upload and Create Class
              </button>
            </form>
          </div>
        )}

        {activeTab === 'add-student' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Add Students</h2>
            <form onSubmit={handleAddStudents}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Upload Students CSV</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileChange(e, setStudentsFile)}
                  className="w-full p-2 border rounded"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Please upload a CSV file with student details
                </p>
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Upload and Add Students
              </button>
            </form>
          </div>
        )}

        {activeTab === 'register-teacher' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Register Teacher</h2>
            <form onSubmit={handleRegisterTeacher}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Upload Teacher CSV</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileChange(e, setTeacherFile)}
                  className="w-full p-2 border rounded"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Please upload a CSV file with teacher details
                </p>
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Upload and Register Teacher
              </button>
            </form>
          </div>
        )}

        {activeTab === 'register-student' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Register Student</h2>
            <form onSubmit={handleRegisterStudent}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Upload Student CSV</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileChange(e, setRegisterStudentFile)}
                  className="w-full p-2 border rounded"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Please upload a CSV file with student details
                </p>
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Upload and Register Student
              </button>
            </form>
          </div>
        )}

        {activeTab === 'upcoming-events' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="lg:sticky lg:top-4 lg:h-fit">
              <AdminUpcomingEventForm />
            </div>
            <div>
              <UpcomingEventsList />
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="bg-white rounded-lg shadow">
            <ReportsPage />
          </div>
        )}

        {activeTab === 'user-management' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <UserManagement />
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <AdminFeedbackReview />
          </div>
        )}

        {activeTab === 'enum-management' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <button 
              onClick={() => navigate('/admin/system-config')}
              className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Open Advanced Configuration
            </button>
            <p className="text-gray-600">
              Manage categories, points rules, and form configurations in the advanced system configuration page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;