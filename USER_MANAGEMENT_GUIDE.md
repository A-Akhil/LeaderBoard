# User Management Guide for Admin Dashboard

## Overview
The new User Management feature in the admin dashboard allows you to manage all teacher accounts, assign roles, and configure role-specific settings like managed departments for Associate Chairpersons.

## Accessing User Management
1. Log into the admin dashboard
2. Click on the "User Management" tab (represented by a shield icon)

## Features

### 1. View All Teachers
- See all registered teachers in a table format
- View their current roles, departments, and managed departments
- Each role has a distinctive icon and color:
  - 👑 **Chairperson** (Purple) - Institution-wide access
  - 🛡️ **Associate Chairperson** (Blue) - Multi-department management
  - 🎓 **HOD** (Green) - Single department head
  - 👥 **Academic Advisor** (Orange) - Class advisory role
  - 👤 **Faculty** (Gray) - Basic teaching role

### 2. Add New Teachers
Click the "Add Teacher" button to register a new teacher with:
- Personal details (name, email, password, register number)
- Role assignment
- Department assignment (except for Chairperson)
- Managed departments (for Associate Chairperson only)

### 3. Edit Teacher Roles
- Click the edit icon (pencil) next to any teacher
- Change their role using the dropdown
- Update department if needed
- For Associate Chairpersons: select multiple managed departments using checkboxes
- Save or cancel changes

## Role-Specific Rules

### Chairperson
- Only one Chairperson allowed per institution
- No department assignment (institution-wide access)
- Highest level of access

### Associate Chairperson
- Must have at least one managed department
- Can manage multiple departments
- Select departments using checkboxes in the form

### HOD (Head of Department)
- Only one HOD allowed per department
- Must be assigned to a specific department
- Manages their assigned department

### Academic Advisor & Faculty
- Must be assigned to a specific department
- Standard teaching roles

## How to Assign Chairperson and Associate Chairperson Roles

### To Create a Chairperson:
1. Click "Add Teacher" or edit an existing teacher
2. Select "Chairperson" from the role dropdown
3. The department field will be hidden (not needed)
4. Complete other required fields and save

### To Create an Associate Chairperson:
1. Click "Add Teacher" or edit an existing teacher
2. Select "Associate Chairperson" from the role dropdown
3. Select their primary department
4. Check the boxes for all departments they should manage
5. Save the changes

## Security Features
- Only admins can access user management
- Role constraints are enforced (e.g., only one Chairperson)
- Changes are validated on both frontend and backend
- Admin authentication required for all operations

## API Endpoints (for developers)
- `GET /teacher/all` - Get all teachers
- `PUT /teacher/:id/role` - Update teacher role
- `POST /teacher/register-with-role` - Register new teacher with role

## Troubleshooting
- If you can't create a Chairperson: Check if one already exists
- If you can't create an HOD: Check if the department already has an HOD
- If role update fails: Ensure you have selected required fields for that role
- If access is denied: Verify you're logged in as an admin

This system provides complete control over user roles and ensures proper hierarchical management of the institution.