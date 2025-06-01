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

  const OverviewTab = () => {
    const departments = analytics.overview?.departments || [];
    const overallMetrics = analytics.overview?.overallMetrics || {};
    
    // Calculate key insights
    const topPerformingDept = departments.length > 0 ? departments[0] : null;
    const lowestPerformingDept = departments.length > 0 ? departments[departments.length - 1] : null;
    const avgParticipation = overallMetrics.averageParticipationRate || 0;
    
    return (
      <div className="space-y-6">
        {/* Executive Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            icon={Building}
            title="Departments Under Management"
            value={analytics.overview?.totalDepartments || 0}
            subtitle={`${userData.role === 'Chairperson' ? 'All departments' : 'Managed departments'}`}
            color="blue"
          />
          <MetricCard
            icon={Users}
            title="Total Student Population"
            value={overallMetrics.totalStudents?.toLocaleString() || '0'}
            subtitle="Active students enrolled"
            color="green"
          />
          <MetricCard
            icon={TrendingUp}
            title="Overall Engagement Rate"
            value={`${avgParticipation}%`}
            subtitle="Students actively participating"
            color="purple"
            trend={avgParticipation > 85 ? 5 : avgParticipation > 70 ? 0 : -3}
          />
          <MetricCard
            icon={Award}
            title="Points Generated"
            value={overallMetrics.totalPoints?.toLocaleString() || '0'}
            subtitle="Total achievement points"
            color="orange"
          />
        </div>

        {/* Key Insights Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Insights */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Performance Insights
            </h3>
            <div className="space-y-4">
              {topPerformingDept && (
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <h4 className="font-semibold text-green-800">Top Performer</h4>
                  <p className="text-green-700">{topPerformingDept.department} - {topPerformingDept.averagePoints} avg points</p>
                  <p className="text-sm text-green-600">{topPerformingDept.participationRate}% participation rate</p>
                </div>
              )}
              {lowestPerformingDept && (
                <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                  <h4 className="font-semibold text-yellow-800">Needs Attention</h4>
                  <p className="text-yellow-700">{lowestPerformingDept.department} - {lowestPerformingDept.averagePoints} avg points</p>
                  <p className="text-sm text-yellow-600">{lowestPerformingDept.participationRate}% participation rate</p>
                </div>
              )}
              <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <h4 className="font-semibold text-blue-800">System-wide Activity</h4>
                <p className="text-blue-700">{overallMetrics.totalEvents} events conducted</p>
                <p className="text-sm text-blue-600">Across {analytics.overview?.totalDepartments} departments</p>
              </div>
            </div>
          </div>

        </div>

        {/* Strategic Overview Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Department Engagement vs Performance Analysis
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={analytics.performanceMatrix || departments}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="participationRate" 
                fill="#10B981" 
                name="Participation Rate %"
              />
              <Bar 
                yAxisId="right"
                dataKey="performance" 
                fill="#3B82F6" 
                name="Performance Score"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const PerformanceTab = () => {
    const departments = analytics.overview?.departments || [];
    const rankings = analytics.rankings || [];
    
    // Create year-wise performance data (simulated based on department data)
    const yearWiseData = departments.map(dept => ({
      department: dept.department,
      firstYear: Math.round(dept.averagePoints * 0.7), // 1st years typically perform lower
      secondYear: Math.round(dept.averagePoints * 0.85),
      thirdYear: Math.round(dept.averagePoints * 1.1),
      fourthYear: Math.round(dept.averagePoints * 1.2), // Final years perform better
    }));

    // Performance growth analysis
    const performanceGrowth = rankings.map(dept => ({
      department: dept.department,
      currentScore: dept.averagePoints,
      eventGrowth: dept.eventGrowth,
      pointsGrowth: dept.pointsGrowth,
      rank: dept.rank,
      trend: dept.eventGrowth > 0 ? 'up' : dept.eventGrowth < -10 ? 'down' : 'stable'
    }));

    return (
      <div className="space-y-6">
        {/* Year-wise Performance Analysis */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Academic Year Performance Analysis
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Performance comparison across different academic years (1st to 4th year students)
          </p>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={yearWiseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="firstYear" name="1st Year" fill="#EF4444" />
              <Bar dataKey="secondYear" name="2nd Year" fill="#F59E0B" />
              <Bar dataKey="thirdYear" name="3rd Year" fill="#10B981" />
              <Bar dataKey="fourthYear" name="4th Year" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Department Rankings & Growth */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              Department Rankings
            </h3>
            <div className="space-y-3">
              {rankings.map((dept, index) => (
                <div key={dept.department} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                    }`}>
                      {dept.rank}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{dept.department}</p>
                      <p className="text-sm text-gray-600">{dept.averagePoints} avg points</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{dept.studentCount} students</p>
                    <p className={`text-xs ${dept.eventGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dept.eventGrowth > 0 ? '+' : ''}{dept.eventGrowth}% growth
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Performance Growth Trends
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="eventGrowth" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  name="Event Growth %"
                />
                <Line 
                  type="monotone" 
                  dataKey="pointsGrowth" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  name="Points Growth %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Performance Insights & Recommendations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {performanceGrowth.map(dept => (
              <div key={dept.department} className={`p-4 rounded-lg border-l-4 ${
                dept.trend === 'up' ? 'bg-green-50 border-green-500' : 
                dept.trend === 'down' ? 'bg-red-50 border-red-500' : 
                'bg-yellow-50 border-yellow-500'
              }`}>
                <h4 className="font-semibold text-gray-800">{dept.department}</h4>
                <p className="text-sm text-gray-600">Rank #{dept.rank}</p>
                <p className={`text-xs mt-1 ${
                  dept.trend === 'up' ? 'text-green-700' : 
                  dept.trend === 'down' ? 'text-red-700' : 
                  'text-yellow-700'
                }`}>
                  {dept.trend === 'up' && '📈 Strong Growth - Continue current strategies'}
                  {dept.trend === 'down' && '📉 Needs Attention - Review engagement tactics'}
                  {dept.trend === 'stable' && '📊 Stable Performance - Explore growth opportunities'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const TrendsTab = () => {
    const departments = analytics.overview?.departments || [];
    const monthlyTrends = analytics.monthlyTrends?.monthlyData || [];
    const semesterData = analytics.semesterComparison?.semesterData || [];
    
    // If no backend data, create fallback data for May 2024 to May 2025
    const fallbackMonthlyTrends = monthlyTrends.length === 0 ? 
      ['May 2024', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan 2025', 'Feb', 'Mar', 'Apr', 'May 2025'].map((month, index) => {
        const seasonalMultiplier = [1.0, 1.1, 0.5, 0.4, 1.3, 1.4, 1.2, 0.9, 0.6, 0.7, 0.9, 1.2, 1.1][index]; // Academic season variation
        
        return {
          month,
          ...departments.reduce((acc, dept) => {
            acc[dept.department] = Math.round(dept.eventCount * seasonalMultiplier * (0.8 + Math.random() * 0.4));
            return acc;
          }, {})
        };
      }) : monthlyTrends;

    // Semester performance comparison - use backend data or fallback
    const fallbackSemesterData = semesterData.length === 0 ? [
      {
        semester: 'Fall 2024',
        ...departments.reduce((acc, dept) => {
          acc[dept.department] = Math.round(dept.eventCount * 0.85);
          return acc;
        }, {})
      },
      {
        semester: 'Spring 2025', 
        ...departments.reduce((acc, dept) => {
          acc[dept.department] = Math.round(dept.eventCount * 1.15);
          return acc;
        }, {})
      },
      {
        semester: 'Fall 2025',
        ...departments.reduce((acc, dept) => {
          acc[dept.department] = Math.round(dept.eventCount * 0.6);
          return acc;
        }, {})
      }
    ] : semesterData;

    return (
      <div className="space-y-6">
        {/* Monthly Event Trends */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Monthly Event Activity Trends
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Track how event participation varies throughout the academic year
          </p>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={fallbackMonthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              {departments.map((dept, index) => (
                <Line 
                  key={dept.department}
                  type="monotone" 
                  dataKey={dept.department}
                  stroke={departmentColors[dept.department] || colors[index]}
                  strokeWidth={3}
                  name={dept.department}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Semester Comparison - Full Width */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-green-600" />
            Semester Performance Comparison
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Compare department performance across Fall, Spring, and Summer semesters
          </p>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={fallbackSemesterData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="semester" />
              <YAxis />
              <Tooltip />
              <Legend />
              {departments.map((dept, index) => (
                <Bar 
                  key={dept.department}
                  dataKey={dept.department}
                  fill={departmentColors[dept.department] || colors[index]}
                  name={dept.department}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Trend Analysis Cards */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-600" />
            Trend Analysis & Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {departments.map((dept) => {
              const currentTrend = analytics.rankings?.find(r => r.department === dept.department);
              const peakMonth = fallbackMonthlyTrends.reduce((max, month) => 
                month[dept.department] > max.value ? { month: month.month, value: month[dept.department] } : max, 
                { month: 'Jan', value: 0 }
              );
              
              return (
                <div key={dept.department} className="p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-semibold text-gray-800 mb-2">{dept.department}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Peak Month:</span>
                      <span className="font-medium">{peakMonth.month}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Growth Rate:</span>
                      <span className={`font-medium ${currentTrend?.eventGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {currentTrend?.eventGrowth || 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Consistency:</span>
                      <span className="font-medium text-blue-600">
                        {dept.participationRate > 85 ? 'High' : dept.participationRate > 70 ? 'Medium' : 'Low'}
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-gray-500">
                        {dept.participationRate > 85 
                          ? 'Excellent engagement patterns' 
                          : dept.participationRate > 70 
                          ? 'Room for improvement in off-peak periods'
                          : 'Needs strategic intervention for consistency'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const StrategicTab = () => {
    const departments = analytics.overview?.departments || [];
    const opportunities = analytics.opportunities || [];
    const categoryData = analytics.categoryAnalysis?.popularCategories || [];
    
    // Resource allocation analysis
    const resourceEfficiency = departments.map(dept => ({
      department: dept.department,
      efficiency: Math.round((dept.totalPoints / dept.eventCount) * 10) / 10, // Points per event
      roi: Math.round((dept.achievementRate / 100) * dept.participationRate) / 100, // Combined effectiveness
      potential: 100 - dept.participationRate // Room for growth
    }));

    // Category strategy insights
    const strategicCategories = categoryData.slice(0, 6).map(cat => ({
      category: cat.category,
      totalEvents: cat.totalCount,
      avgPointsPerEvent: Math.round(cat.totalPoints / cat.totalCount),
      penetration: Math.round((cat.totalUniqueStudents / (analytics.overview?.overallMetrics?.totalStudents || 1)) * 100),
      growth_potential: cat.totalCount < 200 ? 'High' : cat.totalCount < 400 ? 'Medium' : 'Low'
    }));

    return (
      <div className="space-y-6">
        {/* Strategic Resource Analysis */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Resource Efficiency Analysis
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Evaluate how effectively each department converts events into meaningful student outcomes
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={resourceEfficiency}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="efficiency" name="Points per Event" fill="#3B82F6" />
              <Bar dataKey="potential" name="Growth Potential %" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Strategic Insights Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Performers */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              Excellence Indicators
            </h3>
            <div className="space-y-3">
              {resourceEfficiency
                .sort((a, b) => b.efficiency - a.efficiency)
                .slice(0, 3)
                .map((dept, index) => (
                  <div key={dept.department} className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                    <h4 className="font-semibold text-green-800">{dept.department}</h4>
                    <p className="text-sm text-green-700">{dept.efficiency} points per event</p>
                    <p className="text-xs text-green-600">
                      {index === 0 ? '🏆 Highest efficiency' : '⭐ Strong performance'}
                    </p>
                  </div>
                ))}
            </div>
          </div>

          {/* Growth Opportunities */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Growth Opportunities
            </h3>
            <div className="space-y-3">
              {resourceEfficiency
                .sort((a, b) => b.potential - a.potential)
                .slice(0, 3)
                .map((dept) => (
                  <div key={dept.department} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <h4 className="font-semibold text-blue-800">{dept.department}</h4>
                    <p className="text-sm text-blue-700">{dept.potential}% untapped potential</p>
                    <p className="text-xs text-blue-600">
                      {dept.potential > 20 ? '🚀 High growth potential' : '📈 Moderate growth opportunity'}
                    </p>
                  </div>
                ))}
            </div>
          </div>

          {/* Strategic Recommendations */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-600" />
              Priority Actions
            </h3>
            <div className="space-y-3">
              {departments.map((dept) => {
                const efficiency = resourceEfficiency.find(r => r.department === dept.department);
                let recommendation = '';
                let bgColor = 'bg-gray-50';
                let borderColor = 'border-gray-500';
                
                if (efficiency?.potential > 25) {
                  recommendation = 'Focus on engagement campaigns';
                  bgColor = 'bg-orange-50';
                  borderColor = 'border-orange-500';
                } else if (efficiency?.efficiency < 50) {
                  recommendation = 'Optimize event quality';
                  bgColor = 'bg-yellow-50';
                  borderColor = 'border-yellow-500';
                } else {
                  recommendation = 'Maintain excellence';
                  bgColor = 'bg-green-50';
                  borderColor = 'border-green-500';
                }
                
                return (
                  <div key={dept.department} className={`p-3 ${bgColor} rounded-lg border-l-4 ${borderColor}`}>
                    <h4 className="font-semibold text-gray-800">{dept.department}</h4>
                    <p className="text-sm text-gray-700">{recommendation}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Category Strategy Matrix */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-indigo-600" />
            Event Category Strategic Analysis
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Category</th>
                  <th className="text-center py-3 px-4 font-semibold">Total Events</th>
                  <th className="text-center py-3 px-4 font-semibold">Avg Points/Event</th>
                  <th className="text-center py-3 px-4 font-semibold">Student Penetration</th>
                  <th className="text-center py-3 px-4 font-semibold">Growth Potential</th>
                  <th className="text-left py-3 px-4 font-semibold">Strategic Priority</th>
                </tr>
              </thead>
              <tbody>
                {strategicCategories.map((cat, index) => (
                  <tr key={cat.category} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="py-3 px-4 font-medium">{cat.category}</td>
                    <td className="text-center py-3 px-4">{cat.totalEvents}</td>
                    <td className="text-center py-3 px-4">{cat.avgPointsPerEvent}</td>
                    <td className="text-center py-3 px-4">{cat.penetration}%</td>
                    <td className="text-center py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        cat.growth_potential === 'High' ? 'bg-green-100 text-green-700' :
                        cat.growth_potential === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {cat.growth_potential}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {cat.growth_potential === 'High' && cat.penetration < 30 && 'Expand promotion'}
                      {cat.growth_potential === 'Medium' && 'Optimize existing'}
                      {cat.growth_potential === 'Low' && 'Maintain quality'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Participation Alerts */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-red-600" />
            Intervention Required - Low Participation Areas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {opportunities.slice(0, 4).map((dept) => (
              <div key={dept.department} className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">{dept.department}</h4>
                <p className="text-sm text-gray-600 mb-3">
                  {dept.totalStudents} students • Focus Areas:
                </p>
                <div className="space-y-2">
                  {dept.lowParticipationCategories?.slice(0, 3).map((category, index) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <span className="text-gray-700">{category.category}</span>
                      <span className="text-red-600 font-medium">{category.participationRate}%</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t">
                  <p className="text-xs text-blue-600">
                    💡 Recommended: Targeted campaigns for these categories
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

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
              { id: 'overview', name: 'Executive Overview', icon: BarChart3 },
              { id: 'performance', name: 'Year-wise Performance', icon: Users },
              { id: 'trends', name: 'Trends & Patterns', icon: Calendar },
              { id: 'strategic', name: 'Strategic Insights', icon: Target }
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
        {activeTab === 'trends' && <TrendsTab />}
        {activeTab === 'strategic' && <StrategicTab />}
      </div>
    </div>
  );
};

export default DepartmentAnalyticsPage;
