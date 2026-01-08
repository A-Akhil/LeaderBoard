import React, { useState } from 'react';
import { Download, Loader } from 'lucide-react';
import axios from 'axios';

const ReportsDownloadSection = ({ fetchFromApi, yearFilter, departmentFilter }) => {
  const [loading, setLoading] = useState({});
  
  const downloadOptions = [
    { id: 'top-students', label: 'Top Students Report' },
    { id: 'class-performance', label: 'Class Performance Report' },
    { id: 'category-performance', label: 'Category Performance by Class Report' },
    { id: 'popular-categories', label: 'Popular Categories Report' },
    { id: 'approval-rates', label: 'Approval Rates Report' },
    { id: 'inactive-students', label: 'Inactive Students Report' }
  ];

  const handleDownload = async (reportType) => {
    try {
      setLoading(prev => ({ ...prev, [reportType]: true }));
      
      // Create authenticated axios instance (supports teacher or admin tokens)
      const teacherToken = localStorage.getItem('teacher-token');
      const adminToken = localStorage.getItem('admin-token');
      const token = teacherToken || adminToken;
      if (!token) {
        throw new Error('Authentication token missing');
      }
      
      // Prepare query parameters
      const params = {};
      if (yearFilter) params.year = yearFilter;
      if (departmentFilter) params.department = departmentFilter;
      
      console.log(`Downloading ${reportType} with params:`, params);
      
      // We need to use direct axios with blob for downloads
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/reports/download/${reportType}`, 
        {
          responseType: 'blob',
          headers: {
            Authorization: `Bearer ${token}`
          },
          params: params // Include filters in the request
        }
      );
      
      // Create blob and trigger download
      const contentType = response.headers['content-type'] || 'text/csv';
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Error downloading report:', error);
      
      // Better error handling
      let errorMessage = 'Failed to download report';
      if (error.response) {
        console.error('Response status:', error.response.status);
        errorMessage = `Error (${error.response.status}): The server couldn't process this request`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert('Error downloading report: ' + errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, [reportType]: false }));
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Download Reports</h2>
      
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Available Reports</h3>
        <p className="text-gray-600 mb-6">Download reports in CSV format for data analysis in your preferred spreadsheet application.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {downloadOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleDownload(option.id)}
              disabled={loading[option.id]}
              className={`flex items-center justify-center gap-2 ${
                loading[option.id] 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white px-4 py-2 rounded-lg transition-colors`}
            >
              {loading[option.id] ? <Loader size={20} className="animate-spin" /> : <Download size={20} />}
              {loading[option.id] ? 'Downloading...' : option.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Custom Reports</h3>
        <p className="text-gray-600 mb-2">Need a specialized report? Contact the system administrator for custom report generation.</p>
      </div>
    </div>
  );
};

export default ReportsDownloadSection;