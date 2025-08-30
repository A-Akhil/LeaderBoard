import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Building2, TrendingUp, Users, Award, Activity, BookOpen, UserCheck, AlertCircle, Target, Settings, CheckCircle, Clock, XCircle } from 'lucide-react';
import { chairpersonReportsAPI } from '../../services/chairpersonReports';

const ChairpersonReports = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('institution');
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await chairpersonReportsAPI.getDashboard();
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
      const response = await chairpersonReportsAPI.getDashboard(dateFilter);
      if (response.success) {
        setDashboardData(response.data);
      }
    } catch (err) {
      console.error('Error applying date filter:', err);
      setError('Failed to apply date filter');
    } finally {
      setLoading(false);
    }
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

  const { institutionOverview, comparativeAnalysis, administrativeInsights } = dashboardData;

  // Institution Overview Tab
  const InstitutionOverview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Institution Overview</h2>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Departments</p>
              <p className="text-2xl font-bold text-blue-800">{institutionOverview?.institutionSummary?.totalDepartments || 0}</p>
            </div>
            <Building2 className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Students</p>
              <p className="text-2xl font-bold text-green-800">{institutionOverview?.institutionSummary?.totalStudents || 0}</p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Faculty</p>
              <p className="text-2xl font-bold text-purple-800">{institutionOverview?.institutionSummary?.totalFaculty || 0}</p>
            </div>
            <UserCheck className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-orange-50 p-6 rounded-lg border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">Recent Events</p>
              <p className="text-2xl font-bold text-orange-800">{institutionOverview?.institutionSummary?.recentEvents || 0}</p>
            </div>
            <Activity className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        
        <div className="bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-600 text-sm font-medium">Recent Points</p>
              <p className="text-2xl font-bold text-yellow-800">{institutionOverview?.institutionSummary?.recentPoints || 0}</p>
            </div>
            <Award className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Department Breakdown Chart */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Department Performance Breakdown</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={institutionOverview?.departmentBreakdown || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="department" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="students" fill="#3B82F6" name="Students" />
            <Bar yAxisId="left" dataKey="faculty" fill="#10B981" name="Faculty" />
            <Bar yAxisId="right" dataKey="recentEvents" fill="#F59E0B" name="Recent Events" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Performing Departments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Performing Departments</h3>
          <div className="space-y-4">
            {institutionOverview?.topPerformingDepartments?.map((dept, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">{dept.department}</h4>
                    <p className="text-sm text-gray-600">{dept.students} students, {dept.faculty} faculty</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">{dept.recentPoints} pts</p>
                  <p className="text-sm text-gray-600">{dept.recentEvents} events</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Department Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={institutionOverview?.departmentBreakdown || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ department, students }) => `${department}: ${students}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="students"
              >
                {(institutionOverview?.departmentBreakdown || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  // Comparative Analysis Tab
  const ComparativeAnalysis = () => {
    const insights = comparativeAnalysis?.insights || {};
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Comparative Analysis</h2>
          
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

        {/* Key Insights Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Top Department</p>
                <p className="text-xl font-bold text-green-800">{insights.topDepartment?.department || 'N/A'}</p>
                <p className="text-sm text-green-600">{insights.topDepartment?.averagePointsPerStudent || 0} avg points</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Most Active</p>
                <p className="text-xl font-bold text-blue-800">{insights.mostActiveDepartment?.department || 'N/A'}</p>
                <p className="text-sm text-blue-600">{insights.mostActiveDepartment?.periodEvents || 0} events</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Best Participation</p>
                <p className="text-xl font-bold text-purple-800">{insights.highestParticipation?.department || 'N/A'}</p>
                <p className="text-sm text-purple-600">{insights.highestParticipation?.participationRate || 0}% rate</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Department Comparison Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Department Performance Comparison</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={comparativeAnalysis?.departmentComparison || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="averagePointsPerStudent" fill="#3B82F6" name="Avg Points/Student" />
              <Bar yAxisId="right" dataKey="participationRate" fill="#10B981" name="Participation %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Department Performance Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Detailed Department Comparison</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Students
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period Events
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active Students
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participation Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {comparativeAnalysis?.departmentComparison?.map((dept, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{dept.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dept.totalStudents}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dept.averagePointsPerStudent}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dept.periodEvents}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dept.activeStudents}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(dept.participationRate, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900">{dept.participationRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Comparison */}
        {comparativeAnalysis?.categoryComparison && comparativeAnalysis.categoryComparison.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Category Performance Across Departments</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparativeAnalysis.categoryComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalEvents" fill="#3B82F6" name="Total Events" />
                <Bar dataKey="totalPoints" fill="#10B981" name="Total Points" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  // Administrative Insights Tab
  const AdministrativeInsights = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Administrative Insights</h2>
      
      {/* Recommendations */}
      {administrativeInsights?.recommendations && administrativeInsights.recommendations.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Recommendations
          </h3>
          <div className="space-y-4">
            {administrativeInsights.recommendations.map((rec, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg border-l-4 ${
                  rec.priority === 'high' ? 'bg-red-50 border-red-500' :
                  rec.priority === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                  'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {rec.priority === 'high' ? (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    ) : rec.priority === 'medium' ? (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                  <div>
                    <p className={`font-medium ${
                      rec.priority === 'high' ? 'text-red-800' :
                      rec.priority === 'medium' ? 'text-yellow-800' :
                      'text-blue-800'
                    }`}>
                      {rec.type.charAt(0).toUpperCase() + rec.type.slice(1)} - {rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)} Priority
                    </p>
                    <p className={`text-sm ${
                      rec.priority === 'high' ? 'text-red-600' :
                      rec.priority === 'medium' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`}>
                      {rec.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Faculty Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Faculty Distribution by Department</h3>
          <div className="space-y-4">
            {administrativeInsights?.facultyDistribution?.map((dept, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">{dept._id}</h4>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Total Faculty</span>
                  <span className="font-medium">{dept.totalFaculty}</span>
                </div>
                <div className="space-y-1">
                  {dept.roles?.map((role, roleIndex) => (
                    <div key={roleIndex} className="flex justify-between text-sm">
                      <span className="text-gray-600">{role.role}</span>
                      <span className="text-gray-800">{role.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Student-Faculty Ratios</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={administrativeInsights?.studentFacultyRatios || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="ratio" fill="#3B82F6" name="Student:Faculty Ratio" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Approval Trends */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Event Approval Trends by Department</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {administrativeInsights?.approvalTrends?.map((dept, index) => {
            const approved = dept.statusBreakdown?.find(s => s.status === 'Approved')?.count || 0;
            const pending = dept.statusBreakdown?.find(s => s.status === 'Pending')?.count || 0;
            const rejected = dept.statusBreakdown?.find(s => s.status === 'Rejected')?.count || 0;
            const total = approved + pending + rejected;
            
            return (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">{dept._id}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Approved
                    </span>
                    <span className="font-medium">{approved}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-yellow-600 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Pending
                    </span>
                    <span className="font-medium">{pending}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-red-600 flex items-center gap-1">
                      <XCircle className="h-4 w-4" />
                      Rejected
                    </span>
                    <span className="font-medium">{rejected}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total</span>
                      <span className="font-bold">{total}</span>
                    </div>
                    {total > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        Approval Rate: {Math.round((approved / total) * 100)}%
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resource Allocation */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Resource Allocation Metrics</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={administrativeInsights?.resourceAllocation || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="_id" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="totalEvents" fill="#3B82F6" name="Total Events" />
            <Bar yAxisId="right" dataKey="avgPointsPerEvent" fill="#10B981" name="Avg Points/Event" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Chairperson Dashboard</h1>
          <p className="text-gray-600">Comprehensive institution-wide analytics and insights</p>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('institution')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'institution'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Institution Overview
            </button>
            <button
              onClick={() => setActiveTab('comparative')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'comparative'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Comparative Analysis
            </button>
            <button
              onClick={() => setActiveTab('administrative')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'administrative'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Administrative Insights
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'institution' && <InstitutionOverview />}
        {activeTab === 'comparative' && <ComparativeAnalysis />}
        {activeTab === 'administrative' && <AdministrativeInsights />}
      </div>
    </div>
  );
};

export default ChairpersonReports;