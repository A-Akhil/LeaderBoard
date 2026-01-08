import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  PieChart, BarChart2, Users, Download, Filter
} from 'lucide-react';
import { toast } from 'react-toastify'; // Add toast import if missing

// Import section components - removed OverviewSection
import CategoriesSection from '../components/reports/CategoriesSection';
import ClassAnalysisSection from '../components/reports/ClassAnalysisSection';
import StudentsSection from '../components/reports/StudentsSection';
import ReportsDownloadSection from '../components/reports/ReportsDownloadSection';

const decodeTokenPayload = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
      return `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`;
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

const isTokenValid = (token) => {
  const payload = decodeTokenPayload(token);
  if (!payload || !payload.exp) {
    return false;
  }
  const expiryMs = payload.exp * 1000;
  return expiryMs > Date.now();
};

const resolveReportAuth = () => {
  if (typeof window === 'undefined') {
    return { token: null, context: null };
  }

  const teacherToken = localStorage.getItem('teacher-token');
  if (teacherToken) {
    if (isTokenValid(teacherToken)) {
      return { token: teacherToken, context: 'teacher' };
    }
    localStorage.removeItem('teacher-token');
  }

  const adminToken = localStorage.getItem('admin-token');
  if (adminToken) {
    if (isTokenValid(adminToken)) {
      return { token: adminToken, context: 'admin' };
    }
    localStorage.removeItem('admin-token');
  }

  return { token: null, context: null };
};

const ReportsPage = ({ userData }) => {
  const navigate = useNavigate();
  const [authContext, setAuthContext] = useState(() => resolveReportAuth().context);
  const authWarningShownRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState("");
  const [advisorYear, setAdvisorYear] = useState(null);
  const isAcademicAdvisor = userData?.role === "Academic Advisor";
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

  // Sidebar navigation items - removed overview
  const sidebarItems = [
    { id: 'categories', label: 'Categories', icon: <PieChart size={20} /> },
    { id: 'class-analysis', label: 'Class Analysis', icon: <BarChart2 size={20} /> },
    { id: 'students', label: 'Students', icon: <Users size={20} /> },
    { id: 'downloads', label: 'Downloads', icon: <Download size={20} /> }
  ];

  const createAuthAxios = useCallback(() => {
    const { token, context } = resolveReportAuth();

    if (context !== authContext) {
      setAuthContext(context);
    }

    if (!token) {
      if (!authWarningShownRef.current) {
        toast.error('Please log in to view reports');
        authWarningShownRef.current = true;
      }
      const onAdminRoute = window.location.pathname.includes('admin');
      navigate(onAdminRoute ? '/admin-login' : '/teacher-login');
      return null;
    }

    authWarningShownRef.current = false;

    return axios.create({
      baseURL: import.meta.env.VITE_BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }, [authContext, navigate]);

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
        const { context } = resolveReportAuth();
        if (context === 'admin' || authContext === 'admin') {
          navigate('/admin-login');
        } else {
          navigate('/teacher-login');
        }
      }
      
      return { 
        success: false, 
        message: error.response?.data?.message || "Failed to fetch data" 
      };
    }
  };

  // Reload data when year filter changes
  useEffect(() => {
    if (!authContext) {
      return;
    }
    fetchReportsData();
  }, [yearFilter, authContext]);

  // Main data fetching function
  const fetchReportsData = async () => {
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
    if (!authContext) {
      return;
    }
    fetchReportsData();
  }, [navigate, userData?.role, authContext]);

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
      if (userData?.role !== 'Academic Advisor' || authContext !== 'teacher') {
        return;
      }

      try {
        const authAxios = createAuthAxios();
        if (!authAxios) {
          return;
        }

        const response = await authAxios.get('/reports/advisor-year');
        
        if (response.data.success && response.data.year) {
          setYearFilter(response.data.year.toString());
          setAdvisorYear(response.data.year);
        }
      } catch (error) {
        console.error("Error fetching advisor's year:", error);
        if (error.response?.status === 401) {
          navigate('/teacher-login');
        } else {
          toast.error("Failed to determine your assigned year");
        }
      }
    };
    
    fetchAdvisorYear();
  }, [userData, authContext, createAuthAxios, navigate]);

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