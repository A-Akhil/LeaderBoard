import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  Building,
  User,
  Users,
  LogOut,
  Hash,
  Layers,
  BarChart,
  Menu,
  X,
  TrendingUp,
} from "lucide-react";
import AdvisorProfile from "../../components/advisor/AdvisorProfile";
import ClassesList from "../../components/advisor/ClassesList";
import ReportSection from "./ReportSection";
import DepartmentAnalyticsPage from "../../components/analytics/DepartmentAnalyticsPage";

const AdvisorHodDashboard = () => {
  const [userData, setUserData] = useState(null);
  const [classes, setClasses] = useState([]);
  const [currentView, setCurrentView] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [yearFilter, setYearFilter] = useState("all");
  const [availableYears, setAvailableYears] = useState([]);

  const VITE_BASE_URL = import.meta.env.VITE_BASE_URL;
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (windowWidth >= 1024) {
      setIsMobileMenuOpen(false);
    }
  }, [windowWidth]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("teacher-token");

        // Fetch user profile
        const profileResponse = await axios.get(
          `${VITE_BASE_URL}/teacher/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const userData = profileResponse.data;
        setUserData(userData);

        // Fetch the appropriate classes based on role
        let classesResponse;
        if (userData.role === "HOD") {
          classesResponse = await axios.get(
            `${VITE_BASE_URL}/teacher/department-classes`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );
        } else if (userData.role === "Associate Chairperson" || userData.role === "Chairperson") {
          // For now, use advised-classes endpoint - backend will handle role-based access
          classesResponse = await axios.get(
            `${VITE_BASE_URL}/teacher/advised-classes`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );
        } else {
          // Academic Advisor and others
          classesResponse = await axios.get(
            `${VITE_BASE_URL}/teacher/advised-classes`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );
        }

        const fetchedClasses = classesResponse.data;
        setClasses(fetchedClasses);
        
        // Extract unique years from classes
        const years = [...new Set(fetchedClasses.map(cls => cls.year))].sort((a, b) => a - b);
        setAvailableYears(years);
        
        // Always set filtered classes to all classes for dashboard view
        setFilteredClasses(fetchedClasses);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [VITE_BASE_URL]);

  useEffect(() => {
    if (location.state?.returnToClasses) {
      setCurrentView('classes');
      // Clean up the state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Modified navigation handlers with automatic sidebar closing
  const handleViewChange = (view) => {
    setCurrentView(view);
    if (windowWidth < 1024) {
      setIsMobileMenuOpen(false);
    }
  };

  const handleNavigateToClassDetails = (classId) => {
    if (windowWidth < 1024) {
      setIsMobileMenuOpen(false);
    }
    navigate(`/class/${classId}`);
  };

  const handleLogout = async () => {
    // Close sidebar if on mobile before logout
    if (windowWidth < 1024) {
      setIsMobileMenuOpen(false);
    }
    
    // Existing logout code
    try {
      localStorage.removeItem("teacher-token");
      localStorage.removeItem("token");
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (currentView === "profile") {
      return (
        <AdvisorProfile
          userData={userData}
          handleBackToDashboard={() => setCurrentView("dashboard")}
        />
      );
    }

    if (currentView === "classes") {
      return (
        <ClassesList
          classes={classes}
          availableYears={availableYears}
          handleBackToDashboard={() => setCurrentView("dashboard")}
        />
      );
    }

    if (currentView === "reports") {
      return (
        <ReportSection
          handleBackToDashboard={() => setCurrentView("dashboard")}
        />
      );
    }

    if (currentView === "departmentAnalytics") {
      return (
        <DepartmentAnalyticsPage
          userData={userData}
          handleBackToDashboard={() => setCurrentView("dashboard")}
        />
      );
    }

    // Default dashboard view
    return (
      <div className="p-4 lg:p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
          {/* Department Info */}
          <div className="bg-white p-4 lg:p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <h3 className="text-base lg:text-lg font-semibold text-gray-700">
                Department
              </h3>
              <Building className="h-5 w-5 lg:h-6 lg:w-6 text-blue-500" />
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900">
              {userData?.department || "N/A"}
            </p>
            <p className="text-xs lg:text-sm text-gray-500 mt-2">
              Current Department
            </p>
          </div>

          {/* Role Info */}
          <div className="bg-white p-4 lg:p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <h3 className="text-base lg:text-lg font-semibold text-gray-700">
                Role
              </h3>
              <User className="h-5 w-5 lg:h-6 lg:w-6 text-green-500" />
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900">
              {userData?.role || "N/A"}
            </p>
            <p className="text-xs lg:text-sm text-gray-500 mt-2">
              {userData?.role === "HOD" ? "Head of Department" :
               userData?.role === "Academic Advisor" ? "Academic Advisor" :
               userData?.role === "Associate Chairperson" ? "Associate Chairperson" :
               userData?.role === "Chairperson" ? "Chairperson" : "Administrative Role"}
            </p>
          </div>

          {/* Classes Managed */}
          <div className="bg-white p-4 lg:p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <h3 className="text-base lg:text-lg font-semibold text-gray-700">
                Classes
              </h3>
              <Layers className="h-5 w-5 lg:h-6 lg:w-6 text-purple-500" />
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900">
              {classes?.length || 0}
            </p>
            <p className="text-xs lg:text-sm text-gray-500 mt-2">
              {userData?.role === "HOD" ? "Departmental Classes" :
               userData?.role === "Academic Advisor" ? "Classes Managed" :
               userData?.role === "Associate Chairperson" ? "Managed Department Classes" :
               userData?.role === "Chairperson" ? "All Institute Classes" : "Classes Accessible"}
            </p>
          </div>
        </div>

        {/* Classes Overview Section */}
        <div className="bg-white rounded-lg shadow-md mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-800">
                  Classes Overview
                </h2>
              </div>
              <button
                onClick={() => setCurrentView("classes")}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View All Classes
              </button>
            </div>
          </div>

          <div className="p-6">
            {filteredClasses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClasses.slice(0, 6).map((classItem) => (
                  <div
                    key={classItem._id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() =>
                      navigate(`/advisor-hod/class/${classItem._id}`)
                    }
                  >
                    <h3 className="font-medium text-lg text-gray-900">
                      {classItem.className ||
                        `${classItem.year}-${classItem.section}`}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {classItem.department} • {classItem.academicYear}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {classItem.students?.length || 0} Students
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No classes found with the current filter.</p>
                <p className="text-sm text-gray-400 mt-2">
                  {yearFilter !== "all"
                    ? "Try selecting a different year filter."
                    : userData?.role === "HOD"
                    ? "Classes for your department will appear here."
                    : userData?.role === "Academic Advisor"
                    ? "Classes assigned to you will appear here."
                    : userData?.role === "Associate Chairperson"
                    ? "Classes from your managed departments will appear here."
                    : userData?.role === "Chairperson"
                    ? "All institute classes will appear here."
                    : "Accessible classes will appear here."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Reports Overview Section */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-800">
                  Reports Overview
                </h2>
              </div>
              <button
                onClick={() => setCurrentView("reports")}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View All Reports
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className={`grid grid-cols-1 gap-4 ${
              (userData?.role === "Chairperson" || userData?.role === "Associate Chairperson") 
                ? "md:grid-cols-2 lg:grid-cols-4" 
                : "md:grid-cols-3"
            }`}>
              <div
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setCurrentView("reports")}
              >
                <h3 className="font-medium text-gray-900">Performance Reports</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Analyze student performance across classes
                </p>
              </div>
              <div
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setCurrentView("reports")}
              >
                <h3 className="font-medium text-gray-900">Participation Reports</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Event participation statistics by class
                </p>
              </div>
              <div
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setCurrentView("reports")}
              >
                <h3 className="font-medium text-gray-900">Leaderboard Stats</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Top performing students and classes
                </p>
              </div>
              
              {/* Department Analytics - only for Chairperson and Associate Chairperson */}
              {(userData?.role === "Chairperson" || userData?.role === "Associate Chairperson") && (
                <div
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
                  onClick={() => setCurrentView("departmentAnalytics")}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <h3 className="font-medium text-gray-900">Department Analytics</h3>
                  </div>
                  <p className="text-sm text-gray-500">
                    {userData?.role === "Chairperson" 
                      ? "Institution-wide strategic insights" 
                      : "Multi-department performance analytics"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // The rendering section with fixed duplicate heading issue
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Mobile Header - only visible on mobile */}
      <div className="lg:hidden bg-white shadow-md p-4 flex justify-between items-center z-20">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="text-xl font-bold text-gray-800">
          {userData?.role === "HOD" ? "HOD Portal" : 
           userData?.role === "Academic Advisor" ? "Academic Advisor Portal" :
           userData?.role === "Associate Chairperson" ? "Associate Chairperson Portal" :
           userData?.role === "Chairperson" ? "Chairperson Portal" : "Administrative Portal"}
        </h1>
        {/* Empty div to maintain spacing with justify-between */}
        <div className="w-10"></div>
      </div>

      {/* Sidebar - changes based on screen size */}
      <div className={`
        ${windowWidth >= 1024 
          ? 'fixed left-0 top-0 h-full w-64 bg-white shadow-lg p-6 z-20' 
          : `fixed z-50 top-0 left-0 w-64 h-full bg-white shadow-lg p-6 transform transition-transform duration-300 ${
              isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`
        }
      `}>
        {/* Show heading only once - show in sidebar only on desktop */}
        {windowWidth >= 1024 && (
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            {userData?.role === "HOD" ? "HOD Dashboard" : 
             userData?.role === "Academic Advisor" ? "Academic Advisor Dashboard" :
             userData?.role === "Associate Chairperson" ? "Associate Chairperson Dashboard" :
             userData?.role === "Chairperson" ? "Chairperson Dashboard" : "Administrative Dashboard"}
          </h1>
        )}
        
        {/* Remove the redundant close button in mobile sidebar */}
        
        {/* Sidebar navigation with updated handlers */}
        <div className="space-y-2 mt-6">
          <button
            onClick={() => handleViewChange("dashboard")}
            className={`flex items-center w-full p-3 rounded-lg ${
              currentView === "dashboard" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
            }`}
          >
            <Building className="mr-3" size={20} />
            Dashboard
          </button>
          
          <button
            onClick={() => handleViewChange("classes")}
            className={`flex items-center w-full p-3 rounded-lg ${
              currentView === "classes" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
            }`}
          >
            <Users className="mr-3" size={20} />
            Classes
          </button>
          
          <button
            onClick={() => handleViewChange("reports")}
            className={`flex items-center w-full p-3 rounded-lg ${
              currentView === "reports" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
            }`}
          >
            <BarChart className="mr-3" size={20} />
            Reports
          </button>
          
          {/* Department Analytics - only for Chairperson and Associate Chairperson */}
          {(userData?.role === "Chairperson" || userData?.role === "Associate Chairperson") && (
            <button
              onClick={() => handleViewChange("departmentAnalytics")}
              className={`flex items-center w-full p-3 rounded-lg ${
                currentView === "departmentAnalytics" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
              }`}
            >
              <TrendingUp className="mr-3" size={20} />
              Department Analytics
            </button>
          )}
          
          <button
            onClick={() => handleViewChange("profile")}
            className={`flex items-center w-full p-3 rounded-lg ${
              currentView === "profile" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
            }`}
          >
            <User className="mr-3" size={20} />
            Profile
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center w-full p-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            <LogOut className="mr-3" size={20} />
            Logout
          </button>
        </div>
      </div>

      {/* Overlay to close menu when clicked outside on mobile */}
      {isMobileMenuOpen && windowWidth < 1024 && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main content - adjust padding based on screen size */}
      <main className={`flex-grow ${windowWidth >= 1024 ? 'ml-64' : 'ml-0'} ${currentView === "reports" ? '' : 'p-4 md:p-8'}`}>
        {renderContent()}
      </main>
    </div>
  );
};

export default AdvisorHodDashboard;