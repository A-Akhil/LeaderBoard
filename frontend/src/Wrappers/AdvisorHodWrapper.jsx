import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const AdvisorHodWrapper = ({ children }) => {
    const navigate = useNavigate();
    const token = localStorage.getItem("teacher-token");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) {
            navigate("/teacher-login");
            return;
        }

        const checkRole = async () => {
            try {
                const response = await axios.get(
                    `${import.meta.env.VITE_BASE_URL}/teacher/profile`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json"
                        }
                    }
                );
                
                const role = response.data.role;
                if (role !== 'HOD' && 
                    role !== 'Academic Advisor' && 
                    role !== 'Associate Chairperson' && 
                    role !== 'Chairperson') {
                    // Redirect faculty to teacher dashboard
                    navigate("/teacher-dashboard");
                }
                setLoading(false);
            } catch (error) {
                console.error("Error checking role:", error);
                navigate("/teacher-login");
            }
        };

        checkRole();
    }, [navigate, token]);

    if (loading || !token) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return <>{children}</>;
};

export default AdvisorHodWrapper;