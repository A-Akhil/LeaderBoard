const mongoose = require('mongoose');

const departmentConfigSchema = new mongoose.Schema({
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
    description: {
        type: String,
        trim: true,
        default: null
    },
    aliases: [{
        type: String,
        uppercase: true,
        trim: true
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

departmentConfigSchema.pre('save', function(next) {
    if (this.code) {
        this.code = this.code.toUpperCase().trim();
    }

    if (Array.isArray(this.aliases) && this.aliases.length > 0) {
        this.aliases = [...new Set(this.aliases
            .map((value) => value && value.toString().trim().toUpperCase())
            .filter(Boolean))];
    }
    next();
});

departmentConfigSchema.virtual('departmentCodes')
    .get(function() {
        return this.aliases;
    })
    .set(function(values) {
        if (!Array.isArray(values)) {
            this.aliases = [];
            return;
        }
        this.aliases = values;
    });

module.exports = mongoose.model('DepartmentConfig', departmentConfigSchema);
