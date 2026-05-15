const adminModel = require('../models/admin.model');

module.exports.createadmin = async ({ name, email, password, department }) => {
    if (!name || !email || !password) {
        throw new Error("All fields are required");
    }

    const admin = await adminModel.create({
        name,
        email,
        password,
        department
    });
    
    // Return the mongoose document directly instead of converting to object
    // This ensures methods like generateAuthToken are available
    return admin;
};