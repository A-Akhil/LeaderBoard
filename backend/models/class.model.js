const mongoose = require('mongoose');
const metadataCache = require('../utils/metadataCache');

const classSchema = new mongoose.Schema({
  year: { 
    type: Number, 
    required: true,
    min: 1,
    max: 5
  },
  section: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        // Validates sections like A1, A2, A4, B1, B2, B4
        return /^[A-Z][1-9]$/.test(v);
      },
      message: props => `${props.value} is not a valid section format! Use format like A1, B2, etc.`
    }
  },
  className: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return `${this.year}-${this.section}-${this.department}`;
    }
  },
  academicYear: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{4}-\d{4}$/.test(v);
      },
      message: props => `${props.value} is not a valid academic year format! Use YYYY-YYYY format.`
    }
  },
  department: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    validate: {
      validator: async function(value) {
        return metadataCache.isValidDepartmentCode(value);
      },
      message: (props) => `${props.value} is not a configured department.`
    }
  },
  assignedFaculty: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Teacher' 
  }],
  students: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'student'  // Changed from 'Student' to 'student'
  }],
  facultyAssigned: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'teacher'
  }],
  academicAdvisors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'teacher'
  }]
}, { timestamps: true });

// Pre-save middleware to ensure className is set
classSchema.pre('save', function(next) {
  if (!this.className) {
    this.className = `${this.year}-${this.section}-${this.department}`;
  }
  next();
});

// Compound index to ensure unique class per department, year, section, and academic year
classSchema.index({ year: 1, section: 1, academicYear: 1, department: 1 }, { unique: true });

const classModel = mongoose.model('Class', classSchema);

module.exports = classModel;