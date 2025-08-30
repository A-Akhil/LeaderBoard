import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { Users, TrendingUp, Calendar, Award, Activity, BookOpen, UserCheck, AlertCircle } from 'lucide-react';
import { associateChairpersonReportsAPI } from '../../services/chairpersonReports';

const AssociateChairpersonReports = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('performance');
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await associateChairpersonReportsAPI.getDashboard();
      if (response.success) {
        setDashboardData(response.data);
      } else {
        setError('Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const applyDateFilter = async () => {
    if (!dateFilter.startDate || !dateFilter.endDate) {
      alert('Please select both start and end dates');
      return;
    }

    try {
      setLoading(true);
      const eventAnalysis = await associateChairpersonReportsAPI.getEventAnalysis(dateFilter);
      if (eventAnalysis.success) {
        setDashboardData(prev => ({
          ...prev,
          eventAnalysis: eventAnalysis.data
        }));
      }
    } catch (err) {
      console.error('Error applying date filter:', err);
      setError('Failed to apply date filter');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Dashboard</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-gray-800">No Data Available</h2>
          <p className="text-gray-600">Unable to load dashboard data</p>
        </div>
      </div>
    );
  }

  const { departmentPerformance, eventAnalysis, facultyOverview } = dashboardData;

  // Performance Dashboard Tab
  const PerformanceDashboard = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Department Performance Dashboard</h2>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Managed Departments</p>
              <p className="text-2xl font-bold text-blue-800">{departmentPerformance?.summary?.totalDepartments || 0}</p>
            </div>
            <BookOpen className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Total Students</p>
              <p className="text-2xl font-bold text-green-800">{departmentPerformance?.summary?.totalStudents || 0}</p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Recent Events</p>
              <p className="text-2xl font-bold text-purple-800">{departmentPerformance?.summary?.totalEvents || 0}</p>
            </div>
            <Calendar className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-orange-50 p-6 rounded-lg border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">Avg Participation</p>
              <p className="text-2xl font-bold text-orange-800">{departmentPerformance?.summary?.averageParticipation || 0}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Department Performance Chart */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Department Performance Comparison</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={departmentPerformance?.performanceData || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="department" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="averagePoints" fill="#3B82F6" name="Avg Points" />
            <Bar yAxisId="right" dataKey="participationRate" fill="#10B981" name="Participation %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Department Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {departmentPerformance?.performanceData?.map((dept, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-md border">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">{dept.department}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded">
                <p className="text-sm text-blue-600">Total Students</p>
                <p className="text-xl font-bold text-blue-800">{dept.totalStudents}</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <p className="text-sm text-green-600">Avg Points</p>
                <p className="text-xl font-bold text-green-800">{dept.averagePoints}</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded">
                <p className="text-sm text-purple-600">Recent Events</p>
                <p className="text-xl font-bold text-purple-800">{dept.recentEvents}</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded">
                <p className="text-sm text-orange-600">Participation</p>
                <p className="text-xl font-bold text-orange-800">{dept.participationRate}%</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Event Analysis Tab
  const EventAnalysis = () => {
    const categoryData = eventAnalysis?.categoryAnalysis?.reduce((acc, item) => {
      const existing = acc.find(a => a.category === item.category);
      if (existing) {
        existing.eventCount += item.eventCount;
        existing.totalPoints += item.totalPoints;
      } else {
        acc.push({
          category: item.category,
          eventCount: item.eventCount,
          totalPoints: item.totalPoints
        });
      }
      return acc;
    }, []) || [];

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Event Analysis</h2>
          
          {/* Date Filter */}
          <div className="flex items-center space-x-4">
            <input
              type="date"
              value={dateFilter.startDate}
              onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateFilter.endDate}
              onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <button
              onClick={applyDateFilter}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Apply Filter
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Events</p>
                <p className="text-2xl font-bold text-blue-800">{eventAnalysis?.summary?.totalEvents || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Total Points</p>
                <p className="text-2xl font-bold text-green-800">{eventAnalysis?.summary?.totalPoints || 0}</p>
              </div>
              <Award className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Categories</p>
                <p className="text-2xl font-bold text-purple-800">{eventAnalysis?.summary?.totalCategories || 0}</p>
              </div>
              <BookOpen className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Category Analysis Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Events by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, eventCount }) => `${category}: ${eventCount}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="eventCount"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Points by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalPoints" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Trends */}
        {eventAnalysis?.monthlyTrends && eventAnalysis.monthlyTrends.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Event Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={eventAnalysis.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id.month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="eventCount" stroke="#3B82F6" name="Events" />
                <Line type="monotone" dataKey="totalPoints" stroke="#10B981" name="Points" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  // Faculty Overview Tab
  const FacultyOverview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Faculty Overview</h2>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Total Faculty</p>
              <p className="text-2xl font-bold text-blue-800">{facultyOverview?.summary?.totalFaculty || 0}</p>
            </div>
            <UserCheck className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Total Classes</p>
              <p className="text-2xl font-bold text-green-800">{facultyOverview?.summary?.totalClasses || 0}</p>
            </div>
            <BookOpen className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Total Students</p>
              <p className="text-2xl font-bold text-purple-800">{facultyOverview?.summary?.totalStudents || 0}</p>
            </div>
            <Users className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-orange-50 p-6 rounded-lg border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">Recent Events</p>
              <p className="text-2xl font-bold text-orange-800">{facultyOverview?.summary?.totalRecentEvents || 0}</p>
            </div>
            <Activity className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Faculty Performance Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Faculty Performance Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Faculty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Classes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Students
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recent Events
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Points/Student
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {facultyOverview?.facultyData?.map((faculty, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{faculty.name}</div>
                      <div className="text-sm text-gray-500">{faculty.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {faculty.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {faculty.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {faculty.classCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {faculty.studentCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {faculty.recentEvents}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {faculty.averagePointsPerStudent}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Associate Chairperson Dashboard</h1>
          <p className="text-gray-600">Comprehensive reports for your managed departments</p>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('performance')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'performance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Department Performance
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'events'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Event Analysis
            </button>
            <button
              onClick={() => setActiveTab('faculty')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'faculty'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Faculty Overview
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'performance' && <PerformanceDashboard />}
        {activeTab === 'events' && <EventAnalysis />}
        {activeTab === 'faculty' && <FacultyOverview />}
      </div>
    </div>
  );
};

export default AssociateChairpersonReports;