import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Award,
  Users,
  Calendar,
  DollarSign,
  Target,
  Activity,
  Building,
  BookOpen,
  Zap,
  ArrowLeft,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  Map
} from 'lucide-react';

const DepartmentAnalyticsPage = ({ userData, handleBackToDashboard }) => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({});
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  
  const VITE_BASE_URL = import.meta.env.VITE_BASE_URL;
  const token = localStorage.getItem('teacher-token');

  console.log('Frontend: VITE_BASE_URL from env:', import.meta.env.VITE_BASE_URL);
  console.log('Frontend: VITE_BASE_URL assigned:', VITE_BASE_URL);

  // Color schemes for charts
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];
  const departmentColors = {
    'CTECH': '#3B82F6',
    'CINTEL': '#10B981', 
    'DSBS': '#F59E0B',
    'NWC': '#EF4444'
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, selectedDepartment]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Construct the URL (VITE_BASE_URL already includes /api)
      const url = `${VITE_BASE_URL}/department-analytics/dashboard`;
      console.log('Frontend: Fetching analytics from URL:', url);
      console.log('Frontend: VITE_BASE_URL:', VITE_BASE_URL);
      console.log('Frontend: Token:', token ? 'Present' : 'Missing');
      console.log('Frontend: Params:', { timeRange, department: selectedDepartment !== 'all' ? selectedDepartment : undefined });
      
      // Fetch comprehensive dashboard data
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params: {
          timeRange,
          department: selectedDepartment !== 'all' ? selectedDepartment : undefined
        }
      });

      console.log('Frontend: Analytics response:', response.data);
      if (response.data.success && response.data.data) {
        setAnalytics(response.data.data);
        console.log('Frontend: Analytics data set:', response.data.data);
      } else {
        console.error('Frontend: Invalid response structure:', response.data);
      }
    } catch (error) {
      console.error('Frontend: Error fetching analytics:', error);
      console.error('Frontend: Error response:', error.response);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-gray-600">Loading Department Analytics...</p>
        </div>
      </div>
    );
  }

  const MetricCard = ({ icon: Icon, title, value, subtitle, trend, color = 'blue' }) => (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm text-gray-600">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={Building}
          title="Active Departments"
          value={analytics.overview?.totalDepartments || 0}
          subtitle="Currently tracked"
          color="blue"
        />
        <MetricCard
          icon={Users}
          title="Total Students"
          value={analytics.overview?.overallMetrics?.totalStudents || 0}
          subtitle="Across all departments"
          color="green"
        />
        <MetricCard
          icon={Activity}
          title="Total Events"
          value={analytics.overview?.overallMetrics?.totalEvents || 0}
          subtitle="This academic year"
          trend={analytics.overview?.eventGrowth}
          color="purple"
        />
        <MetricCard
          icon={Award}
          title="Total Points"
          value={analytics.overview?.overallMetrics?.totalPoints || 0}
          subtitle="Earned by students"
          trend={analytics.overview?.pointsGrowth}
          color="orange"
        />
      </div>

      {/* Department Performance Comparison */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Department Performance Comparison
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={analytics.performanceComparison || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="department" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="totalPoints" name="Total Points" fill="#3B82F6" />
            <Bar dataKey="averagePoints" name="Avg Points" fill="#10B981" />
            <Bar dataKey="participationRate" name="Participation Rate %" fill="#F59E0B" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Activity Overview */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Map className="h-5 w-5" />
          Department Activity Overview
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={analytics.overview?.departments || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="department" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="eventCount" 
              stackId="1" 
              stroke="#3B82F6" 
              fill="#3B82F6" 
              fillOpacity={0.6}
              name="Event Count"
            />
            <Area 
              type="monotone" 
              dataKey="participationRate" 
              stackId="2" 
              stroke="#10B981" 
              fill="#10B981" 
              fillOpacity={0.6}
              name="Participation Rate %"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const PerformanceTab = () => (
    <div className="space-y-6">
      {/* Department Rankings */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Award className="h-5 w-5" />
          Department Rankings
        </h3>
        <div className="space-y-4">
          {analytics.rankings?.map((dept, index) => (
            <div key={dept.department} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                  index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{dept.department}</h4>
                  <p className="text-sm text-gray-600">{dept.studentCount} students</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900">{dept.totalPoints}</p>
                <p className="text-sm text-gray-600">points (avg: {dept.averagePoints})</p>
                {dept.eventGrowth !== undefined && (
                  <p className={`text-xs flex items-center gap-1 ${
                    dept.eventGrowth > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {dept.eventGrowth > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {Math.abs(dept.eventGrowth)}%
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          Event Category Distribution
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={analytics.categoryAnalysis?.popularCategories || []}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ category, totalCount }) => `${category}: ${totalCount}`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="totalCount"
            >
              {(analytics.categoryAnalysis?.popularCategories || []).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const EngagementTab = () => {
    // Create mock weekly patterns from department data
    const weeklyPatterns = analytics.overview?.departments?.map((dept, index) => ({
      day: dept.department,
      submissions: dept.eventCount || 0,
      approvals: Math.floor((dept.eventCount || 0) * 0.85) // Assume 85% approval rate
    })) || [];

    return (
      <div className="space-y-6">
        {/* Engagement Patterns */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Department Event Patterns
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyPatterns}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="submissions" 
                stroke="#3B82F6" 
                strokeWidth={3}
                name="Total Events"
              />
              <Line 
                type="monotone" 
                dataKey="approvals" 
                stroke="#10B981" 
                strokeWidth={3}
                name="Estimated Approvals"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Faculty Performance */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Department Performance Metrics
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={analytics.overview?.departments || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="participationRate" name="Participation Rate %" fill="#3B82F6" />
              <Bar dataKey="achievementRate" name="Achievement Rate %" fill="#F59E0B" />
              <Bar dataKey="eventCount" name="Event Count" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const OpportunitiesTab = () => (
    <div className="space-y-6">
      {/* Untapped Opportunities */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Target className="h-5 w-5" />
          Low Participation Categories by Department
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {analytics.opportunities?.map((dept) => (
            <div key={dept.department} className="border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">{dept.department}</h4>
              <p className="text-sm text-gray-600 mb-3">Total Students: {dept.totalStudents}</p>
              <div className="space-y-2">
                {dept.lowParticipationCategories?.slice(0, 5).map((category, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <span className="text-sm font-medium text-gray-700">{category.category}</span>
                      <p className="text-xs text-gray-500">{category.recommendation}</p>
                    </div>
                    <span className="text-sm font-medium text-red-600">{category.participationRate}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prize Money Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Department Performance Analysis
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analytics.performanceComparison || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="department" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="totalPoints" name="Total Points" fill="#10B981" />
            <Bar dataKey="averagePoints" name="Average Points" fill="#3B82F6" />
            <Bar dataKey="participationRate" name="Participation Rate %" fill="#F59E0B" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBackToDashboard}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Department Analytics</h1>
              <p className="text-gray-600">
                {userData?.role === 'Chairperson' ? 'Institution-wide analytics' : 
                 userData?.role === 'Associate Chairperson' ? 'Multi-department analytics' : 
                 'Department-level analytics'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Time</option>
              <option value="current_year">Current Year</option>
              <option value="last_6_months">Last 6 Months</option>
              <option value="last_3_months">Last 3 Months</option>
            </select>
            
            {(userData?.role === 'Chairperson' || userData?.role === 'Associate Chairperson') && (
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Departments</option>
                <option value="CTECH">CTECH</option>
                <option value="CINTEL">CINTEL</option>
                <option value="DSBS">DSBS</option>
                <option value="NWC">NWC</option>
              </select>
            )}
            
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="px-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: BarChart3 },
              { id: 'performance', name: 'Performance', icon: TrendingUp },
              { id: 'engagement', name: 'Engagement', icon: Activity },
              { id: 'opportunities', name: 'Opportunities', icon: Target }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon size={16} />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'performance' && <PerformanceTab />}
        {activeTab === 'engagement' && <EngagementTab />}
        {activeTab === 'opportunities' && <OpportunitiesTab />}
      </div>
    </div>
  );
};

export default DepartmentAnalyticsPage;
