const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const adminSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true,
        select: false
    },
    rawPassword: { 
        type: String,
        select: false // Hide raw password from queries by default
    },
    role: {
        type: String,
        enum: ['Super Admin', 'Department Admin'],
        default: 'Department Admin'
    },
    department: {
        type: String,
        uppercase: true,
        trim: true,
        default: null,
        validate: {
            validator(value) {
                if (this.role !== 'Department Admin') {
                    return true;
                }
                return Boolean(value);
            },
            message: 'Department Admin accounts must reference a department code'
        }
    }
}, {
    timestamps: true
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
    if (this.department) {
        this.department = this.department.toString().trim().toUpperCase();
    }

    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

adminSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();
    if (!update) {
        return next();
    }

    const normalise = (value) => (value ? value.toString().trim().toUpperCase() : value);

    if (typeof update.department !== 'undefined') {
        update.department = normalise(update.department);
    }

    if (update.$set && typeof update.$set.department !== 'undefined') {
        update.$set.department = normalise(update.$set.department);
    }

    next();
});

adminSchema.methods.generateAuthToken = function () {
    const token = jwt.sign(
        { _id: this._id.toString() },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
    return token;
};

adminSchema.methods.comparePassword = async function (password) {
    try {
        return await bcrypt.compare(password, this.password);
    } catch (error) {
        throw error;
    }
};

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;