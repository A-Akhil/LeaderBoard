const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    profileImg: { type: String, default: null },
    email: { type: String, required: true, unique: true },
    registerNo: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    rawPassword: { type: String }, // Store raw password
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class'
    },
    //added curnt year , course , isGraduvated Fields
    year: { type: Number, required: true }, 
    course: { 
        type: String, 
        required: true, 
        enum: ['BTech-CSE-AI', 'BTech-CSE-AIML', 'BTech-MECH', 'BTech-CIVIL', 'BTech-EEE', 'BTech-IT', 
               'MTech-CSE', 'MTech-ECE', 'MTech-MECH', 'MTech-CIVIL', 'MTech-EEE', 'MTech-IT',
               'MTech-Integrated-CSE-ws-CC', 'MTech-Integrated-CSE-ws-SWE'] // Add all your courses
    },
    totalPoints: {
        type: Number,
        default: 0
    },
    eventsParticipated: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
    }],
    isActive: { type: Boolean, default: true },
    isGraduated: { type: Boolean, default: false },
    isArchived:{ type: Boolean, default: false },
    registrationYear: { type: Number, required: true },
    program: { 
        type: String, 
        enum: ['BTech', 'MTech', 'MTech-Integrated'],
        required: true 
    },
    department: { 
        type: String,
        required: true,
        enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'CINTEL'] // Add all your departments
    },
    currentClass: {
        year: { type: Number }, // Remove required
        section: { type: String }, // Remove required
        ref: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Class'
            // Remove required
        }
    },
    classHistory: [{
        year: Number,
        section: String,
        academicYear: String, // e.g. "2022-2023"
        classRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' }
    }],
    achievements: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Achievement' }]
}, { timestamps: true });

studentSchema.virtual('graduationYear').get(function () {
    return this.course === 'MTech' ? 5 : 4; // MTech students graduate in year 5, others in year 4
});

// Add this pre-save hook to log class assignments
studentSchema.pre('save', function(next) {
  console.log('Saving student with class: ', this.class || this.currentClass?.ref || 'No class assigned');
  next();
});

// Instance Method: Generate Auth Token
studentSchema.methods.generateAuthToken = function () {
    const token = jwt.sign({ _id: this._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    return token;
};

// Instance Method: Compare Passwords
studentSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// Static Method: Hash Password
studentSchema.statics.hashedPassword = async function (password) {
    return await bcrypt.hash(password, 10);
};

// Add method to calculate current academic year
studentSchema.methods.calculateCurrentYear = function() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    
    let academicYear = currentYear - this.registrationYear;
    
    // If before May (assuming 5 is May), student is still in current year
    // Otherwise, they advance to the next year
    if (currentMonth < 5) {
        return academicYear;
    } else {
        return Math.min(academicYear + 1, this.program === 'MTech' ? 5 : 4);
    }
};

studentSchema.methods.advanceToNextYear = async function(academicYear) {
    // Get current class data
    const currentClassData = {
        year: this.currentClass.year,
        section: this.currentClass.section,
        academicYear: academicYear.replace(/\d{4}-/, (year) => `${parseInt(year) - 1}-`),
        classRef: this.currentClass.ref
    };
    
    // Add current class to history
    if (!this.classHistory) this.classHistory = [];
    this.classHistory.push(currentClassData);
    
    // Calculate new year level
    const newYearLevel = Math.min(this.currentClass.year + 1, 
        this.program === 'MTech' ? 5 : 4);
    
    // Set graduated flag if reached final year
    if ((this.program === 'MTech' && newYearLevel === 5) ||
        (this.program !== 'MTech' && newYearLevel === 4)) {
        this.isGraduated = true;
    }
    
    // Update current class properties
    this.currentClass.year = newYearLevel;
    // Note: section might change and would need to be assigned separately
    
    return this;
};

// Add method to get department from course
studentSchema.pre('save', function(next) {
    if (this.course) {
        // Extract department from course (e.g., 'BTech-CSE' -> 'CSE')
        this.department = this.course.split('-')[1];
    }
    next();
});

// Add a static method to help with debugging
studentSchema.statics.checkClassAssignments = async function() {
  const students = await this.find({}).select('name registerNo class currentClass');
  console.log('Students with class assignments:');
  students.forEach(s => {
    console.log(`Student ${s.name} (${s.registerNo}): Class = ${s.class || s.currentClass?.ref || 'None'}`);
  });
  return students;
};

const studentModel = mongoose.model('student', studentSchema);

module.exports = studentModel;
