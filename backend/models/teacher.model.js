const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const teacherSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hashed password
    rawPassword: { type: String }, // Unhashed password
    profileImg: { type: String, default: null },
    registerNo: { type: String, required: true, unique: true },
    role: { 
        type: String, 
        required: true, 
        enum: ['Faculty', 'Academic Advisor', 'HOD', 'Associate Chairperson', 'Chairperson'],
        default: 'Faculty'
    },
    department: { 
        type: String, 
        required: function() {
            // Department is required for all roles except Chairperson
            return this.role !== 'Chairperson';
        },
        enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT','CINTEL'] // Add all your departments
    },
    // For Associate Chairpersons - array of departments they manage
    managedDepartments: [{
        type: String,
        enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT','CINTEL']
    }],
    classes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class'
    }],
    // For HOD - this will be ignored for other roles
    // HOD sees all classes in their department
    isActive: { type: Boolean, default: true }
});

// Method: Generate Auth Token
teacherSchema.methods.generateAuthToken = function () {
    const token = jwt.sign(
        { _id: this._id, email: this.email, role: this.role, department: this.department },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
    return token;
};

// Method: Compare Password
teacherSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// Static Method: Hash Password
teacherSchema.statics.hashedPassword = async function (password) {
    return await bcrypt.hash(password, 10);
};

// Method: Check if teacher has access to a specific class
teacherSchema.methods.hasAccessToClass = function(classId) {
    // Chairperson has access to all classes across all departments
    if (this.role === 'Chairperson') {
        return true;
    }
    
    // Associate Chairperson has access to classes in their assigned departments
    if (this.role === 'Associate Chairperson') {
        return true; // Will be filtered by department in the service layer
    }
    
    // HODs have access to all classes in their department
    if (this.role === 'HOD') {
        return true;
    }
    
    // Faculty and Academic Advisors only have access to their assigned classes
    return this.classes.some(c => c.equals(classId));
};

const teacherModel = mongoose.model('teacher', teacherSchema);

module.exports = teacherModel;
