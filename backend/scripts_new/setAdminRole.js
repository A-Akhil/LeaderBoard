/* eslint-disable no-console */
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Admin = require('../models/admin.model');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const getArg = (name) => {
    const prefix = `--${name}=`;
    const arg = process.argv.find((value) => value.startsWith(prefix));
    if (!arg) {
        return undefined;
    }
    return arg.slice(prefix.length);
};

(async () => {
    const email = getArg('email');
    const role = getArg('role');

    if (!email || !role) {
        console.error('Usage: node scripts_new/setAdminRole.js --email=user@example.com --role="Super Admin"');
        process.exit(1);
    }

    if (!['Super Admin', 'Department Admin'].includes(role)) {
        console.error('Role must be either "Super Admin" or "Department Admin"');
        process.exit(1);
    }

    try {
        if (!process.env.DB_CONNECT) {
            throw new Error('DB_CONNECT is not defined in environment');
        }

        await mongoose.connect(process.env.DB_CONNECT, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        const updatedAdmin = await Admin.findOneAndUpdate(
            { email },
            { role },
            { new: true }
        );

        if (!updatedAdmin) {
            console.error(`Admin with email ${email} not found.`);
            process.exit(1);
        }

        console.log(`Updated ${email} to role ${role}`);
        process.exit(0);
    } catch (error) {
        console.error('Failed to update admin role:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
})();
