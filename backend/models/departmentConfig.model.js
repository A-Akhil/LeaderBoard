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
    hodEmail: {
        type: String,
        lowercase: true,
        trim: true,
        default: null
    },
    hodTeacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'teacher',
        default: null
    },
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

    if (this.hodEmail) {
        this.hodEmail = this.hodEmail.toString().trim().toLowerCase();
    }

    next();
});

departmentConfigSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();
    if (!update) {
        return next();
    }

    if (update.hodEmail) {
        update.hodEmail = update.hodEmail.toString().trim().toLowerCase();
    }

    if (update.$set && update.$set.hodEmail) {
        update.$set.hodEmail = update.$set.hodEmail.toString().trim().toLowerCase();
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
