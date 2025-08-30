import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Save, 
  X, 
  Shield, 
  User, 
  GraduationCap, 
  Crown,
  AlertCircle
} from 'lucide-react';
import { teacherManagementService } from '../../services/teacherManagement';

const UserManagement = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state for adding new teacher
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    email: '',
    password: '',
    registerNo: '',
    department: '',
    role: 'Faculty',
    managedDepartments: []
  });

  // Form state for editing teacher
  const [editForm, setEditForm] = useState({
    role: '',
    department: '',
    managedDepartments: []
  });

  const departments = teacherManagementService.getDepartments();
  const roles = teacherManagementService.getRoles();

  // Role icons mapping
  const getRoleIcon = (role) => {
    switch (role) {
      case 'Chairperson':
        return <Crown className="w-4 h-4 text-purple-500" />;
      case 'Associate Chairperson':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'HOD':
        return <GraduationCap className="w-4 h-4 text-green-500" />;
      case 'Academic Advisor':
        return <Users className="w-4 h-4 text-orange-500" />;
      default:
        return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  // Role color mapping
  const getRoleColor = (role) => {
    switch (role) {
      case 'Chairperson':
        return 'bg-purple-100 text-purple-800';
      case 'Associate Chairperson':
        return 'bg-blue-100 text-blue-800';
      case 'HOD':
        return 'bg-green-100 text-green-800';
      case 'Academic Advisor':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Load teachers
  const loadTeachers = async () => {
    try {
      setLoading(true);
      const response = await teacherManagementService.getAllTeachers();
      setTeachers(response.teachers);
      setError('');
    } catch (error) {
      setError(error.message || 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  // Handle edit teacher
  const handleEditTeacher = (teacher) => {
    setEditingTeacher(teacher._id);
    setEditForm({
      role: teacher.role,
      department: teacher.department || '',
      managedDepartments: teacher.managedDepartments || []
    });
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      const response = await teacherManagementService.updateTeacherRole(editingTeacher, editForm);
      setSuccess(response.message);
      setEditingTeacher(null);
      setEditForm({ role: '', department: '', managedDepartments: [] });
      await loadTeachers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message || 'Failed to update teacher role');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingTeacher(null);
    setEditForm({ role: '', department: '', managedDepartments: [] });
  };

  // Handle add new teacher
  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await teacherManagementService.registerTeacherWithRole(newTeacher);
      setSuccess(response.message);
      setNewTeacher({
        name: '',
        email: '',
        password: '',
        registerNo: '',
        department: '',
        role: 'Faculty',
        managedDepartments: []
      });
      setShowAddForm(false);
      await loadTeachers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message || 'Failed to register teacher');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Handle managed departments change for Associate Chairperson
  const handleManagedDepartmentsChange = (department, isEdit = false) => {
    const targetForm = isEdit ? editForm : newTeacher;
    const setterFunction = isEdit ? setEditForm : setNewTeacher;
    
    const currentDepartments = targetForm.managedDepartments || [];
    const updatedDepartments = currentDepartments.includes(department)
      ? currentDepartments.filter(d => d !== department)
      : [...currentDepartments, department];
    
    setterFunction({
      ...targetForm,
      managedDepartments: updatedDepartments
    });
  };

  if (loading && teachers.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">User Management</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Add Teacher
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Add Teacher Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-4">Add New Teacher</h3>
          <form onSubmit={handleAddTeacher} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newTeacher.name}
                  onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newTeacher.email}
                  onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newTeacher.password}
                  onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Register Number</label>
                <input
                  type="text"
                  value={newTeacher.registerNo}
                  onChange={(e) => setNewTeacher({ ...newTeacher, registerNo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newTeacher.role}
                  onChange={(e) => setNewTeacher({ ...newTeacher, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              {newTeacher.role !== 'Chairperson' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={newTeacher.department}
                    onChange={(e) => setNewTeacher({ ...newTeacher, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required={newTeacher.role !== 'Chairperson'}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Managed Departments for Associate Chairperson */}
            {newTeacher.role === 'Associate Chairperson' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Managed Departments</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {departments.map(dept => (
                    <label key={dept} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newTeacher.managedDepartments?.includes(dept) || false}
                        onChange={() => handleManagedDepartmentsChange(dept, false)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{dept}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Teacher'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Teachers List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teacher
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Managed Departments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teachers.map((teacher) => (
                <tr key={teacher._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                      <div className="text-sm text-gray-500">{teacher.email}</div>
                      <div className="text-xs text-gray-400">{teacher.registerNo}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingTeacher === teacher._id ? (
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        className="text-sm px-2 py-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      >
                        {roles.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(teacher.role)}`}>
                        {getRoleIcon(teacher.role)}
                        {teacher.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingTeacher === teacher._id ? (
                      editForm.role !== 'Chairperson' ? (
                        <select
                          value={editForm.department}
                          onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                          className="text-sm px-2 py-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Department</option>
                          {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-400">N/A (Chairperson)</span>
                      )
                    ) : (
                      teacher.department || <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingTeacher === teacher._id ? (
                      editForm.role === 'Associate Chairperson' ? (
                        <div className="space-y-1">
                          {departments.map(dept => (
                            <label key={dept} className="flex items-center space-x-1 text-xs">
                              <input
                                type="checkbox"
                                checked={editForm.managedDepartments?.includes(dept) || false}
                                onChange={() => handleManagedDepartmentsChange(dept, true)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span>{dept}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )
                    ) : (
                      teacher.managedDepartments?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {teacher.managedDepartments.map(dept => (
                            <span key={dept} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              {dept}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingTeacher === teacher._id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={loading}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditTeacher(teacher)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {teachers.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No teachers found. Add some teachers to get started.
        </div>
      )}
    </div>
  );
};

export default UserManagement;