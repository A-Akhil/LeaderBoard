import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  PieChart, BarChart2, Users, Download, Filter, Building2, Settings
} from 'lucide-react';
import { toast } from 'react-toastify'; // Add toast import if missing

// Import section components - removed OverviewSection
import CategoriesSection from '../components/reports/CategoriesSection';
import ClassAnalysisSection from '../components/reports/ClassAnalysisSection';
import StudentsSection from '../components/reports/StudentsSection';
import ReportsDownloadSection from '../components/reports/ReportsDownloadSection';
import AssociateChairpersonReports from '../components/reports/AssociateChairpersonReports';
import ChairpersonReports from '../components/reports/ChairpersonReports';

const ReportsPage = ({ userData: propUserData }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState("");
  const [advisorYear, setAdvisorYear] = useState(null);
  const [userData, setUserData] = useState(propUserData || null);
  const isAcademicAdvisor = userData?.role === "Academic Advisor";
  const isAssociateChairperson = userData?.role === "Associate Chairperson";
  const isChairperson = userData?.role === "Chairperson";
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('categories'); // Changed default to categories
  const [reportData, setReportData] = useState({
    availableClasses: [],
    topStudents: [],
    popularCategories: [],
    approvalRates: [],
    trends: [],
    classPerformance: [],
    detailedStudentPerformance: [],
    inactiveStudents: [],
    classParticipation: [],
    categoryPerformanceByClass: [],
    prizeMoneyByClass: [] // HOD only
  });

  // Fetch user data if not provided as prop
  useEffect(() => {
    if (!userData) {
      const fetchUserData = async () => {
        try {
          const authAxios = createAuthAxios();
          if (!authAxios) return;
          
          const response = await authAxios.get('/teacher/profile');
          if (response.data) {
            setUserData(response.data);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          navigate('/teacher-login');
        }
      };
      
      fetchUserData();
    }
  }, [userData, navigate]);

  // Update active section based on user role
  useEffect(() => {
    if (userData) {
      if (isChairperson) {
        setActiveSection('chairperson-reports');
      } else if (isAssociateChairperson) {
        setActiveSection('associate-reports');
      } else {
        setActiveSection('categories');
      }
    }
  }, [userData, isChairperson, isAssociateChairperson]);

  // Sidebar navigation items - updated with new role-based items
  const getSidebarItems = () => {
    const baseItems = [
      { id: 'categories', label: 'Categories', icon: <PieChart size={20} /> },
      { id: 'class-analysis', label: 'Class Analysis', icon: <BarChart2 size={20} /> },
      { id: 'students', label: 'Students', icon: <Users size={20} /> },
      { id: 'downloads', label: 'Downloads', icon: <Download size={20} /> }
    ];

    if (isChairperson) {
      return [
        { id: 'chairperson-reports', label: 'Chairperson Dashboard', icon: <Building2 size={20} /> },
        ...baseItems
      ];
    } else if (isAssociateChairperson) {
      return [
        { id: 'associate-reports', label: 'Associate Chair Dashboard', icon: <Settings size={20} /> },
        ...baseItems
      ];
    }

    return baseItems;
  };

  const sidebarItems = getSidebarItems();

  // Create authenticated axios instance
  const createAuthAxios = () => {
    const token = localStorage.getItem("teacher-token");
    if (!token) {
      console.error("No authentication token found");
      navigate("/teacher-login");
      return null;
    }
    
    return axios.create({
      baseURL: import.meta.env.VITE_BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  };

  // Helper function for API calls - now includes year filter
  const fetchFromApi = async (endpoint, params = {}) => {
    try {
      const authAxios = createAuthAxios();
      if (!authAxios) return { success: false, message: "Authentication failed" };
      
      // Add year filter if it's set
      if (yearFilter) {
        params.year = yearFilter;
      }
      
      console.log(`Fetching from: ${endpoint} with params:`, params);
      const response = await authAxios.get(endpoint, { params });
      console.log(`Response from ${endpoint}:`, response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`Error fetching from ${endpoint}:`, error);
      console.error('Error details:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        // If unauthorized, redirect to login
        navigate("/teacher-login");
      }
      
      return { 
        success: false, 
        message: error.response?.data?.message || "Failed to fetch data" 
      };
    }
  };

  // Reload data when year filter changes
  useEffect(() => {
    fetchReportsData();
  }, [yearFilter]);

  // Main data fetching function
  const fetchReportsData = async () => {
    // Skip data fetching for Chairperson and Associate Chairperson roles
    // as they have their own data fetching mechanisms
    if (isChairperson || isAssociateChairperson) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Common reports for all roles - removed references to overview data
      const basicData = await Promise.allSettled([
        fetchFromApi('/reports/available-classes'),
        fetchFromApi('/reports/top-students'),
        fetchFromApi('/reports/popular-categories'),
        fetchFromApi('/reports/approval-rates'),
        fetchFromApi('/reports/class-performance')
      ]);
      
      // Advanced reports for faculty and HOD
      const advancedData = await Promise.allSettled([
        fetchFromApi('/reports/detailed-student-performance'),
        fetchFromApi('/reports/inactive-students'),
        fetchFromApi('/reports/class-participation'),
        fetchFromApi('/reports/category-performance-by-class')
      ]);
      
      // HOD-only report
      let hodData = null;
      if (userData?.role === 'HOD' || userData?.role === 'admin') {
        hodData = await fetchFromApi('/reports/prize-money-by-class');
      }
      
      // Process and set report data
      const newReportData = {
        availableClasses: basicData[0].status === 'fulfilled' && basicData[0].value.success 
          ? basicData[0].value.data.classes || [] : [],
        topStudents: basicData[1].status === 'fulfilled' && basicData[1].value.success 
          ? basicData[1].value.data.topStudents || [] : [],
        popularCategories: basicData[2].status === 'fulfilled' && basicData[2].value.success 
          ? basicData[2].value.data.popularCategories || [] : [],
        approvalRates: basicData[3].status === 'fulfilled' && basicData[3].value.success 
          ? basicData[3].value.data.approvalRates || [] : [],
        classPerformance: basicData[4].status === 'fulfilled' && basicData[4].value.success 
          ? basicData[4].value.data.performance || [] : [],
        detailedStudentPerformance: advancedData[0].status === 'fulfilled' && advancedData[0].value.success 
          ? advancedData[0].value.data.performance || [] : [],
        inactiveStudents: advancedData[1].status === 'fulfilled' && advancedData[1].value.success 
          ? advancedData[1].value.data || [] : [],
        classParticipation: advancedData[2].status === 'fulfilled' && advancedData[2].value.success 
          ? advancedData[2].value.data.participation || [] : [],
        categoryPerformanceByClass: advancedData[3].status === 'fulfilled' && advancedData[3].value.success 
          ? advancedData[3].value.data.performance || [] : [],
        prizeMoneyByClass: hodData?.success ? hodData.data.prizeMoneyByClass || [] : []
      };
      
      setReportData(newReportData);
      
    } catch (error) {
      console.error('Error in fetchReportsData:', error);
      setError('Failed to load reports data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchReportsData();
  }, [navigate, userData?.role]);

  // UseEffect to set the year filter when component loads
  useEffect(() => {
    if (isAcademicAdvisor && advisorYear) {
      // Set the year filter to the advisor's assigned year
      setYearFilter(advisorYear.toString());
    }
  }, [isAcademicAdvisor, advisorYear]);

  // Detect advisor's assigned year when component loads
  useEffect(() => {
    const fetchAdvisorYear = async () => {
      if (userData?.role === "Academic Advisor") {
        try {
          const token = localStorage.getItem("teacher-token");
          // Use a dedicated API endpoint to just get the advisor's year
          const response = await axios.get(
            `${import.meta.env.VITE_BASE_URL}/reports/advisor-year`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          
          if (response.data.success && response.data.year) {
            // Set the year filter to the advisor's year
            setYearFilter(response.data.year.toString());
            setAdvisorYear(response.data.year);
          }
        } catch (error) {
          console.error("Error fetching advisor's year:", error);
          toast.error("Failed to determine your assigned year");
        }
      }
    };
    
    fetchAdvisorYear();
  }, [userData]);

  // Add useEffect to detect advisor year from available classes
  useEffect(() => {
    // Only run this effect when classes are loaded and user is an Academic Advisor
    if (isAcademicAdvisor && reportData.availableClasses && reportData.availableClasses.length > 0) {
      // Extract year from classes (they should all be the same year for an advisor)
      const year = reportData.availableClasses[0].year;
      
      console.log("Setting advisor year to:", year);
      
      // Set the advisor's year
      setAdvisorYear(year);
      
      // Also update the year filter to match
      setYearFilter(year.toString());
    }
  }, [reportData.availableClasses, isAcademicAdvisor]);

  // Function to render the active section
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      );
    }
    
    switch (activeSection) {
      case 'chairperson-reports':
        return <ChairpersonReports />;
      case 'associate-reports':
        return <AssociateChairpersonReports />;
      case 'categories':
        return <CategoriesSection 
          popularCategories={reportData.popularCategories}
          categoryPerformanceByClass={reportData.categoryPerformanceByClass}
        />;
      case 'class-analysis':
        return <ClassAnalysisSection 
          classPerformance={reportData.classPerformance}
          classParticipation={reportData.classParticipation}
          availableClasses={reportData.availableClasses}
        />;
      case 'students':
        return <StudentsSection 
          detailedStudentPerformance={reportData.detailedStudentPerformance}
          inactiveStudents={reportData.inactiveStudents}
          availableClasses={reportData.availableClasses}
        />;
      case 'downloads':
        return <ReportsDownloadSection fetchFromApi={fetchFromApi} />;
      default:
        return <div>Select a section from the sidebar</div>;
    }
  };

  // Modify the year filter change handler
  const handleYearFilterChange = (e) => {
    const selectedYear = e.target.value;
    
    // For Academic Advisors, prevent changing the year
    if (isAcademicAdvisor && advisorYear) {
      if (parseInt(selectedYear) !== advisorYear) {
        toast.error("As an Academic Advisor, you can only view reports for your assigned year");
        return;
      }
    }
    
    setYearFilter(selectedYear);
  };

  return (
    <div className="flex h-full bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md hidden md:block">
        <div className="p-5">
          <h1 className="text-xl font-bold text-blue-600">Reports Dashboard</h1>
        </div>
        <nav className="mt-5">
          <ul>
            {sidebarItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center w-full px-5 py-3 text-left ${
                    activeSection === item.id
                      ? "bg-blue-50 text-blue-600 border-r-4 border-blue-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Year Filter + Mobile Navigation */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
          <div className="w-full md:w-auto">
            <select
              className="w-full md:w-48 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value)}
            >
              {sidebarItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Year Filter - Added "All Years" option */}
          <div className="w-full md:w-auto md:ml-auto">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-500" />
              <select
                value={yearFilter}
                onChange={handleYearFilterChange}
                disabled={isAcademicAdvisor}
                className={`${isAcademicAdvisor ? 'cursor-not-allowed opacity-75' : ''} p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
                <option value="5">5th Year</option>
              </select>
            </div>
            {/* Add a helper text for Academic Advisors */}
            {isAcademicAdvisor && advisorYear && (
              <p className="text-xs text-gray-500 mt-1">
                As an Academic Advisor, you can only view reports for year {advisorYear}.
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        {renderContent()}
      </div>
    </div>
  );
};

export default ReportsPage;