const mongoose = require('mongoose');

const programConfigSchema = new mongoose.Schema({
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
    durationYears: {
        type: Number,
        required: true,
        min: 1
    },
    leaderboardGroup: {
        type: String,
        required: true,
        trim: true
    },
    registerPattern: {
        type: String,
        trim: true,
        default: null
    },
    departmentCodes: [{
        type: String,
        uppercase: true,
        trim: true
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

programConfigSchema.pre('save', function(next) {
    if (this.code) {
        this.code = this.code.toUpperCase().trim();
    }
    if (Array.isArray(this.departmentCodes)) {
        this.departmentCodes = [...new Set(this.departmentCodes.map((value) => value.toUpperCase().trim()))];
    }
    next();
});

module.exports = mongoose.model('ProgramConfig', programConfigSchema);
