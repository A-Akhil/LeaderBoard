const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const metadataCache = require('../utils/metadataCache');

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
        uppercase: true,
        trim: true,
        validate: {
            validator: async function(value) {
                return metadataCache.isValidCourseCode(value);
            },
            message: (props) => `${props.value} is not a configured course.`
        }
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
        required: true,
        uppercase: true,
        trim: true
    },
    department: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
    },
    programDurationYears: {
        type: Number,
        min: 1,
        max: 5,
        default: 4
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

studentSchema.pre('validate', async function(next) {
    try {
        await this.syncMetadataFromCourse();
        next();
    } catch (error) {
        next(error);
    }
});

studentSchema.virtual('graduationYear').get(function () {
    return this.programDurationYears || 4;
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

studentSchema.methods.syncMetadataFromCourse = async function(force = false) {
    if (!this.course) {
        throw new Error('Course is required for a student record');
    }

    const courseCode = this.course.toString().trim().toUpperCase();
    this.course = courseCode;

    if (!force && !this.isModified('course') && this.program && this.department && this.programDurationYears) {
        return;
    }

    const courseConfig = await metadataCache.getCourseByCode(courseCode);
    if (!courseConfig || courseConfig.isActive === false) {
        throw new Error(`Course ${courseCode} is not configured.`);
    }

    const programConfig = await metadataCache.getProgramByCode(courseConfig.programCode);
    if (!programConfig || programConfig.isActive === false) {
        throw new Error(`Program ${courseConfig.programCode} is not configured.`);
    }

    const departmentConfig = await metadataCache.getDepartmentByCode(courseConfig.departmentCode);
    if (!departmentConfig || departmentConfig.isActive === false) {
        throw new Error(`Department ${courseConfig.departmentCode} is not configured.`);
    }

    this.program = programConfig.code;
    this.department = departmentConfig.code;
    this.programDurationYears = programConfig.durationYears;
};

studentSchema.methods.getProgramDurationYears = async function() {
    if (this.programDurationYears) {
        return this.programDurationYears;
    }

    if (!this.program) {
        return 4;
    }

    const programConfig = await metadataCache.getProgramByCode(this.program);
    if (programConfig && programConfig.durationYears) {
        this.programDurationYears = programConfig.durationYears;
        return this.programDurationYears;
    }

    return 4;
};

// Add method to calculate current academic year
studentSchema.methods.calculateCurrentYear = function() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    
    let academicYear = currentYear - this.registrationYear;
    const maxYears = this.programDurationYears || 4;

    if (currentMonth < 5) {
        return Math.min(academicYear, maxYears);
    }

    return Math.min(academicYear + 1, maxYears);
};

studentSchema.methods.advanceToNextYear = async function(academicYear) {
    const currentClassSnapshot = this.currentClass || {};
    const currentClassData = {
        year: currentClassSnapshot.year,
        section: currentClassSnapshot.section,
        academicYear: academicYear.replace(/\d{4}-/, (year) => `${parseInt(year) - 1}-`),
        classRef: currentClassSnapshot.ref
    };
    
    // Add current class to history
    if (!this.classHistory) this.classHistory = [];
    this.classHistory.push(currentClassData);
    
    // Calculate new year level
    const programDuration = await this.getProgramDurationYears();
    const currentYearLevel = currentClassSnapshot.year || 1;
    const newYearLevel = Math.min(currentYearLevel + 1, programDuration);
    
    // Set graduated flag if reached final year
    if (newYearLevel === programDuration) {
        this.isGraduated = true;
    }
    
    // Update current class properties
    if (!this.currentClass) {
        this.currentClass = { year: newYearLevel };
    } else {
        this.currentClass.year = newYearLevel;
    }
    // Note: section might change and would need to be assigned separately
    
    return this;
};

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
