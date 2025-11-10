const mongoose = require('mongoose');
const ProgramConfig = require('./programConfig.model');
const DepartmentConfig = require('./departmentConfig.model');

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
    programCode: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        validate: {
            validator: async function(value) {
                if (!value) {
                    return false;
                }
                const exists = await ProgramConfig.exists({ code: value });
                return !!exists;
            },
            message: (props) => `Program ${props.value} is not configured.`
        }
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
    yearSpan: {
        type: Number,
        required: true,
        min: 1
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

courseConfigSchema.pre('save', function(next) {
    if (this.code) {
        this.code = this.code.toUpperCase().trim();
    }
    if (this.programCode) {
        this.programCode = this.programCode.toUpperCase().trim();
    }
    if (this.departmentCode) {
        this.departmentCode = this.departmentCode.toUpperCase().trim();
    }
    next();
});

module.exports = mongoose.model('CourseConfig', courseConfigSchema);
