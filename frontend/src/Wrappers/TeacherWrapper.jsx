import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

// API for teacher endpoints
const teacherApi = axios.create({
  baseURL: `${import.meta.env.VITE_BASE_URL}/teacher`,
  withCredentials: true,
});

// API for reports endpoints (without /teacher in the path)
const reportsApi = axios.create({
  baseURL: `${import.meta.env.VITE_BASE_URL}`,
  withCredentials: true,
});

// Add token to all requests for both APIs
[teacherApi, reportsApi].forEach(api => {
  api.interceptors.request.use(config => {
    const token = localStorage.getItem("teacher-token");
    if (token) {
      // Ensure the Authorization header is properly formatted
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
});

const TeacherProtectWrapper = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const token = localStorage.getItem("teacher-token");
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    // Function to handle password change
    const changePassword = async (oldPassword, newPassword) => {
        try {
            const response = await teacherApi.put('/change-password', {
                oldPassword,
                newPassword
            });
            return { success: true, message: response.data.message || "Password changed successfully" };
        } catch (error) {
            return { 
                success: false, 
                message: error.response?.data?.message || "Failed to change password" 
            };
        }
    };

    // Function to ensure reports endpoints have auth
    const getReports = async (endpoint, params = {}) => {
        try {
            const token = localStorage.getItem("teacher-token");
            console.log(`Making reports request to: ${endpoint} with token: ${token?.substring(0, 10)}...`);
            // Make sure we're using the configured reportsApi with auth headers
            const response = await reportsApi.get(endpoint, { 
                params,
                headers: {
                    'Authorization': `Bearer ${token}` // Explicitly set the token here as well
                }
            });
            return { success: true, data: response.data };
        } catch (error) {
            console.error(`Error fetching from ${endpoint}:`, error);
            // Log more detailed error information
            if (error.response) {
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
            }
            
            if (error.response?.status === 401) {
                // If unauthorized, redirect to login
                localStorage.removeItem("teacher-token");
                navigate("/teacher-login");
            }
            return { 
                success: false, 
                message: error.response?.data?.message || "Failed to fetch data" 
            };
        }
    };

    useEffect(() => {
        if (!token) {
            console.log("No token found in localStorage");
            navigate("/teacher-login");
            return;
        }
        
        console.log("Token found:", token.substring(0, 10) + "...");

        // First verify authentication
        const verifyAuth = async () => {
            try {
                // Use teacherApi for verification
                await teacherApi.get('/verify');
                setIsAuthenticated(true);
                
                // Then check teacher role and redirect appropriately
                const checkRoleAndRedirect = async () => {
                    try {
                        // Use teacherApi for profile
                        const response = await teacherApi.get('/profile');
                        
                        const teacherData = response.data;
                        setUserData(teacherData);
                        
                        console.log("Teacher role:", teacherData.role);
                        console.log("Current path:", location.pathname);
                        
                        // If on reports page, don't redirect based on role
                        if (location.pathname.includes('/reports')) {
                            setLoading(false);
                            return;
                        }
                        
                        // Remove the path condition to always redirect HODs/Advisors/Chairpersons/Associate Chairpersons
                        if (teacherData.role === 'HOD' || 
                            teacherData.role === 'Academic Advisor' || 
                            teacherData.role === 'Associate Chairperson' || 
                            teacherData.role === 'Chairperson') {
                            console.log("Redirecting to advisor-hod-dashboard");
                            navigate("/advisor-hod-dashboard");
                            return;
                        }
                        
                        // Set loading to false for all users
                        setLoading(false);
                        
                    } catch (error) {
                        console.error("Error checking role:", error);
                        localStorage.removeItem("teacher-token");
                        navigate("/teacher-login");
                    }
                };

                checkRoleAndRedirect();
                
            } catch (error) {
                console.error('Authentication failed:', error);
                setIsAuthenticated(false);
                localStorage.removeItem("teacher-token");
                navigate("/teacher-login");
            }
        };

        verifyAuth();
    }, [navigate, token, location.pathname]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Clone the children and pass userData and helper functions as props
    return React.Children.map(children, child => {
        if (React.isValidElement(child)) {
            return React.cloneElement(child, { 
                userData, 
                reportsApi, 
                changePassword,
                getReports // Add the helper function for reports
            });
        }
        return child;
    });
};

export default TeacherProtectWrapper;