const mongoose = require('mongoose');
const DepartmentConfig = require('./departmentConfig.model');

const DEGREE_TYPES = ['BTECH', 'MTECH', 'MTECH_INTEGRATED'];

const courseConfigSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    displayName: {
        type: String,
        trim: true,
        default: null
    },
    degreeType: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        enum: DEGREE_TYPES
    },
    departmentCode: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        validate: {
            validator: async function(value) {
                if (!value) {
                    return false;
                }
                const exists = await DepartmentConfig.exists({ code: value });
                return !!exists;
            },
            message: (props) => `Department ${props.value} is not configured.`
        }
    },
    durationYears: {
        type: Number,
        required: true,
        min: 1
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

courseConfigSchema.pre('validate', function(next) {
    if (this.yearSpan && !this.durationYears) {
        this.durationYears = this.yearSpan;
    }
    next();
});

courseConfigSchema.pre('save', function(next) {
    if (this.code) {
        this.code = this.code.toUpperCase().trim();
    }
    if (this.degreeType) {
        this.degreeType = this.degreeType.toUpperCase().trim();
    }
    if (this.departmentCode) {
        this.departmentCode = this.departmentCode.toUpperCase().trim();
    }
    next();
});

courseConfigSchema.statics.DEGREE_TYPES = DEGREE_TYPES;

module.exports = mongoose.model('CourseConfig', courseConfigSchema);
