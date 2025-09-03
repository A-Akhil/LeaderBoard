import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Search, Users } from "lucide-react";

const ClassDetailsView = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [classDetails, setClassDetails] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const VITE_BASE_URL = import.meta.env.VITE_BASE_URL;

  const handleBack = () => {
    const referrer = document.referrer;
    
    if (referrer.includes('advisor-hod-dashboard')) {
      navigate('/advisor-hod-dashboard');
    } else {
      navigate('/advisor-hod-dashboard', { state: { returnToClasses: true } });
    }
  };

  useEffect(() => {
    const fetchClassDetails = async () => {
      try {
        const token = localStorage.getItem("teacher-token");
        
        if (!token) {
          throw new Error("Authentication token not found");
        }
        
        const response = await axios.get(
          `${VITE_BASE_URL}/class/details/${classId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        setClassDetails(response.data);
        
        // Handle different response structures
        if (response.data && response.data.students) {
          console.log("RESPONSE:", response.data);
          setStudents(response.data.students);
        } else if (response.data && response.data.class && response.data.class.students) {
          setStudents(response.data.class.students);
        } else {
          setStudents([]);
        }
        
      } catch (err) {
        console.error("Error fetching class details:", err);
        
        if (err.response && err.response.status === 401) {
          setError("Your session has expired. Please log in again.");
          setTimeout(() => navigate("/teacher-login"), 2000);
        } else {
          setError(err.response?.data?.message || "Failed to fetch class details");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchClassDetails();
  }, [VITE_BASE_URL, classId]);

  const handleBackToClasses = () => {
    navigate(-1);
  };

  const handleExportCSV = () => {
    if (!students.length) return;
    
    // Create CSV content
    const headers = "Name,Email,Register No.,Department,Total Points\n";
    const rows = students.map(student => 
      `"${student.name}","${student.email}","${student.registerNo}","${student.department}","${student.totalPoints || 0}"`
    ).join("\n");
    
    const csvContent = `data:text/csv;charset=utf-8,${headers}${rows}`;
    const encodedUri = encodeURI(csvContent);
    
    // Create download link and trigger download
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `class-students-${classDetails?.className || classId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.registerNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <button
          onClick={handleBackToClasses}
          className="flex items-center gap-2 text-blue-500 hover:underline mb-6"
        >
          <ArrowLeft size={20} />
          Back to Classes
        </button>
        <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Mobile-friendly header */}
      <div className="bg-white shadow-sm p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center">
            <button 
              onClick={handleBack}
              className="mr-3 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">
              Class Details: {classDetails?.className || "Loading..."}
            </h1>
          </div>
        </div>
      </div>
      
      {/* Main content with responsive padding */}
      <div className="p-4 md:p-6 lg:p-8">
        {/* Stats cards - 1 column on mobile, 2-3 on larger screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h1 className="text-2xl font-semibold text-gray-800 mb-2">
              {classDetails?.className || `${classDetails?.year}-${classDetails?.section}`}
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="text-lg font-medium text-gray-800">{classDetails?.department}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Academic Year</p>
                <p className="text-lg font-medium text-gray-800">{classDetails?.academicYear}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Students</p>
                <p className="text-lg font-medium text-gray-800">{students.length}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs - scrollable on mobile */}
        <div className="overflow-x-auto">
          <div className="flex space-x-2 border-b mb-4 min-w-max">
            {/* ...tab buttons... */}
          </div>
        </div>
        
        {/* Student table with horizontal scroll */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Register Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {student.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.registerNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {student.totalPoints || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination - stack buttons on mobile */}
          <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-700 mb-2 sm:mb-0">
              Showing <span className="font-medium">1</span> to <span className="font-medium">10</span> of <span className="font-medium">50</span> results
            </div>
            <div className="flex justify-center space-x-1">
              {/* ...pagination buttons... */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassDetailsView;