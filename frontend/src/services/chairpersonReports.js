import axios from 'axios';

// API for chairperson reports endpoints
const chairpersonReportsApi = axios.create({
  baseURL: `${import.meta.env.VITE_BASE_URL}/chairperson-reports`,
  withCredentials: true,
});

// Add token to all requests
chairpersonReportsApi.interceptors.request.use(config => {
  const token = localStorage.getItem("teacher-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Associate Chairperson Reports API
export const associateChairpersonReportsAPI = {
  // Get Department Performance Dashboard
  getDepartmentPerformanceDashboard: async () => {
    const response = await chairpersonReportsApi.get('/associate/department-performance');
    return response.data;
  },

  // Get Event Analysis
  getEventAnalysis: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    const response = await chairpersonReportsApi.get(`/associate/event-analysis?${params}`);
    return response.data;
  },

  // Get Faculty Overview
  getFacultyOverview: async () => {
    const response = await chairpersonReportsApi.get('/associate/faculty-overview');
    return response.data;
  },

  // Get Complete Dashboard
  getDashboard: async () => {
    const response = await chairpersonReportsApi.get('/associate/dashboard');
    return response.data;
  },
};

// Chairperson Reports API
export const chairpersonReportsAPI = {
  // Get Institution Overview
  getInstitutionOverview: async () => {
    const response = await chairpersonReportsApi.get('/chairperson/institution-overview');
    return response.data;
  },

  // Get Comparative Analysis
  getComparativeAnalysis: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    const response = await chairpersonReportsApi.get(`/chairperson/comparative-analysis?${params}`);
    return response.data;
  },

  // Get Administrative Insights
  getAdministrativeInsights: async () => {
    const response = await chairpersonReportsApi.get('/chairperson/administrative-insights');
    return response.data;
  },

  // Get Complete Dashboard
  getDashboard: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    const response = await chairpersonReportsApi.get(`/chairperson/dashboard?${params}`);
    return response.data;
  },
};

export default chairpersonReportsApi;