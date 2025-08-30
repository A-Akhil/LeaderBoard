import axios from 'axios';

const VITE_BASE_URL = import.meta.env.VITE_BASE_URL;

// Configure axios defaults
const teacherManagementAPI = axios.create({
  baseURL: `${VITE_BASE_URL}/teacher`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include admin token
teacherManagementAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
teacherManagementAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('admin-token');
      window.location.href = '/admin-login';
    }
    return Promise.reject(error);
  }
);

export const teacherManagementService = {
  // Get all teachers
  getAllTeachers: async () => {
    try {
      const response = await teacherManagementAPI.get('/all');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch teachers' };
    }
  },

  // Update teacher role
  updateTeacherRole: async (teacherId, roleData) => {
    try {
      const response = await teacherManagementAPI.put(`/${teacherId}/role`, roleData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update teacher role' };
    }
  },

  // Register individual teacher with role
  registerTeacherWithRole: async (teacherData) => {
    try {
      const response = await teacherManagementAPI.post('/register-with-role', teacherData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to register teacher' };
    }
  },

  // Get departments (for dropdowns)
  getDepartments: () => {
    return ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'CINTEL'];
  },

  // Get roles (for dropdowns)
  getRoles: () => {
    return ['Faculty', 'Academic Advisor', 'HOD', 'Associate Chairperson', 'Chairperson'];
  }
};

export default teacherManagementService;