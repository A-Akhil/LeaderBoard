const crypto = require('crypto');
const adminModel = require('../models/admin.model');

const normaliseEmail = (value = '') => value.toString().trim().toLowerCase();
const normaliseDepartment = (value = '') => value.toString().trim().toUpperCase();

const deriveNameFromEmail = (email, departmentCode) => {
    const localPart = email.split('@')[0] || '';
    const cleaned = localPart.replace(/[^a-zA-Z]+/g, ' ').trim();
    if (cleaned) {
        return cleaned
            .split(' ')
            .filter(Boolean)
            .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
            .join(' ');
    }
    return `Department Admin ${departmentCode}`;
};

const generateTemporaryPassword = (departmentCode) => {
    const random = crypto.randomBytes(3).toString('hex');
    return `Dept@${departmentCode}${random}`;
};

module.exports.createadmin = async ({ name, email, password, rawPassword, department, role = 'Department Admin' }) => {
    if (!name || !email || !password) {
        throw new Error("All fields are required");
    }

    const normalisedDepartment = department ? normaliseDepartment(department) : null;

    const admin = await adminModel.create({
        name,
        email,
        password,
        rawPassword,
        department: normalisedDepartment,
        role
    });
    
    // Return the mongoose document directly instead of converting to object
    // This ensures methods like generateAuthToken are available
    return admin;
};

module.exports.ensureDepartmentAdmin = async ({ departmentCode, adminEmail }) => {
    const normalisedDepartment = normaliseDepartment(departmentCode || '');
    const normalisedEmail = normaliseEmail(adminEmail || '');

    if (!normalisedDepartment) {
        throw new Error('Department code is required to assign a department admin');
    }

    if (!normalisedEmail) {
        throw new Error('Department admin email is required');
    }

    let admin = await adminModel.findOne({ email: normalisedEmail }).select('+rawPassword +password');
    let generatedPassword = null;

    if (admin) {
        let shouldSave = false;

        if (admin.role !== 'Department Admin') {
            admin.role = 'Department Admin';
            shouldSave = true;
        }

        if (admin.department !== normalisedDepartment) {
            admin.department = normalisedDepartment;
            shouldSave = true;
        }

        if (shouldSave) {
            await admin.save();
        }
    } else {
        const name = deriveNameFromEmail(normalisedEmail, normalisedDepartment);
        const password = generateTemporaryPassword(normalisedDepartment);

        admin = await adminModel.create({
            name,
            email: normalisedEmail,
            password,
            rawPassword: password,
            role: 'Department Admin',
            department: normalisedDepartment
        });

        generatedPassword = password;
    }

    return { admin, generatedPassword };
};