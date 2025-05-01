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
        enum: ['Faculty', 'Academic Advisor', 'HOD'],
        default: 'Faculty'
    },
    department: { 
        type: String, 
        required: true,
        enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT','CINTEL'] // Add all your departments
    },
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
    // HODs have access to all classes in their department
    if (this.role === 'HOD') {
        return true;
    }
    
    // Faculty and Academic Advisors only have access to their assigned classes
    return this.classes.some(c => c.equals(classId));
};

const teacherModel = mongoose.model('teacher', teacherSchema);

module.exports = teacherModel;
